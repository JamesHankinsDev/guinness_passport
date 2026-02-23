'use client';

interface TagPillProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function TagPill({ label, selected, onClick, size = 'md' }: TagPillProps) {
  const base = 'rounded-full border transition-all duration-150 font-mono tracking-wide';
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };
  const active = 'bg-gold/20 border-gold text-gold';
  const inactive = 'bg-transparent border-white/15 text-cream/50 hover:border-white/30 hover:text-cream/80';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${sizes[size]} ${selected ? active : inactive} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {label}
    </button>
  );
}
