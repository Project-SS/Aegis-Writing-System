# 🚀 AEGIS Writing 배포 가이드

## 가장 쉬운 방법: Vercel 배포 (5분)

### Step 1: GitHub 저장소

이미 GitHub에 업로드되어 있습니다:
**https://github.com/Project-SS/Aegis-Writing-System**

### Step 2: Vercel 배포

1. **[Vercel.com](https://vercel.com)** 접속
2. **GitHub로 로그인**
3. **"Add New Project"** 클릭
4. 방금 만든 **저장소 선택**
5. **"Deploy"** 클릭

🎉 **끝!** 몇 분 후 `https://aegis-writing-xxx.vercel.app` 주소로 접속 가능!

---

## 다른 사람에게 공유하기

배포 완료 후:

1. **Vercel 대시보드**에서 프로젝트 URL 복사
2. 친구/동료에게 URL 공유
3. 각자 **자신의 API 키**를 설정 페이지에서 입력

> 💡 각 사용자의 데이터는 **자신의 브라우저**에만 저장되므로 프라이버시가 보장됩니다!

---

## 커스텀 도메인 연결 (선택)

1. Vercel 프로젝트 → **Settings** → **Domains**
2. 원하는 도메인 입력 (예: `writing.mydomain.com`)
3. DNS 설정 안내에 따라 설정

---

## 무료 사용 한도

### Vercel (호스팅)
- ✅ 무료: 월 100GB 대역폭
- ✅ 무료: 무제한 배포

### Gemini API (AI)
- ✅ 무료: 분당 15 요청
- ✅ 무료: 일일 1,500 요청

### Claude API (AI)
- 💰 유료: 사용량 기반 과금
- 약 $0.003 / 1K 토큰 (입력)

---

## 업데이트 방법

코드 수정 후:

```bash
git add .
git commit -m "Update: 변경 내용"
git push
```

Vercel이 자동으로 재배포합니다!
