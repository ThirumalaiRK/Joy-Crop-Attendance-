@echo off
title Joy Crop Attendance - Production Startup
color 0A

echo.
echo  =============================================================================
echo   Joy Crop Attendance System - PRODUCTION STARTUP
echo  =============================================================================
echo.

set ROOT_DIR=%~dp0
set CONNECTOR_DIR=%ROOT_DIR%apps\connector
set NGROK_DOMAIN=courageous-unexplosively-beckett.ngrok-free.dev

echo [*] Root Directory: %ROOT_DIR%
echo [*] Production Connector Domain: https://%NGROK_DOMAIN%
echo.

:: 1. Build and Start Web Dashboard in Production Mode
echo [1/3] Building & Starting Web Dashboard (Next.js Production Port 3000)...
start "Web Dashboard [PROD]" cmd /k "cd /d "%ROOT_DIR%" && set NODE_ENV=production && pnpm --filter @hrms/web build && pnpm --filter @hrms/web start"

timeout /t 3 /nobreak > nul

:: 2. Build and Start Connector in Production Mode
echo [2/3] Building & Starting Biometric TCP Connector (Port 4000)...
start "Biometric Connector [PROD]" cmd /k "cd /d "%CONNECTOR_DIR%" && npm run build && npm run start"

timeout /t 3 /nobreak > nul

:: 3. Start Ngrok Cloud Tunnel
echo [3/3] Starting Cloud Tunnel (Ngrok https://%NGROK_DOMAIN%)...
start "Ngrok Cloud Tunnel" /MIN cmd /c "npx ngrok http --url=%NGROK_DOMAIN% 4000"

echo.
echo ==============================================================================
echo  [SUCCESS] All Production Services Started!
echo ==============================================================================
echo  1. Production Web Dashboard : http://localhost:3000 (or Vercel Cloud URL)
echo  2. Local Connector          : http://localhost:4000
echo  3. Permanent Cloud Tunnel   : https://%NGROK_DOMAIN%
echo.
echo  Keep the opened windows running in background.
echo ==============================================================================
echo.
pause
