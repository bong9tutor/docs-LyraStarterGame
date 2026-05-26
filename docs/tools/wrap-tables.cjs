// One-shot: wrap every <table class="..."> in html/pages/*.html with <div class="table-wrap">.
// Idempotent — skips tables whose immediate previous non-blank line is already a .table-wrap opener.
const fs = require("node:fs");
const path = require("node:path");

const pagesDir = path.resolve(__dirname, "..", "..", "html", "pages");  // docs/tools/ → repo root
const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".html"));

let totalWrapped = 0;
let totalSkipped = 0;
const perFile = [];

for (const f of files) {
  const full = path.join(pagesDir, f);
  const src = fs.readFileSync(full, "utf8");

  // Match: optional leading indent + <table class="..."> ... </table>
  // Lazy, dot-matches-newline.
  const re = /([ \t]*)(<table\s+class="[^"]+">[\s\S]*?<\/table>)/g;

  let wrapped = 0;
  let skipped = 0;
  const out = src.replace(re, (match, indent, tableBlock, offset, full) => {
    // Skip if already inside a .table-wrap: look back to nearest non-blank line.
    const before = full.slice(0, offset);
    const prevNonBlank = before.replace(/\s+$/, "").split("\n").pop() || "";
    if (prevNonBlank.includes('class="table-wrap"')) {
      skipped++;
      return match;
    }
    wrapped++;
    // Indent the inner table by 2 extra spaces, keep <div> at original indent.
    const innerIndent = indent + "  ";
    const indented = tableBlock.replace(/\n/g, "\n  ");
    return `${indent}<div class="table-wrap">\n${innerIndent}${indented}\n${indent}</div>`;
  });

  if (wrapped > 0) {
    fs.writeFileSync(full, out, "utf8");
  }
  perFile.push({ f, wrapped, skipped });
  totalWrapped += wrapped;
  totalSkipped += skipped;
}

for (const r of perFile) {
  if (r.wrapped || r.skipped) {
    console.log(`${r.f}: wrapped=${r.wrapped} skipped=${r.skipped}`);
  }
}
console.log(`\nTOTAL: wrapped=${totalWrapped} skipped=${totalSkipped} across ${files.length} files`);
