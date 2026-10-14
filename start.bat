@echo off
setlocal
cd /d "%~dp0"
title Cloud AI - Local Server
color 0B
echo.
echo   CLOUD AI - LOCAL ASSISTANT
echo   --------------------------
echo.

if not exist "server.js" (
  echo ERROR: server.js is missing. Extract the whole CloudAI_Local folder first.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install it from https://nodejs.org/ then reopen this window.
  pause
  exit /b 1
)

where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama was not found. Install it from https://ollama.com/download/windows
  echo Then reopen this window and run install_model.bat.
  pause
  exit /b 1
)

if not exist "google.env" if not exist ".env" (
  echo Creating google.env from the included template...
  >"google.env" echo GOOGLE_CLIENT_ID=PASTE_YOUR_GOOGLE_CLIENT_ID_HERE
  >>"google.env" echo GOOGLE_CLIENT_SECRET=PASTE_YOUR_GOOGLE_CLIENT_SECRET_HERE
  >>"google.env" echo GOOGLE_REDIRECT_URI=http://127.0.0.1:3030/auth/google/callback
  >>"google.env" echo OLLAMA_MODEL=qwen2.5:3b
  echo.
  echo Google sign-in setup file created: google.env
  echo Edit it in Notepad and replace the two PASTE values with your real Google OAuth credentials.
  echo Setup instructions are in README.txt.
  echo.
)

curl -fsS http://127.0.0.1:11434/api/tags >nul 2>nul
if errorlevel 1 (
  echo Starting Ollama...
  start "Ollama" /min ollama serve
  timeout /t 5 /nobreak >nul
)

echo Starting Cloud AI server from:
echo %CD%
echo.
start "" http://127.0.0.1:3030
node server.js
pause
