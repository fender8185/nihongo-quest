#!/usr/bin/env bash
# Fetches the pinned curriculum sources into curriculum/sources/ and writes MANIFEST.sha256
# (docs/superpowers/specs/2026-10-31-curriculum-n3-n1-design.md §2; what each file is: curriculum/sources/SOURCES.md).
# usage: bash scripts/curriculum/fetch-sources.sh [scratch-dir]
# Pages and full JSON land in the scratch dir; only the kept fields reach the repo.
set -euo pipefail
cd "$(dirname "$0")/../.."
tmp="${1:-$(mktemp -d)}"; mkdir -p "$tmp"
out=curriculum/sources; mkdir -p "$out/waller" "$out/openjlpt"
WALLER=https://raw.githubusercontent.com/Bluskyo/JLPT_Vocabulary/4358f932937ad0232194a36e9f4f875094910c6b/data
OPEN=https://raw.githubusercontent.com/evanclan/OpenJLPT/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar
for L in 5 4 3 2 1; do
  curl -sfL "$WALLER/vocab/parsedData/n${L}_vocab_cleaned.csv" -o "$out/waller/n${L}_vocab.csv"
  curl -sfL "$WALLER/kanji/parsedData/n${L}_kanji.csv" -o "$out/waller/n${L}_kanji.csv"
done
# Waller's grammar lists: tanos.co.uk did not resolve on 2026-10-31, so the Wayback copies (id_ = the page as served, links not rewritten)
for pair in 3:20200814013355 2:20200725191822 1:20200729091405; do
  L=${pair%%:*}; ts=${pair#*:}
  curl -sfL "http://web.archive.org/web/${ts}id_/http://www.tanos.co.uk:80/jlpt/jlpt${L}/grammar/" -o "$tmp/waller-grammar-n$L.html"
  node scripts/curriculum/extract-waller-grammar.js "$tmp/waller-grammar-n$L.html" "$out/waller/grammar-n$L.tsv"
  # OpenJLPT (CC BY-SA 4.0): only id, pattern and level are kept; its meanings, formations, examples and notes are not stored
  curl -sfL "$OPEN/n$L.json" -o "$tmp/openjlpt-grammar-n$L.json"
  node -e 'const fs = require("fs"); const [src, dst] = process.argv.slice(1); const g = JSON.parse(fs.readFileSync(src, "utf8"));
    fs.writeFileSync(dst, ["id\tpattern\tlevel", ...g.map(x => [x.id, x.pattern, x.level].join("\t"))].join("\n") + "\n");' "$tmp/openjlpt-grammar-n$L.json" "$out/openjlpt/grammar-n$L.tsv"
done
( cd "$out" && find . -type f ! -name MANIFEST.sha256 ! -name SOURCES.md | sed 's|^\./||' | LC_ALL=C sort | xargs shasum -a 256 ) > "$out/MANIFEST.sha256"
echo "sources written to $out ($(wc -l < "$out/MANIFEST.sha256" | tr -d ' ') files)"
