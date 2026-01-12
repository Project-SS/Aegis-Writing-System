'use client';

import { useEffect, useState } from 'react';
import { Key, Cpu, Zap } from 'lucide-react';
import { getApiKeys, getSettings } from '@/lib/storage';
import { AIProvider } from '@/types';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<AIProvider>('claude');

  useEffect(() => {
    setMounted(true);
    const keys = getApiKeys();
    const settings = getSettings();
    setHasClaudeKey(!!keys.claude);
    setHasGeminiKey(!!keys.gemini);
    setDefaultProvider(settings.defaultProvider);
  }, []);

  const hasAnyKey = hasClaudeKey || hasGeminiKey;

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-lg border-b border-[var(--border-primary)]">
      <div className="px-8 py-4 flex items-center justify-between">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
          )}
        </div>

        {/* Status - only render after mount to avoid hydration mismatch */}
        <div className="flex items-center gap-4">
          {mounted && (
            <>
              {/* API Status */}
              <div className="flex items-center gap-2">
                {hasAnyKey ? (
                  <>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      hasClaudeKey 
                        ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30' 
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-primary)]'
                    }`}>
                      <Cpu className="w-3.5 h-3.5" />
                      Claude
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      hasGeminiKey 
                        ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30' 
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-primary)]'
                    }`}>
                      <Zap className="w-3.5 h-3.5" />
                      Gemini
                    </div>
                  </>
                ) : (
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/30 transition-colors text-sm font-medium"
                  >
                    <Key className="w-4 h-4" />
                    API 키 설정 필요
                  </Link>
                )}
              </div>

              {/* Default Provider Badge */}
              {hasAnyKey && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)]">
                  <span className="text-xs text-[var(--text-muted)]">기본:</span>
                  <span className="text-xs font-medium text-[var(--accent-primary)]">
                    {defaultProvider === 'claude' ? 'Claude' : 'Gemini'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
