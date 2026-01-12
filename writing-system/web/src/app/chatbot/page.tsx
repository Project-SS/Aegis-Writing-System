'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Search, 
  FileText, 
  AlertCircle, 
  RefreshCw, 
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
  Settings,
  Database,
  CheckCircle,
  XCircle,
  Sparkles,
  Bot,
  ChevronLeft,
  ChevronRight,
  History,
  Trash2,
  Plus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  getApiKeys, 
  getConfluenceAuth, 
  getJiraAuth, 
  hasConfluenceAuth, 
  hasJiraAuth,
  getChatHistory,
  addChatConversation,
  updateChatConversation,
  deleteChatConversation,
  clearAllChatHistory,
  ChatConversation,
  ChatMessage,
} from '@/lib/storage';
import { AIProvider } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: AIProvider;
  sources?: {
    type: 'confluence' | 'jira';
    title: string;
    url: string;
  }[];
}

interface SyncStatus {
  lastSyncedAt: string | null;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

// Jira 티켓 ID를 링크로 변환하는 함수
const DEFAULT_JIRA_BASE_URL = 'https://cloud.jira.krafton.com';

function convertJiraTicketsToLinks(content: string, jiraBaseUrl?: string): string {
  const baseUrl = jiraBaseUrl || DEFAULT_JIRA_BASE_URL;
  // AEGIS-123 형식의 Jira 티켓 ID를 마크다운 링크로 변환
  // 조건:
  // 1. 프로젝트 키 (대문자) + 하이픈 + 숫자만 (1~6자리)
  // 2. 숫자 뒤에 알파벳이나 하이픈이 오면 안됨 (UUID 형식 제외)
  // 3. 이미 링크로 되어 있는 경우 제외
  const jiraTicketRegex = /(?<!\[)(?<!\()(?<![\/\w])([A-Z]{2,10}-\d{1,6})(?![\w-])/g;
  
  return content.replace(jiraTicketRegex, (match) => {
    return `[${match}](${baseUrl}/browse/${match})`;
  });
}

// 참조 문서 페이지네이션 컴포넌트
const SOURCES_PER_PAGE = 5;

interface SourcesPaginationProps {
  sources: { type: 'confluence' | 'jira'; title: string; url: string }[];
  messageId: string;
}

function SourcesPagination({ sources, messageId }: SourcesPaginationProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(sources.length / SOURCES_PER_PAGE);
  
  const startIndex = (currentPage - 1) * SOURCES_PER_PAGE;
  const endIndex = startIndex + SOURCES_PER_PAGE;
  const currentSources = sources.slice(startIndex, endIndex);
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
          <FileText className="w-3 h-3" />
          참조 문서 ({sources.length}개)
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-1 rounded transition-colors ${
                currentPage === 1
                  ? 'text-[var(--text-muted)] cursor-not-allowed'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
              title="이전 페이지"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[var(--text-muted)] px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-1 rounded transition-colors ${
                currentPage === totalPages
                  ? 'text-[var(--text-muted)] cursor-not-allowed'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
              title="다음 페이지"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {currentSources.map((source, index) => (
          <a
            key={`${messageId}-source-${startIndex + index}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-primary)]/50 text-sm text-[var(--info)] hover:bg-[var(--bg-hover)] transition-colors group"
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 truncate">{source.title}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`w-6 h-6 text-xs rounded transition-colors ${
                page === currentPage
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-medium'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [apiKeys, setApiKeysState] = useState<{ claude?: string; gemini?: string }>({});
  const [confluenceAuth, setConfluenceAuthState] = useState<{ email: string; apiToken: string; baseUrl: string; spaceKey: string } | null>(null);
  const [jiraAuth, setJiraAuthState] = useState<{ email: string; apiToken: string; baseUrl: string; projectKey: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncedAt: null,
    totalPages: 0,
    isLoading: false,
    error: null,
  });
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 대화 기록 관련 상태
  const [chatHistory, setChatHistory] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // 중복 저장 방지를 위한 ref
  const currentConversationIdRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);

  const hasApiKey = selectedProvider === 'claude' ? !!apiKeys.claude : !!apiKeys.gemini;
  const hasAnyApiKey = !!(apiKeys.claude || apiKeys.gemini);
  const hasConfluence = !!(confluenceAuth?.email && confluenceAuth?.apiToken);
  const hasJira = !!(jiraAuth?.email && jiraAuth?.apiToken);

  useEffect(() => {
    // Check API keys
    const keys = getApiKeys();
    setApiKeysState(keys);
    
    // Load Confluence/Jira auth
    const confAuth = getConfluenceAuth();
    const jAuth = getJiraAuth();
    setConfluenceAuthState(confAuth);
    setJiraAuthState(jAuth);
    
    // Set default provider based on available keys (prefer Gemini)
    if (keys.gemini) {
      setSelectedProvider('gemini');
    } else if (keys.claude) {
      setSelectedProvider('claude');
    }

    // Load sync status
    loadSyncStatus();
    
    // Load chat history
    setChatHistory(getChatHistory());

    // Add welcome message
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '안녕하세요! AEGIS Chat Bot입니다. Confluence 문서나 Jira 이슈에 대해 질문해주세요.\n\n예시 질문:\n- "AEGIS 프로젝트의 기술 스택은 무엇인가요?"\n- "최근 업데이트된 디자인 문서를 찾아줘"\n- "진행 중인 버그 이슈 목록을 보여줘"',
        timestamp: new Date(),
        provider: 'gemini',
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/chatbot/sync');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus({
          lastSyncedAt: data.lastSyncedAt,
          totalPages: data.totalPages,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSync = async () => {
    setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/chatbot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confluenceAuth: confluenceAuth,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSyncStatus({
          lastSyncedAt: data.lastSyncedAt,
          totalPages: data.totalPages,
          isLoading: false,
          error: null,
        });
        
        // Add system message
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'system',
          content: `✅ Confluence 데이터가 최신화되었습니다. (${data.totalPages}개 문서)`,
          timestamp: new Date(),
        }]);
      } else {
        // Update with any returned data (like cached data info)
        setSyncStatus(prev => ({
          ...prev,
          lastSyncedAt: data.lastSyncedAt || prev.lastSyncedAt,
          totalPages: data.totalPages || prev.totalPages,
          isLoading: false,
          error: data.message || data.error || '동기화에 실패했습니다.',
        }));
        
        // Add system message for error
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'system',
          content: `⚠️ ${data.message || '동기화에 실패했습니다.'}\n${data.hint || ''}`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        error: '서버와 통신 중 오류가 발생했습니다.',
      }));
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: '⚠️ 서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date(),
      }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !hasApiKey) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const currentApiKey = selectedProvider === 'claude' ? apiKeys.claude : apiKeys.gemini;

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input.trim(),
          provider: selectedProvider,
          apiKey: currentApiKey,
          confluenceAuth: confluenceAuth,
          jiraAuth: jiraAuth,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          provider: selectedProvider,
          sources: data.sources,
        };
        setMessages(prev => {
          const newMessages = [...prev, assistantMessage];
          // 대화 자동 저장 (setTimeout으로 상태 업데이트 후 실행)
          setTimeout(() => {
            saveCurrentConversationWithMessages(newMessages);
          }, 100);
          return newMessages;
        });
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
          timestamp: new Date(),
          provider: selectedProvider,
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date(),
        provider: selectedProvider,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 대화 기록 저장 (메시지 배열을 직접 받는 버전)
  const saveCurrentConversationWithMessages = (messagesToSave: Message[]) => {
    // 중복 저장 방지
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    
    try {
      // 웰컴 메시지와 시스템 메시지를 제외한 실제 대화만 저장
      const conversationMessages = messagesToSave.filter(m => 
        m.role !== 'system' && !(m.role === 'assistant' && m.id === '1')
      );
      
      if (conversationMessages.length === 0) return;
      
      // 첫 번째 사용자 메시지를 제목으로 사용
      const firstUserMessage = conversationMessages.find(m => m.role === 'user');
      const title = firstUserMessage 
        ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
        : '새 대화';
      
      const chatMessages: ChatMessage[] = conversationMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        provider: m.provider,
        sources: m.sources,
      }));
      
      // ref를 사용하여 최신 ID 확인
      const convId = currentConversationIdRef.current;
      
      if (convId) {
        // 기존 대화 업데이트
        updateChatConversation(convId, {
          messages: chatMessages,
          title,
        });
      } else {
        // 새 대화 저장
        const newConversation: ChatConversation = {
          id: Date.now().toString(),
          title,
          messages: chatMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addChatConversation(newConversation);
        setCurrentConversationId(newConversation.id);
        currentConversationIdRef.current = newConversation.id;
      }
      
      // 히스토리 새로고침
      setChatHistory(getChatHistory());
    } finally {
      isSavingRef.current = false;
    }
  };

