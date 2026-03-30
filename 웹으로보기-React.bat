@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if not errorlevel 1 (
  node "%~dp0scripts\supabase-setup.mjs"
)
cd /d "%~dp0react-ai-tools"
where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js/npm 이 없습니다. https://nodejs.org 에서 LTS 를 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)
if not exist node_modules (
  echo 의존성 설치 중...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo React 개발 서버: http://localhost:5173  ^(종료: Ctrl+C^)
call npm run dev
pause
