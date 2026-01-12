'use client';

import { useState, useEffect } from 'react';
import { Header, Background } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress, ScoreDisplay } from '@/components/ui/Progress';
import { getGrowthStats, getArchive, getFeedbackLog, getApiKeys, getSettings } from '@/lib/storage';
import { sendChatMessage } from '@/lib/api-client';
import { styleLearnerSystemPrompt, createGrowthReportPrompt, parseGrowthReportResponse, GrowthReport } from '@/lib/agents/styleLearner';
import { GrowthStats, FinalContent, FeedbackEntry } from '@/types';
import { 
  TrendingUp, 
  Award, 
  Target, 
  Zap, 
  Star,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Calendar,
  Sparkles,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

export default function GrowthPage() {
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [archive, setArchive] = useState<FinalContent[]>([]);
  const [feedbackLog, setFeedbackLog] = useState<FeedbackEntry[]>([]);
  const [aiReport, setAiReport] = useState<GrowthReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    setStats(getGrowthStats());
    setArchive(getArchive());
    setFeedbackLog(getFeedbackLog());
    
    // Check if API key exists
    const keys = getApiKeys();
    setHasApiKey(!!(keys.claude || keys.gemini));
  }, []);

  // AI 분석 실행
  const handleAIAnalysis = async () => {
    if (archive.length < 1) {
      setAnalysisError('분석을 위해 최소 1개 이상의 글이 필요합니다.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const keys = getApiKeys();
      const settings = getSettings();
      const provider = settings.defaultProvider;
      const apiKey = provider === 'claude' ? keys.claude : keys.gemini;

      if (!apiKey) {
        setAnalysisError('API 키가 설정되지 않았습니다. 설정 페이지에서 API 키를 입력해주세요.');
        return;
      }

      // 아카이브와 피드백 로그를 요약하여 프롬프트 생성
      const archiveSummary = archive.map(c => ({
        title: c.title,
        topic: c.topic,
        score: c.reviewScore,
        date: c.createdAt,
        charCount: c.stats?.charCount || 0,
      }));

      const feedbackSummary = feedbackLog.map(f => ({
        contentTitle: f.contentTitle,
        satisfied: f.satisfied,
        unsatisfied: f.unsatisfied,
        score: f.reviewScore,
        passedFirstTime: f.passedFirstTime,
      }));

      const prompt = createGrowthReportPrompt(
        JSON.stringify(feedbackSummary, null, 2),
        JSON.stringify(archiveSummary, null, 2)
      );

      const response = await sendChatMessage({
        provider,
        apiKey,
        systemPrompt: styleLearnerSystemPrompt,
        userMessage: prompt,
      });

      if (response.error) {
        setAnalysisError(response.error);
        return;
      }

      if (response.content) {
        const parsed = parseGrowthReportResponse(response.content);
        if (parsed) {
          setAiReport(parsed);
        } else {
          setAnalysisError('AI 응답 파싱에 실패했습니다. 다시 시도해주세요.');
        }
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setAnalysisError('분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!stats || archive.length === 0) {
    return (
      <Background>
        <Header title="성장 리포트" subtitle="글쓰기 성장을 추적하고 분석합니다" />
        <div className="p-8 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                아직 데이터가 부족합니다
              </h3>
              <p className="text-[var(--text-secondary)]">
                최소 1개 이상의 글을 작성하면 성장 리포트를 확인할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </Background>
    );
  }

  // Calculate score distribution
  const scoreRanges = {
    excellent: archive.filter(c => c.reviewScore >= 90).length,
    good: archive.filter(c => c.reviewScore >= 80 && c.reviewScore < 90).length,
    average: archive.filter(c => c.reviewScore >= 70 && c.reviewScore < 80).length,
    needsWork: archive.filter(c => c.reviewScore < 70).length,
  };

  return (
    <Background>
      <Header title="성장 리포트" subtitle="글쓰기 성장을 추적하고 분석합니다" />

      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalContents}</p>
                  <p className="text-sm text-[var(--text-muted)]">총 작성 글</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--info)]/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-[var(--info)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.averageScore}점</p>
                  <p className="text-sm text-[var(--text-muted)]">평균 점수</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--warning)]/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-[var(--warning)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.highestScore}점</p>
                  <p className="text-sm text-[var(--text-muted)]">최고 점수</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--success)]/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[var(--success)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.firstPassRate}%</p>
                  <p className="text-sm text-[var(--text-muted)]">1회 합격률</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>점수 분포</CardTitle>
              <CardDescription>작성한 글의 점수 분포를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="success" className="w-20 justify-center">90+</Badge>
                <Progress value={(scoreRanges.excellent / stats.totalContents) * 100} className="flex-1" />
                <span className="text-sm text-[var(--text-muted)] w-8">{scoreRanges.excellent}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="info" className="w-20 justify-center">80-89</Badge>
                <Progress value={(scoreRanges.good / stats.totalContents) * 100} className="flex-1" />
                <span className="text-sm text-[var(--text-muted)] w-8">{scoreRanges.good}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="warning" className="w-20 justify-center">70-79</Badge>
                <Progress value={(scoreRanges.average / stats.totalContents) * 100} className="flex-1" />
                <span className="text-sm text-[var(--text-muted)] w-8">{scoreRanges.average}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="error" className="w-20 justify-center">&lt;70</Badge>
                <Progress value={(scoreRanges.needsWork / stats.totalContents) * 100} className="flex-1" />
                <span className="text-sm text-[var(--text-muted)] w-8">{scoreRanges.needsWork}</span>
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>마일스톤</CardTitle>
              <CardDescription>달성한 목표와 다음 목표를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <MilestoneRow
                  title="첫 글 완성"
                  achieved={stats.milestones.firstContent}
                />
                <MilestoneRow
                  title="5개 글 달성"
                  achieved={stats.milestones.fiveContents}
                  current={stats.totalContents}
                  target={5}
                />
                <MilestoneRow
                  title="평균 80점 이상"
                  achieved={stats.milestones.avgAbove80}
                  current={stats.averageScore}
                  target={80}
                  unit="점"
                />
                <MilestoneRow
                  title="1회 합격률 50%"
                  achieved={stats.milestones.firstPassRate50}
                  current={stats.firstPassRate}
                  target={50}
                  unit="%"
                />
                <MilestoneRow
                  title="10개 글 달성"
                  achieved={stats.milestones.tenContents}
                  current={stats.totalContents}
                  target={10}
                />
                <MilestoneRow
                  title="1회 합격률 80%"
                  achieved={stats.milestones.firstPassRate80}
                  current={stats.firstPassRate}
                  target={80}
                  unit="%"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[var(--warning)]" />
                강점
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.strengths.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">
                  더 많은 글을 작성하면 강점을 분석해드립니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.strengths.map((strength, index) => (
                    <div key={index} className="p-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30">
                      <p className="font-medium text-[var(--text-primary)]">{strength.point}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{strength.evidence}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-2">발견: {strength.contentTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Improvements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[var(--warning)]" />
                개선 기회
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.improvements.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">
                  더 많은 글을 작성하면 개선점을 분석해드립니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.improvements.map((improvement, index) => (
                    <div key={index} className="p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[var(--text-primary)]">{improvement.issue}</p>
                        <Badge variant="warning" size="sm">{improvement.frequency}회</Badge>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{improvement.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Analysis Section */}
        <Card variant="highlight">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
                  AI 성장 분석
                </CardTitle>
                <CardDescription>
                  AI가 글쓰기 패턴을 분석하고 맞춤형 조언을 제공합니다
                </CardDescription>
              </div>
              <Button
                onClick={handleAIAnalysis}
                loading={isAnalyzing}
                disabled={!hasApiKey || archive.length < 1}
                icon={isAnalyzing ? undefined : <RefreshCw className="w-4 h-4" />}
              >
                {isAnalyzing ? '분석 중...' : aiReport ? '다시 분석' : 'AI 분석 시작'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!hasApiKey && (
              <div className="p-4 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-sm text-[var(--warning)]">
                AI 분석을 사용하려면 설정 페이지에서 API 키를 입력해주세요.
              </div>
            )}
            
            {analysisError && (
              <div className="p-4 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/30 text-sm text-[var(--error)]">
                {analysisError}
              </div>
            )}

            {aiReport && (
              <div className="space-y-6 animate-fade-in">
                {/* Next Advice */}
                <div className="p-4 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-[var(--accent-primary)] mt-0.5" />
                    <div>
                      <p className="font-medium text-[var(--text-primary)] mb-1">다음 글을 위한 조언</p>
                      <p className="text-sm text-[var(--text-secondary)]">{aiReport.nextAdvice}</p>
                    </div>
                  </div>
                </div>

                {/* AI Detected Strengths */}
                {aiReport.strengths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-[var(--success)]" />
                      AI가 발견한 강점
                    </h4>
                    <div className="space-y-2">
                      {aiReport.strengths.map((strength, index) => (
                        <div key={index} className="p-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30">
                          <p className="font-medium text-[var(--text-primary)]">{strength.point}</p>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">{strength.evidence}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-2">📝 {strength.contentTitle}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Detected Improvements */}
                {aiReport.improvements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[var(--warning)]" />
                      AI가 발견한 개선 기회
                    </h4>
                    <div className="space-y-2">
                      {aiReport.improvements.map((improvement, index) => (
                        <div key={index} className="p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-[var(--text-primary)]">{improvement.issue}</p>
                            {improvement.frequency > 1 && (
                              <Badge variant="warning" size="sm">{improvement.frequency}회 발견</Badge>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">💡 {improvement.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestones from AI */}
                {aiReport.milestones && (
                  <div className="grid grid-cols-2 gap-4">
                    {aiReport.milestones.achieved.length > 0 && (
                      <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                        <h4 className="text-sm font-medium text-[var(--success)] mb-2">🎉 달성한 마일스톤</h4>
                        <ul className="space-y-1">
                          {aiReport.milestones.achieved.map((m, i) => (
                            <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                              <CheckCircle className="w-3 h-3 text-[var(--success)]" />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiReport.milestones.next && (
                      <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                        <h4 className="text-sm font-medium text-[var(--accent-primary)] mb-2">🎯 다음 목표</h4>
                        <p className="text-sm text-[var(--text-secondary)]">{aiReport.milestones.next}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!aiReport && !analysisError && hasApiKey && (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">
                  AI 분석을 시작하면 글쓰기 패턴과 개선점을 분석해드립니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--accent-primary)]" />
              최근 활동
            </CardTitle>
          </CardHeader>
          <CardContent>
            {archive.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm">아직 활동 기록이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {archive.slice(0, 5).map((content, index) => (
                  <div key={content.id} className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[var(--text-primary)]">{content.title}</p>
                        <Badge variant={content.reviewScore >= 80 ? 'success' : 'warning'} size="sm">
                          {content.reviewScore}점
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">
                        {new Date(content.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Background>
  );
}

interface MilestoneRowProps {
  title: string;
  achieved: boolean;
  current?: number;
  target?: number;
  unit?: string;
}

function MilestoneRow({ title, achieved, current, target, unit = '' }: MilestoneRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        achieved 
          ? 'bg-[var(--success)] text-[var(--bg-primary)]' 
          : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
      }`}>
        {achieved ? <CheckCircle className="w-4 h-4" /> : ''}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${achieved ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          {title}
        </p>
        {!achieved && current !== undefined && target !== undefined && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={(current / target) * 100} size="sm" className="flex-1" />
            <span className="text-xs text-[var(--text-muted)]">
              {current}{unit} / {target}{unit}
            </span>
          </div>
        )}
      </div>
      {achieved && (
        <Badge variant="success" size="sm">달성</Badge>
      )}
    </div>
  );
}
