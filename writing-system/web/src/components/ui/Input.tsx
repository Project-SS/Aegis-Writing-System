'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 rounded-lg
            bg-[var(--bg-secondary)] border border-[var(--border-primary)]
            text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]
            transition-all duration-200
            ${error ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/30' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)]">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-[var(--error)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-lg resize-none
            bg-[var(--bg-secondary)] border border-[var(--border-primary)]
            text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]
            transition-all duration-200
            ${error ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/30' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)]">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-[var(--error)]">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
