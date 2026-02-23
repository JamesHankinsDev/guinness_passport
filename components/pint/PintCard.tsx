'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pint } from '@/types';
import { StarRating } from '@/components/ui/StarRating';
import { TagPill } from '@/components/ui/TagPill';
import { EditPintModal } from './EditPintModal';

interface PintCardProps {
  pint: Pint;
  uid?: string;
  index?: number;
  onUpdated?: (updated: Pint) => void;
  friendsMap?: Record<string, string>; // uid → displayName
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

export function PintCard({ pint: initialPint, uid, index = 0, onUpdated, friendsMap = {} }: PintCardProps) {
  const [pint, setPint] = useState(initialPint);
  const [editOpen, setEditOpen] = useState(false);

  const handleSaved = (updated: Pint) => {
    setPint(updated);
    onUpdated?.(updated);
  };

  const taggedFriends = (pint.withFriends ?? [])
    .map((id) => friendsMap[id])
    .filter(Boolean) as string[];

  return (
    <>
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
            <div className="shrink-0 flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                {uid && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-cream/30 hover:text-gold p-0.5"
                    aria-label="Edit pint"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                )}
                <StarRating value={pint.rating} readonly size="sm" />
              </div>
              <p className="text-cream/30 font-mono text-[10px]">{formatDate(pint)}</p>
            </div>
          </div>

          {pint.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pint.tags.map((tag) => (
                <TagPill key={tag} label={tag} selected size="sm" />
              ))}
            </div>
          )}

          {/* Tagged friends */}
          {taggedFriends.length > 0 && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-gold/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <p className="font-mono text-gold/60 text-[10px]">
                With {taggedFriends.slice(0, 2).join(', ')}
                {taggedFriends.length > 2 && ` + ${taggedFriends.length - 2} more`}
              </p>
            </div>
          )}

          {pint.note && (
            <p className="text-cream/60 text-sm leading-relaxed line-clamp-2 italic">{pint.note}</p>
          )}
        </div>
      </motion.div>

      {uid && (
        <EditPintModal
          pint={pint}
          uid={uid}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
