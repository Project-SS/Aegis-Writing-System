'use client';

import { useState, useEffect } from 'react';
import { Header, Background } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { getArchive, deleteFromArchive } from '@/lib/storage';
import { FinalContent } from '@/types';
import { 
  Archive, 
  Search, 
  Clock, 
  Hash, 
  Copy, 
  Check, 
  Trash2, 
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function ArchivePage() {
  const [archive, setArchive] = useState<FinalContent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setArchive(getArchive());
  }, []);

  const filteredArchive = archive.filter(
    (content) =>
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = async (content: FinalContent) => {
    const fullContent = `${content.title}\n\n${content.content}\n\n${content.hashtags.map(t => `#${t}`).join(' ')}`;
    await navigator.clipboard.writeText(fullContent);
    setCopiedId(content.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 글을 삭제하시겠습니까?')) {
      deleteFromArchive(id);
      setArchive(getArchive());
    }
  };

  return (
    <Background>
      <Header title="아카이브" subtitle="작성한 모든 콘텐츠를 관리합니다" />

      <div className="p-8 max-w-5xl mx-auto">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 주제, 내용으로 검색..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6">
          <Badge variant="accent">
            총 {archive.length}개
          </Badge>
          {searchQuery && (
            <Badge variant="info">
              검색 결과: {filteredArchive.length}개
            </Badge>
          )}
        </div>

        {/* Archive List */}
        {filteredArchive.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Archive className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {searchQuery ? '검색 결과가 없습니다' : '아카이브가 비어있습니다'}
              </h3>
              <p className="text-[var(--text-secondary)]">
                {searchQuery 
                  ? '다른 검색어로 시도해보세요.' 
                  : '글을 작성하고 저장하면 여기에 표시됩니다.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredArchive.map((content) => (
              <Card key={content.id} className="overflow-hidden">
                <CardHeader className="cursor-pointer" onClick={() => setExpandedId(expandedId === content.id ? null : content.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                        <CardTitle className="text-base truncate">{content.title}</CardTitle>
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">{content.topic}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <Badge variant={content.reviewScore >= 80 ? 'success' : 'warning'}>
                        {content.reviewScore}점
                      </Badge>
                      {expandedId === content.id ? (
                        <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(content.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                    <span>{content.stats.charCount}자</span>
                    <span>{content.stats.readingTime}분 읽기</span>
                  </div>
                </CardHeader>

                {expandedId === content.id && (
                  <CardContent className="border-t border-[var(--border-primary)] animate-fade-in">
                    {/* Content */}
                    <div className="whitespace-pre-wrap text-[var(--text-secondary)] leading-relaxed mb-4 max-h-96 overflow-y-auto">
                      {content.content}
                    </div>

                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {content.hashtags.map((tag, index) => (
                        <Badge key={index} variant="default" size="sm">
                          <Hash className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-primary)]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(content)}
                        icon={copiedId === content.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      >
                        {copiedId === content.id ? '복사됨' : '복사'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(content.id)}
                        icon={<Trash2 className="w-4 h-4" />}
                      >
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Background>
  );
}
