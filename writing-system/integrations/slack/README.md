# AEGIS Slack Bot

AEGIS 프로젝트의 Confluence 문서와 Jira 이슈를 검색하고 질문에 답변하는 Slack 챗봇입니다.

## 🚀 기능

- **DM 대화**: 봇에게 직접 메시지를 보내 질문
- **채널 멘션**: 채널에서 `@AEGIS Bot`을 멘션하여 질문
- **슬래시 명령어**: `/aegis [질문]`으로 빠르게 질문
- **Confluence 검색**: 프로젝트 문서 검색 및 요약
- **Jira 연동**: 이슈 조회 및 상태 확인
- **AI 답변**: Claude 또는 Gemini AI를 통한 지능형 답변

## 📋 사전 요구사항

- Node.js 18 이상
- Slack 워크스페이스 관리자 권한 (또는 앱 설치 권한)
- AI API 키 (Claude 또는 Gemini)
- (선택) Jira API 토큰

---

## 🔧 Slack 앱 생성 상세 가이드

### Step 1: Slack API 페이지 접속

1. 브라우저에서 **https://api.slack.com/apps** 접속
2. Slack 계정으로 로그인 (워크스페이스 관리자 계정 권장)

### Step 2: 새 앱 생성

1. 우측 상단의 **"Create New App"** 버튼 클릭

2. **"From scratch"** 선택 (처음부터 만들기)
   - "From an app manifest"는 고급 사용자용

3. 앱 정보 입력:
   ```
   App Name: AEGIS Bot
   Pick a workspace to develop your app in: [워크스페이스 선택]
   ```

4. **"Create App"** 버튼 클릭

### Step 3: 기본 정보 확인 (Basic Information)

앱이 생성되면 **Basic Information** 페이지로 이동합니다.

여기서 **Signing Secret**을 확인하고 저장해두세요:
```
App Credentials 섹션 → Signing Secret → Show → 복사
```

⚠️ **중요**: 이 값은 나중에 `.env` 파일의 `SLACK_SIGNING_SECRET`에 사용됩니다.

### Step 4: Bot Token Scopes 설정

왼쪽 메뉴에서 **"OAuth & Permissions"** 클릭

1. 페이지를 아래로 스크롤하여 **"Scopes"** 섹션 찾기

2. **"Bot Token Scopes"** 아래의 **"Add an OAuth Scope"** 클릭

3. 다음 권한들을 하나씩 추가:

| Scope | 설명 | 용도 |
|-------|------|------|
| `app_mentions:read` | 앱 멘션 읽기 | @AEGIS Bot 멘션 감지 |
| `channels:history` | 공개 채널 메시지 읽기 | 채널 대화 컨텍스트 |
| `chat:write` | 메시지 보내기 | 봇 응답 전송 |
| `groups:history` | 비공개 채널 메시지 읽기 | 비공개 채널 지원 |
| `im:history` | DM 메시지 읽기 | DM 대화 지원 |
| `im:write` | DM 보내기 | DM 응답 전송 |
| `reactions:read` | 리액션 읽기 | 리액션 확인 |
| `reactions:write` | 리액션 추가 | 처리 상태 표시 (👀, ✅) |
| `users:read` | 사용자 정보 읽기 | 사용자 이름 표시 |

### Step 5: Socket Mode 활성화 (권장)

Socket Mode를 사용하면 별도의 서버 URL 없이 봇을 실행할 수 있습니다.

1. 왼쪽 메뉴에서 **"Socket Mode"** 클릭

2. **"Enable Socket Mode"** 토글 ON

3. **App-Level Token 생성** 팝업이 나타남:
   ```
   Token Name: socket-token (또는 원하는 이름)
   ```

4. **"Add Scope"** 클릭 → `connections:write` 선택

5. **"Generate"** 클릭

6. 생성된 토큰 복사 (형식: `xapp-1-...`)

⚠️ **중요**: 이 값은 `.env` 파일의 `SLACK_APP_TOKEN`에 사용됩니다.

### Step 6: Event Subscriptions 설정

1. 왼쪽 메뉴에서 **"Event Subscriptions"** 클릭

2. **"Enable Events"** 토글 ON

