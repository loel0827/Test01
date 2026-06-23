# Caddy static server -> http://localhost:8080 (React build in react-ai-tools/dist)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Refresh-PathEnv {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

Refresh-PathEnv

function Find-CaddyExe {
  $fromPath = Get-Command caddy -ErrorAction SilentlyContinue
  if ($fromPath) { return $fromPath.Source }
  $candidates = @(
    "$env:ProgramFiles\Caddy\caddy.exe"
    "${env:ProgramFiles(x86)}\Caddy\caddy.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  $wingetLinks = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\caddy.exe"
  )
  foreach ($p in $wingetLinks) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

$caddyExe = Find-CaddyExe
if (-not $caddyExe) {
  Write-Host ""
  Write-Host "[!] Caddy is not installed." -ForegroundColor Yellow
  Write-Host "    Trying winget install (admin prompt may appear)..." -ForegroundColor DarkGray
  Write-Host ""
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Host "[!] winget not found. Install manually:" -ForegroundColor Red
    Write-Host "    https://caddyserver.com/docs/install#windows" -ForegroundColor Cyan
    exit 1
  }
  & winget install --id CaddyServer.Caddy -e --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[!] Install may have failed. Try in an admin terminal:" -ForegroundColor Yellow
    Write-Host "    winget install CaddyServer.Caddy" -ForegroundColor Cyan
    exit 1
  }
  Refresh-PathEnv
  $caddyExe = Find-CaddyExe
}

if (-not $caddyExe) {
  Write-Host ""
  Write-Host "[!] Caddy not found. Close this window and run the bat file again." -ForegroundColor Yellow
  exit 1
}

$caddyfile = Join-Path $PSScriptRoot "Caddyfile"
if (-not (Test-Path -LiteralPath $caddyfile)) {
  Write-Host "[!] Caddyfile missing: $caddyfile" -ForegroundColor Red
  exit 1
}

$reactDir = Join-Path $PSScriptRoot "react-ai-tools"
$distDir = Join-Path $reactDir "dist"
$distIndex = Join-Path $distDir "index.html"
$npm = Get-Command npm -ErrorAction SilentlyContinue

if (Test-Path -LiteralPath (Join-Path $reactDir "package.json")) {
  if ($npm) {
    Write-Host ""
    Write-Host "  Building React app (npm run build)..." -ForegroundColor DarkGray
    Push-Location $reactDir
    & npm run build
    $buildOk = $LASTEXITCODE -eq 0
    Pop-Location
    if (-not $buildOk) {
      Write-Host ""
      Write-Host "[!] Build failed. Run: cd react-ai-tools && npm install && npm run build" -ForegroundColor Red
      exit 1
    }
    Write-Host "  Build OK." -ForegroundColor DarkGray
  }
  elseif (-not (Test-Path -LiteralPath $distIndex)) {
    Write-Host ""
    Write-Host "[!] npm not found and dist/index.html is missing." -ForegroundColor Yellow
    Write-Host "    Install Node.js or run npm run build in react-ai-tools first." -ForegroundColor Yellow
    exit 1
  }
  else {
    Write-Host ""
    Write-Host "  npm not found - using existing dist folder." -ForegroundColor Yellow
  }
}
elseif (-not (Test-Path -LiteralPath $distIndex)) {
  Write-Host ""
  Write-Host "[!] react-ai-tools/dist/index.html not found. Build the React app first." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "  Caddy running: $caddyExe" -ForegroundColor Green
Write-Host "  Open:        http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Stop:        Ctrl+C" -ForegroundColor DarkGray
Write-Host ""

& $caddyExe run --config $caddyfile --adapter caddyfile
