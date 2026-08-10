@echo off
TITLE Enable Auto-Start on Windows Boot
COLOR 0B

echo ==============================================================================
echo   JRM HRMS - INSTALL AUTOMATIC STARTUP ON PC BOOT
echo ==============================================================================
echo.

set SCRIPT_DIR=%~dp0
set TARGET_BAT=%SCRIPT_DIR%START_CONNECTOR_AND_TUNNEL.bat
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_VBS=%TEMP%\CreateStartupShortcut.vbs

echo Creating shortcut in Windows Startup directory...
echo Path: %STARTUP_FOLDER%
echo.

:: Create VBS script to generate .lnk shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_VBS%"
echo sLinkFile = "%STARTUP_FOLDER%\JRM_Biometric_AutoStart.lnk" >> "%SHORTCUT_VBS%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_VBS%"
echo oLink.TargetPath = "%TARGET_BAT%" >> "%SHORTCUT_VBS%"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> "%SHORTCUT_VBS%"
echo oLink.WindowStyle = 7 >> "%SHORTCUT_VBS%"
echo oLink.Description = "Auto-start JRM Biometric Connector and Ngrok Tunnel" >> "%SHORTCUT_VBS%"
echo oLink.Save >> "%SHORTCUT_VBS%"

cscript //nologo "%SHORTCUT_VBS%"
del "%SHORTCUT_VBS%"

echo.
echo ==============================================================================
echo  [SUCCESS] Auto-Startup Registered!
echo ==============================================================================
echo  Whenever this computer turns on or restarts, the Biometric Connector
echo  and Ngrok tunnel will automatically launch in the background.
echo ==============================================================================
echo.
pause
