#!/bin/bash

# AEGIS Writing - macOS/Linux 설치 스크립트
# 실행: chmod +x install.sh && ./install.sh

echo "========================================"
echo "  AEGIS Writing 설치 스크립트"
echo "========================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Node.js 확인
echo -e "${YELLOW}[1/4] Node.js 확인 중...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}✓ Node.js $NODE_VERSION 설치됨${NC}"
else
    echo -e "  ${RED}✗ Node.js가 설치되어 있지 않습니다.${NC}"
    echo -e "  ${RED}https://nodejs.org 에서 Node.js 18 이상을 설치해주세요.${NC}"
    exit 1
fi

# npm 확인
echo -e "${YELLOW}[2/4] npm 확인 중...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${GREEN}✓ npm $NPM_VERSION 설치됨${NC}"
else
    echo -e "  ${RED}✗ npm이 설치되어 있지 않습니다.${NC}"
    exit 1
fi

# 의존성 설치
echo -e "${YELLOW}[3/4] 의존성 설치 중... (시간이 걸릴 수 있습니다)${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓ 의존성 설치 완료${NC}"
else
    echo -e "  ${RED}✗ 의존성 설치 실패${NC}"
    exit 1
fi

# 완료
echo -e "${YELLOW}[4/4] 설치 완료!${NC}"
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "  ${GREEN}설치가 완료되었습니다!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "실행 방법:"
echo -e "  ${YELLOW}npm run dev${NC}"
echo ""
echo "브라우저에서 http://localhost:3000 으로 접속하세요."
echo ""
echo "초기 설정:"
echo "  1. 설정 페이지에서 Claude 또는 Gemini API 키를 입력하세요."
echo "  2. API 키 발급:"
echo "     - Claude: https://console.anthropic.com/settings/keys"
echo "     - Gemini: https://aistudio.google.com/app/apikey"
echo ""

# 서버 실행 여부 확인
read -p "지금 바로 서버를 실행하시겠습니까? (Y/n) " RUN_NOW
if [ "$RUN_NOW" != "n" ] && [ "$RUN_NOW" != "N" ]; then
    echo ""
    echo -e "${CYAN}서버를 시작합니다... (종료: Ctrl+C)${NC}"
    npm run dev
fi
