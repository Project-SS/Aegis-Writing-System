'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Download, 
  Upload, 
  Trash2, 
  Cpu, 
  Zap,
  Database,
  Globe,
  Shield,
  Save,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { AIProvider } from '@/types';

// Storage keys
const STORAGE_KEY = 'writing-system-data';
const CONFLUENCE_STORAGE_KEY = 'aegis-confluence-auth';
const JIRA_STORAGE_KEY = 'aegis-jira-auth';

interface ApiKeys {
  claude?: string;
  gemini?: string;
}

interface ConfluenceAuth {
  email: string;
  apiToken: string;
  baseUrl: string;
  spaceKey: string;
}

interface JiraAuth {
  email: string;
  apiToken: string;
  baseUrl: string;
  projectKey: string;
}

// Storage functions
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

function getConfluenceAuth(): ConfluenceAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CONFLUENCE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveConfluenceAuth(auth: ConfluenceAuth): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFLUENCE_STORAGE_KEY, JSON.stringify(auth));
}

function getJiraAuth(): JiraAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(JIRA_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveJiraAuth(auth: JiraAuth): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(JIRA_STORAGE_KEY, JSON.stringify(auth));
}

export default function SettingsPage() {
  // AI API Keys
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  
  // Confluence Auth
  const [confluenceEmail, setConfluenceEmail] = useState('');
  const [confluenceToken, setConfluenceToken] = useState('');
  const [confluenceBaseUrl, setConfluenceBaseUrl] = useState('https://krafton.atlassian.net');
  const [confluenceSpaceKey, setConfluenceSpaceKey] = useState('AEGIS');
  const [showConfluenceToken, setShowConfluenceToken] = useState(false);
  
  // Jira Auth
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraBaseUrl, setJiraBaseUrl] = useState('https://cloud.jira.krafton.com');
  const [jiraProjectKey, setJiraProjectKey] = useState('AEGIS');
  const [showJiraToken, setShowJiraToken] = useState(false);
  
  // UI State
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'confluence' | 'jira'>('ai');

  useEffect(() => {
    // Load AI API Keys
    const keys = getApiKeys();
    setClaudeKey(keys.claude || '');
    setGeminiKey(keys.gemini || '');
    
    // Load Confluence Auth
    const confluenceAuth = getConfluenceAuth();
    if (confluenceAuth) {
      setConfluenceEmail(confluenceAuth.email);
      setConfluenceToken(confluenceAuth.apiToken);
      setConfluenceBaseUrl(confluenceAuth.baseUrl);
      setConfluenceSpaceKey(confluenceAuth.spaceKey);
    }
    
    // Load Jira Auth
    const jiraAuth = getJiraAuth();
    if (jiraAuth) {
      setJiraEmail(jiraAuth.email || '');
      setJiraToken(jiraAuth.apiToken || '');
      // Use saved baseUrl or default
      setJiraBaseUrl(jiraAuth.baseUrl || 'https://cloud.jira.krafton.com');
      setJiraProjectKey(jiraAuth.projectKey || 'AEGIS');
    }
  }, []);

  const showSavedMessage = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleSaveAiKeys = () => {
    try {
      saveApiKeys({
        claude: claudeKey.trim() || undefined,
        gemini: geminiKey.trim() || undefined,
      });
      showSavedMessage('ai');
    } catch {
      setError('API 키 저장에 실패했습니다.');
    }
  };

  const handleSaveConfluence = () => {
    try {
      saveConfluenceAuth({
        email: confluenceEmail.trim(),
        apiToken: confluenceToken.trim(),
        baseUrl: confluenceBaseUrl.trim(),
        spaceKey: confluenceSpaceKey.trim(),
      });
      showSavedMessage('confluence');
    } catch {
      setError('Confluence 설정 저장에 실패했습니다.');
    }
  };

  const handleSaveJira = () => {
    try {
      saveJiraAuth({
        email: jiraEmail.trim(),
        apiToken: jiraToken.trim(),
        baseUrl: jiraBaseUrl.trim(),
        projectKey: jiraProjectKey.trim(),
      });
      showSavedMessage('jira');
    } catch {
      setError('Jira 설정 저장에 실패했습니다.');
    }
  };

  const handleCopyFromConfluence = () => {
    setJiraEmail(confluenceEmail);
    setJiraToken(confluenceToken);
    // Also copy baseUrl if it's an Atlassian URL (convert Confluence URL to Jira URL)
    if (confluenceBaseUrl) {
      // If it's a standard Atlassian URL, use it for Jira too
      // e.g., https://krafton.atlassian.net -> https://krafton.atlassian.net
      setJiraBaseUrl(confluenceBaseUrl);
    }
  };

  const tabs = [
    { id: 'ai' as const, name: 'AI API', icon: Cpu, description: 'Claude & Gemini' },
    { id: 'confluence' as const, name: 'Confluence', icon: Database, description: '문서 연동' },
    { id: 'jira' as const, name: 'Jira', icon: Globe, description: '이슈 연동' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/30 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>메인으로</span>
            </Link>
            
            <div className="w-px h-6 bg-[var(--border-primary)]" />
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md">
                <Image
                  src="/icon.png"
                  alt="AEGIS Platform"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-bold text-[var(--text-primary)]">플랫폼 설정</h1>
                <p className="text-xs text-[var(--text-muted)]">API 키 및 연동 설정</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 py-8">
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

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-medium shadow-lg'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">{tab.name}</p>
                  <p className={`text-xs ${isActive ? 'text-[var(--bg-primary)]/70' : 'text-[var(--text-muted)]'}`}>
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* AI API Keys Tab */}
        {activeTab === 'ai' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>AI API 키 설정</CardTitle>
                  <CardDescription>글쓰기 및 Chat Bot에서 사용할 AI API 키를 설정합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Claude API Key */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-orange-500">C</span>
                  </div>
                  Claude API Key
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
                <Button onClick={handleSaveAiKeys} icon={<Save className="w-4 h-4" />}>
                  저장
                </Button>
                {saved === 'ai' && (
                  <span className="flex items-center gap-1 text-sm text-[var(--success)]">
                    <Check className="w-4 h-4" /> 저장되었습니다
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confluence Tab */}
        {activeTab === 'confluence' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Confluence 연동 설정</CardTitle>
                  <CardDescription>Chat Bot에서 Confluence 문서를 검색하기 위한 인증 정보를 설정합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Atlassian 이메일</label>
                <Input
                  type="email"
                  value={confluenceEmail}
                  onChange={(e) => setConfluenceEmail(e.target.value)}
                  placeholder="your-email@company.com"
                />
              </div>

              {/* API Token */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">API 토큰</label>
                <div className="relative">
                  <Input
                    type={showConfluenceToken ? 'text' : 'password'}
                    value={confluenceToken}
                    onChange={(e) => setConfluenceToken(e.target.value)}
                    placeholder="ATATT3xFfGF0..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfluenceToken(!showConfluenceToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showConfluenceToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-[var(--info)] hover:underline">
                    Atlassian API 토큰 관리
                  </a>에서 토큰을 발급받으세요
                </p>
              </div>

              {/* Base URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Confluence URL</label>
                <Input
                  type="url"
                  value={confluenceBaseUrl}
                  onChange={(e) => setConfluenceBaseUrl(e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                />
              </div>

              {/* Space Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Space Key</label>
                <Input
                  type="text"
                  value={confluenceSpaceKey}
                  onChange={(e) => setConfluenceSpaceKey(e.target.value)}
                  placeholder="AEGIS"
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-primary)]">
                <Button onClick={handleSaveConfluence} icon={<Save className="w-4 h-4" />}>
                  저장
                </Button>
                {saved === 'confluence' && (
                  <span className="flex items-center gap-1 text-sm text-[var(--success)]">
                    <Check className="w-4 h-4" /> 저장되었습니다
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jira Tab */}
        {activeTab === 'jira' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Jira 연동 설정</CardTitle>
                  <CardDescription>Chat Bot에서 Jira 이슈를 검색하기 위한 인증 정보를 설정합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Copy from Confluence */}
              {confluenceEmail && confluenceToken && (
                <div className="p-4 rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[var(--info)]" />
                      <span className="text-sm text-[var(--info)]">
                        Confluence와 동일한 Atlassian 계정을 사용하시나요?
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleCopyFromConfluence}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      복사
                    </Button>
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Atlassian 이메일</label>
                <Input
                  type="email"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="your-email@company.com"
                />
              </div>

              {/* API Token */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">API 토큰</label>
                <div className="relative">
                  <Input
                    type={showJiraToken ? 'text' : 'password'}
                    value={jiraToken}
                    onChange={(e) => setJiraToken(e.target.value)}
                    placeholder="ATATT3xFfGF0..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJiraToken(!showJiraToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showJiraToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Confluence와 동일한 Atlassian API 토큰을 사용할 수 있습니다
                </p>
              </div>

              {/* Base URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Jira URL</label>
                <Input
                  type="url"
                  value={jiraBaseUrl}
                  onChange={(e) => setJiraBaseUrl(e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                />
              </div>

              {/* Project Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Project Key</label>
                <Input
                  type="text"
                  value={jiraProjectKey}
                  onChange={(e) => setJiraProjectKey(e.target.value)}
                  placeholder="AEGIS"
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-primary)]">
                <Button onClick={handleSaveJira} icon={<Save className="w-4 h-4" />}>
                  저장
                </Button>
                {saved === 'jira' && (
                  <span className="flex items-center gap-1 text-sm text-[var(--success)]">
                    <Check className="w-4 h-4" /> 저장되었습니다
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
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
