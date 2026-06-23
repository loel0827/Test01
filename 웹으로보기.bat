@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   Caddy 웹 서버 시작 (React 빌드 후 http://localhost:8080)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-caddy.ps1"
if errorlevel 1 (
  echo.
  echo   오류가 발생했습니다. 위 메시지를 확인하세요.
  echo.
)
pause
