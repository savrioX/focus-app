Set-Location "C:\Users\klszo\focus-app"
Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue
git add -A
git commit -m "fix: remove functions/builds conflict in vercel.json so deployment succeeds"
git push
Write-Host ""
Write-Host "Done! Vercel will deploy in ~60 seconds. Check dailycompound.app"
Read-Host "Press Enter to exit"