3. 아래로 스크롤하여 **"Subscribe to bot events"** 섹션 찾기

4. **"Add Bot User Event"** 클릭하고 다음 이벤트 추가:

| 이벤트 | 설명 |
|--------|------|
| `app_mention` | 누군가 @AEGIS Bot을 멘션했을 때 |
| `message.im` | 봇에게 DM을 보냈을 때 |

5. 페이지 하단의 **"Save Changes"** 클릭

### Step 7: Slash Commands 설정 (선택사항)

슬래시 명령어를 사용하려면:

1. 왼쪽 메뉴에서 **"Slash Commands"** 클릭

2. **"Create New Command"** 클릭

3. 첫 번째 명령어 설정:
   ```
   Command: /aegis
   Short Description: AEGIS Bot에게 질문하기
   Usage Hint: [질문 내용]
   ```
   → **"Save"** 클릭

4. 두 번째 명령어 추가 (선택):
   ```
   Command: /aegis-help
   Short Description: AEGIS Bot 사용 가이드
   Usage Hint: (비워두기)
   ```
   → **"Save"** 클릭

### Step 8: App Home 설정 (선택사항)

봇의 홈 탭과 메시지 탭을 설정합니다.

1. 왼쪽 메뉴에서 **"App Home"** 클릭

2. **"Show Tabs"** 섹션에서:
   - ✅ Messages Tab: 체크 (DM 허용)
   - ✅ "Allow users to send Slash commands and messages from the messages tab": 체크

### Step 9: 워크스페이스에 앱 설치

1. 왼쪽 메뉴에서 **"Install App"** 클릭

2. **"Install to Workspace"** 버튼 클릭

3. 권한 요청 화면에서 **"허용"** 클릭

4. 설치 완료 후 **Bot User OAuth Token** 복사 (형식: `xoxb-...`)

⚠️ **중요**: 이 값은 `.env` 파일의 `SLACK_BOT_TOKEN`에 사용됩니다.

### Step 10: 토큰 정리

지금까지 수집한 3개의 값을 정리합니다:

| 환경 변수 | 값 형식 | 찾는 위치 |
|-----------|---------|-----------|
| `SLACK_BOT_TOKEN` | `xoxb-...` | Install App → Bot User OAuth Token |
| `SLACK_APP_TOKEN` | `xapp-...` | Socket Mode → App-Level Token |
| `SLACK_SIGNING_SECRET` | 영숫자 문자열 | Basic Information → Signing Secret |

---

## 💻 봇 설치 및 실행

### 1. 디렉토리 이동

```bash
cd writing-system/integrations/slack
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`env.example.txt`를 `.env`로 복사:

```bash
# Windows
copy env.example.txt .env

# Mac/Linux
cp env.example.txt .env
```

`.env` 파일을 열어 값 입력:

```env
# ===== Slack 설정 (필수) =====
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# ===== AI 설정 (필수 - 둘 중 하나 선택) =====
AI_PROVIDER=gemini

# Gemini 사용 시
GEMINI_API_KEY=your-gemini-api-key

# Claude 사용 시 (AI_PROVIDER=claude로 변경)
# ANTHROPIC_API_KEY=your-anthropic-api-key

