// API Keys
export interface ApiKeys {
  claude?: string;
  gemini?: string;
}

// AI Provider
export type AIProvider = 'claude' | 'gemini';

// Writing Phase
export type WritingPhase = 
  | 'idle'
  | 'strategy'      // Phase 1: 전략 수립
  | 'style'         // Phase 2: 스타일 분석
  | 'writing'       // Phase 3: 초안 작성
  | 'review'        // Phase 4: 품질 검토
  | 'proofread'     // Phase 5: 최종 교정
  | 'learning';     // Phase 6: 학습 및 개선

export interface PhaseInfo {
  id: WritingPhase;
  name: string;
  description: string;
  order: number;
}

export const PHASES: PhaseInfo[] = [
  { id: 'strategy', name: '전략 수립', description: '콘텐츠 기획안 생성', order: 1 },
  { id: 'style', name: '스타일 분석', description: '스타일 가이드 적용', order: 2 },
  { id: 'writing', name: '초안 작성', description: '콘텐츠 초안 작성', order: 3 },
  { id: 'review', name: '품질 검토', description: '품질 평가 및 채점', order: 4 },
  { id: 'proofread', name: '최종 교정', description: '맞춤법/문법 교정', order: 5 },
  { id: 'learning', name: '학습', description: '피드백 반영 및 학습', order: 6 },
];

// Strategy (기획안)
export interface Strategy {
  topic: string;
  targetAudience: {
    primary: string;
    secondary: string;
    painPoint: string;
  };
  hooks: string[];
  selectedHook?: number;
  valueProposition: string;
  structure: string[];
  cta: string;
  expectedLength: {
    ideal: number;
    min: number;
    max: number;
  };
}

// Draft (초안)
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

// Review (검토 결과)
export interface ReviewScore {
  styleConsistency: {
    toneConsistency: number;      // /15
    sentenceLength: number;       // /15
    forbiddenExpressions: number; // /20
    total: number;                // /50
  };
  planImplementation: {
    hookEffectiveness: number;    // /10
    valueDelivery: number;        // /10
    ctaClarity: number;           // /10
    total: number;                // /30
  };
  readerExperience: {
    readability: number;          // /10
    logicalFlow: number;          // /10
    total: number;                // /20
  };
  totalScore: number;             // /100
  passed: boolean;
  feedback: string;
  improvements?: {
    required: Array<{ issue: string; current: string; suggestion: string }>;
    recommended: string[];
  };
}

// Final Content (최종 콘텐츠)
export interface FinalContent {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  createdAt: string;
  stats: {
    charCount: number;
    wordCount: number;
    readingTime: number;
  };
  reviewScore: number;
  topic: string;
}

// Feedback Entry
export interface FeedbackEntry {
  id: string;
  date: string;
  contentId: string;
  contentTitle: string;
  satisfied: string[];
  unsatisfied: string[];
  reviewScore: number;
  passedFirstTime: boolean;
  notes?: string;
}

// Growth Stats
export interface GrowthStats {
  totalContents: number;
  averageScore: number;
  firstPassRate: number;
  highestScore: number;
  highestScoreTitle: string;
  mostCommonTopic: string;
  strengths: Array<{ point: string; evidence: string; contentTitle: string }>;
  improvements: Array<{ issue: string; frequency: number; lastOccurrence: string; suggestion: string }>;
  milestones: {
    firstContent: boolean;
    fiveContents: boolean;
    avgAbove80: boolean;
    firstPassRate50: boolean;
    tenContents: boolean;
    firstPassRate80: boolean;
  };
  timeline: Array<{ date: string; event: string }>;
}

// Style Guide
export interface StyleGuide {
  tone: {
    basic: string[];
    sentenceStyle: string[];
  };
  preferredExpressions: {
    startPatterns: string[];
    goodExamples: string[];
  };
  forbiddenExpressions: {
    expressions: string[];
    patterns: string[];
  };
  structure: {
    basic: string[];
    formatting: string[];
  };
  hashtags: {
    recommended: string[];
    avoid: string[];
  };
  lengthGuide: {
    ideal: number;
    min: number;
    max: number;
  };
  lastUpdated: string;
}

// User Data (LocalStorage)
export interface UserData {
  apiKeys: ApiKeys;
  styleGuide: string;  // Markdown string
  feedbackLog: FeedbackEntry[];
  growthStats: GrowthStats;
  archive: FinalContent[];
  currentSession?: {
    phase: WritingPhase;
    topic?: string;
    strategy?: Strategy;
    draft?: Draft;
    review?: ReviewScore;
    finalContent?: FinalContent;
  };
  settings: {
    defaultProvider: AIProvider;
    quickMode: boolean;
  };
}

// API Request/Response types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequest {
  provider: AIProvider;
  apiKey: string;
  messages: ChatMessage[];
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  error?: string;
}

// Reference Material (참조 자료)
export type ReferenceType = 'confluence' | 'file' | 'url' | 'text';

export interface ReferenceItem {
  id: string;
  type: ReferenceType;
  name: string;
  content: string;
  url?: string;
  addedAt: string;
}

export interface ConfluenceDocument {
  id: string;
  title: string;
  url: string;
  space: string;
  excerpt?: string;
  lastModified?: string;
}

// Style Guide Profile (다중 스타일 가이드)
export interface StyleGuideProfile {
  id: string;
  name: string;
  description?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}
