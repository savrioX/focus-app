@echo off
cd /d C:\Users\klszo\focus-app
del /f .git\index.lock 2>nul
git add -A
git commit -m "P1/P2: mobile fixes, chat resize, form mode, clear chat, dynamic Apex greeting, modal spinners, auto-profile, safety net"
git push
echo.
echo Done! Check Vercel dashboard for deploy status.
pause
