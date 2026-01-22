'use client';

import { useState, useEffect } from 'react';
import { Header, Background } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PhaseIndicator, StrategyPanel, DraftPanel, ReviewPanel, FinalContentPanel, ReferencePanel } from '@/components/writing';
import { WritingPhase, Strategy, Draft, FinalContent, ReferenceItem, StyleGuideProfile } from '@/types';
import { 
  getStyleGuide, 
  saveStyleGuide,
  getSettings, 
  addToArchive, 
  addFeedback,
  getApiKeys,
  getCurrentSession,
  updateCurrentSession,
  clearCurrentSession,
  getStyleGuideProfiles,
  getActiveStyleGuideId,
  setActiveStyleGuideId,
  getActiveStyleGuide,
} from '@/lib/storage';
import { sendChatMessage, getActiveApiKey } from '@/lib/api-client';
import {
  strategistSystemPrompt,
  createStrategistPrompt,
  parseStrategyResponse,
  styleAnalyzerSystemPrompt,
  createStyleAnalyzerPrompt,
  contentWriterSystemPrompt,
  createContentWriterPrompt,
  parseContentWriterResponse,
  contentReviewerSystemPrompt,
  createContentReviewerPrompt,
  parseContentReviewerResponse,
  proofreaderSystemPrompt,
  createProofreaderPrompt,
  parseProofreaderResponse,
  styleLearnerSystemPrompt,
  createFeedbackAnalysisPrompt,
} from '@/lib/agents';
import { PenTool, Sparkles, AlertCircle, Zap, RotateCcw, Save, BookOpen, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function WritePage() {
  const [phase, setPhase] = useState<WritingPhase>('idle');
  const [completedPhases, setCompletedPhases] = useState<WritingPhase[]>([]);
  const [topic, setTopic] = useState('');
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [selectedHook, setSelectedHook] = useState<number | undefined>();
  const [stylePoints, setStylePoints] = useState<string>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [review, setReview] = useState<any>(null);
  const [finalContent, setFinalContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickMode, setQuickMode] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [hasApiKeyState, setHasApiKeyState] = useState<boolean | null>(null); // null = loading
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [showSessionRestore, setShowSessionRestore] = useState(false);
  
  // 참조 자료 상태
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [useReferences, setUseReferences] = useState(true);
  
  // 스타일 가이드 선택 상태
  const [styleGuideProfiles, setStyleGuideProfiles] = useState<StyleGuideProfile[]>([]);
  const [selectedStyleGuideId, setSelectedStyleGuideId] = useState<string>('');
  const [showStyleGuideDropdown, setShowStyleGuideDropdown] = useState(false);

  // 세션 복원 체크
  useEffect(() => {
    const settings = getSettings();
    setQuickMode(settings.quickMode);
    
    // Check API key on client side only
    const keys = getApiKeys();
    setHasApiKeyState(!!(keys.claude || keys.gemini));

    // 저장된 세션이 있는지 확인
    const savedSession = getCurrentSession();
    if (savedSession && savedSession.phase !== 'idle' && !hasRestoredSession) {
      setShowSessionRestore(true);
    }
    
    // 스타일 가이드 프로필 로드
    const profiles = getStyleGuideProfiles();
    setStyleGuideProfiles(profiles);
    setSelectedStyleGuideId(getActiveStyleGuideId());
  }, [hasRestoredSession]);

  // 스타일 가이드 선택 핸들러
  const handleSelectStyleGuide = (profileId: string) => {
    setSelectedStyleGuideId(profileId);
    setActiveStyleGuideId(profileId);
    setShowStyleGuideDropdown(false);
  };

  // 선택된 스타일 가이드 가져오기
  const getSelectedStyleGuide = (): string => {
    const profile = styleGuideProfiles.find(p => p.id === selectedStyleGuideId);
    return profile?.content || getStyleGuide();
  };

  const selectedStyleGuideProfile = styleGuideProfiles.find(p => p.id === selectedStyleGuideId);

  // 세션 자동 저장 (상태 변경 시)
  useEffect(() => {
    if (phase !== 'idle' && hasRestoredSession !== false) {
      // 진행 중인 세션 저장
      updateCurrentSession({
        phase,
        topic: topic || undefined,
        strategy: strategy || undefined,
        draft: draft || undefined,
        review: review || undefined,
      });
    }
  }, [phase, topic, strategy, draft, review, hasRestoredSession]);

  // 세션 복원 함수
  const restoreSession = () => {
    const savedSession = getCurrentSession();
    if (savedSession) {
      setPhase(savedSession.phase || 'idle');
      setTopic(savedSession.topic || '');
      setStrategy(savedSession.strategy || null);
      setDraft(savedSession.draft || null);
      setReview(savedSession.review || null);
      
      // 완료된 단계 복원
      const completed: WritingPhase[] = [];
      if (savedSession.strategy) completed.push('strategy');
      if (savedSession.draft) {
        if (!quickMode) completed.push('style');
        completed.push('writing');
      }
      if (savedSession.review) completed.push('review');
      setCompletedPhases(completed);
      
      setHasRestoredSession(true);
      setShowSessionRestore(false);
    }
  };

  // 세션 무시 함수
  const discardSession = () => {
    clearCurrentSession();
    setShowSessionRestore(false);
    setHasRestoredSession(true);
  };

  // 참조 자료 관리 함수
  const handleAddReference = (ref: Omit<ReferenceItem, 'id' | 'addedAt'>) => {
    const newRef: ReferenceItem = {
      ...ref,
      id: Date.now().toString(),
      addedAt: new Date().toISOString(),
    };
    setReferences(prev => [...prev, newRef]);
  };

  const handleRemoveReference = (id: string) => {
    setReferences(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleUseReferences = () => {
    setUseReferences(prev => !prev);
  };

  // 참조 자료를 프롬프트에 포함하는 함수
  // 토큰 제한을 피하기 위해 각 참조 자료의 내용을 제한합니다
  const MAX_CONTENT_LENGTH = 3000; // 각 참조 자료당 최대 글자 수
  const MAX_TOTAL_REFERENCE_LENGTH = 15000; // 전체 참조 자료 최대 글자 수
  
  const buildReferenceContext = (): string => {
    if (!useReferences || references.length === 0) return '';

    let totalLength = 0;
    const refContents: string[] = [];
    
    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
      
      // 각 참조 자료의 내용을 제한
      let content = ref.content || '';
      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH) + '\n\n... (내용이 너무 길어 일부만 포함됨)';
      }
      
      const refText = `### 참조 자료 ${i + 1}: ${ref.name}
타입: ${ref.type}
${ref.url ? `URL: ${ref.url}` : ''}

내용:
${content}
`;
      
      // 전체 길이 체크
      if (totalLength + refText.length > MAX_TOTAL_REFERENCE_LENGTH) {
        refContents.push(`\n\n(참조 자료가 너무 많아 ${references.length - i}개는 생략됨)`);
        break;
      }
      
      refContents.push(refText);
      totalLength += refText.length;
    }

    if (refContents.length === 0) return '';

    return `
## 참조 자료
아래 참조 자료를 바탕으로 글을 작성해주세요. 참조 자료의 핵심 내용과 인사이트를 활용하되, 그대로 복사하지 말고 재해석하여 작성해주세요.

${refContents.join('\n---\n')}
`;
  };

  const callAI = async (systemPrompt: string, userMessage: string): Promise<string | null> => {
    const activeKey = getActiveApiKey();
    if (!activeKey) {
      setError('API 키가 설정되지 않았습니다. 설정 페이지에서 API 키를 입력해주세요.');
      return null;
    }

    const response = await sendChatMessage({
      provider: activeKey.provider,
      apiKey: activeKey.apiKey,
      systemPrompt,
      userMessage,
    });

    if (response.error) {
      setError(response.error);
      return null;
    }

    return response.content || null;
  };

  // Phase 1: Strategy
  const handleStartWriting = async () => {
    if (!topic.trim()) {
      setError('주제를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setPhase('strategy');

    try {
      const styleGuide = getSelectedStyleGuide();
      const referenceContext = buildReferenceContext();
      const userMessage = createStrategistPrompt(topic, styleGuide) + referenceContext;
      const response = await callAI(strategistSystemPrompt, userMessage);

      if (response) {
        const parsed = parseStrategyResponse(response);
        if (parsed) {
          setStrategy(parsed);
        } else {
          setError('기획안 파싱에 실패했습니다. 다시 시도해주세요.');
        }
      }
    } catch (err) {
      setError('기획안 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate specific section
  const handleRegenerateSection = async (section: 'targetAudience' | 'hooks' | 'valueProposition' | 'cta') => {
    if (!strategy || !topic) return;

    setRegeneratingSection(section);
    setError(null);

    try {
      const styleGuide = getSelectedStyleGuide();
      let prompt = '';
      
      switch (section) {
        case 'targetAudience':
          prompt = `주제: "${topic}"

현재 기획안의 다른 부분:
- Hook 후보: ${strategy.hooks.join(', ')}
- 핵심 가치: ${strategy.valueProposition}
- CTA: ${strategy.cta}

위 주제에 대해 새로운 타겟 독자를 제안해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "primary": "주요 타겟 (구체적인 직군/레벨)",
  "secondary": "부차 타겟",
  "painPoint": "이들이 이 글에서 찾는 것"
}
\`\`\``;
          break;
          
        case 'hooks':
          prompt = `주제: "${topic}"
타겟 독자: ${strategy.targetAudience.primary}
Pain Point: ${strategy.targetAudience.painPoint}

위 주제와 타겟에 맞는 새로운 Hook 3개를 제안해주세요.
각각 다른 스타일(충격/질문형, 경험/스토리형, 데이터/통계형)로 작성해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "hooks": [
    "충격/질문형 Hook 문장",
    "경험/스토리형 Hook 문장", 
    "데이터/통계형 Hook 문장"
  ]
}
\`\`\``;
          break;
          
        case 'valueProposition':
          prompt = `주제: "${topic}"
타겟 독자: ${strategy.targetAudience.primary}
Pain Point: ${strategy.targetAudience.painPoint}

위 주제와 타겟에 맞는 새로운 핵심 가치(Value Proposition)를 제안해주세요.
독자가 이 글을 읽고 얻어갈 구체적인 인사이트/교훈/방법을 설명해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "valueProposition": "핵심 가치 설명"
}
\`\`\``;
          break;
          
        case 'cta':
          prompt = `주제: "${topic}"
타겟 독자: ${strategy.targetAudience.primary}
핵심 가치: ${strategy.valueProposition}

위 주제와 핵심 가치에 맞는 새로운 CTA(Call to Action)를 제안해주세요.
독자의 댓글, 공유, DM 등의 반응을 유도하는 문장을 작성해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "cta": "CTA 문장"
}
\`\`\``;
          break;
      }

      const response = await callAI(strategistSystemPrompt, prompt);
      
      if (response) {
        try {
          // Extract JSON from response
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                           response.match(/```\s*([\s\S]*?)\s*```/) ||
                           response.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonStr);
            
            const newStrategy = { ...strategy };
            
            switch (section) {
              case 'targetAudience':
                if (parsed.primary && parsed.secondary && parsed.painPoint) {
                  newStrategy.targetAudience = parsed;
                }
                break;
              case 'hooks':
                if (parsed.hooks && Array.isArray(parsed.hooks)) {
                  newStrategy.hooks = parsed.hooks;
                  setSelectedHook(undefined);
                }
                break;
              case 'valueProposition':
                if (parsed.valueProposition) {
                  newStrategy.valueProposition = parsed.valueProposition;
                }
                break;
              case 'cta':
                if (parsed.cta) {
                  newStrategy.cta = parsed.cta;
                }
                break;
            }
            
            setStrategy(newStrategy);
          } else {
            setError('응답 파싱에 실패했습니다. 다시 시도해주세요.');
          }
        } catch (parseErr) {
          console.error('Parse error:', parseErr);
          setError('응답 파싱에 실패했습니다. 다시 시도해주세요.');
        }
      }
    } catch (err) {
      setError('재생성 중 오류가 발생했습니다.');
    } finally {
      setRegeneratingSection(null);
    }
  };

  // Handle strategy change from panel
  const handleStrategyChange = (newStrategy: Strategy) => {
    setStrategy(newStrategy);
  };

  // Phase 2 & 3: Style Analysis & Writing
  const handleApproveStrategy = async () => {
    if (selectedHook === undefined || !strategy) return;

    setLoading(true);
    setError(null);
    
    try {
      const styleGuide = getSelectedStyleGuide();
      
      // Phase 2: Style Analysis (skip in quick mode)
      if (!quickMode) {
        setPhase('style');
        setCompletedPhases(prev => [...prev, 'strategy']);
        
        const styleMessage = createStyleAnalyzerPrompt(JSON.stringify(strategy), styleGuide);
        const styleResponse = await callAI(styleAnalyzerSystemPrompt, styleMessage);
        if (styleResponse) {
          setStylePoints(styleResponse);
        }
      } else {
        setCompletedPhases(prev => [...prev, 'strategy']);
      }

      // Phase 3: Writing
      setPhase('writing');
      if (!quickMode) {
        setCompletedPhases(prev => [...prev, 'style']);
      }

      const referenceContext = buildReferenceContext();
      const writeMessage = createContentWriterPrompt(
        JSON.stringify(strategy),
        styleGuide,
        stylePoints || '기본 스타일 적용',
        selectedHook
      ) + referenceContext;
      const writeResponse = await callAI(contentWriterSystemPrompt, writeMessage);

      if (writeResponse) {
        const parsed = parseContentWriterResponse(writeResponse);
        if (parsed) {
          setDraft(parsed);
          setCompletedPhases(prev => [...prev, 'writing']);
        } else {
          // If parsing failed, try to show raw response as draft
          console.log('Raw write response:', writeResponse);
          setError('AI 응답 형식이 예상과 다릅니다. 다시 시도해주세요.');
          setPhase('strategy'); // Go back to strategy phase
        }
      }
    } catch (err) {
      setError('콘텐츠 작성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Phase 4: Review
  const handleReviewDraft = async () => {
    if (!draft || !strategy) return;

    // Skip review in quick mode
    if (quickMode) {
      handleProofread();
      return;
    }

    setLoading(true);
    setError(null);
    setPhase('review');

    try {
      const styleGuide = getSelectedStyleGuide();
      const reviewMessage = createContentReviewerPrompt(
        JSON.stringify(draft),
        JSON.stringify(strategy),
        styleGuide
      );
      const reviewResponse = await callAI(contentReviewerSystemPrompt, reviewMessage);

      if (reviewResponse) {
        const parsed = parseContentReviewerResponse(reviewResponse);
        if (parsed) {
          setReview(parsed);
          setCompletedPhases(prev => [...prev, 'review']);
        } else {
          setError('검토 결과 파싱에 실패했습니다.');
        }
      }
    } catch (err) {
      setError('검토 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Phase 5: Proofread
  const handleProofread = async () => {
    if (!draft) return;

    setLoading(true);
    setError(null);
    setPhase('proofread');

    try {
      const styleGuide = getSelectedStyleGuide();
      const proofMessage = createProofreaderPrompt(JSON.stringify(draft), styleGuide);
      const proofResponse = await callAI(proofreaderSystemPrompt, proofMessage);

      if (proofResponse) {
        const parsed = parseProofreaderResponse(proofResponse);
        if (parsed) {
          setFinalContent(parsed);
          setCompletedPhases(prev => [...prev, 'proofread']);
        } else {
          setError('교정 결과 파싱에 실패했습니다.');
        }
      }
    } catch (err) {
      setError('교정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Rewrite draft
  const handleRewrite = async () => {
    if (!draft || !review) return;

    setLoading(true);
    setError(null);
    setPhase('writing');

    try {
      const styleGuide = getSelectedStyleGuide();
      const rewriteMessage = `이전 초안과 검토 피드백을 바탕으로 수정해주세요.

## 이전 초안
${JSON.stringify(draft)}

## 검토 피드백
${JSON.stringify(review.improvements)}

## 스타일 가이드
${styleGuide}`;

      const response = await callAI(contentWriterSystemPrompt, rewriteMessage);
      if (response) {
        const parsed = parseContentWriterResponse(response);
        if (parsed) {
          setDraft(parsed);
          setReview(null);
        }
      }
    } catch (err) {
      setError('재작성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Save to archive
  const handleSave = () => {
    if (!finalContent || !strategy) return;

    const content: FinalContent = {
      id: Date.now().toString(),
      title: finalContent.title,
      content: finalContent.content,
      hashtags: finalContent.hashtags,
      createdAt: new Date().toISOString(),
      stats: finalContent.stats,
      reviewScore: review?.totalScore || 85,
      topic: strategy.topic,
    };

    addToArchive(content);
  };

  // Submit feedback
  const handleFeedback = async (type: 'positive' | 'negative', feedback: string): Promise<{ success: boolean; message: string }> => {
    if (!finalContent) return { success: false, message: '콘텐츠가 없습니다.' };

    setPhase('learning');
    setLoading(true);

    try {
      const feedbackEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        contentId: finalContent.title,
        contentTitle: finalContent.title,
        satisfied: type === 'positive' ? [feedback] : [],
        unsatisfied: type === 'negative' ? [feedback] : [],
        reviewScore: review?.totalScore || 85,
        passedFirstTime: review?.passed ?? true,
      };

      addFeedback(feedbackEntry);

      // Analyze feedback and update style guide
      const styleGuide = getSelectedStyleGuide();
      const analysisMessage = createFeedbackAnalysisPrompt(feedback, finalContent.title, styleGuide);
      const response = await callAI(styleLearnerSystemPrompt, analysisMessage);
      
      if (response) {
        // Parse the response and update style guide
        const analysis = parseFeedbackAnalysis(response);
        if (analysis) {
          // Update style guide with new preferences
          let updatedGuide = styleGuide;
          
          if (analysis.styleGuideUpdates.addToPreferred.length > 0) {
            // Add to preferred expressions section
            const preferredSection = '## 선호하는 표현';
            const newPreferred = analysis.styleGuideUpdates.addToPreferred.map(p => `- ${p}`).join('\n');
            if (updatedGuide.includes(preferredSection)) {
              updatedGuide = updatedGuide.replace(
                preferredSection,
                `${preferredSection}\n\n### 최근 추가된 선호 표현\n${newPreferred}\n`
              );
            }
          }
          
          if (analysis.styleGuideUpdates.addToForbidden.length > 0) {
            // Add to forbidden expressions section
            const forbiddenSection = '## 피해야 할 표현';
            const newForbidden = analysis.styleGuideUpdates.addToForbidden.map(f => `- ${f}`).join('\n');
            if (updatedGuide.includes(forbiddenSection)) {
              updatedGuide = updatedGuide.replace(
                forbiddenSection,
                `${forbiddenSection}\n\n### 최근 추가된 금지 표현\n${newForbidden}\n`
              );
            }
          }
          
          // Update last modified date
          const dateStr = new Date().toLocaleDateString('ko-KR');
          updatedGuide = updatedGuide.replace(
            /\*마지막 업데이트:.*\*/,
            `*마지막 업데이트: ${dateStr}*`
          );
          
          saveStyleGuide(updatedGuide);
          setCompletedPhases(prev => [...prev, 'learning']);
          
          return { 
            success: true, 
            message: analysis.encouragement || '피드백이 스타일 가이드에 반영되었습니다!' 
          };
        }
      }
      
      return { success: true, message: '피드백이 저장되었습니다.' };
    } catch (err) {
      console.error('Feedback analysis failed:', err);
      return { success: false, message: '피드백 분석 중 오류가 발생했습니다.' };
    } finally {
      setLoading(false);
    }
  };
  
  // Parse feedback analysis response
  interface FeedbackAnalysisResult {
    styleGuideUpdates: {
      addToPreferred: string[];
      addToForbidden: string[];
      otherSuggestions?: string[];
    };
    encouragement?: string;
  }
  
  const parseFeedbackAnalysis = (response: string): FeedbackAnalysisResult | null => {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/```\s*([\s\S]*?)\s*```/) ||
                       response.match(/\{[\s\S]*"styleGuideUpdates"[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      return JSON.parse(response);
    } catch {
      console.error('Failed to parse feedback analysis');
      return null;
    }
  };

  // Reset
  const handleReset = () => {
    setPhase('idle');
    setCompletedPhases([]);
    setTopic('');
    setStrategy(null);
    setSelectedHook(undefined);
    setStylePoints('');
    setDraft(null);
    setReview(null);
    setFinalContent(null);
    setError(null);
    // 참조 자료 초기화
    setReferences([]);
    setUseReferences(true);
    // 세션 클리어
    clearCurrentSession();
  };

  return (
    <Background>
      <Header 
        title="글쓰기" 
        subtitle={phase === 'idle' ? '새로운 글 쓰기를 시작합니다' : `Phase: ${phase}`} 
      />

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Session Restore Banner */}
          {showSessionRestore && (
            <div className="mb-6 p-4 rounded-lg bg-[var(--info)]/20 border border-[var(--info)]/30 flex items-center gap-3 animate-fade-in">
              <Save className="w-5 h-5 text-[var(--info)]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">이전 작업이 저장되어 있습니다</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  이어서 작업하시겠습니까?
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={restoreSession} icon={<RotateCcw className="w-4 h-4" />}>
                  이어서 작업
                </Button>
                <Button size="sm" variant="ghost" onClick={discardSession}>
                  새로 시작
                </Button>
              </div>
            </div>
          )}

          {/* API Key Warning - only show after client-side check */}
          {hasApiKeyState === false && (
            <div className="mb-6 p-4 rounded-lg bg-[var(--warning)]/20 border border-[var(--warning)]/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--warning)]" />
              <div className="flex-1">
                <p className="text-sm text-[var(--warning)]">API 키가 설정되지 않았습니다.</p>
              </div>
              <Link href="/writing/settings">
                <Button size="sm">설정으로 이동</Button>
              </Link>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-[var(--error)]/20 border border-[var(--error)]/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--error)]" />
              <p className="text-sm text-[var(--error)]">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-[var(--error)] hover:underline text-sm">
                닫기
              </button>
            </div>
          )}

          <div className="flex gap-6">
            {/* Left Panel - Phase Indicator */}
            <div className="w-64 flex-shrink-0">
              <Card className="sticky top-24">
                <CardContent className="p-4">
                  <PhaseIndicator 
                    currentPhase={phase} 
                    completedPhases={completedPhases}
                    quickMode={quickMode}
                  />
                  
                  {phase !== 'idle' && (
                    <div className="mt-6 pt-4 border-t border-[var(--border-primary)]">
                      <Button variant="ghost" size="sm" onClick={handleReset} className="w-full">
                        처음부터 다시
                      </Button>
                    </div>
                  )}

                  {quickMode && (
                    <div className="mt-4 p-2 rounded bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30">
                      <div className="flex items-center gap-2 text-xs text-[var(--accent-primary)]">
                        <Zap className="w-3 h-3" />
                        빠른 모드
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Idle State - Topic Input */}
              {phase === 'idle' && (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center mx-auto mb-4">
                        <PenTool className="w-8 h-8 text-[var(--bg-primary)]" />
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                        새 글 작성하기
                      </h2>
                      <p className="text-[var(--text-secondary)]">
                        작성하고 싶은 주제를 입력하면 AI가 기획부터 교정까지 도와드립니다.
                      </p>
                    </div>

                    <div className="max-w-xl mx-auto space-y-4">
                      <Textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="예: 개발자 번아웃 극복 경험, 주니어 개발자를 위한 코드 리뷰 팁..."
                        rows={4}
                        className="text-lg"
                      />

                      {/* 스타일 가이드 선택 */}
                      <div className="relative">
                        <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
                          스타일 가이드
                        </label>
                        <button
                          onClick={() => setShowStyleGuideDropdown(!showStyleGuideDropdown)}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)]/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span className="text-sm text-[var(--text-primary)]">
                              {selectedStyleGuideProfile?.name || '스타일 가이드 선택'}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showStyleGuideDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showStyleGuideDropdown && (
                          <div className="absolute z-10 w-full mt-1 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-lg">
                            {styleGuideProfiles.map((profile) => (
                              <button
                                key={profile.id}
                                onClick={() => handleSelectStyleGuide(profile.id)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between ${
                                  profile.id === selectedStyleGuideId ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
                                }`}
                              >
                                <div>
                                  <p className="font-medium">{profile.name}</p>
                                  {profile.description && (
                                    <p className="text-xs text-[var(--text-muted)]">{profile.description}</p>
                                  )}
                                </div>
                                {profile.id === selectedStyleGuideId && (
                                  <Badge variant="accent" size="sm">선택됨</Badge>
                                )}
                              </button>
                            ))}
                            <div className="border-t border-[var(--border-primary)] mt-1 pt-1">
                              <Link
                                href="/writing/style-guide"
                                className="block px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-primary)]"
                              >
                                + 새 스타일 가이드 만들기
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 참조 자료 패널 */}
                      <ReferencePanel
                        references={references}
                        onAddReference={handleAddReference}
                        onRemoveReference={handleRemoveReference}
                        useReferences={useReferences}
                        onToggleUseReferences={handleToggleUseReferences}
                        disabled={loading}
                      />
                      
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleStartWriting}
                          disabled={!topic.trim() || loading || hasApiKeyState === false || hasApiKeyState === null}
                          loading={loading}
                          icon={<Sparkles className="w-4 h-4" />}
                          className="flex-1"
                        >
                          기획 시작 {useReferences && references.length > 0 && `(참조 ${references.length}개)`}
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-4">
                        <p className="text-xs text-[var(--text-muted)] w-full mb-2">추천 주제:</p>
                        {['개발자 성장기', '기술 면접 팁', '팀 협업 경험', '사이드 프로젝트'].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setTopic(suggestion)}
                            className="px-3 py-1.5 rounded-full text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Strategy Phase */}
              {phase === 'strategy' && strategy && (
                <StrategyPanel
                  strategy={strategy}
                  onStrategyChange={handleStrategyChange}
                  onRegenerateSection={handleRegenerateSection}
                  onSelectHook={setSelectedHook}
                  onApprove={handleApproveStrategy}
                  selectedHook={selectedHook}
                  loading={loading}
                  regeneratingSection={regeneratingSection}
                />
              )}

              {/* Writing Phase */}
              {(phase === 'style' || phase === 'writing') && !draft && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-pulse">
                      <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center mx-auto mb-4">
                        <PenTool className="w-8 h-8 text-[var(--accent-primary)]" />
                      </div>
                      <p className="text-[var(--text-secondary)]">
                        {phase === 'style' ? '스타일 분석 중...' : '초안 작성 중...'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Draft Phase */}
              {draft && !review && phase !== 'proofread' && !finalContent && (
                <DraftPanel
                  draft={draft}
                  onApprove={handleReviewDraft}
                  loading={loading}
                />
              )}

              {/* Review Phase */}
              {phase === 'review' && review && (
                <ReviewPanel
                  review={review}
                  onProceed={handleProofread}
                  onRewrite={handleRewrite}
                  loading={loading}
                />
              )}

              {/* Proofread Phase - Loading */}
              {phase === 'proofread' && !finalContent && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-pulse">
                      <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center mx-auto mb-4">
                        <PenTool className="w-8 h-8 text-[var(--accent-primary)]" />
                      </div>
                      <p className="text-[var(--text-secondary)]">최종 교정 중...</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Final Content */}
              {finalContent && (
                <FinalContentPanel
                  title={finalContent.title}
                  content={finalContent.content}
                  hashtags={finalContent.hashtags}
                  corrections={finalContent.corrections || []}
                  stats={finalContent.stats}
                  publishRecommendation={finalContent.publishRecommendation}
                  onSave={handleSave}
                  onFeedback={handleFeedback}
                  loading={loading}
                />
              )}
            </div>

            {/* Right Panel - Style Guide Preview */}
            <div className="w-72 flex-shrink-0 hidden xl:block">
              <Card className="sticky top-24">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">스타일 가이드 요약</h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-[var(--text-muted)] mb-1">문체</p>
                      <p className="text-[var(--text-secondary)]">친근하지만 전문적</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-muted)] mb-1">문장 길이</p>
                      <p className="text-[var(--text-secondary)]">20자 이내 권장</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-muted)] mb-1">글자 수</p>
                      <p className="text-[var(--text-secondary)]">800-1,200자</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-muted)] mb-1">해시태그</p>
                      <p className="text-[var(--text-secondary)]">3-5개</p>
                    </div>
                  </div>
                  <Link href="/writing/style-guide" className="block mt-4">
                    <Button variant="ghost" size="sm" className="w-full">
                      전체 가이드 보기
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Background>
  );
}
