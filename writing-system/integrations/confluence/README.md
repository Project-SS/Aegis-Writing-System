# Confluence AEGIS Space Integration

AEGIS 스페이스의 문서를 글쓰기 시스템에서 참조할 수 있도록 연동합니다.

---

## 🌐 웹 버전 사용자 (권장)

웹 버전을 사용하는 경우, 별도의 환경 변수 설정 없이 웹 UI에서 직접 인증 정보를 설정할 수 있습니다.

### 빠른 시작

1. **웹 애플리케이션 접속**
   ```
   http://localhost:3000
   ```

2. **설정 페이지로 이동**
   - 메인 페이지 우측 상단의 ⚙️ **Settings** 버튼 클릭
   - 또는 직접 `http://localhost:3000/settings` 접속

3. **Confluence 인증 설정**
   - **Base URL**: `https://krafton.atlassian.net` (기본값)
   - **Email**: 본인의 Atlassian 계정 이메일
   - **API Token**: Atlassian에서 발급받은 API 토큰

4. **Jira 인증 설정** (선택사항)
   - Confluence와 동일한 인증 정보 사용 시 "Confluence에서 복사" 버튼 클릭
   - **Base URL**: `https://krafton.atlassian.net` (기본값)

5. **저장**
   - 각 섹션의 "저장" 버튼 클릭
   - 설정은 브라우저 LocalStorage에 안전하게 저장됩니다

### API 토큰 발급 방법

1. [Atlassian API 토큰 관리](https://id.atlassian.com/manage-profile/security/api-tokens) 접속
2. "Create API token" 클릭
3. 토큰 이름 입력 (예: "AEGIS Chatbot")
4. 생성된 토큰 복사하여 설정 페이지에 입력

### Confluence 문서 동기화

1. **Chat Bot 페이지 접속**: `http://localhost:3000/chatbot`
2. **동기화 버튼 클릭**: 우측 상단의 🔄 버튼 클릭
3. **동기화 완료 대기**: 문서 수에 따라 1~5분 소요

> ⚠️ **참고**: 첫 동기화 시 Python과 `requests` 패키지가 필요합니다.
> ```bash
> pip install requests
> ```

### 사용 예시

동기화 완료 후 Chat Bot에서 다음과 같이 질문할 수 있습니다:

- "봇의 사격 판단에 대해 알려줘"
- "컨플루언스에서 AI 관련 문서 찾아줘"
- "지라에서 뱅가드 관련 일감 찾아줘"
- "현재 스프린트 정보 알려줘"

---

## 🖥️ CLI 버전 사용자 (개발자용)

터미널에서 직접 스크립트를 실행하려는 경우 아래 설정을 따르세요.

## 설정 방법

### 1. API 토큰 발급

1. [Atlassian API 토큰 관리](https://id.atlassian.com/manage-profile/security/api-tokens) 접속
2. "Create API token" 클릭
3. 토큰 이름 입력 (예: "Writing System")
4. 생성된 토큰 복사

### 2. 환경 변수 설정

**PowerShell (현재 세션):**
```powershell
$env:CONFLUENCE_EMAIL = "your-email@krafton.com"
$env:CONFLUENCE_API_TOKEN = "your-api-token-here"
```

**PowerShell (영구 설정):**
```powershell
[System.Environment]::SetEnvironmentVariable("CONFLUENCE_EMAIL", "your-email@krafton.com", "User")
[System.Environment]::SetEnvironmentVariable("CONFLUENCE_API_TOKEN", "your-api-token-here", "User")
```

**Git Bash / WSL:**
```bash
export CONFLUENCE_EMAIL="your-email@krafton.com"
export CONFLUENCE_API_TOKEN="your-api-token-here"
```

### 3. Python 의존성 설치

```bash
pip install requests
```

## 사용 방법

### 문서 목록 가져오기

```bash
cd integrations/confluence
python sync_confluence.py --fetch
```

### 전체 동기화

```bash
python sync_confluence.py --sync
```

모든 문서가 `cache/` 폴더에 마크다운 파일로 저장됩니다.

### 캐시된 문서 목록 보기

```bash
python sync_confluence.py --list
```

### 문서 검색

```bash
python sync_confluence.py --search "검색어"
```

## 파일 구조

```
integrations/confluence/
├── confluence_config.json   # 설정 파일
├── sync_confluence.py       # 동기화 스크립트
├── README.md               # 이 파일
└── cache/                  # 동기화된 문서 캐시
    ├── page_index.json     # 페이지 인덱스
    └── [페이지ID]_[제목].md  # 각 페이지 내용
```

## Claude/Gemini에서 사용

### 자동 참조

글쓰기 요청 시 다음과 같이 말하면 AEGIS 문서를 참조합니다:

- "AEGIS 문서 참고해서 글 써줘"
- "내부 자료 기반으로 작성해줘"
- "컨플루언스에서 관련 자료 찾아서"

### 수동 참조

특정 문서를 직접 참조하려면:

```
integrations/confluence/cache/page_index.json 파일에서 
[문서제목] 찾아서 내용 보여줘
```

## 주의사항

### 보안
- API 토큰은 절대 코드에 직접 입력하지 마세요
- `.gitignore`에 `cache/` 폴더가 포함되어 있는지 확인하세요
- 환경 변수로만 인증 정보를 관리하세요

### 기밀 정보
- 동기화된 문서에는 내부 기밀 정보가 포함될 수 있습니다
- 외부 공개 글 작성 시 기밀 정보가 포함되지 않도록 주의하세요
- AI가 자동으로 필터링하지만, 최종 검토는 사용자가 해야 합니다

### 캐시 관리
- 캐시는 24시간마다 갱신하는 것을 권장합니다
- 중요한 문서 업데이트 후에는 수동으로 `--sync` 실행

## 문제 해결

### 인증 오류
```
❌ 인증 오류: 환경 변수를 설정해주세요
```
→ 환경 변수가 올바르게 설정되었는지 확인

### API 오류 (401)
```
❌ API 오류: 401 Unauthorized
```
→ API 토큰이 만료되었거나 잘못됨. 새 토큰 발급 필요

### API 오류 (403)
```
❌ API 오류: 403 Forbidden
```
→ AEGIS 스페이스 접근 권한이 없음. 관리자에게 권한 요청

## AEGIS 스페이스 정보

- **URL**: https://krafton.atlassian.net/wiki/spaces/AEGIS/overview
- **Space Key**: AEGIS
- **Homepage ID**: 736988863
