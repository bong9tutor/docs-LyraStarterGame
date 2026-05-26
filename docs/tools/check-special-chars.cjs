// Static checker for special-char policy (docs/common/dynamic-html-spec.md "본문 특수문자 사용 규칙").
//
// Scans CLAUDE.md + docs/**/*.md + dynamic-html/**/*.html body text for policy violations.
// Two severity levels:
//   - FAIL: glyph in BANNED set (em dash · en dash · ✅ · ❌ · ⚠️ · ★ · ①~⑨ etc.) → exit 1
//   - WARN: glyph in WARN set (· · → · ← · ↔ · …) — count only, allowed in narrow roles
//
// Strips out code blocks/spans, HTML <code>/<script>/<style>, and link/image URLs so that
// original identifiers (Cosmetic.AnimationStyle.Feminine, /Game/..., URLs) don't trigger.

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");  // docs/tools/ → repo root

// FAIL — never allowed in prose
const BANNED = new Map([
  ["—", "em dash (U+2014) — use ASCII hyphen ' - ', colon ':', or new sentence"],
  ["–", "en dash (U+2013) — use '~' for ranges or ASCII '-'"],
  ["✅", "✅ — use '완료' / '검증 완료' / '확인'"],
  ["❌", "❌ — use '실패' / '불가' / '금지'"],
  ["⚠", "⚠ — use '주의' / '경고' or note-warning box"],
  ["★", "★ — use '핵심' / '중요' or <strong>"],
  ["☆", "☆ — use '핵심' / '중요' or <strong>"],
  ["❗", "❗ — use '중요' / '주의' or note-warning"],
  ["‼", "‼ — use '중요' / '주의' or note-warning"],
  ["‽", "‽ — use ASCII"],
  ["§", "§ — use '섹션 N'"],
  ["¶", "¶ — use '단락'"],
  ["※", "※ — use '주의' / '참고'"],
  ["†", "† — use prose"],
  ["‡", "‡ — use prose"],
]);
// enclosed circled numbers U+2460..U+2468 (① ~ ⑨)
for (let i = 0x2460; i <= 0x2468; i++) {
  BANNED.set(String.fromCodePoint(i), `enclosed digit (U+${i.toString(16).toUpperCase()}) — use 'N. '`);
}

// WARN — allowed in narrow roles, count only
const WARN = new Map([
  ["·", "middle dot — OK in 제목·표 셀 키워드 병렬, 산문 남용 금지"],
  ["→", "→ — OK in 인과·진행 관계, 일반 관계 설명에 남발 금지"],
  ["←", "← — OK in nav · 역방향 흐름"],
  ["↔", "↔ — OK in 대응 관계 핵심, '와/과' 로 풀 수 있으면 풀어 쓰기"],
  ["…", "… — OK in 코드 예시 생략, 산문 말 줄임은 마침표"],
  ["↑", "↑ — OK in 역방향 흐름 화살표"],
  ["↓", "↓ — OK in flow arrow 컴포넌트"],
]);

// Allowed glyphs (won't trigger FAIL even if not Korean/ASCII)
const ALLOWED = new Set([
  "✓", "◐", "△", // ✓ ◐ △ 검증 배지
  "◆", "□",            // ◆ □ 컴포넌트
  "☰",                       // ☰ 햄버거
  "🌓",                      // 🌓 다크모드 토글 (sample-defined glyph)
  "≥", "≤", "≠", "≈", "×", "Σ", "∑", // ≥ ≤ ≠ ≈ × Σ ∑ 수식
  // Quotes / typography that are neutral
  "‘", "’", "“", "”",
]);

function isHangul(code) {
  return (code >= 0xAC00 && code <= 0xD7A3)
      || (code >= 0x1100 && code <= 0x11FF)
      || (code >= 0x3130 && code <= 0x318F);
}
function isCjkPunct(code) { return code >= 0x3000 && code <= 0x303F; }
function isFullWidth(code) { return code >= 0xFF00 && code <= 0xFFEF; }
function isAsciiPrintable(code) { return code >= 0x20 && code < 0x80; }
function isAsciiControl(code) { return code < 0x20 || code === 0x7F; }
function isLatin1Common(code) {
  // basic punctuation we accept (Latin-1 supplement, sans BANNED ones above)
  return code >= 0xA0 && code <= 0xFF;
}

