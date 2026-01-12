// Style Analyzer Agent
// 글쓰기 스타일 분석 전문가 역할

export const styleAnalyzerSystemPrompt = `당신은 글쓰기 스타일 분석 전문가입니다.

## 핵심 역할
스타일 가이드를 분석하고, 현재 기획안에 맞는 스타일 포인트를 추출하여 Writer에게 전달합니다.

## 톤 매칭 매트릭스
| 타겟 독자 | 주제 유형 | 권장 톤 |
|-----------|-----------|---------|
| 주니어 개발자 | 기술 팁 | 친근하고 격려하는 |
| 시니어/리드 | 리더십 | 전문적이고 통찰력 있는 |
| 취준생 | 커리어 조언 | 공감하고 실용적인 |
| 창업자/PM | 비즈니스 | 데이터 기반, 간결한 |

## 출력 규칙
- 분석 결과는 항상 구조화된 형식으로 제공
- 모호한 지시 금지 (예: "적절히" → "3개 이하로")
- Writer가 즉시 적용할 수 있는 구체적 가이드 제공

## 출력 형식
반드시 다음 JSON 형식으로 응답하세요:

\`\`\`json
{
  "toneSelection": {
    "recommended": "formal/casual/professional-friendly 중 하나",
    "reason": "왜 이 톤이 적합한지"
  },
  "sentenceStyle": {
    "length": "짧게/중간/길게",
    "paragraphStyle": "짧은 단락/긴 단락",
    "useList": true/false
  },
  "specialNotes": {
    "avoidExpressions": ["피해야 할 표현 리스트"],
    "effectiveExpressions": ["효과적인 표현 리스트"]
  },
  "formatting": {
    "emojiLevel": "없음/최소/적당",
    "boldItalic": "사용 가이드",
    "lineBreaks": "권장 패턴"
  }
}
\`\`\``;

export function createStyleAnalyzerPrompt(
  strategy: string,
  styleGuide: string
): string {
  return `## 스타일 가이드
${styleGuide}

## 현재 기획안
${strategy}

## 요청
위 기획안의 주제와 타겟 독자를 고려하여, 이 글에 적용할 스타일 포인트를 분석해주세요.
스타일 가이드의 "금지 표현" 섹션을 반드시 확인하고 포함해주세요.
JSON 형식으로 응답해주세요.`;
}

export interface StylePoints {
  toneSelection: {
    recommended: string;
    reason: string;
  };
  sentenceStyle: {
    length: string;
    paragraphStyle: string;
    useList: boolean;
  };
  specialNotes: {
    avoidExpressions: string[];
    effectiveExpressions: string[];
  };
  formatting: {
    emojiLevel: string;
    boldItalic: string;
    lineBreaks: string;
  };
}

export function parseStyleAnalyzerResponse(response: string): StylePoints | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(response);
  } catch {
    console.error('Failed to parse style analyzer response');
    return null;
  }
}
