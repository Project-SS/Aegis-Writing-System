// Style Learner Agent
// 데이터 기반 학습 분석가 역할

export const styleLearnerSystemPrompt = `당신은 데이터 기반 학습 분석가입니다.

## 주요 기능

### 1. 피드백 수집 및 반영
사용자의 긍정/부정 피드백을 분석하여 스타일 가이드 업데이트를 제안합니다.

### 2. 성장 리포트 생성
글쓰기 통계와 개선 포인트를 분석합니다.

### 3. 스타일 가이드 자동 업데이트
피드백 패턴을 분석하여 스타일 가이드 개선을 제안합니다.

## 학습 원칙

### 즉시 반영 vs 주기적 분석
- **즉시 반영**: 명시적 피드백 (좋다/싫다)
- **주기적 분석**: 패턴 발견, 성장 리포트

### 데이터 품질
- 정량적 데이터(점수, 빈도)와 정성적 해석 균형
- 충분한 샘플(최소 3개 글) 후 패턴 분석

### 톤 & 매너
- 사용자의 성장을 격려하는 톤 유지
- 비판보다 개선 기회로 프레이밍
- 작은 진전도 인정하고 축하

## 출력 형식 (피드백 분석)
\`\`\`json
{
  "feedbackSummary": {
    "satisfied": ["만족한 항목들"],
    "unsatisfied": ["불만족한 항목들"]
  },
  "styleGuideUpdates": {
    "addToPreferred": ["선호 표현에 추가할 것들"],
    "addToForbidden": ["금지 표현에 추가할 것들"],
    "otherSuggestions": ["기타 제안"]
  },
  "encouragement": "격려 메시지"
}
\`\`\`

## 출력 형식 (성장 리포트)
\`\`\`json
{
  "statistics": {
    "totalContents": 0,
    "averageScore": 0,
    "firstPassRate": 0,
    "highestScore": 0,
    "highestScoreTitle": ""
  },
  "strengths": [
    { "point": "강점", "evidence": "근거", "contentTitle": "발견된 글" }
  ],
  "improvements": [
    { "issue": "개선점", "frequency": 0, "suggestion": "제안" }
  ],
  "nextAdvice": "다음 글을 위한 조언",
  "milestones": {
    "achieved": ["달성한 마일스톤"],
    "next": "다음 목표"
  }
}
\`\`\``;

export function createFeedbackAnalysisPrompt(
  feedback: string,
  contentTitle: string,
  currentStyleGuide: string
): string {
  return `## 현재 스타일 가이드
${currentStyleGuide}

## 콘텐츠 제목
${contentTitle}

## 사용자 피드백
${feedback}

## 요청
위 피드백을 분석하여 스타일 가이드 업데이트 제안을 JSON 형식으로 응답해주세요.
긍정적인 피드백은 "선호 표현"에, 부정적인 피드백은 "금지 표현"에 반영될 수 있도록 분석해주세요.`;
}

export function createGrowthReportPrompt(
  feedbackLog: string,
  archive: string
): string {
  return `## 피드백 로그
${feedbackLog}

## 아카이브 (완성된 글 목록)
${archive}

## 요청
위 데이터를 분석하여 성장 리포트를 JSON 형식으로 생성해주세요.
강점과 개선점을 구체적인 근거와 함께 제시하고, 격려하는 톤으로 작성해주세요.`;
}

export interface FeedbackAnalysis {
  feedbackSummary: {
    satisfied: string[];
    unsatisfied: string[];
  };
  styleGuideUpdates: {
    addToPreferred: string[];
    addToForbidden: string[];
    otherSuggestions: string[];
  };
  encouragement: string;
}

export interface GrowthReport {
  statistics: {
    totalContents: number;
    averageScore: number;
    firstPassRate: number;
    highestScore: number;
    highestScoreTitle: string;
  };
  strengths: Array<{
    point: string;
    evidence: string;
    contentTitle: string;
  }>;
  improvements: Array<{
    issue: string;
    frequency: number;
    suggestion: string;
  }>;
  nextAdvice: string;
  milestones: {
    achieved: string[];
    next: string;
  };
}

export function parseFeedbackAnalysisResponse(response: string): FeedbackAnalysis | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(response);
  } catch {
    console.error('Failed to parse feedback analysis response');
    return null;
  }
}

export function parseGrowthReportResponse(response: string): GrowthReport | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(response);
  } catch {
    console.error('Failed to parse growth report response');
    return null;
  }
}
