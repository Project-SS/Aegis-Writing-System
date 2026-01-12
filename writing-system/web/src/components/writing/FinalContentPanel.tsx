'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileText, Hash, Clock, CheckCircle, Copy, Check, ThumbsUp, ThumbsDown, Save } from 'lucide-react';
import { useState } from 'react';

interface FinalContentProps {
  title: string;
  content: string;
  hashtags: string[];
  corrections: Array<{ type: string; original: string; corrected: string }>;
  stats: {
    charCount: number;
    wordCount: number;
    readingTime: number;
  };
  publishRecommendation: {
    status: string;
    optimalTime: string;
  };
  onSave: () => void;
  onFeedback: (type: 'positive' | 'negative', feedback: string) => Promise<{ success: boolean; message: string }>;
  loading?: boolean;
}

export function FinalContentPanel({
  title,
  content,
  hashtags,
  corrections,
  stats,
  publishRecommendation,
  onSave,
  onFeedback,
  loading = false,
}: FinalContentProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [saved, setSaved] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCopy = async () => {
    const fullContent = `${title}\n\n${content}\n\n${hashtags.map(t => `#${t}`).join(' ')}`;
    await navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave();
    setSaved(true);
  };

  const handleSubmitFeedback = async () => {
    if (feedbackType && feedbackText.trim()) {
      setFeedbackSubmitting(true);
      setFeedbackResult(null);
      
      try {
        const result = await onFeedback(feedbackType, feedbackText);
        setFeedbackResult(result);
        
        if (result.success) {
          setFeedbackType(null);
          setFeedbackText('');
        }
      } catch (err) {
        setFeedbackResult({ success: false, message: '피드백 제출 중 오류가 발생했습니다.' });
      } finally {
        setFeedbackSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success Banner */}
      <div className="p-4 rounded-lg bg-[var(--success)]/20 border border-[var(--success)]/30 flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-[var(--success)]" />
        <div>
          <p className="font-medium text-[var(--success)]">교정 완료!</p>
          <p className="text-sm text-[var(--text-secondary)]">최종 콘텐츠가 준비되었습니다.</p>
        </div>
      </div>

      {/* Final Content */}
      <Card variant="highlight">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--accent-primary)]" />
              최종 콘텐츠
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCopy}
                icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? '복사됨' : '복사'}
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={saved}
                icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              >
                {saved ? '저장됨' : '아카이브에 저장'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          <div className="whitespace-pre-wrap text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--accent-primary)] pl-4">
            {content}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {hashtags.map((tag, index) => (
              <Badge key={index} variant="accent">
                #{tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats & Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">통계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[var(--accent-primary)]">{stats.charCount}</p>
                <p className="text-xs text-[var(--text-muted)]">글자 수</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--accent-primary)]">{stats.wordCount}</p>
                <p className="text-xs text-[var(--text-muted)]">단어 수</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--accent-primary)]">{stats.readingTime}분</p>
                <p className="text-xs text-[var(--text-muted)]">읽기 시간</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              발행 권장
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="success" className="mb-2">{publishRecommendation.status}</Badge>
            <p className="text-sm text-[var(--text-secondary)]">
              최적 시간: <span className="text-[var(--text-primary)] font-medium">{publishRecommendation.optimalTime}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Corrections */}
      {corrections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">수정 사항</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {corrections.map((correction, index) => (
                <div key={index} className="p-3 rounded-lg bg-[var(--bg-secondary)] text-sm">
                  <Badge variant="info" size="sm" className="mb-2">{correction.type}</Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--error)] line-through">{correction.original}</span>
                    <span className="text-[var(--text-muted)]">→</span>
                    <span className="text-[var(--success)]">{correction.corrected}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">피드백</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            이 콘텐츠에 대한 피드백을 남겨주세요. 스타일 가이드 개선에 반영됩니다.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => setFeedbackType('positive')}
              className={`flex-1 p-4 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                feedbackType === 'positive'
                  ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]'
                  : 'border-[var(--border-primary)] hover:border-[var(--success)] text-[var(--text-secondary)]'
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              좋아요
            </button>
            <button
              onClick={() => setFeedbackType('negative')}
              className={`flex-1 p-4 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                feedbackType === 'negative'
                  ? 'border-[var(--error)] bg-[var(--error)]/10 text-[var(--error)]'
                  : 'border-[var(--border-primary)] hover:border-[var(--error)] text-[var(--text-secondary)]'
              }`}
            >
              <ThumbsDown className="w-5 h-5" />
              개선 필요
            </button>
          </div>

          {feedbackType && (
            <div className="space-y-3 animate-fade-in">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  feedbackType === 'positive'
                    ? '어떤 점이 좋았나요? (예: "이 표현이 마음에 들어요")'
                    : '어떤 점을 개선하면 좋을까요? (예: "이 부분은 너무 딱딱해요")'
                }
                className="w-full p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none h-24 focus:outline-none focus:border-[var(--accent-primary)]"
                disabled={feedbackSubmitting}
              />
              <Button 
                onClick={handleSubmitFeedback} 
                disabled={!feedbackText.trim() || loading || feedbackSubmitting}
                loading={feedbackSubmitting}
              >
                {feedbackSubmitting ? '분석 중...' : '피드백 제출'}
              </Button>
            </div>
          )}
          
          {/* Feedback Result */}
          {feedbackResult && (
            <div className={`p-4 rounded-lg animate-fade-in ${
              feedbackResult.success 
                ? 'bg-[var(--success)]/20 border border-[var(--success)]/30' 
                : 'bg-[var(--error)]/20 border border-[var(--error)]/30'
            }`}>
              <div className="flex items-center gap-2">
                {feedbackResult.success ? (
                  <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                ) : (
                  <span className="w-5 h-5 text-[var(--error)]">⚠️</span>
                )}
                <p className={`text-sm ${
                  feedbackResult.success ? 'text-[var(--success)]' : 'text-[var(--error)]'
                }`}>
                  {feedbackResult.message}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
