// Content Reviewer Agent
// 엄격한 품질 관리자 역할

export const contentReviewerSystemPrompt = `당신은 엄격한 품질 관리자입니다.

## 검토 기준 (100점 만점)

### 1. 스타일 일치성 (50점)
- 문체 일관성: 15점
- 문장 길이 준수: 15점
- 금지 표현 미사용: 20점

### 2. 기획 의도 구현 (30점)
- Hook 효과성: 10점
- Value 전달력: 10점
- CTA 명확성: 10점

### 3. 독자 경험 (20점)
- 가독성: 10점
- 논리 흐름: 10점

## 채점 원칙

### 엄격하지만 공정하게
- 감점 시 반드시 구체적 근거 제시
- 주관적 판단 최소화, 가이드 기준으로 평가
- 좋은 점도 언급하여 균형 잡힌 피드백

### 재작성 요청 시
- 추상적 지시 금지 ("더 좋게 써주세요" ❌)
- 구체적 예시 제공 ("이 문장을 이렇게 바꿔보세요" ✅)
- 우선순위 명시 (필수 vs 권장)

## 합격/불합격 기준
| 점수 | 판정 | 액션 |
|------|------|------|
| 90-100 | 우수 | 즉시 Proofreader로 |
| 80-89 | 합격 | Proofreader로 진행 |
| 70-79 | 조건부 | 1회 수정 후 재검토 |
| 60-69 | 불합격 | 주요 수정 필요 |
| 60 미만 | 재작성 | 전면 재작성 권고 |

## 출력 형식
반드시 다음 JSON 형식으로 응답하세요:

\`\`\`json
{
  "styleConsistency": {
    "toneConsistency": { "score": 0, "maxScore": 15, "comment": "평가" },
    "sentenceLength": { "score": 0, "maxScore": 15, "comment": "평가" },
    "forbiddenExpressions": { "score": 0, "maxScore": 20, "comment": "평가", "found": [] },
    "total": 0
  },
  "planImplementation": {
    "hookEffectiveness": { "score": 0, "maxScore": 10, "comment": "평가" },
    "valueDelivery": { "score": 0, "maxScore": 10, "comment": "평가" },
    "ctaClarity": { "score": 0, "maxScore": 10, "comment": "평가" },
    "total": 0
  },
  "readerExperience": {
    "readability": { "score": 0, "maxScore": 10, "comment": "평가" },
    "logicalFlow": { "score": 0, "maxScore": 10, "comment": "평가" },
    "total": 0
  },
  "totalScore": 0,
  "passed": true/false,
  "verdict": "우수/합격/조건부/불합격/재작성",
  "feedback": "종합 피드백",
  "improvements": {
    "required": [
      { "issue": "문제점", "current": "현재 문장", "suggestion": "개선 제안" }
    ],
    "recommended": ["선택적 개선 포인트"]
  }
}
\`\`\``;

export function createContentReviewerPrompt(
  draft: string,
  strategy: string,
  styleGuide: string
): string {
  return `## 스타일 가이드
${styleGuide}

## 기획안
${strategy}

## 검토할 초안
${draft}

## 요청
위 초안을 스타일 가이드와 기획안을 기준으로 검토하고 채점해주세요.
100점 만점으로 채점하고, 80점 이상이면 합격입니다.
JSON 형식으로 상세한 검토 결과를 응답해주세요.`;
}

export interface ReviewResult {
  styleConsistency: {
    toneConsistency: { score: number; maxScore: number; comment: string };
    sentenceLength: { score: number; maxScore: number; comment: string };
    forbiddenExpressions: { score: number; maxScore: number; comment: string; found: string[] };
    total: number;
  };
  planImplementation: {
    hookEffectiveness: { score: number; maxScore: number; comment: string };
    valueDelivery: { score: number; maxScore: number; comment: string };
    ctaClarity: { score: number; maxScore: number; comment: string };
    total: number;
  };
  readerExperience: {
    readability: { score: number; maxScore: number; comment: string };
    logicalFlow: { score: number; maxScore: number; comment: string };
    total: number;
  };
  totalScore: number;
  passed: boolean;
  verdict: string;
  feedback: string;
  improvements?: {
    required: Array<{ issue: string; current: string; suggestion: string }>;
    recommended: string[];
  };
}

export function parseContentReviewerResponse(response: string): ReviewResult | null {
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
    const jsonObjectMatch = response.match(/\{[\s\S]*"totalScore"[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }
    
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to parse content reviewer response:', error);
    // Return a default review result if parsing fails
    return createDefaultReviewResult(response);
  }
}

function createDefaultReviewResult(response: string): ReviewResult {
  // Try to extract score from text
  const scoreMatch = response.match(/(\d{1,3})\s*점/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;
  
  return {
    styleConsistency: {
      toneConsistency: { score: Math.round(score * 0.15), maxScore: 15, comment: '분석 중' },
      sentenceLength: { score: Math.round(score * 0.15), maxScore: 15, comment: '분석 중' },
      forbiddenExpressions: { score: Math.round(score * 0.2), maxScore: 20, comment: '분석 중', found: [] },
      total: Math.round(score * 0.5),
    },
    planImplementation: {
      hookEffectiveness: { score: Math.round(score * 0.1), maxScore: 10, comment: '분석 중' },
      valueDelivery: { score: Math.round(score * 0.1), maxScore: 10, comment: '분석 중' },
      ctaClarity: { score: Math.round(score * 0.1), maxScore: 10, comment: '분석 중' },
      total: Math.round(score * 0.3),
    },
    readerExperience: {
      readability: { score: Math.round(score * 0.1), maxScore: 10, comment: '분석 중' },
      logicalFlow: { score: Math.round(score * 0.1), maxScore: 10, comment: '분석 중' },
      total: Math.round(score * 0.2),
    },
    totalScore: score,
    passed: score >= 80,
    verdict: score >= 90 ? '우수' : score >= 80 ? '합격' : score >= 70 ? '조건부' : '불합격',
    feedback: response.substring(0, 200) + '...',
    improvements: {
      required: [],
      recommended: [],
    },
  };
}
