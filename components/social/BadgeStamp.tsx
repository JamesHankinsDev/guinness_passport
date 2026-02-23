'use client';

import { motion } from 'framer-motion';
import { BADGE_CONFIG } from '@/types';
import type { BadgeId } from '@/types';

interface BadgeStampProps {
  id: BadgeId;
  earned?: boolean;
  earnedAt?: Date;
  index?: number;
  size?: 'sm' | 'md';
}

export function BadgeStamp({ id, earned = true, earnedAt, index = 0, size = 'md' }: BadgeStampProps) {
  const cfg = BADGE_CONFIG[id];
  const dim = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';
  const iconSize = size === 'sm' ? 'text-xl' : 'text-2xl';
  const nameSize = size === 'sm' ? 'text-[8px]' : 'text-[9px]';

  return (
    <motion.div
      initial={earned ? { opacity: 0, scale: 0.6, rotate: -10 } : { opacity: 0 }}
      animate={earned ? { opacity: 1, scale: 1, rotate: -3 } : { opacity: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', damping: 12 }}
      className="flex flex-col items-center gap-1.5"
    >
      <div
        className={`${dim} rounded-full border-4 flex flex-col items-center justify-center relative ${
          earned ? 'opacity-100' : 'opacity-25 grayscale'
        }`}
        style={{
          borderColor: earned ? cfg.color : '#555',
          background: earned ? `${cfg.color}18` : 'transparent',
          boxShadow: earned ? `0 0 14px ${cfg.color}40` : 'none',
        }}
      >
        {/* Decorative inner ring */}
        <div
          className="absolute inset-1.5 rounded-full border opacity-30"
          style={{ borderColor: earned ? cfg.color : '#555' }}
        />
        <span className={`${iconSize} relative z-10`}>{cfg.icon}</span>
      </div>

      <div className="text-center">
        <p className={`font-mono ${nameSize} tracking-wide leading-tight ${earned ? 'text-cream/70' : 'text-cream/20'}`}>
          {cfg.name.toUpperCase()}
        </p>
        {earned && earnedAt && (
          <p className="font-mono text-[7px] text-cream/30 mt-0.5">
            {earnedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
          </p>
        )}
        {!earned && (
          <p className={`font-mono ${size === 'sm' ? 'text-[7px]' : 'text-[8px]'} text-cream/20 mt-0.5 max-w-[64px] leading-tight text-center`}>
            {cfg.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}
