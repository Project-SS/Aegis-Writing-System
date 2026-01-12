'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/30 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>메인으로</span>
              </Link>

              <div className="w-px h-6 bg-[var(--border-primary)]" />

              {/* Logo */}
              <Link href="/chatbot" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg overflow-hidden shadow-md group-hover:shadow-[var(--shadow-glow)] transition-shadow">
                  <Image 
                    src="/icon.png" 
                    alt="AEGIS Chat Bot" 
                    width={36} 
                    height={36}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="font-bold text-[var(--text-primary)]">AEGIS Chat Bot</h1>
                  <p className="text-xs text-[var(--text-muted)]">Confluence & Jira</p>
                </div>
              </Link>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30">
              <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-xs text-[var(--success)] font-medium">연결됨</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
