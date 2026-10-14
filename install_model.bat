@echo off
setlocal
 title Cloud AI - Install Model
where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama was not found. Install it from https://ollama.com/download/windows
  pause
  exit /b 1
)
echo Downloading qwen2.5:3b. This can take a while and uses internet data.
ollama pull qwen2.5:3b
if errorlevel 1 (
  echo Model download failed. Check your internet connection and try again.
  pause
  exit /b 1
)
echo Model installed successfully.
pause
