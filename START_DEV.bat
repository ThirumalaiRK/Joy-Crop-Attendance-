@echo off
title Joy Crop Attendance - Dev Server

echo.
echo  ====================================================
echo   Joy Crop Attendance System - Development Startup
echo  ====================================================
echo.

:: Set NODE memory limit to prevent OOM crashes during pnpm install
set NODE_OPTIONS=--max-old-space-size=4096

echo [1/2] Starting Web Dashboard (Next.js on port 3000)...
start "Web Dashboard" cmd /k "cd /d F:\TEST LIVE ATTENDANCE && set NODE_OPTIONS=--max-old-space-size=4096 && pnpm --filter @hrms/web dev"

timeout /t 2 /nobreak > nul

echo [2/2] Starting Connector (Express on port 4000)...
start "Connector" cmd /k "cd /d F:\TEST LIVE ATTENDANCE\apps\connector && set NODE_OPTIONS=--max-old-space-size=4096 && npx ts-node-dev --respawn --exit-child --ignore-watch node_modules src/index.ts"

echo.
echo  Services starting:
echo   Web Dashboard  -> http://localhost:3000/admin
echo   Connector      -> http://localhost:4000/api/status
echo.
echo  Both services opened in separate windows.
echo  Close this window when done.
pause
