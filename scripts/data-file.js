// data.js keeps DATA one entry per line (each item of an array section, each key of an object section), so grep finds an item
// by its fields and a diff shows only the items that changed. load() reads the file whatever its layout; save() writes that layout.
// usage: node scripts/data-file.js           — puts data.js back in the layout after a script wrote DATA some other way
//        node scripts/data-file.js --check   — exit 1 when it is not in the layout (scripts/test.sh)
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data.js');
const MARK = 'const DATA = ';

function split(src) {
  const at = src.indexOf(MARK);
  if (at < 0) throw new Error(`data.js: no "${MARK}"`);
  return { head: src.slice(0, at), body: src.slice(at + MARK.length).replace(/;\s*$/, '') };
}

function load(file = FILE) { return JSON.parse(split(fs.readFileSync(file, 'utf8')).body); }

function format(D) {
  const section = (v) => {
    const arr = Array.isArray(v);
    const kids = arr ? v.map(x => JSON.stringify(x)) : (v && typeof v === 'object') ? Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`) : [];
    if (!kids.length) return JSON.stringify(v);   // a number, a string, [] or {}
    return `${arr ? '[' : '{'}\n${kids.map(s => '    ' + s).join(',\n')}\n  ${arr ? ']' : '}'}`;
  };
  return `${MARK}{\n${Object.entries(D).map(([k, v]) => `  ${JSON.stringify(k)}: ${section(v)}`).join(',\n')}\n};\n`;
}

function save(D, file = FILE) { fs.writeFileSync(file, split(fs.readFileSync(file, 'utf8')).head + format(D)); }

if (require.main === module) {
  const src = fs.readFileSync(FILE, 'utf8');
  const { head, body } = split(src);
  const out = head + format(JSON.parse(body));
  if (process.argv.includes('--check')) {
    if (out !== src) { console.log('data.js is not one entry per line: run node scripts/data-file.js'); process.exit(1); }
  } else if (out !== src) fs.writeFileSync(FILE, out);
}

module.exports = { load, save, format };
