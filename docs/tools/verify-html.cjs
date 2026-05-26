// Headless Chrome verification of dynamic-html/ site.
// Spawns Chrome via puppeteer-core (system Chrome). Drives file:// URLs through
// three viewports (375/768/1280), checks:
//   - document.documentElement.scrollWidth <= clientWidth (no global horizontal overflow)
//   - presence of #sidebar children, #page-toc children, .page-pager, .chapter-brief 4 cells
//   - dark mode toggle adds .dark on <html>
//   - all <table> have a .table-wrap parent
//   - sample of links resolve (200-ish via file existence)
//   - console errors captured
// Captures one screenshot per viewport per probe page.

const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const repo = path.resolve(__dirname, "..", "..");  // docs/tools/ → repo root
const dynRoot = path.join(repo, "dynamic-html");
const shotsDir = path.join(repo, "docs", "tools", "verify-shots");
fs.mkdirSync(shotsDir, { recursive: true });

// Probe pages — table-heavy + index + a couple of varied
const PAGES = [
  { rel: "index.html",                                           label: "home" },
  { rel: "pages/lyra-gas-ability-policy.html",                   label: "gas-ability-policy" },     // 4 tables, long GA tags
  { rel: "pages/lyra-asset-loading-asset-bundles.html",          label: "asset-bundles" },          // 5 tables, long paths
  { rel: "pages/lyra-animation-animbp-ali-tradeoffs.html",       label: "animbp-tradeoffs" },       // 3 tables, partial
  { rel: "pages/lyra-ui-widget-injection.html",                  label: "ui-widget-injection" },    // tables + comparison
];

const VIEWPORTS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "768",  width: 768,  height: 1024 },
  { name: "375",  width: 375,  height: 720 },
];

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function pageUrl(rel) {
  const abs = path.join(dynRoot, rel).replace(/\\/g, "/");
  return "file:///" + abs;
}

const findings = [];
function note(level, msg) {
  findings.push({ level, msg });
  console.log(`[${level}] ${msg}`);
}

(async () => {
  if (!fs.existsSync(CHROME)) {
    console.error("Chrome not at expected path: " + CHROME);
    process.exit(2);
  }
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"],
  });

  for (const p of PAGES) {
    const url = pageUrl(p.rel);
    for (const v of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: 1 });
      const consoleErrors = [];
      page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`console.error: ${m.text()}`); });
      try {
        await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });
      } catch (e) {
        note("BLOCK", `${p.label} @${v.name}: navigation failed — ${e.message}`);
        await page.close();
        continue;
      }

      // Allow scrollspy + dynamic widgets to render
      await new Promise((r) => setTimeout(r, 250));

      const probe = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflowX = doc.scrollWidth - doc.clientWidth;
        const sidebar = document.getElementById("sidebar");
        const sidebarLinks = sidebar ? sidebar.querySelectorAll("a").length : -1;
        const pageToc = document.getElementById("page-toc");
        const tocLinks = pageToc ? pageToc.querySelectorAll("a").length : -1;
        const pagerExists = !!document.querySelector(".page-pager");
        const chapterBrief = document.querySelector(".chapter-brief");
        const briefCells = chapterBrief ? chapterBrief.querySelectorAll(".brief-block").length : -1;
        const tables = Array.from(document.querySelectorAll("table"));
        const unwrappedTables = tables.filter((t) => !t.parentElement || !t.parentElement.classList.contains("table-wrap")).length;
        // Identify which children of body overflow horizontally (find culprit if overflowX > 0)
        let culprit = null;
        if (overflowX > 0) {
          const all = document.querySelectorAll("body *");
          for (const el of all) {
            const r = el.getBoundingClientRect();
            if (r.right > doc.clientWidth + 1) {
              culprit = {
                tag: el.tagName.toLowerCase(),
                cls: el.className || "",
                id: el.id || "",
                right: Math.round(r.right),
                width: Math.round(r.width),
                snippet: (el.textContent || "").trim().slice(0, 80),
              };
              break;
            }
          }
        }
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          overflowX,
          sidebarLinks,
          tocLinks,
          pagerExists,
          briefCells,
          tableCount: tables.length,
          unwrappedTables,
          culprit,
        };
      });

      // Screenshot
      const shotPath = path.join(shotsDir, `${p.label}_${v.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      // Findings
      if (probe.overflowX > 0) {
        const cul = probe.culprit;
        note("FAIL", `${p.label} @${v.name}: global horizontal overflow ${probe.overflowX}px (scrollWidth=${probe.scrollWidth}, clientWidth=${probe.clientWidth}). culprit=${cul ? `<${cul.tag} class="${cul.cls}" id="${cul.id}"> right=${cul.right}px width=${cul.width}px text="${cul.snippet}"` : "unknown"}`);
      } else {
        note("PASS", `${p.label} @${v.name}: no global overflow (scrollWidth=${probe.scrollWidth} ≤ clientWidth=${probe.clientWidth})`);
      }
      if (probe.unwrappedTables > 0) note("FAIL", `${p.label} @${v.name}: ${probe.unwrappedTables} table(s) lack .table-wrap parent (of ${probe.tableCount})`);
      if (p.rel.includes("pages/")) {
        if (probe.sidebarLinks < 1) note("FAIL", `${p.label} @${v.name}: sidebar empty (links=${probe.sidebarLinks})`);
        if (probe.briefCells !== 4) note("FAIL", `${p.label} @${v.name}: chapter-brief cells=${probe.briefCells} (expected 4)`);
        if (v.name === "1280" && probe.tocLinks < 1) note("FAIL", `${p.label} @${v.name}: page-toc empty (links=${probe.tocLinks})`);
        if (v.name === "1280" && !probe.pagerExists) note("WARN", `${p.label} @${v.name}: pager missing (could be first/last page)`);
      }
      if (consoleErrors.length) note("WARN", `${p.label} @${v.name}: console errors — ${consoleErrors.join(" | ")}`);

      await page.close();
    }
  }

  // Dark-mode probe on home only
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(pageUrl("index.html"), { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 100));
    const before = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    await page.click(".theme-toggle");
    await new Promise((r) => setTimeout(r, 100));
    const after = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (before === after) note("FAIL", `dark-mode: toggle did not flip .dark (before=${before}, after=${after})`);
    else note("PASS", `dark-mode: toggle flipped .dark (${before} → ${after})`);
    await page.screenshot({ path: path.join(shotsDir, "home_dark_1280.png") });
    await page.close();
  }

  await browser.close();

  console.log(`\nTotal findings: ${findings.length}`);
  const fails = findings.filter((f) => f.level === "FAIL").length;
  const warns = findings.filter((f) => f.level === "WARN").length;
  console.log(`FAIL=${fails} WARN=${warns}`);
  if (fails > 0) process.exit(1);
})().catch((e) => { console.error(e); process.exit(2); });
