import { UserData, ApiKeys, FeedbackEntry, FinalContent, GrowthStats, AIProvider, WritingPhase, Strategy, Draft, ReviewScore, StyleGuideProfile } from '@/types';

const STORAGE_KEY = 'writing-system-data';

// Default style guide (from existing style_guide.md)
const DEFAULT_STYLE_GUIDE = `# 내 글쓰기 스타일 가이드

## 문체

### 기본 톤
- 친근하지만 전문적
- 경험에서 우러나온 진정성
- 독자와 대화하는 느낌

### 문장 스타일
- 짧은 문장 선호 (20자 이내)
- 한 문단 3-4문장
- 능동태 사용

## 선호하는 표현

### 시작 패턴
- 구체적인 숫자로 시작
- 질문으로 시작
- 짧은 선언문으로 시작

### 좋은 예시
- "3년 전, 나는 ~"
- "이 방법으로 ~를 50% 개선했습니다"
- "많은 사람들이 모르는 사실이 있습니다"

## 피해야 할 표현

### 금지 표현
- "여러분"
- "~하신 적 있으신가요?"
- "오늘은 ~에 대해 이야기해볼까 합니다"
- "많은 분들이"
- "사실 저도"

### 피해야 할 패턴
- 과도한 이모지 (문단당 1개 이하)
- 느낌표 남발
- 추상적인 조언 ("열심히 하세요")
- 클리셰 ("성공의 비결은...")

## 구조

### 기본 구조
1. Hook (첫 3줄) - 스크롤 멈추게 하기
2. 배경/문제 - 공감 유도
3. 인사이트/해결 - 핵심 가치
4. 적용 방법 - 실용성
5. CTA - 행동 유도

### 포맷팅
- 중요 포인트는 줄바꿈으로 강조
- 리스트는 3-5개 항목
- 긴 글은 소제목으로 구분

## 해시태그 가이드

### 권장
- 3-5개 사용
- 주제 관련 2-3개
- 일반 태그 1-2개 (#개발자 #커리어)

### 피해야 할 것
- 10개 이상 해시태그
- 너무 일반적인 태그 (#좋아요)
- 관련 없는 태그

## 글자 수 가이드

- 이상적: 800-1,200자
- 최소: 500자
- 최대: 1,500자

---

*이 가이드는 피드백을 통해 지속적으로 업데이트됩니다.*
`;

const DEFAULT_GROWTH_STATS: GrowthStats = {
  totalContents: 0,
  averageScore: 0,
  firstPassRate: 0,
  highestScore: 0,
  highestScoreTitle: '',
  mostCommonTopic: '',
  strengths: [],
  improvements: [],
  milestones: {
    firstContent: false,
    fiveContents: false,
    avgAbove80: false,
    firstPassRate50: false,
    tenContents: false,
    firstPassRate80: false,
  },
  timeline: [],
};

const DEFAULT_USER_DATA: UserData = {
  apiKeys: {},
  styleGuide: DEFAULT_STYLE_GUIDE,
  feedbackLog: [],
  growthStats: DEFAULT_GROWTH_STATS,
  archive: [],
  settings: {
    defaultProvider: 'claude',
    quickMode: false,
  },
};

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Get all user data
export function getUserData(): UserData {
  if (!isBrowser) return DEFAULT_USER_DATA;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_USER_DATA;
    
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_USER_DATA, ...parsed };
  } catch {
    return DEFAULT_USER_DATA;
  }
}

// Save all user data
export function saveUserData(data: UserData): void {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}

// API Keys
export function getApiKeys(): ApiKeys {
  return getUserData().apiKeys;
}

export function saveApiKeys(keys: ApiKeys): void {
  const data = getUserData();
  data.apiKeys = keys;
  saveUserData(data);
}

export function hasApiKey(provider: AIProvider): boolean {
  const keys = getApiKeys();
  return provider === 'claude' ? !!keys.claude : !!keys.gemini;
}

// Style Guide (기존 호환성 유지)
export function getStyleGuide(): string {
  return getUserData().styleGuide;
}

export function saveStyleGuide(guide: string): void {
  const data = getUserData();
  data.styleGuide = guide;
  saveUserData(data);
}

// Style Guide Profiles (다중 스타일 가이드)
const STYLE_GUIDES_KEY = 'writing-system-style-guides';
const ACTIVE_STYLE_GUIDE_KEY = 'writing-system-active-style-guide';

