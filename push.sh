#!/bin/bash
set -e
cd "$(dirname "$0")"
rm -f .git/index.lock

MSG="${1:-update $(date '+%Y-%m-%d %H:%M')}"

git add -A
git commit -m "$MSG"
git push

echo ""
echo "Done! Vercel will deploy in ~60 seconds. Check dailycompound.app"
