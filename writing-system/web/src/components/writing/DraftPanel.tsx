'use client';

import { Draft } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileText, Hash, BarChart, ArrowRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface DraftPanelProps {
  draft: Draft;
  onApprove: () => void;
  loading?: boolean;
  showReviewButton?: boolean;
}

export function DraftPanel({ draft, onApprove, loading = false, showReviewButton = true }: DraftPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const fullContent = `${draft.title}\n\n${draft.content}\n\n${draft.hashtags.map(t => `#${t}`).join(' ')}`;
    await navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--accent-primary)]" />
              제목
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopy}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? '복사됨' : '복사'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{draft.title}</h2>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>본문</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-[var(--text-secondary)] leading-relaxed">
              {draft.content}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-[var(--accent-primary)]" />
            해시태그
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {draft.hashtags.map((tag, index) => (
              <Badge key={index} variant="accent">
                #{tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      {draft.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-[var(--accent-primary)]" />
              예상 성과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">예상 조회수</p>
                <Badge variant={
                  draft.metadata.expectedViews === 'High' ? 'success' :
                  draft.metadata.expectedViews === 'Medium' ? 'warning' : 'default'
                }>
                  {draft.metadata.expectedViews}
                </Badge>
              </div>
              <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">예상 참여도</p>
                <Badge variant={
                  draft.metadata.expectedEngagement === 'High' ? 'success' :
                  draft.metadata.expectedEngagement === 'Medium' ? 'warning' : 'default'
                }>
                  {draft.metadata.expectedEngagement}
                </Badge>
              </div>
              <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">최적 발행 시간</p>
                <p className="text-sm text-[var(--text-primary)]">{draft.metadata.optimalTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Button */}
      {showReviewButton && (
        <div className="flex justify-end pt-4">
          <Button 
            onClick={onApprove} 
            disabled={loading}
            loading={loading}
            icon={<ArrowRight className="w-4 h-4" />}
            className="px-8"
          >
            검토 진행
          </Button>
        </div>
      )}
    </div>
  );
}