  // 대화 기록 저장 (현재 상태 사용)
  const saveCurrentConversation = () => {
    saveCurrentConversationWithMessages(messages);
  };

  // 대화 기록 불러오기
  const loadConversation = (conversation: ChatConversation) => {
    const loadedMessages: Message[] = conversation.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      provider: m.provider as AIProvider | undefined,
      sources: m.sources,
    }));
    
    setMessages(loadedMessages);
    setCurrentConversationId(conversation.id);
    currentConversationIdRef.current = conversation.id;
    setShowHistory(false);
  };

  // 새 대화 시작
  const startNewConversation = () => {
    // 현재 대화 저장
    if (messages.length > 1) {
      saveCurrentConversation();
    }
    
    // 초기화
    setCurrentConversationId(null);
    currentConversationIdRef.current = null;
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '안녕하세요! AEGIS Chat Bot입니다. Confluence 문서나 Jira 이슈에 대해 질문해주세요.\n\n예시 질문:\n- "AEGIS 프로젝트의 기술 스택은 무엇인가요?"\n- "최근 업데이트된 디자인 문서를 찾아줘"\n- "진행 중인 버그 이슈 목록을 보여줘"',
        timestamp: new Date(),
        provider: 'gemini',
      },
    ]);
    setShowHistory(false);
  };

  // 대화 삭제
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 대화를 삭제하시겠습니까?')) {
      deleteChatConversation(id);
      setChatHistory(getChatHistory());
      
      // 현재 보고 있는 대화가 삭제된 경우 새 대화 시작
      if (currentConversationId === id) {
        startNewConversation();
      }
    }
  };

  // 모든 대화 삭제
  const handleClearAllHistory = () => {
    if (confirm('모든 대화 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearAllChatHistory();
      setChatHistory([]);
      startNewConversation();
    }
  };

  // 대화 날짜 포맷
  const formatConversationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatSyncTime = (dateStr: string | null) => {
    if (!dateStr) return '동기화 필요';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-lg ${
                    message.role === 'user'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                      : message.role === 'system'
                      ? 'bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)]'
                  }`}
                >
                  {/* AI Provider Badge */}
                  {message.role === 'assistant' && message.provider && (
                    <div className="flex items-center gap-1 mb-3 pb-2 border-b border-[var(--border-primary)]/50 text-xs text-[var(--text-muted)]">
                      {message.provider === 'gemini' ? (
                        <><Sparkles className="w-3 h-3" /> Gemini</>
                      ) : (
                        <><Bot className="w-3 h-3" /> Claude</>
                      )}
                    </div>
                  )}
                  {/* Markdown Content */}
                  <div className="chatbot-markdown prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      children={convertJiraTicketsToLinks(message.content, jiraAuth?.baseUrl)}
                      components={{
                        // 헤딩 스타일
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold text-[var(--text-primary)] mt-4 mb-3 pb-2 border-b border-[var(--border-primary)]">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-bold text-[var(--text-primary)] mt-4 mb-2">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold text-[var(--text-primary)] mt-3 mb-2">
                            {children}
                          </h3>
                        ),
                        // 단락
                        p: ({ children }) => (
                          <p className="text-[var(--text-primary)] leading-relaxed mb-3 last:mb-0">
                            {children}
                          </p>
                        ),
                        // 리스트
                        ul: ({ children }) => (
                          <ul className="list-none space-y-2 my-3 pl-0">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-2 my-3 pl-0">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-[var(--text-primary)] leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-[var(--accent-primary)] before:font-bold">
                            {children}
                          </li>
                        ),
                        // 강조
                        strong: ({ children }) => (
                          <strong className="font-bold text-[var(--accent-primary)]">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-[var(--text-secondary)]">
                            {children}
                          </em>
                        ),
                        // 코드
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--info)] text-sm font-mono">
                              {children}
                            </code>
                          ) : (
                            <code className="block p-3 rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm font-mono overflow-x-auto">
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => (
                          <pre className="my-3 rounded-lg overflow-hidden">
                            {children}
                          </pre>
                        ),
                        // 링크
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--info)] hover:underline inline-flex items-center gap-1"
                          >
                            {children}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ),
                        // 인용
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-[var(--accent-primary)] pl-4 my-3 text-[var(--text-secondary)] italic">
                            {children}
                          </blockquote>
                        ),
                        // 테이블
                        table: ({ children }) => (
                          <div className="my-4 overflow-x-auto rounded-lg border border-[var(--border-primary)]">
                            <table className="w-full text-sm border-collapse">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-[var(--bg-hover)]">
                            {children}
                          </thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="divide-y divide-[var(--border-primary)]">
                            {children}
                          </tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className="hover:bg-[var(--bg-hover)]/50 transition-colors">
                            {children}
                          </tr>
                        ),
                        th: ({ children }) => (
                          <th className="px-4 py-3 text-left font-semibold text-[var(--text-primary)] border-b border-[var(--border-primary)] whitespace-nowrap">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-4 py-3 text-[var(--text-secondary)] align-top">
                            {children}
                          </td>
                        ),
                        // 수평선
                        hr: () => (
                          <hr className="my-4 border-[var(--border-primary)]" />
                        ),
                      }}
                    />
                  </div>
                  
                  {/* Sources with Pagination */}
                  {message.sources && message.sources.length > 0 && (
                    <SourcesPagination sources={message.sources} messageId={message.id} />
                  )}
                  
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-[var(--bg-primary)]/70' : 'text-[var(--text-muted)]'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>답변 생성 중...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <div className="max-w-3xl mx-auto">
            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={startNewConversation}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  새 대화
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    showHistory
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--bg-primary)]'
                      : 'bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <History className="w-4 h-4" />
                  대화 기록 ({chatHistory.length})
                </button>
              </div>
              {currentConversationId && (
                <span className="text-xs text-[var(--text-muted)]">
                  자동 저장됨
                </span>
              )}
            </div>
            
            {/* API Key Warning */}
            {!hasAnyApiKey && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--warning)]" />
                <p className="text-sm text-[var(--warning)]">
                  API 키가 설정되지 않았습니다. 
                  <a href="/writing/settings" className="underline ml-1">설정 페이지</a>에서 API 키를 입력해주세요.
                </p>
              </div>
            )}

            {/* Provider Selector */}
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="text-xs text-[var(--text-muted)] mr-2">AI 모델:</span>
              <div className="flex rounded-lg border border-[var(--border-primary)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelectedProvider('gemini')}
                  disabled={!apiKeys.gemini}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                    selectedProvider === 'gemini'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-medium'
                      : apiKeys.gemini
                      ? 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      : 'bg-[var(--bg-primary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                  }`}
                  title={!apiKeys.gemini ? 'Gemini API 키가 필요합니다' : 'Gemini 사용'}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Gemini</span>
                  {selectedProvider === 'gemini' && (
                    <CheckCircle className="w-3 h-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider('claude')}
                  disabled={!apiKeys.claude}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-all border-l border-[var(--border-primary)] ${
                    selectedProvider === 'claude'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-medium'
                      : apiKeys.claude
                      ? 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      : 'bg-[var(--bg-primary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                  }`}
                  title={!apiKeys.claude ? 'Claude API 키가 필요합니다' : 'Claude 사용'}
                >
                  <Bot className="w-4 h-4" />
                  <span>Claude</span>
                  {selectedProvider === 'claude' && (
                    <CheckCircle className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`${selectedProvider === 'gemini' ? 'Gemini' : 'Claude'}에게 Confluence 문서나 Jira 이슈에 대해 질문하세요...`}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                  disabled={isLoading || !hasApiKey}
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading || !hasApiKey}
                loading={isLoading}
                icon={<Send className="w-4 h-4" />}
              >
                전송
              </Button>
            </form>
            
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
              <span>Confluence & Jira 데이터 기반</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {selectedProvider === 'gemini' ? (
                  <><Sparkles className="w-3 h-3" /> Gemini AI</>
                ) : (
                  <><Bot className="w-3 h-3" /> Claude AI</>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat History Panel */}
      {showHistory && (
        <div className="w-80 border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col">
          <div className="p-4 border-b border-[var(--border-primary)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <History className="w-4 h-4" />
                대화 기록
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {chatHistory.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="text-xs text-[var(--error)] hover:underline"
              >
                모든 기록 삭제
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">저장된 대화가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => loadConversation(conversation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                      currentConversationId === conversation.id
                        ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30'
                        : 'bg-[var(--bg-card)] border border-[var(--border-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          currentConversationId === conversation.id
                            ? 'text-[var(--accent-primary)]'
                            : 'text-[var(--text-primary)]'
                        }`}>
                          {conversation.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {formatConversationDate(conversation.updatedAt)} · {conversation.messages.length}개 메시지
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-all"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`w-80 border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 hidden lg:block overflow-y-auto ${showHistory ? 'hidden' : ''}`}>
        {/* Sync Status Card */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">데이터 동기화</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSync}
                disabled={syncStatus.isLoading}
                icon={syncStatus.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              >
                {syncStatus.isLoading ? '동기화 중...' : '최신화'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">마지막 동기화</span>
              <span className="text-[var(--text-primary)]">
                {formatSyncTime(syncStatus.lastSyncedAt)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">문서 수</span>
              <Badge variant="info">{syncStatus.totalPages}개</Badge>
            </div>
            {syncStatus.error && (
              <div className="p-2 rounded bg-[var(--error)]/10 border border-[var(--error)]/30">
                <p className="text-xs text-[var(--error)]">{syncStatus.error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">빠른 질문</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              '프로젝트 개요를 알려줘',
              '최근 업데이트된 문서는?',
              '진행 중인 이슈 목록',
              '기술 스택 정보',
            ].map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                {question}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">연결 상태</CardTitle>
              <Link
                href="/settings"
                className="text-xs text-[var(--info)] hover:underline flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                설정
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">Confluence</span>
              </div>
              <div className="flex items-center gap-1">
                {hasConfluence ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                    <span className="text-xs text-[var(--success)]">연결됨</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[var(--warning)]" />
                    <span className="text-xs text-[var(--warning)]">설정 필요</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">Jira</span>
              </div>
              <div className="flex items-center gap-1">
                {hasJira ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                    <span className="text-xs text-[var(--success)]">연결됨</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[var(--warning)]" />
                    <span className="text-xs text-[var(--warning)]">설정 필요</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">Gemini</span>
              </div>
              <div className="flex items-center gap-1">
                {apiKeys.gemini ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                    <span className="text-xs text-[var(--success)]">준비됨</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[var(--error)]" />
                    <span className="text-xs text-[var(--error)]">API 키 필요</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">Claude</span>
              </div>
              <div className="flex items-center gap-1">
                {apiKeys.claude ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                    <span className="text-xs text-[var(--success)]">준비됨</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[var(--error)]" />
                    <span className="text-xs text-[var(--error)]">API 키 필요</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
