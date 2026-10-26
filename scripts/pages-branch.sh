#!/usr/bin/env bash
# Point the GitHub Pages site at a branch (default: main), so a feature branch can be viewed live before merging.
# Usage: scripts/pages-branch.sh [branch]
set -euo pipefail
branch="${1:-main}"
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
# Deleting the branch Pages currently points at removes the whole site; create it again when that happened.
# (Always switch Pages back to main BEFORE deleting a feature branch.)
if gh api "repos/$repo/pages" >/dev/null 2>&1; then method=PUT; else method=POST; echo "Pages site missing: creating it"; fi
gh api -X "$method" "repos/$repo/pages" --input - <<JSON >/dev/null
{"source":{"branch":"$branch","path":"/"}}
JSON
# switching the source alone does not rebuild when the branch was pushed earlier: ask for a build explicitly
gh api -X POST "repos/$repo/pages/builds" >/dev/null 2>&1 || true
echo "Pages now deploys branch '$branch' of $repo (build requested; takes about a minute)."
