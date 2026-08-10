@echo off
:: BatchGotAdmin
:-------------------------------------
REM  --> Check for permissions
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo [HRMS Setup] Requesting Administrative Privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params = %*:"=""
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params%", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0\.."
:--------------------------------------

title Install HRMS Biometric Background Service
cls
echo ================================================================
echo   HRMS Live Biometric Connector - Windows Service Installer
echo ================================================================
echo.
echo 1. Building latest TypeScript connector code...
call npm run build

echo.
echo 2. Installing Windows Service (HRMS Biometric Connector)...
node scripts/install-service.js

echo.
echo ================================================================
echo   INSTALLATION COMPLETED!
echo   The service will now run automatically on Windows boot.
echo ================================================================
echo.
pause
