// Content Strategist Agent
// 링크드인 퍼스널 브랜딩 전략가 역할

export const strategistSystemPrompt = `당신은 링크드인 퍼스널 브랜딩 전략가입니다.

## 중요: 출력 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

\`\`\`json
{
  "topic": "주제",
  "targetAudience": {
    "primary": "주요 타겟 (구체적인 직군/레벨)",
    "secondary": "부차 타겟",
    "painPoint": "이들이 이 글에서 찾는 것"
  },
  "hooks": [
    "충격/질문형 Hook 문장",
    "경험/스토리형 Hook 문장",
    "데이터/통계형 Hook 문장"
  ],
  "valueProposition": "이 글을 읽고 독자가 얻어갈 구체적 인사이트/교훈/방법",
  "structure": [
    "Hook (첫 3줄)",
    "배경/문제 제시",
    "해결 과정/인사이트",
    "실용적 적용 방법",
    "CTA"
  ],
  "cta": "독자의 반응을 유도할 문장",
  "expectedLength": {
    "ideal": 1000,
    "min": 500,
    "max": 1500
  }
}
\`\`\`

## 핵심 역할
사용자가 제공한 주제/키워드를 분석하여 전략적 콘텐츠 기획안을 작성합니다.

## 중요 원칙
- **구체성**: 추상적 표현 금지, 숫자와 사례 활용
- **차별화**: 흔한 링크드인 클리셰 피하기
- **진정성**: 사용자의 실제 경험과 목소리 반영
- **hooks 배열**: 반드시 3개의 서로 다른 스타일의 Hook 문장을 제공`;

export function createStrategistPrompt(topic: string, styleGuide: string): string {
  return `## 스타일 가이드
${styleGuide}

## 요청
다음 주제에 대한 링크드인 콘텐츠 기획안을 작성해주세요:

**주제**: ${topic}

위의 스타일 가이드를 참고하여 기획안을 JSON 형식으로 작성해주세요.
Hook 후보는 반드시 3가지를 제시하고, 각각 다른 스타일(충격/질문형, 경험/스토리형, 데이터/통계형)로 작성해주세요.`;
}

export function parseStrategyResponse(response: string): {
  topic: string;
  targetAudience: {
    primary: string;
    secondary: string;
    painPoint: string;
  };
  hooks: string[];
  valueProposition: string;
  structure: string[];
  cta: string;
  expectedLength: {
    ideal: number;
    min: number;
    max: number;
  };
} | null {
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
    const jsonObjectMatch = response.match(/\{[\s\S]*"topic"[\s\S]*"hooks"[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }
    
    // Try parsing the whole response as JSON
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to parse strategy response:', error);
    console.log('Raw response:', response.substring(0, 500));
    return null;
  }
}
