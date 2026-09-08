#!/bin/bash
# macOS port of take_screenshots.ps1 (Windows-only, deleted 2026-09-08).
# Captures the three build-in-public shots into instagram_content/.
# Vercel dashboard URL comes from $VERCEL_DASHBOARD_URL; the repo URL from
# `git remote`, so no personal paths or account slugs live in this file.
set -e
cd "$(dirname "$0")"

OUT="instagram_content"
mkdir -p "$OUT"

REPO_URL=$(git remote get-url origin 2>/dev/null | sed -E 's#^git@github\.com:#https://github.com/#; s#\.git$##')
VERCEL_URL="${VERCEL_DASHBOARD_URL:-https://vercel.com/dashboard}"

snap() {  # snap <filename> <seconds-to-wait>
  sleep "${2:-5}"
  screencapture -x "$OUT/$1"
  echo "Saved: $OUT/$1"
}

echo "== Compound Instagram screenshots =="

open "$VERCEL_URL"
snap 01_vercel_dashboard.png 5

if [ -n "$REPO_URL" ]; then
  open "$REPO_URL/commits/main"
  snap 02_github_commits.png 5
else
  echo "Skipped GitHub shot — no 'origin' remote configured."
fi

open "https://dailycompound.app"
snap 03_live_app.png 5

echo "All done. Files in: $OUT"
