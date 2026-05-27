Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "instagram_content"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function Snap([string]$name, [int]$wait = 4000) {
    Start-Sleep -Milliseconds $wait
    $s   = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = New-Object System.Drawing.Bitmap($s.Width, $s.Height)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen(0, 0, 0, 0, $s.Size)
    $path = Join-Path $outDir $name
    $bmp.Save($path)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Saved: $name"
}

Write-Host "== Compound Instagram Screenshots =="
Write-Host "Capturing 3 shots automatically..."
Write-Host ""

# Shot 1 — Vercel dashboard
Write-Host "Opening Vercel..."
Start-Process "https://vercel.com/savrioxsi-4724s-projects/compound"
Snap "01_vercel_dashboard.png" 5000

# Shot 2 — GitHub commits
Write-Host "Opening GitHub..."
Start-Process "https://github.com/savrioX/focus-app/commits/main"
Snap "02_github_commits.png" 5000

# Shot 3 — Live app
Write-Host "Opening Compound app..."
Start-Process "https://dailycompound.app"
Snap "03_live_app.png" 5000

Write-Host ""
Write-Host "All done. Files in: $outDir"
Read-Host "Press Enter to exit"
