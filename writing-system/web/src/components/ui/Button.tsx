'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    icon,
    className = '',
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--bg-primary)] hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5 active:translate-y-0',
      secondary: 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent-tertiary)]',
      ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
      danger: 'bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/30 hover:bg-[var(--error)]/30',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
