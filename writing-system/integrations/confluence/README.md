# Confluence AEGIS Space Integration

AEGIS 스페이스의 문서를 글쓰기 시스템에서 참조할 수 있도록 연동합니다.

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
