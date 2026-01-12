@echo off
chcp 65001 >nul
title AEGIS Platform Installer

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              AEGIS Platform Installer                        ║
echo ║                                                              ║
echo ║          Confluence / Jira Chat Bot + Writing Tool           ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

:: Find the web directory (handle both direct and nested folder structures)
set "WEB_DIR="
if exist "%SCRIPT_DIR%writing-system\web\package.json" (
    set "WEB_DIR=%SCRIPT_DIR%writing-system\web"
) else if exist "%SCRIPT_DIR%..\writing-system\web\package.json" (
    set "WEB_DIR=%SCRIPT_DIR%..\writing-system\web"
) else if exist "%SCRIPT_DIR%Aegis-Writing-System-main\writing-system\web\package.json" (
    set "WEB_DIR=%SCRIPT_DIR%Aegis-Writing-System-main\writing-system\web"
)

if "%WEB_DIR%"=="" (
    echo.
    echo [오류] writing-system\web 폴더를 찾을 수 없습니다.
    echo.
    echo 다음 구조로 압축을 해제했는지 확인해주세요:
    echo.
    echo   [압축 해제 폴더]
    echo       └── START.bat  (이 파일)
    echo       └── writing-system
    echo           └── web
    echo               └── package.json
    echo.
    echo 현재 위치: %SCRIPT_DIR%
    echo.
    pause
    exit /b 1
)

echo    폴더 확인: %WEB_DIR%
echo.

:: Check if Node.js is installed
echo [1/4] Node.js 확인 중...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Node.js가 설치되어 있지 않습니다.
    echo.
    echo     Node.js를 설치해주세요: https://nodejs.org/
    echo     - "LTS" 버전 다운로드 권장
    echo     - 설치 후 이 파일을 다시 실행해주세요
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo    [OK] Node.js %NODE_VERSION% 설치됨

:: Check if Python is installed
echo [2/4] Python 확인 중...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo    [!] Python이 설치되어 있지 않습니다.
    echo        Confluence 동기화 기능을 사용하려면 Python이 필요합니다.
    echo        나중에 설치해도 됩니다: https://www.python.org/downloads/
    echo.
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo    [OK] %PYTHON_VERSION% 설치됨
    
    :: Install Python requests package
    echo        Python requests 패키지 설치 중...
    pip install requests -q 2>nul
)

:: Navigate to web directory
cd /d "%WEB_DIR%"

:: Install npm dependencies if needed
echo [3/4] 의존성 설치 중... (첫 실행 시 2-3분 소요)
if not exist "node_modules" (
    echo    📦 npm 패키지 설치 중...
    call npm install --silent
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ❌ npm 설치 실패. 인터넷 연결을 확인해주세요.
        pause
        exit /b 1
    )
) else (
    echo    ✅ 의존성이 이미 설치되어 있습니다
)

:: Start the development server
echo [4/4] 서버 시작 중...
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   AEGIS Platform이 시작됩니다!                               ║
echo ║                                                              ║
echo ║   브라우저에서 자동으로 열립니다.                            ║
echo ║   열리지 않으면 아래 주소로 접속하세요:                      ║
echo ║                                                              ║
echo ║   --^> http://localhost:3000                                  ║
echo ║                                                              ║
echo ║   종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.               ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Wait a moment then open browser
start /b cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

:: Start the server
call npm run dev
