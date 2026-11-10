#!/usr/bin/env node
/* 句意拼貼 (2026-11-10): a grammar item whose meaning is asked by putting the Chinese together from pieces carries
     zt  the pieces, which join to its Chinese exactly (zh for a fill-in item, a for a 句意 item: t 'meaning'),
     zk  the piece that carries the grammar point (shown marked once answered),
     zd  two or three decoys: each a wrong stand-in for one of the pieces.
   Usage: node scripts/check-zh-tiles.js                      — every item in data.js that has pieces (scripts/test.sh)
          node scripts/check-zh-tiles.js <out.jsonl> [<batch.json>] — lines { id, zt, zk, zd } or { id, skip } against data.js;
                                                               with the batch file, every item in it must have a line
   Exit 1 on an error. Warnings (a decoy much longer or shorter than every piece) are printed only. */
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('./data-file').load();
const byId = new Map(D.GRAMMAR.map(g => [g.id, g]));
const target = (g) => (g.t === 'meaning' ? g.a : g.zh);
const len = (s) => [...s].length;

function check(g, x, say) {
  const tgt = target(g);
  if (!tgt) return say('no Chinese to put together');
  const { zt, zk, zd } = x;
  if (!Array.isArray(zt) || zt.length < 2 || zt.length > 6) return say('zt: 2–6 pieces');
  if (zt.some(p => typeof p !== 'string' || !p || p !== p.trim())) return say('zt: empty piece, or spaces at an end');
  if (zt.join('') !== tgt) return say(`zt does not join to the Chinese: ${zt.join('|')} ≠ ${tgt}`);
  if (zt.some(p => /^[，。、！？；：「」…,.!?\s]+$/.test(p))) return say('zt: a piece of punctuation only');
  if (new Set(zt).size !== zt.length) return say('zt: the same piece twice');
  if (!Number.isInteger(zk) || zk < 0 || zk >= zt.length) return say('zk: not a piece of zt');
  if (!Array.isArray(zd) || zd.length < 2 || zd.length > 3) return say('zd: 2–3 decoys');
  if (zd.some(p => typeof p !== 'string' || !p || p !== p.trim())) return say('zd: empty decoy, or spaces at an end');
  if (new Set(zd).size !== zd.length) return say('zd: the same decoy twice');
  if (zd.some(p => zt.includes(p))) return say('zd: a decoy is one of the pieces');
  const lens = zt.map(len);
  zd.forEach(p => { if (lens.every(n => Math.abs(n - len(p)) > 3)) say(`warning: decoy 「${p}」 is far from every piece's length`, true); });
  return true;
}

let errors = 0, warnings = 0;
const report = (id) => (msg, warn) => { if (warn) warnings++; else errors++; console.log(`${id}: ${msg}`); return false; };
const args = process.argv.slice(2);
if (!args.length) {
  let n = 0;
  D.GRAMMAR.forEach(g => { if (g.zt || g.zk !== undefined || g.zd) { n++; check(g, g, report(g.id)); } });
  console.log(`句意拼貼: ${n} items, ${errors} errors, ${warnings} warnings`);
} else {
  const lines = fs.readFileSync(args[0], 'utf8').split('\n').filter(s => s.trim());
  const seen = new Set(); let ok = 0, skip = 0;
  lines.forEach((s, i) => {
    let x; try { x = JSON.parse(s); } catch (e) { report(`line ${i + 1}`)('not JSON'); return; }
    const g = byId.get(x.id); if (!g) { report(`line ${i + 1}`)(`no grammar item ${x.id}`); return; }
    if (seen.has(x.id)) { report(x.id)('twice'); return; }
    seen.add(x.id);
    if (x.skip) { skip++; return; }
    if (check(g, x, report(x.id))) ok++;
  });
  if (args[1]) JSON.parse(fs.readFileSync(args[1], 'utf8')).forEach(b => { if (!seen.has(b.id)) report(b.id)('no line for it'); });
  console.log(`${path.basename(args[0])}: ${ok} with pieces, ${skip} skipped, ${errors} errors, ${warnings} warnings`);
}
process.exit(errors ? 1 : 0);
