@echo off
TITLE JRM Biometric Hardware Gateway AND Ngrok Tunnel Launcher
COLOR 0A

echo ==============================================================================
echo   JRM HRMS - AUTOMATIC BIOMETRIC CONNECTOR AND NGROK LAUNCHER
echo ==============================================================================
echo.

set ROOT_DIR=%~dp0
set CONNECTOR_DIR=%ROOT_DIR%apps\connector
set NGROK_DOMAIN=courageous-unexplosively-beckett.ngrok-free.dev

echo [*] Root Directory: %ROOT_DIR%
echo [*] Permanent Domain: https://%NGROK_DOMAIN%
echo.

:: 1. Start Connector in background window
echo [1/2] Starting Biometric TCP Connector on Port 4000...
start "JRM Biometric Connector :4000" /MIN cmd /c "cd /d "%CONNECTOR_DIR%" && npm run build && npm run start"

:: Wait 3 seconds for connector to initialize
timeout /t 3 /nobreak >nul

:: 2. Start Ngrok Permanent Tunnel
echo [2/2] Starting Permanent Ngrok Tunnel (%NGROK_DOMAIN%)...
start "Ngrok Cloud Tunnel" /MIN cmd /c "npx ngrok http --url=%NGROK_DOMAIN% 4000"

echo.
echo ==============================================================================
echo  [SUCCESS] All Services Started Successfully!
echo ==============================================================================
echo  1. Local Connector : http://localhost:4000
echo  2. Permanent Tunnel : https://%NGROK_DOMAIN%
echo.
echo  Both services are running in the background.
echo  You can now monitor live attendance on Vercel!
echo ==============================================================================
echo.
