'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ScoreDisplay, Progress } from '@/components/ui/Progress';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

interface ReviewScore {
  styleConsistency: {
    toneConsistency: { score: number; maxScore: number; comment: string };
    sentenceLength: { score: number; maxScore: number; comment: string };
    forbiddenExpressions: { score: number; maxScore: number; comment: string; found?: string[] };
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

interface ReviewPanelProps {
  review: ReviewScore;
  onProceed: () => void;
  onRewrite: () => void;
  loading?: boolean;
}

export function ReviewPanel({ review, onProceed, onRewrite, loading = false }: ReviewPanelProps) {
  const getVerdictBadge = () => {
    if (review.totalScore >= 90) return <Badge variant="success">우수</Badge>;
    if (review.totalScore >= 80) return <Badge variant="success">합격</Badge>;
    if (review.totalScore >= 70) return <Badge variant="warning">조건부</Badge>;
    if (review.totalScore >= 60) return <Badge variant="error">불합격</Badge>;
    return <Badge variant="error">재작성</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overall Score */}
      <Card variant={review.passed ? 'highlight' : 'default'}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-8">
            <ScoreDisplay score={review.totalScore} label="종합 점수" />
            <div className="text-center">
              <div className="flex items-center gap-2 mb-2">
                {review.passed ? (
                  <CheckCircle className="w-6 h-6 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-6 h-6 text-[var(--error)]" />
                )}
                {getVerdictBadge()}
              </div>
              <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                {review.feedback}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Style Consistency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">스타일 일치성</CardTitle>
            <p className="text-2xl font-bold text-[var(--accent-primary)]">
              {review.styleConsistency.total}/50
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScoreItem 
              label="문체 일관성" 
              score={review.styleConsistency.toneConsistency.score}
              maxScore={review.styleConsistency.toneConsistency.maxScore}
              comment={review.styleConsistency.toneConsistency.comment}
            />
            <ScoreItem 
              label="문장 길이" 
              score={review.styleConsistency.sentenceLength.score}
              maxScore={review.styleConsistency.sentenceLength.maxScore}
              comment={review.styleConsistency.sentenceLength.comment}
            />
            <ScoreItem 
              label="금지 표현" 
              score={review.styleConsistency.forbiddenExpressions.score}
              maxScore={review.styleConsistency.forbiddenExpressions.maxScore}
              comment={review.styleConsistency.forbiddenExpressions.comment}
            />
            {review.styleConsistency.forbiddenExpressions.found && 
             review.styleConsistency.forbiddenExpressions.found.length > 0 && (
              <div className="mt-2 p-2 rounded bg-[var(--error)]/10 border border-[var(--error)]/30">
                <p className="text-xs text-[var(--error)] mb-1">발견된 금지 표현:</p>
                <div className="flex flex-wrap gap-1">
                  {review.styleConsistency.forbiddenExpressions.found.map((expr, i) => (
                    <Badge key={i} variant="error" size="sm">{expr}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Implementation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">기획 구현도</CardTitle>
            <p className="text-2xl font-bold text-[var(--accent-primary)]">
              {review.planImplementation.total}/30
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScoreItem 
              label="Hook 효과성" 
              score={review.planImplementation.hookEffectiveness.score}
              maxScore={review.planImplementation.hookEffectiveness.maxScore}
              comment={review.planImplementation.hookEffectiveness.comment}
            />
            <ScoreItem 
              label="Value 전달력" 
              score={review.planImplementation.valueDelivery.score}
              maxScore={review.planImplementation.valueDelivery.maxScore}
              comment={review.planImplementation.valueDelivery.comment}
            />
            <ScoreItem 
              label="CTA 명확성" 
              score={review.planImplementation.ctaClarity.score}
              maxScore={review.planImplementation.ctaClarity.maxScore}
              comment={review.planImplementation.ctaClarity.comment}
            />
          </CardContent>
        </Card>

        {/* Reader Experience */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">독자 경험</CardTitle>
            <p className="text-2xl font-bold text-[var(--accent-primary)]">
              {review.readerExperience.total}/20
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScoreItem 
              label="가독성" 
              score={review.readerExperience.readability.score}
              maxScore={review.readerExperience.readability.maxScore}
              comment={review.readerExperience.readability.comment}
            />
            <ScoreItem 
              label="논리 흐름" 
              score={review.readerExperience.logicalFlow.score}
              maxScore={review.readerExperience.logicalFlow.maxScore}
              comment={review.readerExperience.logicalFlow.comment}
            />
          </CardContent>
        </Card>
      </div>

      {/* Improvements */}
      {review.improvements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
              개선 사항
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {review.improvements.required.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-[var(--error)] mb-2">필수 수정</h4>
                <div className="space-y-2">
                  {review.improvements.required.map((item, index) => (
                    <div key={index} className="p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/30">
                      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{item.issue}</p>
                      <p className="text-xs text-[var(--text-muted)]">현재: "{item.current}"</p>
                      <p className="text-xs text-[var(--success)]">제안: "{item.suggestion}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {review.improvements.recommended.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-[var(--warning)] mb-2">권장 수정</h4>
                <ul className="space-y-1">
                  {review.improvements.recommended.map((item, index) => (
                    <li key={index} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="text-[var(--warning)]">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        {!review.passed && (
          <Button 
            variant="secondary"
            onClick={onRewrite} 
            disabled={loading}
            loading={loading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            재작성
          </Button>
        )}
        <Button 
          onClick={onProceed} 
          disabled={loading}
          loading={loading}
          icon={<ArrowRight className="w-4 h-4" />}
          className="px-8"
        >
          {review.passed ? '교정 진행' : '그래도 진행'}
        </Button>
      </div>
    </div>
  );
}

interface ScoreItemProps {
  label: string;
  score: number;
  maxScore: number;
  comment: string;
}

function ScoreItem({ label, score, maxScore, comment }: ScoreItemProps) {
  const percentage = (score / maxScore) * 100;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span className="text-xs font-medium text-[var(--text-primary)]">{score}/{maxScore}</span>
      </div>
      <Progress value={percentage} size="sm" />
      <p className="text-xs text-[var(--text-muted)] mt-1">{comment}</p>
    </div>
  );
}
