'use client';

import { useEffect, useCallback, useState } from 'react';
import type { Pint, User } from '@/types';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePints } from '@/hooks/usePints';
import { getFriends, getFriendsPints } from '@/lib/firestore';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PintCard } from '@/components/pint/PintCard';
import { Button } from '@/components/ui/Button';
import { PintCardSkeleton } from '@/components/ui/Skeleton';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

type FeedTab = 'mine' | 'friends';

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
  const { pints, loading, hasMore, loadMore, refresh, updateOptimistic } = usePints(uid);

  const [tab, setTab] = useState<FeedTab>('mine');
  const [friends, setFriends] = useState<User[]>([]);
  const [friendsPints, setFriendsPints] = useState<Pint[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsHasMore, setFriendsHasMore] = useState(false);
  const [friendsLastDoc, setFriendsLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  useEffect(() => {
    if (uid) refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Load friends list once (and whenever friend count changes)
  useEffect(() => {
    if (!uid) return;
    getFriends(uid).then(setFriends).catch(() => {});
  }, [uid, userDoc?.friendIds?.length]);

  const loadFriendsPints = useCallback(async (reset = false) => {
    if (!uid || friends.length === 0) return;
    setFriendsLoading(true);
    try {
      const friendIds = friends.map((f) => f.uid);
      const cursor = reset ? undefined : (friendsLastDoc ?? undefined);
      const result = await getFriendsPints(friendIds, 10, cursor);
      setFriendsPints((prev) => reset ? result.pints : [...prev, ...result.pints]);
      setFriendsLastDoc(result.lastDoc);
      setFriendsHasMore(result.hasMore);
    } finally {
      setFriendsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, friends, friendsLastDoc]);

  // When switching to friends tab, load their pints if not yet loaded
  useEffect(() => {
    if (tab === 'friends' && friendsPints.length === 0 && friends.length > 0) {
      loadFriendsPints(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, friends]);

  // Unique pubs count
  const uniquePubs = new Set(pints.map((p) => p.pubName)).size;

  // Friends map for PintCard
  const friendsMap = Object.fromEntries(friends.map((f) => [f.uid, f.displayName]));

  const hasFriends = (userDoc?.friendIds?.length ?? 0) > 0;

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

          {/* Stats strip (own pints only) */}
          {tab === 'mine' && (
            <StatsStrip
              total={userDoc?.totalPints ?? pints.length}
              pubs={uniquePubs}
              avg={userDoc?.avgRating ?? 0}
            />
          )}

          {/* Feed toggle */}
          {hasFriends && (
            <div className="flex gap-1 mb-5 bg-white/5 rounded-xl p-1">
              {(['mine', 'friends'] as FeedTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg font-mono text-xs tracking-wide transition-colors ${
                    tab === t
                      ? 'bg-gold text-black'
                      : 'text-cream/50 hover:text-cream/70'
                  }`}
                >
                  {t === 'mine' ? 'My Pints' : "Friends'"}
                </button>
              ))}
            </div>
          )}

          {/* My Pints feed */}
          {tab === 'mine' && (
            <>
              {loading && pints.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <PintCardSkeleton key={i} />)}
                </div>
              ) : pints.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-4">
                  {pints.map((pint, i) => (
                    <PintCard
                      key={pint.id}
                      pint={pint}
                      uid={uid}
                      index={i}
                      friendsMap={friendsMap}
                      onUpdated={(updated: Pint) => updateOptimistic(updated)}
                    />
                  ))}

                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button variant="secondary" size="md" loading={loading} onClick={loadMore}>
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
            </>
          )}

          {/* Friends feed */}
          {tab === 'friends' && (
            <>
              {friendsLoading && friendsPints.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <PintCardSkeleton key={i} />)}
                </div>
              ) : friendsPints.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="text-6xl">🤝</div>
                  <h2 className="font-display text-xl text-cream">No pints yet</h2>
                  <p className="text-cream/40 text-sm font-body max-w-xs mx-auto">
                    Your friends haven&apos;t logged any pints yet. Check back soon!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {friendsPints.map((pint, i) => (
                    <div key={pint.id}>
                      {friendsMap[pint.userId] && (
                        <p className="font-mono text-cream/30 text-[10px] tracking-wide mb-1.5 px-1">
                          {friendsMap[pint.userId]}
                        </p>
                      )}
                      <PintCard pint={pint} index={i} friendsMap={friendsMap} />
                    </div>
                  ))}

                  {friendsHasMore && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="secondary"
                        size="md"
                        loading={friendsLoading}
                        onClick={() => loadFriendsPints(false)}
                      >
                        Load more
                      </Button>
                    </div>
                  )}

                  {!friendsHasMore && friendsPints.length > 0 && (
                    <p className="text-center text-cream/20 font-mono text-xs pt-4 tracking-widest">
                      — ALL CAUGHT UP —
                    </p>
                  )}
                </div>
              )}
            </>
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
