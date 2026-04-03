# AI Tool 플랫폼 등록 가이드 — AI 코딩 도구용

> **이 문서를 Cursor, Claude Code 등 AI 코딩 도구에 컨텍스트로 전달하세요.**
> AI가 이 가이드를 참고하여 플랫폼 호환성 이슈를 자동으로 수정합니다.

## 플랫폼 개요

이 앱은 사내 **AI Tool Marketplace** 플랫폼에 등록되어 실행됩니다.
플랫폼은 리버스 프록시를 통해 앱에 접근하며, 포트/호스트/환경변수를 자동으로 주입합니다.
아래 규칙을 지키지 않으면 **AI 코드 검수에서 감점**되거나 **기동이 차단**됩니다.

---

## 1. 포트 설정 (Critical — 미준수 시 기동 차단)

### 규칙
- 소스코드에 포트 번호를 **절대 하드코딩하지 마세요**
- 시스템이 `PORT` 환경변수로 배정 포트(8100~8199)를 주입합니다
- `TOOL_PORT`는 `PORT`와 동일한 값입니다 (명시적 참조용)

### 시스템이 자동 주입하는 포트 환경변수

| 환경변수 | 범위 | 용도 |
|---|---|---|
| `PORT` | 8100~8199 | 메인 서버 포트 (필수 사용) |
| `TOOL_PORT` | PORT와 동일 | 명시적 참조용 |
| `SECONDARY_PORT` | 9000~9100 | 보조 서버 포트 (멀티포트 Tool용) |
| `TOOL_SECONDARY_PORT` | SECONDARY_PORT와 동일 | 명시적 참조용 |

### Python 예시

```python
# Flask
import os
port = int(os.environ.get("PORT", 8100))
app.run(host="0.0.0.0", port=port)

# FastAPI + uvicorn
import os, uvicorn
uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8100)))

# Streamlit (start_command에서)
# streamlit run app.py --server.port $PORT --server.address 0.0.0.0

# Gradio
demo.launch(server_name="0.0.0.0", server_port=int(os.environ.get("PORT", 7860)))
```

### Node.js 예시

```javascript
// Express / Hono
const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, "0.0.0.0", () => console.log(`Running on ${port}`));
```

### 잘못된 예 (이렇게 하면 안 됩니다)

```python
# BAD: 하드코딩
app.run(port=8080)
app.run(port=3000)
server.listen(3000)
```

---

## 2. 호스트 바인딩 (Critical — 미준수 시 접근 불가)

### 규칙
- 반드시 `0.0.0.0`에 바인딩하세요
- `localhost` 또는 `127.0.0.1`만 바인딩하면 프록시 서버에서 접근할 수 없습니다

### 체크 대상

| 프레임워크 | 올바른 설정 |
|---|---|
| Flask | `app.run(host="0.0.0.0")` |
| FastAPI/uvicorn | `uvicorn.run(..., host="0.0.0.0")` |
| Express | `app.listen(port, "0.0.0.0")` |
| Vite | `server: { host: '0.0.0.0' }` |
| Next.js | 기본값 OK (0.0.0.0) |

---

## 3. Vite 프로젝트 전용 (Critical — 미준수 시 화면 로드 불가)

### 중요: vite dev가 아닌 vite build + vite preview를 사용하세요

이 플랫폼은 리버스 프록시를 통해 Tool에 접근합니다.
Vite 개발 서버(`vite dev`)는 HMR, `@react-refresh`, 동적 ES module import 등
프록시 환경과 호환되지 않는 기능을 사용하므로 **반드시 프로덕션 빌드 후 preview 서버**를 사용해야 합니다.

시스템이 `vite dev` 감지 시 자동으로 `build + preview`로 전환하지만,
package.json에 명시적으로 설정하는 것을 권장합니다.

### 3-1. package.json scripts (가장 중요)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "start": "vite build && vite preview",
    "preview": "vite preview"
  }
}
```

> **start_command는 `npm start` 또는 `npm run preview`를 사용하세요.**
> `npm run dev`는 개발 서버 전용이며 프록시 환경에서 동작하지 않습니다.

### 3-2. base 경로

```typescript
// vite.config.ts — base는 반드시 '/' 또는 생략
export default defineConfig({
  base: '/',            // ✅ 프록시 호환
  // base: '/MyApp',    // ❌ 에셋 404 발생
})
```

### 3-3. 포트/호스트 설정

```typescript
// vite.config.ts
export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
  },
  preview: {
    host: '0.0.0.0',                                    // ✅ 필수
    port: parseInt(process.env.PORT || '5173'),          // ✅ 환경변수 사용
  },
})
```

### 3-4. HMR 비활성화 (선택)

프록시 환경에서 WebSocket HMR 경고를 없애려면:

```typescript
server: {
  hmr: false,   // 프록시 환경에서 HMR 불필요
}
```

---

## 4. Next.js 프로젝트 전용

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

- `start` 스크립트에 `-p 3000` 같은 포트 하드코딩 금지
- 시스템이 `next dev` / `next start` 감지 시 `-p {배정포트}`를 자동 주입

---

## 5. 멀티포트 (Vite UI + Python API 등)

두 서버를 동시에 실행하는 경우:

| 서버 | 환경변수 | 용도 |
|---|---|---|
| UI (Vite/Next.js) | `PORT` | 메인 포트 (8100~8199) |
| API (FastAPI/Express) | `SECONDARY_PORT` | 보조 포트 (9000~9100) |

### vite.config.ts 프록시 설정

```typescript
export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.SECONDARY_PORT || 9000}`,
        changeOrigin: true,
      },
    },
  },
})
```

