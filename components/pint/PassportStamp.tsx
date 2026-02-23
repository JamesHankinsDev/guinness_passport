'use client';

import { motion } from 'framer-motion';
import { Pint } from '@/types';

interface PassportStampProps {
  pint: Pint;
  index: number;
  number: number;
}

function extractCity(address: string): string {
  const parts = address.split(',');
  return (parts[parts.length - 2] ?? parts[0] ?? 'Unknown').trim().split(' ').slice(0, 2).join(' ');
}

export function PassportStamp({ pint, index, number }: PassportStampProps) {
  const date = pint.createdAt?.toDate?.() ?? new Date();
  const dateStr = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).format(date);
  const city = extractCity(pint.address);

  // Slight rotation variance per stamp
  const rotations = [-3, 2, -1.5, 3, -2, 1, -2.5, 2.5];
  const rotation = rotations[index % rotations.length];

  return (
    <motion.div
      initial={{ scale: 1.6, opacity: 0, rotate: rotation - 10 }}
      animate={{ scale: 1, opacity: 1, rotate: rotation }}
      transition={{
        type: 'spring',
        damping: 10,
        stiffness: 180,
        delay: index * 0.08,
      }}
      className="relative w-28 h-28 mx-auto"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-gold/60 flex items-center justify-center">
        {/* Inner dashed ring */}
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-gold/30" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-2">
          <span className="font-mono text-gold/50 text-[9px] tracking-widest uppercase"># {String(number).padStart(3, '0')}</span>
          <span className="font-display text-gold text-[11px] font-bold leading-tight mt-0.5 line-clamp-2">
            {city}
          </span>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-1.5 h-1.5 rounded-full ${s <= pint.rating ? 'bg-gold' : 'bg-gold/20'}`}
              />
            ))}
          </div>
          <span className="font-mono text-gold/40 text-[8px] tracking-wider mt-1">{dateStr}</span>
        </div>
      </div>

      {/* Worn ink effect overlay */}
      <div className="absolute inset-0 rounded-full mix-blend-overlay opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.4) 100%)' }}
      />
    </motion.div>
  );
}
