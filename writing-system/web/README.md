# AEGIS Writing - AI 글쓰기 어시스턴트

Claude와 Gemini를 활용한 개인화된 글쓰기 스타일 발전 시스템입니다.

<p align="center">
  <img src="./public/icon.png" alt="AEGIS Writing" width="120" />
</p>

## 🚀 지금 바로 사용하기

### ⚡ 방법 1: 원클릭 Vercel 배포 (가장 쉬움!)

아래 버튼을 클릭하면 **5분 안에** 나만의 AEGIS Writing을 배포할 수 있습니다:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO&project-name=aegis-writing&root-directory=writing-system/web)

> **참고**: 위 버튼을 사용하려면 먼저 이 프로젝트를 GitHub에 업로드해야 합니다.

**Vercel 배포 장점:**
- ✅ 설치 필요 없음
- ✅ 무료 (취미용)
- ✅ HTTPS 자동 적용
- ✅ 전 세계 CDN
- ✅ 자동 업데이트

---

### 🖥️ 방법 2: 로컬 설치 (3단계)

```bash
# 1. 저장소 클론
git clone https://github.com/Project-SS/Aegis-Writing-System.git

# 2. 폴더 이동 후 설치
cd Aegis-Writing-System
npm install

# 3. 실행
npm run dev
```

브라우저에서 **http://localhost:3000** 접속!

---

## ⚙️ 초기 설정 (필수)

1. **설정 페이지** 이동 (사이드바 → 설정)
2. **API 키 입력** (둘 중 하나만 있으면 됨):
   - [Claude API 키 발급](https://console.anthropic.com/settings/keys)
   - [Gemini API 키 발급](https://aistudio.google.com/app/apikey)
3. **저장** 클릭

> 💡 **Gemini API는 무료**로 사용할 수 있습니다!

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 🤖 **AI 글쓰기** | 기획 → 작성 → 검토 → 교정 자동화 |
| 📝 **스타일 가이드** | 나만의 글쓰기 스타일 저장 및 학습 |
| 📊 **성장 리포트** | AI 분석으로 글쓰기 실력 추적 |
| 📚 **아카이브** | 작성한 모든 글 관리 |
| 🔗 **참조 통합** | Confluence, 파일, URL 참조 지원 |

---

## 💾 데이터 저장

모든 데이터는 **브라우저 LocalStorage**에 저장됩니다.
- 서버에 데이터가 저장되지 않음 (프라이버시 보장)
- 설정 페이지에서 백업/복원 가능

---

## 🐳 Docker 배포 (선택)

```bash
docker-compose up -d
```

---

## ❓ 문제 해결

| 문제 | 해결 |
|------|------|
| API 오류 | API 키 확인, 크레딧 확인 |
| 페이지 안 열림 | `rm -rf .next && npm run dev` |
| 포트 충돌 | `npm run dev -- -p 3001` |

---

## 📄 라이선스

MIT License
