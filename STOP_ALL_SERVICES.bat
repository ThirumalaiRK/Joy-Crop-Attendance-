@echo off
TITLE Stop JRM Biometric Connector and Ngrok
COLOR 0C

echo ==============================================================================
echo   JRM HRMS - STOP ALL CONNECTOR & NGROK PROCESSES
echo ==============================================================================
echo.

echo Stopping ngrok processes...
taskkill /F /IM ngrok.exe >nul 2>&1

echo Stopping node connector processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do (
  echo Killing process on port 4000 (PID %%a)...
  taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ==============================================================================
echo  [SUCCESS] All Connector and Tunnel processes have been stopped.
echo ==============================================================================
echo.
pause
