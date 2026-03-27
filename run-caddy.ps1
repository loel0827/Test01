# Caddy 웹 서버로 이 폴더를 http://localhost:8080 에 서빙
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
  Write-Host "Caddy가 설치되어 있지 않습니다." -ForegroundColor Yellow
  Write-Host "winget으로 설치를 시도합니다. (관리자 승인이 뜰 수 있습니다)" -ForegroundColor DarkGray
  Write-Host ""
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Host "winget을 찾을 수 없습니다. 수동 설치:" -ForegroundColor Red
    Write-Host "  https://caddyserver.com/docs/install#windows" -ForegroundColor Cyan
    exit 1
  }
  & winget install --id CaddyServer.Caddy -e --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "설치에 실패했을 수 있습니다. 관리자 권한 터미널에서 다시 실행하거나:" -ForegroundColor Yellow
    Write-Host "  winget install CaddyServer.Caddy" -ForegroundColor Cyan
    exit 1
  }
  Refresh-PathEnv
  $caddyExe = Find-CaddyExe
}
if (-not $caddyExe) {
  Write-Host ""
  Write-Host "Caddy 설치 후 이 창을 닫고 '웹으로보기.bat'을 다시 실행해 주세요." -ForegroundColor Yellow
  exit 1
}

$caddyfile = Join-Path $PSScriptRoot "Caddyfile"
if (-not (Test-Path -LiteralPath $caddyfile)) {
  Write-Host "Caddyfile이 없습니다: $caddyfile" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "  Caddy 웹 서버 실행 중  ($caddyExe)" -ForegroundColor Green
Write-Host "  브라우저:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "  중지: Ctrl+C" -ForegroundColor DarkGray
Write-Host ""

& $caddyExe run --config $caddyfile --adapter caddyfile
