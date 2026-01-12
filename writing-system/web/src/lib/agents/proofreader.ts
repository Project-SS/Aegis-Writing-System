// Proofreader Agent
// 최종 교정 전문가 역할

export const proofreaderSystemPrompt = `당신은 최종 교정 전문가입니다.

## 검토 항목

### 1. 맞춤법/띄어쓰기
- 한국어 표준어 규정 준수
- 외래어 표기법 확인
- 전문 용어 일관성

### 2. 문법
- 주술 호응
- 시제 일치
- 조사 오용

### 3. 가독성
- 모바일 환경 최적화 (줄바꿈)
- 단락 구분 명확화
- 이모지 적절성 (스타일 가이드 기준)

### 4. 최종 점검
- 해시태그 적정성
- 글자 수 확인

## 자주 발견되는 오류 패턴

### 맞춤법
| 오류 | 올바른 표현 |
|------|-------------|
| 됬다 | 됐다 |
| 안되다 | 안 되다 |
| 어떻해 | 어떡해 |
| 몇일 | 며칠 |

### 띄어쓰기
| 오류 | 올바른 표현 |
|------|-------------|
| 할수있다 | 할 수 있다 |
| 그러므로써 | 그럼으로써 |
| 뿐만아니라 | 뿐만 아니라 |

### 외래어
| 오류 | 올바른 표현 |
|------|-------------|
| 컨텐츠 | 콘텐츠 |
| 메세지 | 메시지 |
| 악세사리 | 액세서리 |

## 출력 형식
반드시 다음 JSON 형식으로 응답하세요:

\`\`\`json
{
  "title": "교정된 제목",
  "content": "교정된 본문 (마크다운 형식)",
  "hashtags": ["해시태그1", "해시태그2"],
  "corrections": [
    { "type": "맞춤법/띄어쓰기/문법/가독성", "original": "원본", "corrected": "수정본" }
  ],
  "stats": {
    "charCount": 0,
    "wordCount": 0,
    "readingTime": 0
  },
  "publishRecommendation": {
    "status": "즉시 발행 가능/수정 후 발행 권장",
    "optimalTime": "요일 시간대"
  }
}
\`\`\``;

export function createProofreaderPrompt(
  draft: string,
  styleGuide: string
): string {
  return `## 스타일 가이드
${styleGuide}

## 교정할 초안
${draft}

## 요청
위 초안의 맞춤법, 띄어쓰기, 문법, 가독성을 점검하고 교정해주세요.
수정 사항이 있으면 corrections 배열에 기록하고, 수정된 최종본을 JSON 형식으로 응답해주세요.
수정 사항이 없으면 corrections를 빈 배열로 두세요.`;
}

export interface ProofreadResult {
  title: string;
  content: string;
  hashtags: string[];
  corrections: Array<{
    type: string;
    original: string;
    corrected: string;
  }>;
  stats: {
    charCount: number;
    wordCount: number;
    readingTime: number;
  };
  publishRecommendation: {
    status: string;
    optimalTime: string;
  };
}

export function parseProofreaderResponse(response: string): ProofreadResult | null {
  try {
    // Try to find JSON in code block
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to find JSON in generic code block
    const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      try {
        return JSON.parse(codeMatch[1]);
      } catch {
        // Not valid JSON
      }
    }
    
    // Try to find JSON object directly
    const jsonObjectMatch = response.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*"stats"[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }
    
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to parse proofreader response:', error);
    // Return a default result extracting content from text
    return extractProofreadFromText(response);
  }
}

function extractProofreadFromText(text: string): ProofreadResult | null {
  // Try to extract title
  let title = '';
  const titleMatch = text.match(/(?:제목[:\s]*)?([^\n]+)/);
  if (titleMatch) {
    title = titleMatch[1].replace(/^[#\s*]+/, '').trim();
  }
  
  // Extract hashtags
  const hashtagMatches = text.match(/#[\w가-힣]+/g);
  const hashtags = hashtagMatches 
    ? hashtagMatches.map(tag => tag.replace('#', ''))
    : ['개발자', '커리어'];
  
  // Content is the main body
  let content = text;
  if (title) {
    content = content.replace(title, '').trim();
  }
  content = content.replace(/\n*#[\w가-힣\s#]+$/, '').trim();
  
  const charCount = content.length;
  const wordCount = content.split(/\s+/).length;
  
  return {
    title: title || '제목 없음',
    content,
    hashtags,
    corrections: [],
    stats: {
      charCount,
      wordCount,
      readingTime: Math.ceil(charCount / 500),
    },
    publishRecommendation: {
      status: '즉시 발행 가능',
      optimalTime: '화요일 오전 9시',
    },
  };
}
