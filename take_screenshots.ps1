# Compound Instagram Screenshots — run this once, it captures everything automatically
# Double-click to run, or: right-click → Run with PowerShell

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$outDir = "$PSScriptRoot\instagram_content"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function Snap {
    param([string]$name)
    Start-Sleep -Milliseconds 1800
    $s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = New-Object System.Drawing.Bitmap($s.Width, $s.Height)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen(0, 0, 0, 0, $s.Size)
    $bmp.Save("$outDir\$name")
    $g.Dispose(); $bmp.Dispose()
    Write-Host "  Saved $name"
}

Write-Host "== Compound Instagram Capture =="

# Shot 1 — Vercel dashboard (open now)
Start-Process "chrome.exe" "--new-window vercel.com/savrioxsi-4724s-projects/compound" -WindowStyle Maximized
Snap "01_vercel_dashboard.png"

# Shot 2 — GitHub commits
Start-Process "chrome.exe" "github.com/savrioX/focus-app/commits/main" -WindowStyle Maximized
Snap "02_github_commits.png"

# Shot 3 — Live app landing page
Start-Process "chrome.exe" "dailycompound.app" -WindowStyle Maximized
Snap "03_live_app.png"

# Shot 4 — Live app logged in (goals/habits/todos visible — log in first, then run this again if needed)
# Start-Process "chrome.exe" "dailycompound.app" -WindowStyle Maximized
# Snap "04_app_dashboard.png"

Write-Host ""
Write-Host "Done! Open instagram_content folder to see your shots."
Write-Host "Path: $outDir"
pause
