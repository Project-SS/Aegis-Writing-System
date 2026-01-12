'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  PenTool,
  Home,
  Settings,
  BookOpen,
  Archive,
  BarChart3,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';

const navigation = [
  { name: '대시보드', href: '/writing', icon: Home },
  { name: '글쓰기', href: '/writing/write', icon: PenTool },
  { name: '스타일 가이드', href: '/writing/style-guide', icon: BookOpen },
  { name: '아카이브', href: '/writing/archive', icon: Archive },
  { name: '성장 리포트', href: '/writing/growth', icon: BarChart3 },
  { name: '설정', href: '/writing/settings', icon: Settings },
];

export default function WritingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-[var(--border-primary)]">
          <Link href="/writing" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg group-hover:shadow-[var(--shadow-glow)] transition-shadow">
              <Image 
                src="/icon.png" 
                alt="AEGIS Writing" 
                width={40} 
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-bold text-[var(--text-primary)] text-lg">AEGIS Writing</h1>
              <p className="text-xs text-[var(--text-muted)]">AI Assistant</p>
            </div>
          </Link>
        </div>

        {/* Back to Platform */}
        <div className="px-4 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>메인으로 돌아가기</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/writing' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-semibold shadow-lg' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? '' : 'opacity-70'}`} />
                <span>{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--bg-primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-[var(--border-primary)] space-y-2">
          <Link
            href="/writing/write"
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            <PenTool className="w-4 h-4" />
            새 글 작성
          </Link>
          
          {/* Help Button */}
          <a
            href="/AEGIS_Guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            도움말
          </a>
        </div>

        {/* Version */}
        <div className="p-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
