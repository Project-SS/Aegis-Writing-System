# Writing System

7개의 전문 AI 에이전트를 조율하여 링크드인 콘텐츠를 생산하는 글쓰기 시스템입니다.

## 빠른 시작

### 설치

```powershell
# Claude Code
npm install -g @anthropic-ai/claude-code

# Gemini CLI
npm install -g @google/gemini-cli
```

### 실행

```powershell
cd writing-system
claude    # 또는 gemini
```

### 글쓰기 시작

```
"링크드인 글 써줘"
"개발자 번아웃에 대한 포스트 만들어줘"
"빠른 모드로 써줘"
```

## 주요 기능

| 기능 | 설명 |
|------|------|
| **6단계 워크플로우** | 전략 → 스타일 → 작성 → 검토 → 교정 → 학습 |
| **품질 게이트** | 80점 이상 통과 시에만 다음 단계 진행 |
| **빠른 모드** | Phase 1, 3, 5만 실행 |
| **누적 학습** | 피드백이 스타일 가이드에 자동 반영 |
| **성장 리포트** | 통계 및 개선 포인트 확인 |
| **Confluence 연동** | 내부 문서 참조 (수동/자동) |

## 문서

- **[GUIDE.md](GUIDE.md)** - 종합 가이드 (설치, 설정, 사용법, 문제 해결)
- **[GEMINI.md](GEMINI.md)** - Gemini CLI 시스템 지시사항

## 프로젝트 구조

```
writing-system/
├── .claude/skills/        # AI 에이전트 스킬 (7개)
├── data/                  # 데이터 파일
│   ├── style_guide.md     # 스타일 가이드
│   ├── references/        # 참조 자료 (Confluence 문서)
│   └── archive/           # 완성 콘텐츠 보관
├── integrations/          # 외부 연동
│   └── confluence/        # Confluence 동기화
├── GUIDE.md               # 종합 가이드
├── GEMINI.md              # Gemini 설정
└── README.md              # 이 파일
```

## 유용한 명령어

| 명령어 | 기능 |
|--------|------|
| `빠른 모드로 써줘` | 검토 단계 생략 |
| `내 성장 보여줘` | 성장 리포트 확인 |
| `이 표현 좋아` | 긍정 피드백 기록 |
| `스타일 가이드 보여줘` | 현재 스타일 확인 |

## 라이선스

MIT License
