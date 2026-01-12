'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  PenTool, 
  MessageSquare, 
  ArrowRight, 
  Sparkles,
  FileText,
  Search,
  Zap,
  Settings,
} from 'lucide-react';

const tools = [
  {
    id: 'writing',
    name: 'AEGIS Writing',
    description: 'AI 글쓰기 어시스턴트',
    longDescription: 'Claude와 Gemini를 활용한 개인화된 글쓰기 스타일 발전 시스템. 기획부터 교정까지 AI가 도와드립니다.',
    href: '/writing',
    icon: PenTool,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    features: ['AI 기반 글쓰기', '스타일 가이드 관리', '성장 리포트'],
  },
  {
    id: 'chatbot',
    name: 'AEGIS Chat Bot',
    description: 'Confluence & Jira 연동 챗봇',
    longDescription: 'Aegis 프로젝트의 Confluence 문서와 Jira 이슈를 검색하고 필요한 정보를 빠르게 찾아보세요.',
    href: '/chatbot',
    icon: MessageSquare,
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    features: ['Confluence 문서 검색', 'Jira 이슈 조회', 'AI 기반 답변'],
  },
];

export default function LandingPage() {
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    // Check if background image exists
    const img = new window.Image();
    img.onload = () => setBgLoaded(true);
    img.src = '/dashboard-bg.jpg';
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        {bgLoaded ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25"
            style={{ backgroundImage: 'url(/dashboard-bg.jpg)' }}
          />
        ) : (
          /* Fallback gradient background when image is not available */
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a4a] via-[#0d1f2d] to-[#0a1520]" />
        )}
        {/* Overlay gradient for better readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/60 via-[var(--bg-primary)]/40 to-[var(--bg-primary)]/90" />
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent-primary)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[var(--accent-primary)]/3 to-transparent rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
                <Image 
                  src="/icon.png" 
                  alt="AEGIS Platform" 
                  width={48} 
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">AEGIS Platform</h1>
                <p className="text-sm text-[var(--text-muted)]">게임 개발 도구 플랫폼</p>
              </div>
            </div>
            
            {/* Settings Button */}
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">설정</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 mb-6">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-sm text-[var(--accent-primary)] font-medium">Aegis 게임 개발 프로젝트</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
            개발 생산성을 높이는
            <br />
            <span className="gradient-text">통합 도구 플랫폼</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            AI 글쓰기 어시스턴트부터 Confluence/Jira 연동 챗봇까지,
            <br />
            Aegis 프로젝트에 필요한 모든 도구를 한 곳에서 사용하세요.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`group relative p-8 rounded-2xl border ${tool.borderColor} ${tool.bgColor} hover:border-opacity-60 transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--accent-primary)]/10 hover:-translate-y-1`}
              >
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {tool.name}
                </h3>
                <p className="text-[var(--accent-primary)] font-medium mb-3">
                  {tool.description}
                </p>
                <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                  {tool.longDescription}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {tool.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-primary)]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-2 text-[var(--accent-primary)] font-medium group-hover:gap-3 transition-all">
                  <span>시작하기</span>
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Link>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <FileText className="w-8 h-8 text-[var(--accent-primary)] mx-auto mb-3" />
            <p className="text-2xl font-bold text-[var(--text-primary)]">AI 글쓰기</p>
            <p className="text-sm text-[var(--text-muted)]">기획부터 교정까지</p>
          </div>
          <div className="text-center p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <Search className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-[var(--text-primary)]">문서 검색</p>
            <p className="text-sm text-[var(--text-muted)]">Confluence & Jira</p>
          </div>
          <div className="text-center p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <Zap className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-[var(--text-primary)]">빠른 응답</p>
            <p className="text-sm text-[var(--text-muted)]">AI 기반 답변</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border-primary)] mt-20">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              AEGIS Platform v1.0.0
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Krafton Aegis Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
