'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, Background } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { getArchive, getGrowthStats, getApiKeys } from '@/lib/storage';
import { FinalContent, GrowthStats } from '@/types';
import { 
  PenTool, 
  TrendingUp, 
  FileText, 
  Award, 
  Target,
  ArrowRight,
  Sparkles,
  Clock,
  BarChart3,
} from 'lucide-react';

export default function WritingDashboardPage() {
  const [archive, setArchive] = useState<FinalContent[]>([]);
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    setArchive(getArchive());
    setStats(getGrowthStats());
    const keys = getApiKeys();
    setHasApiKey(!!(keys.claude || keys.gemini));
  }, []);

  const recentContents = archive.slice(0, 3);

  return (
    <Background>
      <Header title="글쓰기 대시보드" subtitle="글쓰기 현황을 한눈에 확인하세요" />

      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Banner - only show after client-side check */}
          {hasApiKey === false && (
            <Card variant="highlight">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-[var(--bg-primary)]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">시작하기</h2>
                      <p className="text-sm text-[var(--text-secondary)]">
                        API 키를 설정하고 AI 글쓰기를 시작하세요
                      </p>
                    </div>
                  </div>
                  <Link href="/writing/settings">
                    <Button icon={<ArrowRight className="w-4 h-4" />}>
                      설정으로 이동
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/writing/write" className="block">
              <Card className="h-full hover:border-[var(--accent-primary)] transition-colors cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center group-hover:bg-[var(--accent-primary)] transition-colors">
                      <PenTool className="w-6 h-6 text-[var(--accent-primary)] group-hover:text-[var(--bg-primary)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">새 글 작성</h3>
                      <p className="text-sm text-[var(--text-secondary)]">AI와 함께 글쓰기</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/writing/style-guide" className="block">
              <Card className="h-full hover:border-[var(--accent-primary)] transition-colors cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--info)]/20 flex items-center justify-center group-hover:bg-[var(--info)] transition-colors">
                      <Target className="w-6 h-6 text-[var(--info)] group-hover:text-[var(--bg-primary)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">스타일 가이드</h3>
                      <p className="text-sm text-[var(--text-secondary)]">나만의 스타일 정의</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/writing/growth" className="block">
              <Card className="h-full hover:border-[var(--accent-primary)] transition-colors cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--success)]/20 flex items-center justify-center group-hover:bg-[var(--success)] transition-colors">
                      <TrendingUp className="w-6 h-6 text-[var(--success)] group-hover:text-[var(--bg-primary)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">성장 리포트</h3>
                      <p className="text-sm text-[var(--text-secondary)]">글쓰기 성장 추적</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="w-8 h-8 text-[var(--accent-primary)] mx-auto mb-2" />
                <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.totalContents || 0}</p>
                <p className="text-sm text-[var(--text-muted)]">작성한 글</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-8 h-8 text-[var(--info)] mx-auto mb-2" />
                <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.averageScore || 0}</p>
                <p className="text-sm text-[var(--text-muted)]">평균 점수</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Award className="w-8 h-8 text-[var(--warning)] mx-auto mb-2" />
                <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.highestScore || 0}</p>
                <p className="text-sm text-[var(--text-muted)]">최고 점수</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Target className="w-8 h-8 text-[var(--success)] mx-auto mb-2" />
                <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.firstPassRate || 0}%</p>
                <p className="text-sm text-[var(--text-muted)]">1회 합격률</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Contents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>최근 작성 글</CardTitle>
                  <Link href="/writing/archive">
                    <Button variant="ghost" size="sm">
                      전체 보기 <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentContents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)]">아직 작성한 글이 없습니다.</p>
                    <Link href="/writing/write">
                      <Button variant="secondary" size="sm" className="mt-4">
                        첫 글 작성하기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentContents.map((content) => (
                      <div
                        key={content.id}
                        className="p-4 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-[var(--text-primary)] truncate">
                              {content.title}
                            </h4>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                              {content.topic}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant={content.reviewScore >= 80 ? 'success' : 'warning'}>
                              {content.reviewScore}점
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(content.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                          <span>{content.stats.charCount}자</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Milestones */}
            <Card>
              <CardHeader>
                <CardTitle>마일스톤</CardTitle>
                <CardDescription>글쓰기 성장 목표를 달성하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MilestoneItem
                    title="첫 글 완성"
                    achieved={stats?.milestones.firstContent || false}
                  />
                  <MilestoneItem
                    title="5개 글 달성"
                    achieved={stats?.milestones.fiveContents || false}
                    progress={Math.min((stats?.totalContents || 0) / 5 * 100, 100)}
                  />
                  <MilestoneItem
                    title="평균 80점 이상"
                    achieved={stats?.milestones.avgAbove80 || false}
                  />
                  <MilestoneItem
                    title="1회 합격률 50%"
                    achieved={stats?.milestones.firstPassRate50 || false}
                    progress={Math.min((stats?.firstPassRate || 0) / 50 * 100, 100)}
                  />
                  <MilestoneItem
                    title="10개 글 달성"
                    achieved={stats?.milestones.tenContents || false}
                    progress={Math.min((stats?.totalContents || 0) / 10 * 100, 100)}
                  />
                  <MilestoneItem
                    title="1회 합격률 80%"
                    achieved={stats?.milestones.firstPassRate80 || false}
                    progress={Math.min((stats?.firstPassRate || 0) / 80 * 100, 100)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Background>
  );
}

interface MilestoneItemProps {
  title: string;
  achieved: boolean;
  progress?: number;
}

function MilestoneItem({ title, achieved, progress }: MilestoneItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        achieved 
          ? 'bg-[var(--success)] text-[var(--bg-primary)]' 
          : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
      }`}>
        {achieved ? '✓' : ''}
      </div>
      <div className="flex-1">
        <p className={`text-sm ${achieved ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          {title}
        </p>
        {!achieved && progress !== undefined && (
          <Progress value={progress} size="sm" className="mt-1" />
        )}
      </div>
    </div>
  );
}
