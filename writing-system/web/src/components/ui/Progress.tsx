'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, showLabel = false, size = 'md', variant = 'default', className = '', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizes = {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    };

    const variants = {
      default: 'from-[var(--accent-primary)] to-[var(--accent-secondary)]',
      success: 'from-[var(--success)] to-[var(--success)]',
      warning: 'from-[var(--warning)] to-[var(--warning)]',
      error: 'from-[var(--error)] to-[var(--error)]',
    };

    return (
      <div ref={ref} className={`w-full ${className}`} {...props}>
        {showLabel && (
          <div className="flex justify-between mb-1.5">
            <span className="text-sm text-[var(--text-secondary)]">진행률</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className={`w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden ${sizes[size]}`}>
          <div
            className={`h-full bg-gradient-to-r ${variants[variant]} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

interface ScoreDisplayProps extends HTMLAttributes<HTMLDivElement> {
  score: number;
  maxScore?: number;
  label?: string;
}

export const ScoreDisplay = forwardRef<HTMLDivElement, ScoreDisplayProps>(
  ({ score, maxScore = 100, label, className = '', ...props }, ref) => {
    const percentage = (score / maxScore) * 100;
    
    let variant: 'success' | 'warning' | 'error' = 'error';
    if (percentage >= 80) variant = 'success';
    else if (percentage >= 60) variant = 'warning';

    const colors = {
      success: 'text-[var(--success)]',
      warning: 'text-[var(--warning)]',
      error: 'text-[var(--error)]',
    };

    return (
      <div ref={ref} className={`text-center ${className}`} {...props}>
        {label && (
          <p className="text-sm text-[var(--text-secondary)] mb-2">{label}</p>
        )}
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="var(--bg-secondary)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke={`var(--${variant})`}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.51} 251`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${colors[variant]}`}>{score}</span>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">/ {maxScore}점</p>
      </div>
    );
  }
);

ScoreDisplay.displayName = 'ScoreDisplay';
