'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getUserDoc, getAllPints } from '@/lib/firestore';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PassportStamp } from '@/components/pint/PassportStamp';
import { HarpLogo } from '@/components/ui/HarpLogo';
import { Button } from '@/components/ui/Button';
import { BadgeStamp } from '@/components/social/BadgeStamp';
import type { User, Pint } from '@/types';
import { ALL_BADGE_IDS } from '@/types';

export default function FriendPassportPage() {
  const { uid: friendUid } = useParams<{ uid: string }>();
  const { firebaseUser, userDoc } = useAuth();
  const router = useRouter();

  const [friend, setFriend] = useState<User | null>(null);
  const [pints, setPints] = useState<Pint[]>([]);
  const [loading, setLoading] = useState(true);

  const isFriend = userDoc?.friendIds?.includes(friendUid) ?? false;
  const isSelf = firebaseUser?.uid === friendUid;

  useEffect(() => {
    if (!friendUid || (!isFriend && !isSelf)) return;
    Promise.all([
      getUserDoc(friendUid),
      getAllPints(friendUid),
    ]).then(([user, pintList]) => {
      setFriend(user);
      setPints(pintList.slice().reverse());
    }).finally(() => setLoading(false));
  }, [friendUid, isFriend, isSelf]);

  // If not a friend and not self, only load user doc (no pints)
  useEffect(() => {
    if (!friendUid || isFriend || isSelf) return;
    getUserDoc(friendUid)
      .then(setFriend)
      .finally(() => setLoading(false));
  }, [friendUid, isFriend, isSelf]);

  const earnedBadgeIds = (friend?.badges ?? []).map((b) => b.id);
  const badgeMap = Object.fromEntries((friend?.badges ?? []).map((b) => [b.id, b]));

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black">
        <TopBar />
        <main className="max-w-2xl mx-auto px-4 pt-20 pb-24">

          {/* Back button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-cream/40 hover:text-cream/70 font-mono text-xs mb-6 mt-4 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : !friend ? (
            <div className="text-center py-16 space-y-3">
              <p className="font-display text-cream text-xl">User not found</p>
              <Button variant="secondary" size="md" onClick={() => router.replace('/profile')}>
                Go to Profile
              </Button>
            </div>
          ) : (
            <>
              {/* Passport booklet */}
              <div className="bg-[#0e0e0e] border border-gold/20 rounded-2xl p-6 relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gold/10">
                  <div className="w-12 h-12 rounded-full bg-gold/20 border-2 border-gold/30 flex items-center justify-center shrink-0">
                    {friend.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={friend.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <HarpLogo className="w-6 h-7" />
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-gold/50 text-[10px] tracking-widest uppercase">
                      Guinness Passport
                    </p>
                    <p className="font-display text-cream text-xl mt-0.5">{friend.displayName}</p>
                    {friend.homePub && (
                      <p className="font-mono text-cream/30 text-xs mt-0.5">🏠 {friend.homePub}</p>
                    )}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-mono text-cream/20 text-[10px] tracking-widest uppercase">Total</p>
                    <p className="font-display text-gold text-3xl">{friend.totalPints}</p>
                    <p className="font-mono text-cream/20 text-[10px]">pints</p>
                  </div>
                </div>

                {/* Stamps or lock state */}
                {!isFriend && !isSelf ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="text-4xl">🔒</div>
                    <p className="font-display text-cream/60 text-lg">Add as a friend to see their stamps</p>
                    <p className="font-mono text-cream/30 text-xs max-w-xs mx-auto">
                      Ask {friend.displayName} for their QR code, or share yours
                    </p>
                  </div>
                ) : pints.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <span className="text-2xl">🍺</span>
                    <p className="font-display text-cream/60">No stamps yet</p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-3 sm:grid-cols-4 gap-6"
                  >
                    {pints.map((pint, i) => (
                      <PassportStamp key={pint.id} pint={pint} index={i} number={i + 1} />
                    ))}
                  </motion.div>
                )}

                {/* Decorative corners */}
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-gold/20 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-gold/20 rounded-bl" />
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-gold/20 rounded-tl" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-gold/20 rounded-br" />
              </div>

              {/* Badges */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-cream text-lg">Badges</h2>
                  <span className="font-mono text-cream/30 text-xs">
                    {earnedBadgeIds.length} / {ALL_BADGE_IDS.length}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {ALL_BADGE_IDS.map((id, i) => {
                    const earned = earnedBadgeIds.includes(id);
                    const badge = badgeMap[id];
                    return (
                      <BadgeStamp
                        key={id}
                        id={id}
                        earned={earned}
                        earnedAt={badge?.earnedAt?.toDate?.()}
                        index={i}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
