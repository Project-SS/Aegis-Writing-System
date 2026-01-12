'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, Background } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getApiKeys, getSettings, updateSettings, exportData, importData, resetAllData } from '@/lib/storage';
import { AIProvider } from '@/types';
import { Key, Check, AlertCircle, Download, Upload, Trash2, Cpu, Zap, ExternalLink, Settings } from 'lucide-react';

export default function SettingsPage() {
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<AIProvider>('claude');
  const [quickMode, setQuickMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const keys = getApiKeys();
    const settings = getSettings();
    setHasClaudeKey(!!keys.claude);
    setHasGeminiKey(!!keys.gemini);
    setDefaultProvider(settings.defaultProvider);
    setQuickMode(settings.quickMode);
  }, []);

  const handleSaveSettings = () => {
    try {
      updateSettings({ defaultProvider, quickMode });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('설정 저장에 실패했습니다.');
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `writing-system-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (importData(content)) {
            window.location.reload();
          } else {
            setError('데이터 가져오기에 실패했습니다. 파일 형식을 확인해주세요.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      resetAllData();
      window.location.reload();
    }
  };

  return (
    <Background>
      <Header title="설정" subtitle="API 키 및 시스템 설정을 관리합니다" />
      
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* API Keys Section - Link to Platform Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-[var(--accent-primary)]" />
              </div>
              <div>
                <CardTitle>API 키 설정</CardTitle>
                <CardDescription>AI API 키는 플랫폼 설정에서 관리됩니다</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Status */}
            <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-3">현재 상태</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-sm text-[var(--text-secondary)]">Claude API Key</span>
                  </div>
                  {hasClaudeKey ? (
                    <Badge variant="success" size="sm">설정됨</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">미설정</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-sm text-[var(--text-secondary)]">Gemini API Key</span>
                  </div>
                  {hasGeminiKey ? (
                    <Badge variant="success" size="sm">설정됨</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">미설정</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-sm text-[var(--text-secondary)]">
              API 키 설정은 플랫폼 전체에서 공유됩니다. 글쓰기 도구와 Chat Bot 모두 동일한 API 키를 사용합니다.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/settings" className="w-full">
              <Button className="w-full" icon={<Settings className="w-4 h-4" />}>
                플랫폼 설정으로 이동
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Default Settings */}
        <Card>
          <CardHeader>
            <CardTitle>기본 설정</CardTitle>
            <CardDescription>글쓰기 시스템의 기본 동작을 설정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default Provider */}
            <div className="space-y-3">
              <span className="text-sm font-medium text-[var(--text-primary)]">기본 AI 모델</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setDefaultProvider('claude')}
                  className={`flex-1 p-4 rounded-lg border transition-all ${
                    defaultProvider === 'claude'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                      : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--accent-tertiary)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Cpu className={`w-5 h-5 ${defaultProvider === 'claude' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`} />
                    <div className="text-left">
                      <p className={`font-medium ${defaultProvider === 'claude' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>Claude</p>
                      <p className="text-xs text-[var(--text-muted)]">Anthropic</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setDefaultProvider('gemini')}
                  className={`flex-1 p-4 rounded-lg border transition-all ${
                    defaultProvider === 'gemini'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                      : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--accent-tertiary)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Zap className={`w-5 h-5 ${defaultProvider === 'gemini' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`} />
                    <div className="text-left">
                      <p className={`font-medium ${defaultProvider === 'gemini' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>Gemini</p>
                      <p className="text-xs text-[var(--text-muted)]">Google</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Mode */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <div>
                <p className="font-medium text-[var(--text-primary)]">빠른 모드</p>
                <p className="text-sm text-[var(--text-secondary)]">검토 단계를 생략하고 Phase 1, 3, 5만 실행</p>
              </div>
              <button
                onClick={() => setQuickMode(!quickMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  quickMode ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-hover)]'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    quickMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSaveSettings} icon={saved ? <Check className="w-4 h-4" /> : undefined}>
              {saved ? '저장됨' : '설정 저장'}
            </Button>
          </CardFooter>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>데이터 관리</CardTitle>
            <CardDescription>데이터 백업, 복원 및 초기화</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
                데이터 내보내기
              </Button>
              <Button variant="secondary" onClick={handleImport} icon={<Upload className="w-4 h-4" />}>
                데이터 가져오기
              </Button>
            </div>
            <div className="pt-4 border-t border-[var(--border-primary)]">
              <Button variant="danger" onClick={handleReset} icon={<Trash2 className="w-4 h-4" />}>
                모든 데이터 삭제
              </Button>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                이 작업은 모든 스타일 가이드, 피드백, 아카이브 데이터를 삭제합니다.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-[var(--error)]/20 border border-[var(--error)]/30">
            <AlertCircle className="w-5 h-5 text-[var(--error)]" />
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}
      </div>
    </Background>
  );
}
