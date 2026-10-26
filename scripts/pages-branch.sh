#!/usr/bin/env bash
# Point the GitHub Pages site at a branch (default: main), so a feature branch can be viewed live before merging.
# Usage: scripts/pages-branch.sh [branch]
set -euo pipefail
branch="${1:-main}"
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
gh api -X PUT "repos/$repo/pages" --input - <<JSON >/dev/null
{"source":{"branch":"$branch","path":"/"}}
JSON
# switching the source alone does not rebuild when the branch was pushed earlier: ask for a build explicitly
gh api -X POST "repos/$repo/pages/builds" >/dev/null 2>&1 || true
echo "Pages now deploys branch '$branch' of $repo (build requested; takes about a minute)."
