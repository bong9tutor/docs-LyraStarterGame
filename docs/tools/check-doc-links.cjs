// Static checker for doc paths across the repo.
//
// Two passes:
//   (1) Markdown link target check — `[label](path.md)` in .md files must resolve.
//   (2) Stale-path sweep — non-md sources (HTML/CSS/JS in html/, scripts in tools/)
//       must not reference the pre-restructure flat doc paths
//       (`docs/<analysis-tools|documentation-workflow|dynamic-html-spec|architecture-overview|project-verification>.md`
//        or `docs/<animation|ui|asset-loading|gas>-*.md`). The new homes are docs/common/ and docs/project/.
//
// Both passes report violations and set the process exit code (1 if any).
const fs = require("node:fs");
const path = require("node:path");

function listFiles(dir, exts, rel = "") {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(f, exts, r));
    else if (exts.some((x) => e.name.endsWith(x))) out.push(r);
  }
  return out;
}

// ---------- Pass 1: markdown link target check ----------
const mdSrc = ["CLAUDE.md", ...listFiles("docs", [".md"]).map((r) => `docs/${r}`)];
let mdBad = 0, mdTotal = 0;
for (const s of mdSrc) {
  const txt = fs.readFileSync(s, "utf8");
  const dir = path.posix.dirname(s.replace(/\\/g, "/"));
  const re = /\]\(([^)\s]+\.md)(#[^)]*)?\)/g;
  let m;
  while ((m = re.exec(txt))) {
    const t = m[1];
    if (/^(https?:|mailto:|#)/.test(t)) continue;
    mdTotal++;
    const abs = path.posix.normalize(`${dir}/${t}`);
    if (!fs.existsSync(abs)) {
      console.log(`[md] BROKEN ${s} -> ${t} (resolved ${abs})`);
      mdBad++;
    }
  }
}
console.log(`[md] checked=${mdTotal} broken=${mdBad}`);

// ---------- Pass 2: stale flat-path sweep in non-md sources ----------
// Pattern: docs/<one of legacy basenames>.md  — anything that should now be docs/common/... or docs/project/...
const legacyBasenames = [
  "analysis-tools",
  "documentation-workflow",
  "dynamic-html-spec",
  "architecture-overview",
  "project-verification",
];
const legacySystemPrefixes = ["animation-", "ui-", "asset-loading-", "gas-"];
const legacyRe = new RegExp(
  `docs/(?:(?:${legacyBasenames.join("|")})\\.md|(?:${legacySystemPrefixes.join("|")})[\\w.-]+\\.md)(?![\\w/])`,
  "g",
);
// Allow new-home paths explicitly (anything under docs/common/ or docs/project/ is fine because the regex
// requires "docs/X.md" with X starting with one of the legacy basenames/prefixes — common/ and project/ won't match).
const nonMdSrc = [
  ...listFiles("html", [".html", ".css", ".js"]).map((r) => `html/${r}`),
  ...listFiles("docs/tools", [".cjs", ".js"]).map((r) => `docs/tools/${r}`).filter((p) => !p.includes("node_modules")),
];
let stale = 0, scanned = 0;
for (const s of nonMdSrc) {
  // Skip the checker itself so its own legacy list doesn't trigger.
  if (s === "docs/tools/check-doc-links.cjs") continue;
  const txt = fs.readFileSync(s, "utf8");
  scanned++;
  const matches = txt.match(legacyRe);
  if (matches) {
    for (const m of matches) {
      console.log(`[stale] ${s}: found legacy path "${m}" — should be docs/common/ or docs/project/`);
      stale++;
    }
  }
}
console.log(`[stale] scanned=${scanned} stale=${stale}`);

if (mdBad > 0 || stale > 0) process.exit(1);
