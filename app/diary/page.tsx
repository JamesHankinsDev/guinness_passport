'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePints } from '@/hooks/usePints';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PintCard } from '@/components/pint/PintCard';
import { Button } from '@/components/ui/Button';
import { PintCardSkeleton } from '@/components/ui/Skeleton';
import type { Metadata } from 'next';

function StatsStrip({ total, pubs, avg }: { total: number; pubs: number; avg: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-3 mb-6"
    >
      {[
        { label: 'Pints', value: total },
        { label: 'Pubs', value: pubs },
        { label: 'Avg Rating', value: avg ? avg.toFixed(1) : '—' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-[#111] border border-white/5 rounded-xl p-3 text-center">
          <div className="font-display text-2xl text-gold">{value}</div>
          <div className="font-mono text-[10px] text-cream/40 tracking-widest uppercase mt-0.5">{label}</div>
        </div>
      ))}
    </motion.div>
  );
}

export default function DiaryPage() {
  const { firebaseUser, userDoc } = useAuth();
  const uid = firebaseUser?.uid;
  const { pints, loading, hasMore, loadMore, refresh } = usePints(uid);

  useEffect(() => {
    if (uid) refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Unique pubs count
  const uniquePubs = new Set(pints.map((p) => p.pubName)).size;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black">
        <TopBar />
        <main className="max-w-2xl mx-auto px-4 pt-20 pb-24">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6 mt-2">
            <div>
              <h1 className="font-display text-2xl text-cream">
                {userDoc?.displayName
                  ? `${userDoc.displayName.split(' ')[0]}'s Diary`
                  : 'My Diary'}
              </h1>
              <p className="text-cream/40 font-mono text-xs tracking-wide mt-0.5">Every pint, remembered</p>
            </div>
            <Link href="/log">
              <Button variant="primary" size="sm">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Log Pint
              </Button>
            </Link>
          </div>

          {/* Stats strip */}
          <StatsStrip
            total={userDoc?.totalPints ?? pints.length}
            pubs={uniquePubs}
            avg={userDoc?.avgRating ?? 0}
          />

          {/* Feed */}
          {loading && pints.length === 0 ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <PintCardSkeleton key={i} />)}
            </div>
          ) : pints.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {pints.map((pint, i) => (
                <PintCard key={pint.id} pint={pint} index={i} />
              ))}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="secondary"
                    size="md"
                    loading={loading}
                    onClick={loadMore}
                  >
                    Load more
                  </Button>
                </div>
              )}

              {!hasMore && pints.length > 0 && (
                <p className="text-center text-cream/20 font-mono text-xs pt-4 tracking-widest">
                  — END OF DIARY —
                </p>
              )}
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16 space-y-4"
    >
      <div className="text-6xl">🍺</div>
      <h2 className="font-display text-xl text-cream">Your diary is empty</h2>
      <p className="text-cream/40 text-sm font-body max-w-xs mx-auto">
        Log your first Guinness to start building your passport of perfect pints.
      </p>
      <Link href="/log">
        <Button variant="primary" size="lg" className="mt-2">
          Log your first pint
        </Button>
      </Link>
    </motion.div>
  );
}
