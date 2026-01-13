# AEGIS Platform - 종합 가이드

AEGIS 게임 개발 프로젝트의 통합 도구 플랫폼입니다. AI 글쓰기 어시스턴트와 Confluence/Jira 연동 챗봇을 제공합니다.

---

## 목차

1. [시스템 개요](#1-시스템-개요)
   - [핵심 개념](#11-핵심-개념)
   - [시스템 아키텍처](#12-시스템-아키텍처)
   - [에이전트 소개](#13-에이전트-소개)
   - [지원 CLI](#14-지원-cli)
   - [주요 기능](#15-주요-기능)
   - [기술 스택](#16-기술-스택)
2. [설치 방법](#2-설치-방법)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [워크플로우](#4-워크플로우)
5. [사용 방법](#5-사용-방법)
6. [Confluence 연동](#6-confluence-연동)
7. [커스터마이징](#7-커스터마이징)
8. [문제 해결](#8-문제-해결)
9. [AEGIS Web Platform](#9-aegis-web-platform)
   - [플랫폼 개요](#91-플랫폼-개요)
   - [설치 및 실행](#92-설치-및-실행)
   - [AEGIS Chat Bot](#93-aegis-chat-bot)
   - [개인 설정](#94-개인-설정)

---

## 1. 시스템 개요

### 1.1 핵심 개념

#### 왜 서브에이전트 시스템인가? (단일 LLM 대비 장점)

| 항목 | 단일 LLM | AEGIS Writing (서브에이전트) |
|------|----------|------------------------------|
| **품질 일관성** | ⭐⭐ 프롬프트마다 다름 | ⭐⭐⭐⭐⭐ 검토 에이전트가 점수 평가 |
| **스타일 유지** | ⭐⭐ 브랜드 보이스 유지 어려움 | ⭐⭐⭐⭐⭐ 스타일 가이드 기반 일관성 |
| **학습/개선** | ⭐ 매번 새로 시작 | ⭐⭐⭐⭐⭐ 피드백이 스타일 가이드에 반영 |
| **수정 용이성** | ⭐⭐ 전체 재작성 필요 | ⭐⭐⭐⭐ 단계별 부분 수정 가능 |
| **품질 검증** | ⭐ 검증 없음 | ⭐⭐⭐⭐⭐ 80점 이상 통과 기준 |

**핵심 차별점:**

1. **전문화된 에이전트 분업**
   - 단일 LLM: "글 써줘" → 바로 결과물
   - AEGIS: 기획 → 스타일 분석 → 작성 → 검토 → 교정 → 학습

2. **누적 학습 시스템**
   ```
   글 작성 → 피드백 "이 표현 좋아요" 
                       ↓
            스타일 가이드에 자동 추가
                       ↓
            다음 글에서 해당 스타일 적용
   ```

3. **품질 보장 메커니즘**
   - 검토 에이전트가 100점 만점으로 채점
   - 80점 미만 시 자동 재작성
   - Hook 효과성, 구조 완성도, CTA 명확성 등 다각도 평가

4. **다중 스타일 프로필 관리**
   ```
   📁 스타일 프로필
   ├── 기술 블로그 스타일
   ├── LinkedIn 전문가 스타일
   ├── 캐주얼 뉴스레터 스타일
   └── 공식 보고서 스타일
   ```

5. **성장 추적**
   - 모든 글 아카이브 저장
   - 평균 점수 변화 추적
   - AI 성장 분석 리포트 제공

**결론:**
- **단일 LLM**: 빠르게 한 번 쓰고 끝날 때 적합
- **AEGIS Writing**: 지속적으로 글을 쓰고, 일관된 브랜드 보이스가 필요하며, 글쓰기 실력을 발전시키고 싶은 사람에게 적합

---

#### 서브에이전트 시스템이란?

**서브에이전트 시스템**은 하나의 복잡한 작업을 여러 전문화된 AI 에이전트가 분업하여 처리하는 아키텍처입니다. 마치 회사에서 기획자, 작가, 편집자, 교정자가 협업하여 콘텐츠를 만드는 것처럼, AI 에이전트들이 각자의 전문 영역에서 역할을 수행합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    전통적인 단일 AI 접근                          │
│                                                                 │
│   사용자 ──────────────────────────────────────────► AI         │
│            "글 써줘"                      "여기 글이요"          │
│                                                                 │
│   문제점: 품질 불균일, 스타일 불일치, 학습 불가                    │
└─────────────────────────────────────────────────────────────────┘

                              VS

┌─────────────────────────────────────────────────────────────────┐
│                    서브에이전트 시스템 접근                        │
│                                                                 │
│   사용자 ──► Orchestrator ──┬──► Strategist (기획)              │
│                            ├──► Style Analyzer (스타일)         │
│                            ├──► Content Writer (작성)           │
│                            ├──► Content Reviewer (검토)         │
│                            ├──► Proofreader (교정)              │
│                            └──► Style Learner (학습)            │
│                                                                 │
│   장점: 전문화, 품질 보장, 누적 학습, 일관된 스타일                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 핵심 설계 원칙

| 원칙 | 설명 |
|------|------|
| **전문화 (Specialization)** | 각 에이전트는 하나의 역할에 집중 |
| **파이프라인 (Pipeline)** | 단계별 순차 처리로 품질 누적 |
| **품질 게이트 (Quality Gate)** | 기준 미달 시 이전 단계로 회귀 |
| **파일 기반 상태 (File-based State)** | 모든 중간 결과물을 파일로 저장 |
| **누적 학습 (Cumulative Learning)** | 피드백이 스타일 가이드에 반영 |

### 1.2 시스템 아키텍처

#### 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Writing System                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      CLI Layer (진입점)                          │   │
│  │  ┌─────────────────┐         ┌─────────────────┐                │   │
│  │  │   Claude Code   │         │   Gemini CLI    │                │   │
│  │  │ .claude/skills/ │         │   GEMINI.md     │                │   │
│  │  └────────┬────────┘         └────────┬────────┘                │   │
│  └───────────┼───────────────────────────┼─────────────────────────┘   │
│              │                           │                              │
│              └───────────┬───────────────┘                              │
│                          ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Orchestrator (조율자)                         │   │
│  │                                                                  │   │
│  │   • 워크플로우 관리        • 에이전트 호출 순서 결정              │   │
│  │   • 사용자 상호작용        • 품질 게이트 판단                     │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│              ┌──────────────────┼──────────────────┐                    │
│              ▼                  ▼                  ▼                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   Phase 0-1     │  │   Phase 2-4     │  │   Phase 5-6     │         │
│  │                 │  │                 │  │                 │         │
│  │ • Confluence    │  │ • Style         │  │ • Proofreader   │         │
│  │   Reader        │  │   Analyzer      │  │ • Style         │         │
│  │ • Strategist    │  │ • Content       │  │   Learner       │         │
│  │                 │  │   Writer        │  │                 │         │
│  │                 │  │ • Content       │  │                 │         │
│  │                 │  │   Reviewer      │  │                 │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
│           └────────────────────┼────────────────────┘                   │
│                                ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Data Layer (데이터)                         │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │ style_guide  │  │ current_     │  │ feedback_    │           │   │
│  │  │    .md       │  │ draft.md     │  │ log.md       │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │ current_     │  │ final_       │  │ growth_      │           │   │
│  │  │ strategy.md  │  │ content.md   │  │ report.md    │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  Integration Layer (외부 연동)                   │   │
│  │                                                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │              Confluence Integration                       │   │   │
│  │  │                                                           │   │   │
│  │  │   OAuth 2.0 ──► Atlassian API ──► cache/ (1,858 pages)   │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 에이전트 상세 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Agent Architecture                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  각 에이전트는 Markdown 파일로 정의됨 (.claude/skills/*.md)              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Agent Definition (예: content_writer.md)                       │   │
│  │                                                                  │   │
│  │  # Content Writer                                                │   │
│  │                                                                  │   │
│  │  ## 역할 (Role)                                                  │   │
│  │  - 에이전트의 정체성과 책임 정의                                   │   │
│  │                                                                  │   │
│  │  ## 입력 (Input)                                                 │   │
│  │  - 필요한 파일: current_strategy.md, style_guide.md              │   │
│  │                                                                  │   │
│  │  ## 프로세스 (Process)                                           │   │
│  │  - 단계별 작업 지침                                               │   │
│  │                                                                  │   │
│  │  ## 출력 (Output)                                                │   │
│  │  - 생성할 파일: current_draft.md                                  │   │
│  │                                                                  │   │
│  │  ## 트리거 (Trigger)                                             │   │
│  │  - 활성화 조건                                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 데이터 흐름

```
사용자 요청
    │
    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Confluence  │────►│ reference_  │────►│ Strategist  │
│ Reader      │     │ notes.md    │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ current_    │
                                        │ strategy.md │
                                        └──────┬──────┘
                                               │
┌─────────────┐     ┌─────────────┐            │
│ style_      │────►│ Style       │◄───────────┘
│ guide.md    │     │ Analyzer    │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Content     │
                    │ Writer      │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ current_    │
                    │ draft.md    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐     80점 미만
                    │ Content     │─────────────┐
                    │ Reviewer    │             │
                    └──────┬──────┘             │
                           │ 80점 이상          │
                           ▼                    │
                    ┌─────────────┐             │
                    │ Proofreader │             │
                    └──────┬──────┘             │
                           │                    │
                           ▼                    │
                    ┌─────────────┐             │
                    │ final_      │             │
                    │ content.md  │◄────────────┘
                    └──────┬──────┘    (재작성)
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ Style       │────►│ style_      │
                    │ Learner     │     │ guide.md    │
                    └─────────────┘     │ (업데이트)   │
                           │            └─────────────┘
                           ▼
                    ┌─────────────┐
                    │ feedback_   │
                    │ log.md      │
                    └─────────────┘
```

### 1.3 에이전트 소개

이 시스템은 **8개의 전문 AI 에이전트**를 조율하여 고품질 글쓰기 콘텐츠를 생산합니다.

| 에이전트 | 역할 | 입력 | 출력 |
|----------|------|------|------|
| **Orchestrator** | 전체 워크플로우 조율 및 관리 | 사용자 요청 | 에이전트 호출 |
| **Confluence Reader** | 내부 문서 참조 및 자료 수집 | 검색 키워드 | reference_notes.md |
| **Strategist** | 콘텐츠 전략 기획 | 주제, 참조 자료 | current_strategy.md |
| **Style Analyzer** | 스타일 가이드 분석 및 적용 | style_guide.md | 스타일 포인트 |
| **Content Writer** | 초안 작성 | 전략, 스타일 | current_draft.md |
| **Content Reviewer** | 품질 검토 및 채점 (100점 만점) | 초안 | 점수, 피드백 |
| **Proofreader** | 맞춤법/문법 최종 교정 | 검토된 초안 | final_content.md |
| **Style Learner** | 피드백 학습 및 성장 리포트 | 피드백 | style_guide.md 업데이트 |

### 1.4 지원 CLI

| CLI | 제공사 | 스킬 인식 방식 |
|-----|--------|---------------|
| **Claude Code** | Anthropic | `.claude/skills/` 폴더 자동 인식 |
| **Gemini CLI** | Google | `GEMINI.md` 파일 참조 |

### 1.5 주요 기능

- ✅ **6단계 체계적 글쓰기 워크플로우** - 기획부터 교정까지
- ✅ **품질 게이트** - 80점 이상 통과 시에만 다음 단계 진행
- ✅ **빠른 모드** - Phase 1, 3, 5만 실행 (검토 생략)
- ✅ **누적 학습** - 피드백이 스타일 가이드에 자동 반영
- ✅ **성장 리포트** - 통계 및 개선 포인트 추적
- ✅ **Confluence 연동** - 1,858개 내부 문서 참조 가능

### 1.6 기술 스택

| 구성 요소 | 기술 |
|-----------|------|
| 에이전트 정의 | Markdown (Claude Skills) |
| CLI | Claude Code, Gemini CLI |
| 데이터 저장 | 파일 시스템 (Markdown, JSON) |
| 외부 연동 | Python + OAuth 2.0 (Confluence) |
| 버전 관리 | Git (.gitignore 설정됨) |

---

## 2. 설치 방법

### 2.1 Claude Code 설치

```powershell
# Claude Code 설치
npm install -g @anthropic-ai/claude-code

# 버전 확인
claude --version
```

**Windows 요구사항**: Git Bash 필요
```powershell
# Git 설치 (Git Bash 포함)
winget install --id Git.Git -e --source winget
```

### 2.2 Gemini CLI 설치

```powershell
# Gemini CLI 설치
npm install -g @google/gemini-cli

# 버전 확인
gemini --version
```

### 2.3 Python 의존성 (Confluence 연동용)

```powershell
pip install requests
```

---

---

## 🌐 웹 버전 사용자 (권장)

웹 버전을 사용하는 경우, 별도의 환경 변수 설정 없이 웹 UI에서 직접 인증 정보를 설정할 수 있습니다.

### 📦 다운로드 및 설치 (3단계)

#### Step 1: 다운로드

1. [📥 GitHub에서 다운로드](https://github.com/Project-SS/Aegis-Writing-System/archive/refs/heads/main.zip) 클릭
2. 또는 [GitHub 저장소](https://github.com/Project-SS/Aegis-Writing-System) → 녹색 **Code** 버튼 → **Download ZIP**

#### Step 2: 압축 해제

다운로드된 `Aegis-Writing-System-main.zip` 파일을 원하는 위치에 압축 해제

#### Step 3: 실행 🚀

**Windows:**
```
📁 Aegis-Writing-System-main
   └── 🖱️ START.bat 더블클릭!
```

**macOS:**
```
📁 Aegis-Writing-System-main
   └── 🖱️ START.command 더블클릭!
```

> 💡 **첫 실행 시** Node.js가 없으면 설치 페이지가 자동으로 열립니다.
> Node.js 설치 후 다시 실행하면 됩니다.

---

### ⚡ 원클릭 실행 후 진행 과정

```
[1/4] Node.js 확인 중...     ✅
[2/4] Python 확인 중...      ✅ (선택사항)
[3/4] 의존성 설치 중...      📦 (첫 실행 시 2-3분)
[4/4] 서버 시작 중...        🚀

👉 http://localhost:3000 자동으로 열림!
```

---

### 🔧 수동 설치 (개발자용)

<details>
<summary>클릭하여 펼치기</summary>

#### 사전 요구사항

- **Node.js** 18.0 이상 ([다운로드](https://nodejs.org/))
- **Python** 3.8 이상 ([다운로드](https://www.python.org/downloads/)) - 선택사항

#### Git Clone

```bash
git clone https://github.com/Project-SS/Aegis-Writing-System.git
cd Aegis-Writing-System
```

#### Windows 설치

```powershell
cd writing-system\web
npm install
pip install requests
npm run dev
```

#### macOS / Linux 설치

```bash
cd writing-system/web
npm install
pip install requests
npm run dev
```

</details>

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

## 3. 프로젝트 구조

```
writing-system/
│
├── .claude/
│   └── skills/                    # Claude Code 스킬 파일
│       ├── orchestrator.md        # 메인 오케스트레이터
│       ├── confluence_reader.md   # Confluence 문서 참조
│       ├── strategist.md          # 전략 기획
│       ├── style_analyzer.md      # 스타일 분석
│       ├── content_writer.md      # 콘텐츠 작성
│       ├── content_reviewer.md    # 품질 검토
│       ├── proofreader.md         # 최종 교정
│       └── style_learner.md       # 학습 및 리포트
│
├── .gemini/
│   └── styles/                    # Gemini 추가 스타일 (확장용)
│
├── data/
│   ├── style_guide.md             # 스타일 가이드 (자동 업데이트)
│   ├── feedback_log.md            # 피드백 누적 로그
│   ├── growth_report.md           # 성장 리포트
│   ├── current_strategy.md        # 현재 기획안
│   ├── current_draft.md           # 현재 초안
│   ├── final_content.md           # 최종 콘텐츠
│   ├── references/                # 참조 자료 (수동 저장)
│   │   └── README.md
│   └── archive/                   # 완성 콘텐츠 보관
│
├── integrations/
│   └── confluence/                # Confluence 연동
│       ├── confluence_config.json
│       ├── sync_confluence.py
│       ├── test_connection.py
│       ├── README.md
│       └── cache/                 # 동기화된 문서 캐시
│
├── GEMINI.md                      # Gemini CLI 시스템 지시사항
├── GUIDE.md                       # 이 가이드 문서
├── README.md                      # 프로젝트 소개
└── .gitignore                     # Git 제외 설정
```

---

## 4. 워크플로우

### 4.1 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자: 글쓰기 요청                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 0: 자료 수집 (선택적)                                  │
│  - Confluence/참조 문서에서 관련 자료 검색                     │
│  - data/reference_notes.md에 정리                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 전략 수립                                          │
│  - 주제 분석, 타겟 독자 정의                                   │
│  - Hook 후보 3가지 제시                                       │
│  - data/current_strategy.md 저장                             │
│  - 👤 사용자 승인 대기                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 스타일 분석                                        │
│  - data/style_guide.md 로드                                  │
│  - 기획안에 맞는 스타일 포인트 추출                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 초안 작성                                          │
│  - 기획안 + 스타일 가이드 조합                                 │
│  - data/current_draft.md 저장                                │
│  - 👤 사용자 확인                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: 품질 검토                                          │
│  - 100점 만점 채점                                           │
│  - 80점 미만 → Phase 3로 돌아가 재작성                        │
│  - 80점 이상 → 다음 단계 진행                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: 최종 교정                                          │
│  - 맞춤법, 문법, 가독성 점검                                   │
│  - data/final_content.md 저장                                │
│  - 👤 사용자에게 최종본 제시                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 6: 학습 및 개선                                       │
│  - 사용자 피드백 수집                                         │
│  - data/feedback_log.md 업데이트                             │
│  - data/style_guide.md 자동 개선                             │
│  - data/growth_report.md 업데이트                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 채점 기준 (100점 만점)

| 카테고리 | 배점 | 세부 항목 |
|----------|------|-----------|
| **스타일 일치성** | 50점 | 문체 일관성 (15), 문장 길이 (15), 금지 표현 미사용 (20) |
| **기획 구현도** | 30점 | Hook 효과성 (10), Value 전달력 (10), CTA 명확성 (10) |
| **독자 경험** | 20점 | 가독성 (10), 논리 흐름 (10) |

### 4.3 합격 기준

| 점수 | 판정 | 액션 |
|------|------|------|
| 90-100 | 우수 | 즉시 Proofreader로 |
| 80-89 | 합격 | Proofreader로 진행 |
| 70-79 | 조건부 | 1회 수정 후 재검토 |
| 60-69 | 불합격 | 주요 수정 필요 |
| 60 미만 | 재작성 | 전면 재작성 권고 |

---

## 5. 사용 방법

### 5.1 기본 실행

#### Claude Code

```powershell
cd D:\PilotProject\AgentWriting\writing-system
claude
```

#### Gemini CLI

```powershell
cd D:\PilotProject\AgentWriting\writing-system
gemini
```

### 5.2 글쓰기 시작

CLI 실행 후 다음과 같이 입력:

| 명령어 | 설명 |
|--------|------|
| `링크드인 글 써줘` | 기본 워크플로우 시작 |
| `콘텐츠 작성해줘` | 기본 워크플로우 시작 |
| `포스트 만들어줘` | 기본 워크플로우 시작 |
| `[주제]에 대한 글 써줘` | 특정 주제로 시작 |
| `빠른 모드로 써줘` | Phase 1, 3, 5만 실행 |

### 5.3 참조 자료 활용

```
"data/references 폴더의 문서 참고해서 글 써줘"
"AEGIS 프로젝트 경험에 대한 글 써줘. 참조 자료 활용해줘"
"내부 자료 기반으로 기술 도전 글 작성해줘"
```

### 5.4 피드백 및 학습

| 명령어 | 기능 |
|--------|------|
| `이 표현 좋아` / `마음에 들어` | 긍정 피드백 기록 |
| `이건 별로야` / `마음에 안 들어` | 부정 피드백 기록 |
| `내 성장 보여줘` / `리포트` | 성장 리포트 확인 |
| `스타일 가이드 보여줘` | 현재 스타일 가이드 확인 |
| `피드백 기록 보여줘` | 피드백 로그 확인 |

### 5.5 예시 대화

```
사용자: 개발자 번아웃에 대한 링크드인 글 써줘

AI: [Phase 1: 전략 수립]
    
    📋 콘텐츠 기획안
    
    ## 주제
    개발자 번아웃 극복 경험
    
    ## 타겟 독자
    - 주요 타겟: 3-7년차 개발자
    - Pain point: 업무 과부하, 성장 정체감
    
    ## Hook 후보
    1. "퇴사 버튼에 손이 갔던 그 날, 나는 대신 이것을 했습니다."
    2. "6개월간 야근만 하다가 깨달은 것이 있습니다."
    3. "개발자 10명 중 7명이 번아웃을 경험합니다."
    
    이 기획안으로 진행할까요?

사용자: 2번 Hook으로 진행해줘

AI: [Phase 2-3: 스타일 분석 & 초안 작성]
    ...
```

---

## 6. Confluence 연동

### 6.1 현재 상황

KRAFTON Atlassian Cloud는 **SSO(Atlassian Access)**가 활성화되어 있어 API 토큰 방식이 제한됩니다.
현재 **OAuth 2.0 연동이 완료**되어 AEGIS 스페이스의 1,858개 문서가 동기화되었습니다.

| 방식 | 가능 여부 | 비고 |
|------|----------|------|
| API 토큰 | ❌ 불가 | SSO 환경에서 차단 |
| **OAuth 2.0** | ✅ 설정됨 | 현재 사용 중 |
| 수동 복사 | ✅ 가능 | 백업 방식 |

### 6.2 수동 참조 방식 (권장)

#### Step 1: Confluence에서 문서 복사

1. 브라우저에서 AEGIS 스페이스 접속 (SSO 로그인)
2. 참고할 페이지 열기
3. **Ctrl+A** (전체 선택) → **Ctrl+C** (복사)

#### Step 2: 로컬에 저장

```powershell
# 새 파일 생성
code data/references/aegis_[주제].md
```

파일에 붙여넣기 (Ctrl+V) 후 저장

#### Step 3: 글쓰기 시 활용

```
"data/references 폴더의 AEGIS 문서 참고해서 글 써줘"
```

### 6.3 권장 참조 문서 구조

```
data/references/
├── aegis_프로젝트_개요.md      # 프로젝트 소개
├── aegis_기술_스택.md          # 사용 기술
├── aegis_도전과_해결.md        # 기술적 도전
├── aegis_팀_회고.md            # 회고록
└── aegis_성과_지표.md          # 성과/KPI
```

### 6.4 OAuth 2.0 연동 (현재 설정됨)

SSO 환경에서 OAuth 2.0 앱을 통해 Confluence API에 접근합니다.

#### 현재 동기화 상태

| 항목 | 값 |
|------|-----|
| 스페이스 | AEGIS |
| 동기화된 페이지 | **1,858개** |
| 캐시 위치 | `integrations/confluence/cache/` |
| 인덱스 파일 | `confluence_index.json` |

#### Step 1: OAuth 앱 생성 (최초 1회)

1. [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) 접속
2. **Create** → **OAuth 2.0 integration** 선택
3. 앱 정보 입력:
   - Name: `Writing System Integration`
4. **Permissions** 탭에서 **Confluence API** 권한 추가 (Granular Scopes):
   - `read:space:confluence`
   - `read:page:confluence`
   - `read:content:confluence`
   - `read:content-details:confluence`
5. **Authorization** 탭에서 Callback URL 추가:
   - `http://localhost:8080/callback`
6. **Settings** 탭에서 Client ID, Client Secret 복사

#### Step 2: 환경 변수 설정

```powershell
# PowerShell (현재 세션)
$env:CONFLUENCE_CLIENT_ID = "your-client-id"
$env:CONFLUENCE_CLIENT_SECRET = "your-client-secret"

# 영구 설정 (시스템 환경 변수)
[System.Environment]::SetEnvironmentVariable("CONFLUENCE_CLIENT_ID", "your-client-id", "User")
[System.Environment]::SetEnvironmentVariable("CONFLUENCE_CLIENT_SECRET", "your-client-secret", "User")
```

#### Step 3: 인증 및 동기화

```powershell
cd integrations/confluence

# 1. OAuth 인증 (브라우저에서 Atlassian 로그인)
python oauth_confluence.py --auth

# 2. 스페이스 검색 (키워드로)
python oauth_confluence.py --find "AEGIS"

# 3. 전체 스페이스 목록 조회
python oauth_confluence.py --spaces

# 4. 특정 스페이스 동기화
python oauth_confluence.py --sync --space "AEGIS"

# 5. 토큰 갱신 (만료 시 자동 갱신됨)
python oauth_confluence.py --refresh
```

#### 동기화 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `--auth` | OAuth 인증 시작 (브라우저 열림) |
| `--spaces` | 접근 가능한 모든 스페이스 목록 |
| `--find "키워드"` | 키워드로 스페이스 검색 |
| `--sync --space "KEY"` | 특정 스페이스 문서 동기화 |
| `--refresh` | 토큰 수동 갱신 |

#### 동기화된 문서 활용

동기화 후 `cache/` 폴더에 마크다운 파일로 저장됩니다:

```
integrations/confluence/cache/
├── confluence_index.json          # 전체 인덱스
├── 736988863_AEGIS Overview.md    # 개별 페이지들
├── 736988864_기술 스택.md
└── ...
```

Claude/Gemini에서 활용:
```
"Confluence 캐시에서 AEGIS 관련 문서 찾아서 참고해줘"
"integrations/confluence/cache 폴더의 문서 기반으로 글 써줘"
```

#### 토큰 관련 문제 해결

**"scope does not match" 오류 발생 시:**
```powershell
# 토큰 삭제 후 재인증
Remove-Item oauth_token.json
python oauth_confluence.py --auth
```

**토큰 만료 시:**
- 자동으로 refresh token을 사용해 갱신됨
- 수동 갱신: `python oauth_confluence.py --refresh`

### 6.5 동기화 자동화 (선택사항)

정기적으로 Confluence 문서를 동기화하려면:

#### Windows 작업 스케줄러 등록

```powershell
# 매일 오전 9시 동기화 (예시)
$action = New-ScheduledTaskAction -Execute "python" -Argument "oauth_confluence.py --sync --space AEGIS" -WorkingDirectory "D:\PilotProject\AgentWriting\writing-system\integrations\confluence"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "ConfluenceSync" -Action $action -Trigger $trigger
```

#### 수동 업데이트

새 문서가 추가되었을 때:
```powershell
cd D:\PilotProject\AgentWriting\writing-system\integrations\confluence
python oauth_confluence.py --sync --space "AEGIS"
```

### 6.6 API 토큰 연동 (SSO 비활성화 환경)

SSO가 비활성화된 환경에서는 API 토큰으로 연동 가능:

```powershell
# 환경 변수 설정
$env:CONFLUENCE_EMAIL = "your-email@krafton.com"
$env:CONFLUENCE_API_TOKEN = "your-api-token"

# 동기화 실행
cd integrations/confluence
python sync_confluence.py --sync
```

---

## 7. 커스터마이징

### 7.1 스타일 가이드 수정

`data/style_guide.md` 파일을 직접 편집:

```markdown
# 내 글쓰기 스타일 가이드

## 문체
- 친근하지만 전문적
- 짧은 문장 선호 (20자 이내)

## 금지 표현
- "여러분"
- "~하신 적 있으신가요?"

## 선호 표현
- 구체적인 숫자로 시작
- 질문으로 시작
```

### 7.2 새 스킬 추가

`.claude/skills/` 폴더에 새 마크다운 파일 추가:

```markdown
# My Custom Skill

## 역할
[스킬 설명]

## 작업 프로세스
1. [단계 1]
2. [단계 2]

## 트리거
- "[키워드]"라고 하면 이 스킬 활성화
```

### 7.3 채점 기준 조정

`content_reviewer.md` 파일에서 배점 수정 가능

---

## 8. 문제 해결

### 8.1 Claude Code 실행 오류

**오류**: `Claude Code on Windows requires git-bash`

**해결**:
```powershell
winget install --id Git.Git -e --source winget
# 새 터미널 열기
```

### 8.2 Gemini CLI 인증 오류

**해결**: 처음 실행 시 브라우저에서 Google 계정 로그인

### 8.3 Confluence 403 Forbidden

**원인**: SSO(Atlassian Access) 활성화로 API 토큰 차단

**해결**: 수동 참조 방식 사용 (섹션 6.2 참조)

### 8.4 Python 모듈 오류

**오류**: `ModuleNotFoundError: No module named 'requests'`

**해결**:
```powershell
pip install requests
```

### 8.5 스타일 가이드가 반영 안 됨

**해결**: `data/style_guide.md` 파일이 존재하는지 확인

---

## 부록: 빠른 참조

### 시작 명령어

```powershell
# Claude Code
cd D:\PilotProject\AgentWriting\writing-system && claude

# Gemini CLI
cd D:\PilotProject\AgentWriting\writing-system && gemini
```

### 주요 파일 위치

| 파일 | 용도 |
|------|------|
| `data/style_guide.md` | 스타일 가이드 |
| `data/references/` | 참조 자료 |
| `data/final_content.md` | 최종 콘텐츠 |
| `data/growth_report.md` | 성장 리포트 |

### 유용한 명령어

| 명령어 | 기능 |
|--------|------|
| `빠른 모드로 써줘` | 검토 단계 생략 |
| `내 성장 보여줘` | 성장 리포트 |
| `스타일 가이드 보여줘` | 현재 스타일 확인 |

---

### Confluence 동기화 현황

```
AEGIS 스페이스: 1,858 페이지 동기화 완료
캐시 위치: integrations/confluence/cache/
마지막 동기화: 2026-01-11
```

---

## 9. AEGIS Web Platform

### 9.1 플랫폼 개요

AEGIS Platform은 게임 개발 프로젝트를 위한 통합 도구 플랫폼입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                      AEGIS Platform                              │
│                    http://localhost:3000                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │   AEGIS Writing     │    │   AEGIS Chat Bot    │             │
│  │                     │    │                     │             │
│  │  • AI 글쓰기        │    │  • Confluence 검색  │             │
│  │  • 스타일 가이드    │    │  • Jira 이슈 조회   │             │
│  │  • 성장 리포트      │    │  • AI 기반 답변     │             │
│  │                     │    │  • 대화 기록 저장   │             │
│  └─────────────────────┘    └─────────────────────┘             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     플랫폼 설정                          │    │
│  │  • AI API 키 (Gemini, Claude)                           │    │
│  │  • Confluence 인증 정보                                  │    │
│  │  • Jira 인증 정보                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 주요 도구

| 도구 | 경로 | 설명 |
|------|------|------|
| **메인 페이지** | `/` | 플랫폼 랜딩 페이지, 도구 선택 |
| **AEGIS Writing** | `/writing` | AI 글쓰기 어시스턴트 |
| **AEGIS Chat Bot** | `/chatbot` | Confluence/Jira 연동 챗봇 |
| **설정** | `/settings` | API 키 및 인증 정보 관리 |

### 9.2 설치 및 실행

#### 의존성 설치

```powershell
cd D:\PilotProject\AgentWriting\writing-system\web
npm install
```

#### 개발 서버 실행

```powershell
npm run dev
```

브라우저에서 **http://localhost:3000** 접속

#### 프로덕션 빌드

```powershell
npm run build
npm start
```

### 9.3 AEGIS Chat Bot

#### 기능 개요

AEGIS Chat Bot은 Confluence 문서와 Jira 이슈를 검색하고 AI가 답변을 생성합니다.

| 기능 | 설명 |
|------|------|
| **Confluence 검색** | 1,800+ 문서에서 관련 정보 검색 |
| **AI 답변 생성** | Gemini 또는 Claude로 답변 생성 |
| **참조 문서 표시** | 최대 30개 관련 문서 링크 제공 |
| **Jira 티켓 링크** | AEGIS-123 형식 자동 링크 변환 |
| **대화 기록 저장** | 로컬 스토리지에 최대 50개 대화 저장 |

#### 검색 엔진 특징

```
┌─────────────────────────────────────────────────────────────────┐
│                    고급 검색 엔진                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 한국어 형태소 분석                                           │
│     - 조사 제거: "봇의" → "봇"                                   │
│     - 어미 제거: "사격하는" → "사격"                              │
│                                                                  │
│  2. 부분 문자열 매칭                                             │
│     - "봇" 검색 시 "봇의 사격 판단" 문서 매칭                     │
│                                                                  │
│  3. TF-IDF 가중치                                                │
│     - 문서별 키워드 중요도 계산                                   │
│                                                                  │
│  4. 동의어 확장                                                  │
│     - "봇" → bot, ai, 인공지능, npc                              │
│     - "사격" → shooting, fire, 발사, 공격                        │
│                                                                  │
│  5. 근접도 검색                                                  │
│     - 키워드가 가까이 있으면 높은 점수                            │
│                                                                  │
│  6. 시맨틱 유사도                                                │
│     - 벡터 임베딩 기반 의미 검색                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 사용 예시

```
사용자: 봇 사격 관련 문서를 모두 찾아줘

AI: 봇의 사격 관련 문서를 찾았습니다.

## 주요 문서

1. **봇의 사격 판단 v.0.9**
   - 봇이 사격 여부를 결정하는 로직 설명
   
2. **봇 기본 기획 (구조 및 기본 데이터) v.0.9**
   - 봇 시스템의 전체 구조 설명

3. **자동 사격 (Autofire)**
   - 자동 사격 기능 구현 명세

[참조 문서: 15개]
```

#### 대화 기록 관리

| 기능 | 설명 |
|------|------|
| **자동 저장** | AI 응답 후 자동으로 대화 저장 |
| **새 대화** | 현재 대화 저장 후 새 대화 시작 |
| **기록 불러오기** | 저장된 대화 클릭하여 불러오기 |
| **개별 삭제** | 각 대화 항목 삭제 가능 |
| **전체 삭제** | 모든 대화 기록 일괄 삭제 |

#### Confluence 데이터 동기화

```powershell
# 웹 UI에서 동기화
# Chat Bot 사이드바 → "최신화" 버튼 클릭

# 또는 CLI에서 직접 실행
cd D:\PilotProject\AgentWriting\writing-system\integrations\confluence
python oauth_confluence.py --sync --space "AEGIS"
```

### 9.4 개인 설정

플랫폼 설정 페이지 (`/settings`)에서 개인별 인증 정보를 관리합니다.

#### AI API 키 설정

| 항목 | 설명 |
|------|------|
| **Gemini API Key** | Google AI Studio에서 발급 |
| **Claude API Key** | Anthropic Console에서 발급 |

```
Gemini API 키 발급:
1. https://aistudio.google.com/apikey 접속
2. "Create API Key" 클릭
3. 키 복사하여 설정 페이지에 입력
```

#### Confluence 인증 설정

| 항목 | 기본값 | 설명 |
|------|--------|------|
| **이메일** | - | Atlassian 계정 이메일 |
| **API 토큰** | - | Atlassian API 토큰 |
| **Base URL** | `https://krafton.atlassian.net` | Confluence 서버 URL |
| **Space Key** | `AEGIS` | 검색할 스페이스 키 |

```
API 토큰 발급:
1. https://id.atlassian.com/manage-profile/security/api-tokens 접속
2. "Create API token" 클릭
3. 토큰 복사하여 설정 페이지에 입력
```

#### Jira 인증 설정

| 항목 | 기본값 | 설명 |
|------|--------|------|
| **이메일** | - | Atlassian 계정 이메일 |
| **API 토큰** | - | Atlassian API 토큰 (Confluence와 동일) |
| **Base URL** | `https://cloud.jira.krafton.com` | Jira 서버 URL |
| **Project Key** | `AEGIS` | 프로젝트 키 |

> **팁**: "Confluence에서 복사" 버튼으로 Confluence 인증 정보를 Jira에 복사할 수 있습니다.

#### 데이터 저장 위치

모든 설정은 브라우저의 **LocalStorage**에 저장됩니다:

| 키 | 내용 |
|-----|------|
| `writing-system-data` | API 키, 스타일 가이드, 아카이브 |
| `aegis-confluence-auth` | Confluence 인증 정보 |
| `aegis-jira-auth` | Jira 인증 정보 |
| `aegis-chatbot-history` | 챗봇 대화 기록 |

---

## 부록: 웹 플랫폼 빠른 참조

### URL 목록

| 페이지 | URL | 설명 |
|--------|-----|------|
| 메인 | http://localhost:3000 | 플랫폼 랜딩 |
| 글쓰기 | http://localhost:3000/writing | AI 글쓰기 |
| 챗봇 | http://localhost:3000/chatbot | Confluence/Jira 챗봇 |
| 설정 | http://localhost:3000/settings | 인증 설정 |

### 기술 스택

| 구성 요소 | 기술 |
|-----------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| AI | Google Gemini, Anthropic Claude |
| 마크다운 | react-markdown, remark-gfm |
| 저장소 | LocalStorage |

### 검색 결과 설정

| 항목 | 값 | 설명 |
|------|-----|------|
| `maxResults` | 30 | 최대 검색 결과 수 |
| `SOURCES_PER_PAGE` | 5 | 페이지당 참조 문서 수 |

---

*마지막 업데이트: 2026-01-12*
