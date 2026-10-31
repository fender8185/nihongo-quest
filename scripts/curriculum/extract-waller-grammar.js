// Reads a Wayback copy of a tanos.co.uk JLPT grammar page and writes its grammar points as `id<TAB>pattern`, in page order.
// usage: node scripts/curriculum/extract-waller-grammar.js <page.html> <out.tsv>
const fs = require('fs');
const [src, out] = process.argv.slice(2);
const html = fs.readFileSync(src, 'utf8');
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// a grammar point is a link of class "nounderline" to the point's example sentences (…/skills/grammar/sentences/?grammarid=N)
const rows = []; const seen = new Set();
for (const [, attrs, inner] of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
  const id = (/href="[^"]*skills\/grammar\/sentences\/\?grammarid=(\d+)"/.exec(attrs) || [])[1];
  if (!id || !/class="nounderline"/.test(attrs) || seen.has(id)) continue;
  const pattern = decode(inner.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
  if (pattern) { seen.add(id); rows.push(`${id}\t${pattern}`); }
}
if (!rows.length) { console.error(`${src}: no grammar points found`); process.exit(1); }
fs.writeFileSync(out, ['id\tpattern', ...rows].join('\n') + '\n');
console.log(`${out}: ${rows.length} grammar points`);
