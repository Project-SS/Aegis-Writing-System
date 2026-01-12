# 참조 자료 폴더

Confluence API 접근이 제한된 경우, 이 폴더에 수동으로 문서를 저장하세요.

## 사용 방법

### 방법 1: 페이지 복사-붙여넣기

1. Confluence에서 원하는 페이지 열기
2. 전체 내용 선택 (Ctrl+A)
3. 복사 (Ctrl+C)
4. 새 마크다운 파일 생성 (예: `aegis_overview.md`)
5. 붙여넣기 (Ctrl+V)

### 방법 2: PDF/Word 내보내기

1. Confluence 페이지에서 `...` 메뉴 클릭
2. "Export" → "Export to PDF" 또는 "Export to Word"
3. 다운로드된 파일을 이 폴더에 저장

### 방법 3: 스페이스 전체 내보내기

1. 스페이스 설정 → "Content Tools" → "Export"
2. "HTML" 또는 "PDF" 선택
3. 내보내기 완료 후 이 폴더에 저장

## 파일 명명 규칙

```
[카테고리]_[제목].md

예시:
- aegis_프로젝트_개요.md
- aegis_기술_아키텍처.md
- aegis_회고록_2024Q4.md
```

## Claude/Gemini에서 사용

글쓰기 요청 시:
```
"data/references 폴더의 AEGIS 문서 참고해서 글 써줘"
```

Claude/Gemini가 이 폴더의 파일들을 읽어서 글쓰기에 활용합니다.
