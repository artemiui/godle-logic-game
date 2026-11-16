# Renders scripts/og/og-image.html to public/og-image.png (1200x630) with headless Edge or Chrome.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$src = Join-Path $PSScriptRoot 'og-image.html'
$out = Join-Path $root 'public\og-image.png'

$candidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw 'Edge or Chrome not found' }

$url = 'file:///' + ($src -replace '\\', '/')
& $browser --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
  --window-size=1200,630 --virtual-time-budget=4000 --screenshot="$out" $url | Out-Null
Write-Output "Wrote $out"
