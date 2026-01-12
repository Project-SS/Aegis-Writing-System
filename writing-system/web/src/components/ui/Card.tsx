'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'highlight' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className = '', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--bg-card)] border border-[var(--border-primary)]',
      highlight: 'bg-[var(--bg-card)] border border-[var(--accent-tertiary)] shadow-[var(--shadow-glow)]',
      glass: 'bg-[var(--bg-card)]/70 backdrop-blur-lg border border-[var(--border-primary)]',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={`rounded-xl transition-all duration-200 ${variants[variant]} ${paddings[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className = '', ...props }, ref) => (
    <h3 ref={ref} className={`text-lg font-semibold text-[var(--text-primary)] ${className}`} {...props}>
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className = '', ...props }, ref) => (
    <p ref={ref} className={`text-sm text-[var(--text-secondary)] mt-1 ${className}`} {...props}>
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`mt-4 pt-4 border-t border-[var(--border-primary)] ${className}`} {...props}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
