'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium tracking-wide transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold/40';

    const variants = {
      primary:
        'bg-gold text-black hover:bg-gold/90 active:scale-95',
      secondary:
        'border border-gold/40 text-gold hover:bg-gold/10 active:scale-95',
      ghost:
        'text-cream/60 hover:text-cream hover:bg-white/5 active:scale-95',
      danger:
        'bg-deep-red text-cream hover:bg-deep-red/80 active:scale-95',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded',
      md: 'px-5 py-2.5 text-sm rounded-md',
      lg: 'px-7 py-3.5 text-base rounded-lg',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
