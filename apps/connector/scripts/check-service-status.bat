@echo off
title HRMS Biometric Service Status Checker
cd /d "%~dp0\.."
cls
echo ================================================================
echo   HRMS Live Biometric Connector - Service Status Check
echo ================================================================
echo.
echo [1] Checking Windows Service State...
sc query "hrmsbiometricconnector.exe" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ℹ️ Trying service name query...
    sc query "HRMS Biometric Connector" 2>nul
)

echo.
echo [2] Checking Live API Health on http://localhost:4000/api/status...
powershell -Command "try { $res = Invoke-RestMethod -Uri 'http://localhost:4000/api/status' -TimeoutSec 3; Write-Host '✅ Connector is LIVE and HEALTHY!' -ForegroundColor Green; Write-Host ('   Service: ' + $res.service); Write-Host ('   Local IP: ' + $res.localIp); Write-Host ('   Connected Devices: ' + $res.tcpConnectedCount); Write-Host ('   RAM Cache: ' + $res.employeeCacheSize + ' employees'); } catch { Write-Host '❌ Connector is OFFLINE or not responding on port 4000.' -ForegroundColor Red; }"

echo.
echo ================================================================
pause
