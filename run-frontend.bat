@echo off
cd /d "%~dp0"
echo ========================================
echo SafeRoute - Team Trishul
 echo Installing dependencies if needed...
npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Try running this file from Command Prompt or use npm.cmd.
  pause
  exit /b 1
)
echo.
echo Starting SafeRoute...
npm run dev
pause
