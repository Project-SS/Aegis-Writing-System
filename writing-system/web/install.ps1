# AEGIS Writing - Windows 설치 스크립트
# PowerShell에서 실행: .\install.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AEGIS Writing 설치 스크립트" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Node.js 확인
Write-Host "[1/4] Node.js 확인 중..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion 설치됨" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "  https://nodejs.org 에서 Node.js 18 이상을 설치해주세요." -ForegroundColor Red
    exit 1
}

# npm 확인
Write-Host "[2/4] npm 확인 중..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm $npmVersion 설치됨" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm이 설치되어 있지 않습니다." -ForegroundColor Red
    exit 1
}

# 의존성 설치
Write-Host "[3/4] 의존성 설치 중... (시간이 걸릴 수 있습니다)" -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ 의존성 설치 완료" -ForegroundColor Green
} else {
    Write-Host "  ✗ 의존성 설치 실패" -ForegroundColor Red
    exit 1
}

# 완료
Write-Host "[4/4] 설치 완료!" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  설치가 완료되었습니다!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "실행 방법:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "브라우저에서 http://localhost:3000 으로 접속하세요." -ForegroundColor White
Write-Host ""
Write-Host "초기 설정:" -ForegroundColor White
Write-Host "  1. 설정 페이지에서 Claude 또는 Gemini API 키를 입력하세요." -ForegroundColor Gray
Write-Host "  2. API 키 발급:" -ForegroundColor Gray
Write-Host "     - Claude: https://console.anthropic.com/settings/keys" -ForegroundColor Gray
Write-Host "     - Gemini: https://aistudio.google.com/app/apikey" -ForegroundColor Gray
Write-Host ""

# 서버 실행 여부 확인
$runNow = Read-Host "지금 바로 서버를 실행하시겠습니까? (Y/n)"
if ($runNow -ne "n" -and $runNow -ne "N") {
    Write-Host ""
    Write-Host "서버를 시작합니다... (종료: Ctrl+C)" -ForegroundColor Cyan
    npm run dev
}
