'use client';

import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ReferenceItem, ReferenceType } from '@/types';
import {
  FileText,
  Link as LinkIcon,
  Upload,
  X,
  Plus,
  Search,
  ExternalLink,
  File,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ReferencePanelProps {
  references: ReferenceItem[];
  onAddReference: (ref: Omit<ReferenceItem, 'id' | 'addedAt'>) => void;
  onRemoveReference: (id: string) => void;
  useReferences: boolean;
  onToggleUseReferences: () => void;
  disabled?: boolean;
}

export function ReferencePanel({
  references,
  onAddReference,
  onRemoveReference,
  useReferences,
  onToggleUseReferences,
  disabled = false,
}: ReferencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'confluence' | 'file' | 'url' | 'text'>('confluence');
  const [confluenceUrl, setConfluenceUrl] = useState('');
  const [confluenceSearch, setConfluenceSearch] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textName, setTextName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confluence URL에서 문서 추가
  const handleAddConfluenceUrl = async () => {
    if (!confluenceUrl.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // URL에서 제목 추출 (간단한 방식)
      const urlParts = confluenceUrl.split('/');
      const title = urlParts[urlParts.length - 1]?.replace(/\+/g, ' ') || 'Confluence 문서';
      
      onAddReference({
        type: 'confluence',
        name: decodeURIComponent(title),
        content: `[Confluence 문서 링크]\nURL: ${confluenceUrl}\n\n이 문서의 내용을 참고하여 글을 작성해주세요.`,
        url: confluenceUrl,
      });
      
      setConfluenceUrl('');
    } catch (err) {
      setError('Confluence 문서를 추가하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 업로드 처리
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const fileName = file.name;
      const fileType = file.type;

      if (fileType === 'application/pdf') {
        // PDF 파일 처리 - 텍스트 추출은 서버에서 처리해야 하므로 파일 정보만 저장
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          onAddReference({
            type: 'file',
            name: fileName,
            content: `[PDF 파일: ${fileName}]\n\n파일이 업로드되었습니다. AI가 이 파일의 내용을 참고합니다.\n\n(참고: PDF 내용은 AI 분석 시 텍스트로 변환됩니다)`,
            url: base64,
          });
        };
        reader.readAsDataURL(file);
      } else if (fileType === 'text/plain' || fileType === 'text/markdown' || fileName.endsWith('.md')) {
        // 텍스트/마크다운 파일
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          onAddReference({
            type: 'file',
            name: fileName,
            content: content,
          });
        };
        reader.readAsText(file);
      } else {
        setError('지원하지 않는 파일 형식입니다. (지원: .txt, .md, .pdf)');
      }
    } catch (err) {
      setError('파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // URL 추가
  const handleAddUrl = () => {
    if (!urlInput.trim()) return;

    try {
      const url = new URL(urlInput);
      const title = url.hostname + url.pathname;
      
      onAddReference({
        type: 'url',
        name: title.length > 50 ? title.substring(0, 50) + '...' : title,
        content: `[외부 링크]\nURL: ${urlInput}\n\n이 링크의 내용을 참고하여 글을 작성해주세요.`,
        url: urlInput,
      });
      
      setUrlInput('');
    } catch {
      setError('유효한 URL을 입력해주세요.');
    }
  };

  // 텍스트 직접 입력
  const handleAddText = () => {
    if (!textInput.trim()) return;

    onAddReference({
      type: 'text',
      name: textName.trim() || `참고 자료 ${references.length + 1}`,
      content: textInput,
    });

    setTextInput('');
    setTextName('');
  };

  const getTypeIcon = (type: ReferenceType) => {
    switch (type) {
      case 'confluence':
        return <BookOpen className="w-4 h-4" />;
      case 'file':
        return <File className="w-4 h-4" />;
      case 'url':
        return <LinkIcon className="w-4 h-4" />;
      case 'text':
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: ReferenceType) => {
    switch (type) {
      case 'confluence':
        return <Badge variant="info" size="sm">Confluence</Badge>;
      case 'file':
        return <Badge variant="warning" size="sm">파일</Badge>;
      case 'url':
        return <Badge variant="accent" size="sm">URL</Badge>;
      case 'text':
        return <Badge variant="default" size="sm">텍스트</Badge>;
    }
  };

  return (
    <Card className={!useReferences ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--accent-primary)]" />
              참조 자료
            </CardTitle>
            <button
              onClick={onToggleUseReferences}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                useReferences
                  ? 'bg-[var(--success)]/20 text-[var(--success)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}
            >
              {useReferences ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              {useReferences ? 'ON' : 'OFF'}
            </button>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </button>
        </div>
        {!isExpanded && references.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {references.length}개의 참조 자료
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* 참조 자료 목록 */}
          {references.length > 0 && (
            <div className="space-y-2">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] group"
                >
                  <div className="flex-shrink-0 text-[var(--text-muted)]">
                    {getTypeIcon(ref.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {ref.name}
                      </p>
                      {getTypeBadge(ref.type)}
                    </div>
                    {ref.url && ref.type !== 'file' && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        링크 열기
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveReference(ref.id)}
                    disabled={disabled}
                    className="p-1.5 rounded hover:bg-[var(--error)]/20 text-[var(--text-muted)] hover:text-[var(--error)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 추가 탭 */}
          {useReferences && !disabled && (
            <>
              <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg">
                {(['confluence', 'file', 'url', 'text'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {tab === 'confluence' && 'Confluence'}
                    {tab === 'file' && '파일'}
                    {tab === 'url' && 'URL'}
                    {tab === 'text' && '텍스트'}
                  </button>
                ))}
              </div>

              {/* Confluence 탭 */}
              {activeTab === 'confluence' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                      Confluence 문서 URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={confluenceUrl}
                        onChange={(e) => setConfluenceUrl(e.target.value)}
                        placeholder="https://your-domain.atlassian.net/wiki/..."
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddConfluenceUrl}
                        disabled={!confluenceUrl.trim() || isLoading}
                        loading={isLoading}
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    💡 Confluence 문서 URL을 입력하면 해당 문서를 참고하여 글을 작성합니다.
                  </p>
                </div>
              )}

              {/* 파일 탭 */}
              {activeTab === 'file' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    className="w-full"
                    disabled={isLoading}
                    loading={isLoading}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    파일 업로드
                  </Button>
                  <p className="text-xs text-[var(--text-muted)] text-center">
                    지원 형식: .txt, .md, .pdf
                  </p>
                </div>
              )}

              {/* URL 탭 */}
              {activeTab === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                      참고할 웹 페이지 URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/article"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim()}
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 텍스트 탭 */}
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                      자료 이름 (선택)
                    </label>
                    <Input
                      value={textName}
                      onChange={(e) => setTextName(e.target.value)}
                      placeholder="예: 회사 소개 자료"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                      참고 내용
                    </label>
                    <Textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="글 작성 시 참고할 내용을 입력하세요..."
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={handleAddText}
                    disabled={!textInput.trim()}
                    className="w-full"
                    icon={<Plus className="w-4 h-4" />}
                  >
                    추가
                  </Button>
                </div>
              )}

              {/* 에러 메시지 */}
              {error && (
                <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 p-2 rounded">
                  {error}
                </p>
              )}
            </>
          )}

          {!useReferences && (
            <p className="text-xs text-[var(--text-muted)] text-center py-2">
              참조 자료 기능이 비활성화되어 있습니다.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
