// Content Writer Agent
// 전문 콘텐츠 작가 역할

export const contentWriterSystemPrompt = `당신은 전문 콘텐츠 작가입니다.

## 중요: 출력 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

\`\`\`json
{
  "title": "제목 (15자 이내)",
  "content": "본문 내용 전체 (줄바꿈은 \\n으로 표시)",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3"],
  "metadata": {
    "expectedViews": "Medium",
    "expectedEngagement": "Medium",
    "optimalTime": "화요일 오전 9시"
  }
}
\`\`\`

## 글쓰기 규칙

### 필수 준수 사항
- 기획안의 Hook 중 하나를 반드시 첫 문단에 사용
- 스타일 가이드의 문체, 문장 길이, 구조 100% 준수
- 타겟 독자가 이해할 수 있는 언어 수준 유지

### 피해야 할 것
- 스타일 가이드의 "피해야 할 것" 리스트 절대 금지
- 진부한 표현 (ex: "여러분, ~하신 적 있나요?")
- 과도한 수식어

## 글쓰기 구조
1. Hook (첫 3줄) - 스크롤 멈추게 하기
2. 배경/문제 제시 - 독자의 공감 유도
3. 해결 과정/인사이트 - 핵심 가치 전달
4. 실용적 적용 방법 - 독자가 바로 써먹을 수 있는 것
5. CTA - 행동 유도
6. 해시태그 3-5개

## 품질 체크리스트
- Hook이 첫 3줄 안에 있는가?
- 금지 표현을 사용하지 않았는가?
- 문장 길이가 가이드 기준을 준수하는가?
- CTA가 명확한가?
- 800-1200자 범위인가?`;

export function createContentWriterPrompt(
  strategy: string,
  styleGuide: string,
  stylePoints: string,
  selectedHookIndex: number
): string {
  return `## 스타일 가이드
${styleGuide}

## 스타일 포인트 (Style Analyzer 분석 결과)
${stylePoints}

## 기획안
${strategy}

## 선택된 Hook
${selectedHookIndex + 1}번 Hook을 사용해주세요.

## 요청
위 기획안과 스타일 가이드를 바탕으로 링크드인 콘텐츠를 작성해주세요.
선택된 Hook을 첫 문단에 반드시 사용하고, 스타일 가이드의 금지 표현은 절대 사용하지 마세요.
JSON 형식으로 응답해주세요.`;
}

export function createRewritePrompt(
  previousDraft: string,
  reviewFeedback: string,
  styleGuide: string
): string {
  return `## 스타일 가이드
${styleGuide}

## 이전 초안
${previousDraft}

## 검토 피드백
${reviewFeedback}

## 요청
위 검토 피드백을 반영하여 초안을 수정해주세요.
지적된 사항을 하나씩 수정하고, 수정된 버전을 JSON 형식으로 응답해주세요.`;
}

export interface Draft {
  title: string;
  content: string;
  hashtags: string[];
  metadata?: {
    expectedViews: 'Low' | 'Medium' | 'High';
    expectedEngagement: 'Low' | 'Medium' | 'High';
    optimalTime: string;
  };
}

export function parseContentWriterResponse(response: string): Draft | null {
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
        // Not valid JSON in code block
      }
    }
    
    // Try to find JSON object directly in response
    const jsonObjectMatch = response.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }
    
    // Try parsing the whole response as JSON
    try {
      return JSON.parse(response);
    } catch {
      // Not valid JSON
    }
    
    // Fallback: Extract content from plain text response
    console.log('Attempting to extract content from plain text response');
    return extractDraftFromText(response);
  } catch (error) {
    console.error('Failed to parse content writer response:', error);
    return null;
  }
}

function extractDraftFromText(text: string): Draft | null {
  // Try to extract title (first line or line after "제목:")
  let title = '';
  const titleMatch = text.match(/(?:제목[:\s]*)?([^\n]+)/);
  if (titleMatch) {
    title = titleMatch[1].replace(/^[#\s*]+/, '').trim();
  }
  
  // Extract hashtags
  const hashtagMatches = text.match(/#[\w가-힣]+/g);
  const hashtags = hashtagMatches 
    ? hashtagMatches.map(tag => tag.replace('#', ''))
    : ['개발자', '커리어', '성장'];
  
  // Content is the main body (remove title line and hashtags)
  let content = text;
  if (title) {
    content = content.replace(title, '').trim();
  }
  // Remove hashtag line at the end
  content = content.replace(/\n*#[\w가-힣\s#]+$/, '').trim();
  
  if (!title || !content) {
    return null;
  }
  
  return {
    title,
    content,
    hashtags,
    metadata: {
      expectedViews: 'Medium',
      expectedEngagement: 'Medium',
      optimalTime: '화요일 오전 9시',
    },
  };
}