export function getStyleGuideProfiles(): StyleGuideProfile[] {
  if (!isBrowser) return [];
  
  try {
    const stored = localStorage.getItem(STYLE_GUIDES_KEY);
    if (!stored) {
      // 기존 스타일 가이드를 기본 프로필로 마이그레이션
      const currentGuide = getStyleGuide();
      const defaultProfile: StyleGuideProfile = {
        id: 'default',
        name: '기본 스타일',
        description: '기본 링크드인 글쓰기 스타일',
        content: currentGuide,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      };
      saveStyleGuideProfiles([defaultProfile]);
      return [defaultProfile];
    }
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveStyleGuideProfiles(profiles: StyleGuideProfile[]): void {
  if (!isBrowser) return;
  localStorage.setItem(STYLE_GUIDES_KEY, JSON.stringify(profiles));
}

export function getActiveStyleGuideId(): string {
  if (!isBrowser) return 'default';
  return localStorage.getItem(ACTIVE_STYLE_GUIDE_KEY) || 'default';
}

export function setActiveStyleGuideId(id: string): void {
  if (!isBrowser) return;
  localStorage.setItem(ACTIVE_STYLE_GUIDE_KEY, id);
  
  // 활성 스타일 가이드의 내용을 기존 styleGuide 필드에도 동기화
  const profiles = getStyleGuideProfiles();
  const activeProfile = profiles.find(p => p.id === id);
  if (activeProfile) {
    saveStyleGuide(activeProfile.content);
  }
}

export function getActiveStyleGuide(): StyleGuideProfile | null {
  const profiles = getStyleGuideProfiles();
  const activeId = getActiveStyleGuideId();
  return profiles.find(p => p.id === activeId) || profiles[0] || null;
}

export function addStyleGuideProfile(profile: Omit<StyleGuideProfile, 'id' | 'createdAt' | 'updatedAt'>): StyleGuideProfile {
  const profiles = getStyleGuideProfiles();
  const newProfile: StyleGuideProfile = {
    ...profile,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  profiles.push(newProfile);
  saveStyleGuideProfiles(profiles);
  return newProfile;
}

export function updateStyleGuideProfile(id: string, updates: Partial<Omit<StyleGuideProfile, 'id' | 'createdAt'>>): void {
  const profiles = getStyleGuideProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index !== -1) {
    profiles[index] = {
      ...profiles[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveStyleGuideProfiles(profiles);
    
    // 활성 스타일 가이드가 업데이트된 경우 동기화
    if (id === getActiveStyleGuideId() && updates.content) {
      saveStyleGuide(updates.content);
    }
  }
}

export function deleteStyleGuideProfile(id: string): boolean {
  const profiles = getStyleGuideProfiles();
  
  // 기본 프로필은 삭제 불가
  const profile = profiles.find(p => p.id === id);
  if (profile?.isDefault) return false;
  
  // 최소 1개는 유지
  if (profiles.length <= 1) return false;
  
  const newProfiles = profiles.filter(p => p.id !== id);
  saveStyleGuideProfiles(newProfiles);
  
  // 삭제된 프로필이 활성 상태였다면 첫 번째 프로필로 변경
  if (getActiveStyleGuideId() === id) {
    setActiveStyleGuideId(newProfiles[0].id);
  }
  
  return true;
}

export function duplicateStyleGuideProfile(id: string, newName: string): StyleGuideProfile | null {
  const profiles = getStyleGuideProfiles();
  const source = profiles.find(p => p.id === id);
  if (!source) return null;
  
  return addStyleGuideProfile({
    name: newName,
    description: source.description ? `${source.description} (복사본)` : undefined,
    content: source.content,
  });
}

// Feedback Log
export function getFeedbackLog(): FeedbackEntry[] {
  return getUserData().feedbackLog;
}

export function addFeedback(entry: FeedbackEntry): void {
  const data = getUserData();
  data.feedbackLog.push(entry);
  saveUserData(data);
  updateGrowthStats();
}

// Archive
export function getArchive(): FinalContent[] {
  return getUserData().archive;
}

export function addToArchive(content: FinalContent): void {
  const data = getUserData();
  data.archive.unshift(content); // Add to beginning
  saveUserData(data);
  updateGrowthStats();
}

export function deleteFromArchive(id: string): void {
  const data = getUserData();
  data.archive = data.archive.filter(item => item.id !== id);
  saveUserData(data);
}

// Growth Stats
export function getGrowthStats(): GrowthStats {
  return getUserData().growthStats;
}

export function updateGrowthStats(): void {
  const data = getUserData();
  const archive = data.archive;
  const feedbackLog = data.feedbackLog;
  
  if (archive.length === 0) return;
  
  // Calculate stats
  const totalContents = archive.length;
  const totalScore = archive.reduce((sum, item) => sum + item.reviewScore, 0);
  const averageScore = Math.round(totalScore / totalContents);
  
  const passedFirstTime = feedbackLog.filter(f => f.passedFirstTime).length;
  const firstPassRate = Math.round((passedFirstTime / Math.max(feedbackLog.length, 1)) * 100);
  
  const highestScoreContent = archive.reduce((max, item) => 
    item.reviewScore > max.reviewScore ? item : max, archive[0]);
  
  // Count topics
  const topicCounts: Record<string, number> = {};
  archive.forEach(item => {
    topicCounts[item.topic] = (topicCounts[item.topic] || 0) + 1;
  });
  const mostCommonTopic = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  
  // Update milestones
  const milestones = {
    firstContent: totalContents >= 1,
    fiveContents: totalContents >= 5,
    avgAbove80: averageScore >= 80,
    firstPassRate50: firstPassRate >= 50,
    tenContents: totalContents >= 10,
    firstPassRate80: firstPassRate >= 80,
  };
  
  data.growthStats = {
    ...data.growthStats,
    totalContents,
    averageScore,
    firstPassRate,
    highestScore: highestScoreContent.reviewScore,
    highestScoreTitle: highestScoreContent.title,
    mostCommonTopic,
    milestones,
  };
  
  saveUserData(data);
}

// Current Session
export function getCurrentSession() {
  return getUserData().currentSession;
}

export function updateCurrentSession(session: Partial<UserData['currentSession']>): void {
  const data = getUserData();
  data.currentSession = { ...data.currentSession, ...session } as UserData['currentSession'];
  saveUserData(data);
}

export function clearCurrentSession(): void {
  const data = getUserData();
  data.currentSession = undefined;
  saveUserData(data);
}

// Settings
export function getSettings() {
  return getUserData().settings;
}

export function updateSettings(settings: Partial<UserData['settings']>): void {
  const data = getUserData();
  data.settings = { ...data.settings, ...settings };
  saveUserData(data);
}

// Reset all data
export function resetAllData(): void {
  if (!isBrowser) return;
  localStorage.removeItem(STORAGE_KEY);
}

// Export data as JSON
export function exportData(): string {
  return JSON.stringify(getUserData(), null, 2);
}

// Import data from JSON
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as UserData;
    saveUserData({ ...DEFAULT_USER_DATA, ...data });
    return true;
  } catch {
    return false;
  }
}

// Confluence/Jira Auth Storage
const CONFLUENCE_STORAGE_KEY = 'aegis-confluence-auth';
const JIRA_STORAGE_KEY = 'aegis-jira-auth';

export interface ConfluenceAuth {
  email: string;
  apiToken: string;
  baseUrl: string;
  spaceKey: string;
}

export interface JiraAuth {
  email: string;
  apiToken: string;
  baseUrl: string;
  projectKey: string;
}

export function getConfluenceAuth(): ConfluenceAuth | null {
  if (!isBrowser) return null;
  try {
    const stored = localStorage.getItem(CONFLUENCE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveConfluenceAuth(auth: ConfluenceAuth): void {
  if (!isBrowser) return;
  localStorage.setItem(CONFLUENCE_STORAGE_KEY, JSON.stringify(auth));
}

export function getJiraAuth(): JiraAuth | null {
  if (!isBrowser) return null;
  try {
    const stored = localStorage.getItem(JIRA_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveJiraAuth(auth: JiraAuth): void {
  if (!isBrowser) return;
  localStorage.setItem(JIRA_STORAGE_KEY, JSON.stringify(auth));
}

export function hasConfluenceAuth(): boolean {
  const auth = getConfluenceAuth();
  return !!(auth?.email && auth?.apiToken);
}

export function hasJiraAuth(): boolean {
  const auth = getJiraAuth();
  return !!(auth?.email && auth?.apiToken);
}

// Chatbot Conversation History Storage
const CHATBOT_HISTORY_KEY = 'aegis-chatbot-history';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: 'claude' | 'gemini';
  sources?: {
    type: 'confluence' | 'jira';
    title: string;
    url: string;
    score?: number;
    matchType?: 'title' | 'content';
  }[];
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export function getChatHistory(): ChatConversation[] {
  if (!isBrowser) return [];
  try {
    const stored = localStorage.getItem(CHATBOT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(history: ChatConversation[]): void {
  if (!isBrowser) return;
  localStorage.setItem(CHATBOT_HISTORY_KEY, JSON.stringify(history));
}

export function addChatConversation(conversation: ChatConversation): void {
  const history = getChatHistory();
  // 최대 50개 대화 유지
  if (history.length >= 50) {
    history.pop(); // 가장 오래된 것 제거
  }
  history.unshift(conversation); // 최신 것을 앞에 추가
  saveChatHistory(history);
}

export function updateChatConversation(id: string, updates: Partial<ChatConversation>): void {
  const history = getChatHistory();
  const index = history.findIndex(c => c.id === id);
  if (index !== -1) {
    history[index] = {
      ...history[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveChatHistory(history);
  }
}

export function deleteChatConversation(id: string): void {
  const history = getChatHistory();
  const filtered = history.filter(c => c.id !== id);
  saveChatHistory(filtered);
}

export function getChatConversation(id: string): ChatConversation | null {
  const history = getChatHistory();
  return history.find(c => c.id === id) || null;
}

export function clearAllChatHistory(): void {
  if (!isBrowser) return;
  localStorage.removeItem(CHATBOT_HISTORY_KEY);
}