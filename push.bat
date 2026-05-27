@echo off
cd /d C:\Users\klszo\focus-app
del /f .git\index.lock 2>nul
git add -A
git commit -m "fix: remove functions/builds conflict in vercel.json so deployment succeeds"
git push
echo.
echo Done! Vercel will deploy in ~60 seconds. Check dailycompound.app
pause
