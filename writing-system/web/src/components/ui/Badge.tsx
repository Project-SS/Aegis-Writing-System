'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', size = 'md', className = '', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border-primary)]',
      success: 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30',
      warning: 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30',
      error: 'bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30',
      info: 'bg-[var(--info)]/20 text-[var(--info)] border-[var(--info)]/30',
      accent: 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--accent-primary)]/30',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1 font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