# ===== Jira 설정 (선택) =====
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=AEGIS
```

### 4. 봇 실행

**개발 모드** (코드 변경 시 자동 재시작):
```bash
npm run dev
```

**프로덕션 모드**:
```bash
npm run build
npm start
```

### 5. 실행 확인

성공적으로 실행되면 다음과 같은 메시지가 표시됩니다:

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🤖 AEGIS Slack Bot is running!                          ║
║                                                            ║
║   AI Provider: gemini                                      ║
║   Mode: Socket Mode                                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📖 사용 방법

### 방법 1: DM으로 질문하기

1. Slack 왼쪽 사이드바에서 **"앱"** 섹션 찾기
2. **"AEGIS Bot"** 클릭 (없으면 "앱 추가"에서 검색)
3. 메시지 입력창에 질문 입력
4. Enter 키로 전송

### 방법 2: 채널에서 멘션하기

```
@AEGIS Bot AEGIS 프로젝트 개요 알려줘
```

⚠️ 채널에서 사용하려면 먼저 봇을 채널에 초대해야 합니다:
- 채널에서 `/invite @AEGIS Bot` 입력

### 방법 3: 슬래시 명령어 사용

```
/aegis 진행 중인 버그 이슈 목록
/aegis-help
```

---

## 💡 질문 예시

### Confluence 문서 검색
- "AEGIS 프로젝트의 기술 스택은 무엇인가요?"
- "봇 AI 관련 문서 검색해줘"
- "최근 업데이트된 디자인 문서를 찾아줘"

### Jira 이슈 조회
- "진행 중인 버그 이슈 목록을 보여줘"
- "AEGIS-123 이슈 상태 알려줘"
- "이번 스프린트 일감 목록"

### 복합 질문
- "봇 AI 관련 이슈와 문서를 모두 찾아줘"
- "최근 완료된 작업과 관련 문서"

---

## 🏗️ 프로젝트 구조

```
slack/
├── src/
│   ├── index.ts              # 앱 진입점 (Bolt.js 설정)
│   ├── handlers/
│   │   ├── index.ts          # 핸들러 export
│   │   ├── message.ts        # DM 메시지 핸들러
│   │   ├── mention.ts        # 멘션 이벤트 핸들러
│   │   └── commands.ts       # 슬래시 명령어 핸들러
│   ├── services/
│   │   └── chatbot.ts        # AI 챗봇 서비스
│   ├── types/
│   │   └── index.ts          # TypeScript 타입 정의
│   └── utils/
│       └── formatter.ts      # Slack 메시지 포맷터
├── package.json
├── tsconfig.json
├── env.example.txt
└── README.md
```

---

## 🔄 Confluence 데이터 동기화

Slack 봇은 로컬에 캐시된 Confluence 데이터를 사용합니다.

데이터를 최신화하려면:

**방법 1: 웹 대시보드 사용**
1. 웹 대시보드 접속 (http://localhost:3000)
2. Chat Bot 페이지 이동
3. 우측 사이드바의 "최신화" 버튼 클릭

**방법 2: 명령어 실행**
```bash
cd ../confluence
python sync_confluence.py
```

---

## 🐛 문제 해결

### 봇이 응답하지 않음

1. **환경 변수 확인**: `.env` 파일의 토큰들이 올바른지 확인
2. **Event Subscriptions 확인**: Slack 앱 설정에서 이벤트가 활성화되었는지 확인
3. **채널 초대 확인**: 채널에서 사용 시 봇이 초대되었는지 확인
4. **로그 확인**: 터미널에서 에러 메시지 확인

### "Missing scope" 오류

1. Slack API → 앱 선택 → OAuth & Permissions
2. 필요한 scope가 모두 추가되었는지 확인
3. **"Reinstall to Workspace"** 클릭하여 앱 재설치

### "invalid_auth" 오류

1. Bot Token이 올바른지 확인 (`xoxb-`로 시작)
2. 앱이 워크스페이스에 설치되었는지 확인
3. 토큰을 다시 복사하여 `.env` 파일 업데이트

### Socket Mode 연결 실패

1. App Token이 올바른지 확인 (`xapp-`로 시작)
2. Socket Mode가 활성화되었는지 확인
3. App Token에 `connections:write` scope가 있는지 확인

### AI 응답 오류

1. AI API 키가 올바른지 확인
2. API 사용량 한도를 초과하지 않았는지 확인
3. `AI_PROVIDER` 값과 API 키가 일치하는지 확인

### Jira 연동 오류

1. Jira API 토큰이 유효한지 확인
2. 이메일 주소가 Jira 계정과 일치하는지 확인
3. 프로젝트 키가 올바른지 확인
4. Jira URL 형식 확인 (https://로 시작)

---

## 🔒 보안 참고사항

- `.env` 파일은 절대 Git에 커밋하지 마세요
- API 토큰은 정기적으로 갱신하세요
- 프로덕션 환경에서는 환경 변수를 안전하게 관리하세요

---

## 📝 라이선스

이 프로젝트는 내부 사용 목적으로 개발되었습니다.

## 🤝 기여

버그 리포트나 기능 제안은 이슈를 통해 제출해주세요.
