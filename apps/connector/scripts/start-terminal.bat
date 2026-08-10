@echo off
title HRMS Live Biometric Connector
cd /d "%~dp0\.."
echo ===================================================
echo   HRMS Live Biometric TCP Connector Gateway
echo   Target Device : 192.168.1.56:4370 (ZKTeco)
echo   Local Port    : 4000
echo ===================================================
echo.
node dist/index.js
pause
