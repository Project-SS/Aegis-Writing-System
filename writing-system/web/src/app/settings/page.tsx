'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Cpu, 
  Save,
  Shield,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { checkPlatformKeys, type PlatformKeys } from '@/lib/api-client';

const STORAGE_KEY = 'writing-system-data';

interface ApiKeys {
  claude?: string;
  gemini?: string;
}

function getApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed.apiKeys || {};
  } catch {
    return {};
  }
}

function saveApiKeys(keys: ApiKeys): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data.apiKeys = keys;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save API keys:', error);
  }
}

export default function SettingsPage() {
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [platformKeys, setPlatformKeys] = useState<PlatformKeys>({ claude: false, gemini: false });

  useEffect(() => {
    const keys = getApiKeys();
    setClaudeKey(keys.claude || '');
    setGeminiKey(keys.gemini || '');

    checkPlatformKeys().then(setPlatformKeys);
  }, []);

  const handleSave = () => {
    try {
      saveApiKeys({
        claude: claudeKey.trim() || undefined,
        gemini: geminiKey.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('API 키 저장에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/writing"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/30 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>돌아가기</span>
            </Link>
            
            <div className="w-px h-6 bg-[var(--border-primary)]" />
            
            <div>
              <h1 className="font-bold text-[var(--text-primary)]">AI API 설정</h1>
              <p className="text-xs text-[var(--text-muted)]">글쓰기에 사용할 AI API 키를 설정합니다</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--error)]" />
            <p className="text-[var(--error)]">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-[var(--error)] hover:underline">
              닫기
            </button>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>AI API 키 설정</CardTitle>
                <CardDescription>글쓰기에서 사용할 AI API 키를 설정합니다</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Platform Key Status */}
            {(platformKeys.claude || platformKeys.gemini) && (
              <div className="p-4 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-[var(--success)]" />
                  <span className="text-sm font-medium text-[var(--success)]">플랫폼 API 키 사용 가능</span>
                </div>
                <div className="flex gap-2">
                  {platformKeys.claude && <Badge variant="success">Claude</Badge>}
                  {platformKeys.gemini && <Badge variant="success">Gemini</Badge>}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  플랫폼에서 제공하는 API 키가 설정되어 있습니다. 별도 키를 입력하지 않아도 사용 가능합니다.
                </p>
              </div>
            )}

            {/* Claude API Key */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-500">C</span>
                </div>
                Claude API Key
                {platformKeys.claude && !claudeKey && <Badge variant="info" className="ml-2 text-[10px]">플랫폼 키 사용 중</Badge>}
              </label>
              <div className="relative">
                <Input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-api..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--info)] hover:underline">
                  Anthropic Console
                </a>에서 API 키를 발급받으세요
              </p>
            </div>

            {/* Gemini API Key */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-500">G</span>
                </div>
                Gemini API Key
                {platformKeys.gemini && !geminiKey && <Badge variant="info" className="ml-2 text-[10px]">플랫폼 키 사용 중</Badge>}
              </label>
              <div className="relative">
                <Input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--info)] hover:underline">
                  Google AI Studio
                </a>에서 API 키를 발급받으세요
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-primary)]">
              <Button onClick={handleSave} icon={<Save className="w-4 h-4" />}>
                저장
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-[var(--success)]">
                  <Check className="w-4 h-4" /> 저장되었습니다
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <div className="mt-8 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
            보안 안내
          </h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
              모든 인증 정보는 브라우저의 LocalStorage에 저장되며, 서버로 전송되지 않습니다.
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
              API 호출은 클라이언트에서 직접 수행되거나, 인증 정보가 요청 시에만 전달됩니다.
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
              다른 사용자와 인증 정보가 공유되지 않습니다.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
