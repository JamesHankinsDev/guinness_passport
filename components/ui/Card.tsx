import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  gold?: boolean;
}

export function Card({ children, className = '', gold, ...props }: CardProps) {
  return (
    <div
      className={`bg-[#111] rounded-xl p-5 ${gold ? 'border border-gold/30' : 'border border-white/5'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