### Python API 서버

```python
import os, uvicorn
uvicorn.run("main:app", host="0.0.0.0",
            port=int(os.environ.get("SECONDARY_PORT", 9000)))
```

### start_command (Windows)

```
npm run dev & python api/main.py
```

---

## 6. 환경변수 / 보안 (Critical — 미준수 시 기동 차단)

### 하드코딩 금지 항목

```python
# BAD: 소스코드에 직접 입력
OPENAI_API_KEY = "sk-abc123..."
password = "qwerty1234"
token = "ghp_xxxx"
DATABASE_URL = "postgresql://user:pass@host/db"

# GOOD: 환경변수 참조
api_key = os.environ.get("OPENAI_API_KEY")
password = os.environ.get("DB_PASSWORD")
```

### 자동 제공 환경변수 (코드에서 바로 사용 가능)

| 변수명 | 값 |
|---|---|
| `PORT` | 배정된 메인 포트 |
| `TOOL_PORT` | PORT와 동일 |
| `SECONDARY_PORT` | 배정된 보조 포트 |
| `TOOL_SECONDARY_PORT` | SECONDARY_PORT와 동일 |
| `TOOL_ID` | Tool 시스템 ID |
| `TOOL_NAME` | 등록된 Tool 이름 |
| `OPENAI_API_KEY` | OpenAI GPT API 키 (공용) |
| `CLAUDE_API_KEY` | Anthropic Claude API 키 (공용) |

### .env 파일

- `.env` 파일에 실제 민감 값을 넣고 Git에 push하면 **AI 검수 Warning**
- `.gitignore`에 `.env`를 반드시 추가
- 환경변수는 플랫폼 등록 폼에서 별도 입력

---

## 7. 의존성 파일 (Critical — 없으면 기동 불가)

| 언어 | 필수 파일 |
|---|---|
| Python | `requirements.txt` 또는 `pyproject.toml` |
| Node.js | `package.json` |

- 시스템이 기동 전에 자동으로 `pip install` / `npm install` 실행
- 파일이 없으면 AI 검수에서 **Critical** 판정

---

## 8. AI 검수 채점 기준

| 등급 | 감점 | 항목 |
|---|---|---|
| **Critical** (-40점, 기동 차단) | 보안 키 하드코딩, 포트 하드코딩, 의존성 파일 누락 |
| **Warning** (-10점) | .env 커밋, 위험한 exec/eval, Vite base 하드코딩, 외부 데이터 전송 |
| **Info** (-3점) | 에러 핸들링 부재, debug=True, localhost 하드코딩, Vite 포트 하드코딩 |

- 기본점수 100점, 70점 이상이면 통과
- Critical 1건이라도 있으면 점수 무관 **불통과**

---

## 9. 최종 체크리스트

AI 코딩 도구에게 아래 항목을 확인하도록 요청하세요:

- [ ] 포트 번호가 `PORT` 환경변수를 참조하는가 (하드코딩 없는가)
- [ ] 서버가 `0.0.0.0`에 바인딩되는가 (`localhost` 아닌가)
- [ ] Vite 사용 시 `base: '/'` 인가 (다른 경로 하드코딩 없는가)
- [ ] Vite `server.host`가 `'0.0.0.0'`인가
- [ ] API 키, 비밀번호 등이 소스코드에 직접 적혀있지 않은가
- [ ] `.env` 파일이 `.gitignore`에 등록되어 있는가
- [ ] `requirements.txt` 또는 `package.json`이 존재하는가
- [ ] `package.json`에 `start` 스크립트가 있는가 (없으면 `dev` 폴백)
- [ ] 멀티포트 시 API 서버가 `SECONDARY_PORT`를 참조하는가

---

## 10. AI 도구에게 전달할 프롬프트 예시

```
이 프로젝트를 사내 AI Tool 플랫폼에 등록하려고 합니다.
첨부한 ai-tool-platform-guide.md의 규칙에 따라 코드를 검토하고 수정해주세요.

특히:
1. 포트가 PORT 환경변수를 사용하는지 확인
2. 서버가 0.0.0.0에 바인딩되는지 확인
3. Vite base가 '/'인지 확인
4. API 키 등 민감 정보가 하드코딩되어 있지 않은지 확인
5. 필요한 수정사항을 모두 적용해주세요
```
