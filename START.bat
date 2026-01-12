@echo off
title AEGIS Platform

echo.
echo ================================================================
echo              AEGIS Platform Installer
echo ================================================================
echo.

cd /d "%~dp0"

echo Finding web directory...

:: Direct path
if exist "writing-system\web\package.json" (
    echo Found: writing-system\web
    cd /d "%~dp0writing-system\web"
    goto :run
)

:: Inside subfolder (GitHub ZIP creates this)
for /d %%D in ("%~dp0*") do (
    if exist "%%D\writing-system\web\package.json" (
        echo Found: %%D\writing-system\web
        cd /d "%%D\writing-system\web"
        goto :run
    )
)

:: Not found
echo.
echo ERROR: Cannot find writing-system\web\package.json
echo.
echo Please check folder structure:
echo   - START.bat
echo   - writing-system\
echo       - web\
echo           - package.json
echo.
echo Current location: %~dp0
echo.
echo Contents:
dir /b "%~dp0"
echo.
pause
exit /b 1

:run
echo Current directory: %cd%
echo.

:: Check Node.js
echo [1/4] Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed.
    echo Please install from: https://nodejs.org/
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo       Node.js %%v OK
echo.

:: Check Python
echo [2/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo       Python not found - Confluence sync will not work
    echo       Install later from: https://www.python.org/downloads/
) else (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo       %%v OK
    pip install requests -q 2>nul
)
echo.

:: Install dependencies
echo [3/4] Installing dependencies...
if not exist "node_modules\next" (
    echo       Running npm install... (this may take 2-3 minutes)
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
) else (
    echo       Dependencies already installed
)
echo.

:: Start server
echo [4/4] Starting server...
echo.
echo ================================================================
echo.
echo   AEGIS Platform is starting!
echo.
echo   Browser will open automatically.
echo   If not, go to: http://localhost:3000
echo.
echo   Press Ctrl+C or close this window to stop.
echo.
echo ================================================================
echo.

:: Open browser after delay
start /b cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000"

:: Run server
npm run dev
