#!/usr/bin/env bash
# Point the GitHub Pages site at a branch (default: main), so a feature branch can be viewed live before merging.
# Usage: scripts/pages-branch.sh [branch]
set -euo pipefail
branch="${1:-main}"
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
gh api -X PUT "repos/$repo/pages" --input - <<JSON >/dev/null
{"source":{"branch":"$branch","path":"/"}}
JSON
echo "Pages now deploys branch '$branch' of $repo (takes about a minute)."