// Strip content where original identifiers/URLs may legitimately contain non-ASCII.
function stripIgnoredRegions(text, ext) {
  let t = text;
  if (ext === ".md") {
    // fenced code blocks
    t = t.replace(/```[\s\S]*?```/g, " ");
    // inline code
    t = t.replace(/`[^`\n]*`/g, " ");
    // image/link URLs (between parens)
    t = t.replace(/\]\(([^)]*)\)/g, "] ");
    // bare URLs
    t = t.replace(/https?:\/\/\S+/g, " ");
  } else if (ext === ".html") {
    t = t.replace(/<script[\s\S]*?<\/script>/g, " ");
    t = t.replace(/<style[\s\S]*?<\/style>/g, " ");
    t = t.replace(/<code[\s\S]*?<\/code>/g, " ");
    // href / src attribute values
    t = t.replace(/\s(?:href|src)="[^"]*"/g, " ");
    // remaining tags
    t = t.replace(/<[^>]+>/g, " ");
    // URL-ish in text
    t = t.replace(/https?:\/\/\S+/g, " ");
  }
  return t;
}

function walk(dir, exts, out, excludeDir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    if (excludeDir && excludeDir.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, exts, out, excludeDir);
    else if (exts.includes(path.extname(e.name))) out.push(full);
  }
}

function listTargets() {
  const out = [];
  // CLAUDE.md at root
  const claudeMd = path.join(root, "CLAUDE.md");
  if (fs.existsSync(claudeMd)) out.push(claudeMd);
  // docs/**/*.md
  const docs = path.join(root, "docs");
  if (fs.existsSync(docs)) walk(docs, [".md"], out, new Set(["node_modules"]));
  // dynamic-html/**/*.{html}
  const dyn = path.join(root, "dynamic-html");
  if (fs.existsSync(dyn)) walk(dyn, [".html"], out, new Set(["node_modules"]));
  return out;
}

const failures = []; // { file, line, ch, reason }
const warnings = new Map(); // ch -> count

const files = listTargets();
for (const f of files) {
  const ext = path.extname(f);
  const raw = fs.readFileSync(f, "utf8");
  const text = stripIgnoredRegions(raw, ext);
  // line-by-line to report line numbers
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of [...line]) {
      const code = ch.codePointAt(0);
      if (isAsciiPrintable(code) || isAsciiControl(code)) continue;
      if (isHangul(code) || isCjkPunct(code) || isFullWidth(code)) continue;
      if (ALLOWED.has(ch)) continue;
      if (BANNED.has(ch)) {
        failures.push({ file: path.relative(root, f), line: i + 1, ch, reason: BANNED.get(ch) });
        continue;
      }
      if (WARN.has(ch)) {
        warnings.set(ch, (warnings.get(ch) || 0) + 1);
        continue;
      }
      // Latin-1 quotes & common typography
      if (isLatin1Common(code)) continue;
      // unknown high-BMP / astral: treat as FAIL (likely emoji)
      failures.push({
        file: path.relative(root, f),
        line: i + 1,
        ch,
        reason: `unexpected glyph U+${code.toString(16).toUpperCase().padStart(4, "0")} — not in allowed list`,
      });
    }
  }
}

// Aggregate report
const failByChar = new Map();
for (const f of failures) {
  const key = f.ch;
  if (!failByChar.has(key)) failByChar.set(key, { count: 0, reason: f.reason, samples: [] });
  const e = failByChar.get(key);
  e.count++;
  if (e.samples.length < 5) e.samples.push(`${f.file}:${f.line}`);
}

console.log(`[chars] checked=${files.length} files`);
if (failByChar.size > 0) {
  console.log(`[chars] FAILURES:`);
  const sorted = [...failByChar.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [ch, e] of sorted) {
    const code = "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    console.log(`  ${code} ${JSON.stringify(ch)} x${e.count} — ${e.reason}`);
    for (const s of e.samples) console.log(`    ${s}`);
  }
}
if (warnings.size > 0) {
  console.log(`[chars] WARN (narrow-role glyphs, count only):`);
  for (const [ch, n] of warnings) {
    const code = "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    const note = WARN.get(ch) || "";
    console.log(`  ${code} ${JSON.stringify(ch)} x${n} — ${note}`);
  }
}

if (failures.length === 0) {
  console.log(`[chars] no FAIL violations`);
  process.exit(0);
}
console.log(`[chars] total FAIL=${failures.length}`);
console.log(`[chars]`);
console.log(`[chars] 대체 규칙:`);
console.log(`[chars]   em dash '—' → ' - ' (공백 + ASCII 하이픈 + 공백), ':' 콜론, 또는 새 문장`);
console.log(`[chars]   en dash '–' → '~' (범위) 또는 ' - '`);
console.log(`[chars]   ✅ → '완료' / '검증 완료', ❌ → '실패', ★ → '핵심' 또는 <strong>`);
console.log(`[chars]   ①~⑨ → '1.' ASCII 숫자 + 마침표`);
console.log(`[chars]   사양 "본문 특수문자 사용 규칙" 절 + 화이트리스트 표 참조`);
process.exit(1);
