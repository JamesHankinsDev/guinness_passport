'use client';

import { motion } from 'framer-motion';
import { Pint } from '@/types';
import { StarRating } from '@/components/ui/StarRating';
import { TagPill } from '@/components/ui/TagPill';

interface PintCardProps {
  pint: Pint;
  index?: number;
}

function formatDate(pint: Pint): string {
  const date = pint.createdAt?.toDate?.() ?? new Date();
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function PintCard({ pint, index = 0 }: PintCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="bg-[#111] border border-white/5 rounded-xl overflow-hidden hover:border-gold/15 transition-colors group"
    >
      {pint.photoUrl && (
        <div className="h-40 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pint.photoUrl}
            alt={pint.pubName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-cream text-base leading-tight truncate">{pint.pubName}</h3>
            <p className="text-cream/40 font-mono text-xs mt-0.5 truncate">{pint.address}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <StarRating value={pint.rating} readonly size="sm" />
            <p className="text-cream/30 font-mono text-[10px] mt-1">{formatDate(pint)}</p>
          </div>
        </div>

        {pint.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pint.tags.map((tag) => (
              <TagPill key={tag} label={tag} selected size="sm" />
            ))}
          </div>
        )}

        {pint.note && (
          <p className="text-cream/60 text-sm leading-relaxed line-clamp-2 italic">{pint.note}</p>
        )}
      </div>
    </motion.div>
  );
}
