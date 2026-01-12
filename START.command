#!/bin/bash

# AEGIS Platform Installer for macOS/Linux
# Double-click this file to run

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

clear
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              AEGIS Platform Installer                        ║"
echo "║                                                              ║"
echo "║          Confluence / Jira Chat Bot + Writing Tool           ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Find the web directory (handle both direct and nested folder structures)
WEB_DIR=""
if [ -f "$SCRIPT_DIR/writing-system/web/package.json" ]; then
    WEB_DIR="$SCRIPT_DIR/writing-system/web"
elif [ -f "$SCRIPT_DIR/../writing-system/web/package.json" ]; then
    WEB_DIR="$SCRIPT_DIR/../writing-system/web"
elif [ -f "$SCRIPT_DIR/Aegis-Writing-System-main/writing-system/web/package.json" ]; then
    WEB_DIR="$SCRIPT_DIR/Aegis-Writing-System-main/writing-system/web"
fi

if [ -z "$WEB_DIR" ]; then
    echo ""
    echo "[오류] writing-system/web 폴더를 찾을 수 없습니다."
    echo ""
    echo "다음 구조로 압축을 해제했는지 확인해주세요:"
    echo ""
    echo "  [압축 해제 폴더]"
    echo "      └── START.command  (이 파일)"
    echo "      └── writing-system"
    echo "          └── web"
    echo "              └── package.json"
    echo ""
    echo "현재 위치: $SCRIPT_DIR"
    echo ""
    read -p "Enter를 눌러 종료..."
    exit 1
fi

echo "   폴더 확인: $WEB_DIR"
echo ""

# Check if Node.js is installed
echo "[1/4] Node.js 확인 중..."
if ! command -v node &> /dev/null; then
    echo ""
    echo "[!] Node.js가 설치되어 있지 않습니다."
    echo ""
    echo "    Node.js를 설치해주세요:"
    echo "    macOS: brew install node"
    echo "    또는: https://nodejs.org/ 에서 다운로드"
    echo ""
    read -p "Enter를 눌러 종료..."
    open "https://nodejs.org/" 2>/dev/null || xdg-open "https://nodejs.org/" 2>/dev/null
    exit 1
fi
echo "   [OK] Node.js $(node -v) 설치됨"

# Check if Python is installed
echo "[2/4] Python 확인 중..."
if ! command -v python3 &> /dev/null; then
    echo ""
    echo "   [!] Python이 설치되어 있지 않습니다."
    echo "       Confluence 동기화 기능을 사용하려면 Python이 필요합니다."
    echo "       나중에 설치해도 됩니다."
    echo ""
else
    echo "   [OK] $(python3 --version) 설치됨"
    echo "       Python requests 패키지 설치 중..."
    pip3 install requests -q 2>/dev/null || pip install requests -q 2>/dev/null
fi

# Navigate to web directory
cd "$WEB_DIR"

# Install npm dependencies if needed
echo "[3/4] 의존성 설치 중... (첫 실행 시 2-3분 소요)"
if [ ! -d "node_modules" ]; then
    echo "   📦 npm 패키지 설치 중..."
    npm install --silent
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ npm 설치 실패. 인터넷 연결을 확인해주세요."
        read -p "Enter를 눌러 종료..."
        exit 1
    fi
else
    echo "   ✅ 의존성이 이미 설치되어 있습니다"
fi

# Start the development server
echo "[4/4] 서버 시작 중..."
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   AEGIS Platform이 시작됩니다!                               ║"
echo "║                                                              ║"
echo "║   브라우저에서 자동으로 열립니다.                            ║"
echo "║   열리지 않으면 아래 주소로 접속하세요:                      ║"
echo "║                                                              ║"
echo "║   --> http://localhost:3000                                  ║"
echo "║                                                              ║"
echo "║   종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Open browser after a delay
(sleep 5 && open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null) &

# Start the server
npm run dev
