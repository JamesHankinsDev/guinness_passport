'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getAllPints, getAllFriendsPints, getFriends, getHeatmapPubStats } from '@/lib/firestore';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PintMap } from '@/components/pint/PintMap';
import { PubHeatmap } from '@/components/pint/PubHeatmap';
import { StarRating } from '@/components/ui/StarRating';
import { TagPill } from '@/components/ui/TagPill';
import type { Pint, PubStats, User } from '@/types';

type MapTab = 'mine' | 'friends' | 'heatmap';

export default function MapPage() {
  const { firebaseUser, userDoc } = useAuth();
  const [myPints, setMyPints] = useState<Pint[]>([]);
  const [friendsPints, setFriendsPints] = useState<Pint[]>([]);
  const [heatmapPubs, setHeatmapPubs] = useState<PubStats[]>([]);
  const [heatmapLoaded, setHeatmapLoaded] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pint | null>(null);
  const [tab, setTab] = useState<MapTab>('mine');

  useEffect(() => {
    if (!firebaseUser) return;
    getAllPints(firebaseUser.uid)
      .then(setMyPints)
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    getFriends(firebaseUser.uid).then(setFriends).catch(() => {});
  }, [firebaseUser?.uid, userDoc?.friendIds?.length]);

  // Only friends who've opted in to sharing are visible on the map.
  const sharingFriends = friends.filter((f) => f.shareWithFriends !== false);

  // Load friends pints lazily when tab switches
  useEffect(() => {
    if (tab !== 'friends' || sharingFriends.length === 0 || friendsPints.length > 0) return;
    setLoading(true);
    const friendIds = sharingFriends.map((f) => f.uid);
    getAllFriendsPints(friendIds)
      .then(setFriendsPints)
      .finally(() => setLoading(false));
  }, [tab, sharingFriends, friendsPints.length]);

  // Load the anonymised heatmap aggregates lazily, once.
  useEffect(() => {
    if (tab !== 'heatmap' || heatmapLoaded) return;
    setLoading(true);
    getHeatmapPubStats(3)
      .then((pubs) => {
        setHeatmapPubs(pubs);
        setHeatmapLoaded(true);
      })
      .catch(() => setHeatmapLoaded(true))
      .finally(() => setLoading(false));
  }, [tab, heatmapLoaded]);

  const hasFriends = (userDoc?.friendIds?.length ?? 0) > 0;
  const activePints = tab === 'mine' ? myPints : tab === 'friends' ? friendsPints : [];
  const friendsMap = Object.fromEntries(friends.map((f) => [f.uid, f.displayName]));

  // The heatmap tab is always available; friends tab only when you have friends.
  const availableTabs: MapTab[] = hasFriends ? ['mine', 'friends', 'heatmap'] : ['mine', 'heatmap'];

  return (
    <AuthGuard>
      <div className="fixed inset-0 bg-black">
        <TopBar />

        <div className="absolute inset-0 top-14">
          {loading ? (
            <div className="w-full h-full bg-[#111] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : tab === 'heatmap' ? (
            <PubHeatmap key="heatmap" pubs={heatmapPubs} />
          ) : (
            <PintMap
              key={tab}
              pints={activePints}
              onPintSelect={setSelected}
              friendMode={tab === 'friends'}
            />
          )}

          {/* Count badge + layer toggle */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <div className="bg-black/80 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                tab === 'heatmap' ? 'bg-gold' : tab === 'friends' ? 'bg-cream/60' : 'bg-gold'
              }`} />
              <span className="font-mono text-cream/70 text-xs">
                {tab === 'heatmap'
                  ? `${heatmapPubs.length} pub${heatmapPubs.length !== 1 ? 's' : ''} worldwide`
                  : `${activePints.length} pint${activePints.length !== 1 ? 's' : ''}${tab === 'friends' ? ' from friends' : ' logged'}`}
              </span>
            </div>

            <div className="flex gap-1 bg-black/80 backdrop-blur border border-white/10 rounded-full p-1">
              {availableTabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setSelected(null); setTab(t); }}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] tracking-wide transition-colors ${
                    tab === t ? 'bg-gold text-black' : 'text-cream/50 hover:text-cream/70'
                  }`}
                >
                  {t === 'mine' ? 'Mine' : t === 'friends' ? 'Friends' : 'Heatmap'}
                </button>
              ))}
            </div>
          </div>

          {/* Selected pint card */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="absolute bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:w-80 bg-[#1a1a1a] border border-gold/20 rounded-2xl p-4 shadow-xl shadow-black/60 z-10"
              >
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="absolute top-3 right-3 text-cream/30 hover:text-cream transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="space-y-2 pr-6">
                  {/* Friend attribution */}
                  {tab === 'friends' && friendsMap[selected.userId] && (
                    <p className="font-mono text-cream/30 text-[10px] tracking-wide">
                      {friendsMap[selected.userId]}
                    </p>
                  )}
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
                    {selected.createdAt?.toDate?.().toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    }) ?? ''}
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
