// The course data lives in data.js (the shared tables, 入門 to N4) and one file a later level (data-n3.js, 2026-11-11): each level
// file's items come after data.js's in every list, as they always did, so DATA put back together is the same, item for item.
// Every file keeps one entry per line (each item of an array section, each key of an object section), so grep finds an item by its
// fields and a diff shows only the items that changed. load() reads them whatever their layout; save() writes that layout.
// usage: node scripts/data-file.js           — puts the files back in the layout after a script wrote DATA some other way
//        node scripts/data-file.js --check   — exit 1 when one is not in the layout (scripts/test.sh)
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data.js');
const MARK = 'const DATA = ';
const MORE = 'DATA_MORE(';   // a level file: DATA_MORE({ …its sections… }); data.js's head defines DATA_MORE, which adds them to DATA
// the levels with a file of their own, in load order; an item goes to its level's file by `lv`, a lesson by its unit's level
const LEVEL_FILES = [{ lv: 'N3', file: 'data-n3.js' }];
const BY_LEVEL = ['VOCAB', 'GRAMMAR', 'EXAM', 'LISTEN', 'READ', 'KANJI'];

function split(src, mark, file) {
  const at = src.indexOf(mark);
  if (at < 0) throw new Error(`${file}: no "${mark}"`);
  return { head: src.slice(0, at), body: src.slice(at + mark.length).replace(mark === MORE ? /\);\s*$/ : /;\s*$/, '') };
}
const levelPath = (file, lf) => path.join(path.dirname(file), lf.file);

// what DATA_MORE does in the browser (data.js's head): a list goes on after the one there, an object's keys join it
function addPart(D, part) {
  for (const [k, v] of Object.entries(part)) D[k] = Array.isArray(v) ? (D[k] || []).concat(v) : Object.assign({}, D[k], v);
  return D;
}

function load(file = FILE) {
  const D = JSON.parse(split(fs.readFileSync(file, 'utf8'), MARK, file).body);
  for (const lf of LEVEL_FILES) {
    const p = levelPath(file, lf);
    if (fs.existsSync(p)) addPart(D, JSON.parse(split(fs.readFileSync(p, 'utf8'), MORE, p).body));
  }
  return D;
}

function body(D) {
  const section = (v) => {
    const arr = Array.isArray(v);
    const kids = arr ? v.map(x => JSON.stringify(x)) : (v && typeof v === 'object') ? Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`) : [];
    if (!kids.length) return JSON.stringify(v);   // a number, a string, [] or {}
    return `${arr ? '[' : '{'}\n${kids.map(s => '    ' + s).join(',\n')}\n  ${arr ? ']' : '}'}`;
  };
  return `{\n${Object.entries(D).map(([k, v]) => `  ${JSON.stringify(k)}: ${section(v)}`).join(',\n')}\n}`;
}
function format(D) { return `${MARK}${body(D)};\n`; }

// DATA cut into data.js's part and each level file's part
function cut(D) {
  const unitLv = new Map((D.UNITS || []).map(u => [u.id, u.lv]));
  const parts = LEVEL_FILES.map(lf => {
    const part = {};
    BY_LEVEL.forEach(k => { if (Array.isArray(D[k])) part[k] = D[k].filter(x => x.lv === lf.lv); });
    if (D.LESSONS) part.LESSONS = Object.fromEntries(Object.entries(D.LESSONS).filter(([u]) => unitLv.get(u) === lf.lv));
    return part;
  });
  const own = new Set(LEVEL_FILES.map(lf => lf.lv));
  const core = {};
  for (const [k, v] of Object.entries(D)) {
    if (BY_LEVEL.includes(k) && Array.isArray(v)) core[k] = v.filter(x => !own.has(x.lv));
    else if (k === 'LESSONS') core[k] = Object.fromEntries(Object.entries(v).filter(([u]) => !own.has(unitLv.get(u))));
    else core[k] = v;
  }
  return { core, parts };
}

function texts(D, file = FILE) {
  const { core, parts } = cut(D);
  const out = [[file, split(fs.readFileSync(file, 'utf8'), MARK, file).head + format(core)]];
  LEVEL_FILES.forEach((lf, i) => { const p = levelPath(file, lf); out.push([p, split(fs.readFileSync(p, 'utf8'), MORE, p).head + MORE + body(parts[i]) + ');\n']); });
  return out;
}

function save(D, file = FILE) { texts(D, file).forEach(([p, t]) => fs.writeFileSync(p, t)); }

if (require.main === module) {
  const out = texts(load());
  const off = out.filter(([p, t]) => fs.readFileSync(p, 'utf8') !== t);
  if (process.argv.includes('--check')) {
    if (off.length) { console.log(`${off.map(([p]) => path.basename(p)).join(', ')} not one entry per line (or an item in the wrong level's file): run node scripts/data-file.js`); process.exit(1); }
  } else off.forEach(([p, t]) => fs.writeFileSync(p, t));
}

module.exports = { load, save, format, addPart, LEVEL_FILES };
