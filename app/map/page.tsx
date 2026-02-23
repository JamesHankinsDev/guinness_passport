'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getAllPints } from '@/lib/firestore';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PintMap } from '@/components/pint/PintMap';
import { StarRating } from '@/components/ui/StarRating';
import { TagPill } from '@/components/ui/TagPill';
import type { Pint } from '@/types';

export default function MapPage() {
  const { firebaseUser } = useAuth();
  const [pints, setPints] = useState<Pint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pint | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getAllPints(firebaseUser.uid)
      .then(setPints)
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  return (
    <AuthGuard>
      <div className="h-screen bg-black flex flex-col">
        <TopBar />

        <div className="flex-1 relative mt-14">
          {loading ? (
            <div className="w-full h-full bg-[#111] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            <PintMap pints={pints} onPintSelect={setSelected} />
          )}

          {/* Pint count overlay */}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="font-mono text-cream/70 text-xs">
              {pints.length} pint{pints.length !== 1 ? 's' : ''} logged
            </span>
          </div>

          {/* Selected pint card */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="absolute bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:w-80 bg-[#1a1a1a] border border-gold/20 rounded-2xl p-4 shadow-xl shadow-black/60"
              >
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-3 right-3 text-cream/30 hover:text-cream transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="space-y-2 pr-6">
                  <div>
                    <h3 className="font-display text-cream text-base">{selected.pubName}</h3>
                    <p className="font-mono text-cream/40 text-xs mt-0.5">{selected.address}</p>
                  </div>
                  <StarRating value={selected.rating} readonly size="sm" />
                  {selected.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map((t) => <TagPill key={t} label={t} selected size="sm" />)}
                    </div>
                  )}
                  {selected.note && (
                    <p className="text-cream/60 text-xs font-body italic line-clamp-2">{selected.note}</p>
                  )}
                  <p className="font-mono text-cream/30 text-[10px]">
                    {selected.createdAt?.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) ?? ''}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
