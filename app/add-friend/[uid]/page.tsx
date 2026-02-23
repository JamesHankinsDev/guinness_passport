'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { getUserDoc, addFriend } from '@/lib/firestore';
import { BADGE_CONFIG } from '@/types';
import type { User } from '@/types';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Button } from '@/components/ui/Button';
import { HarpLogo } from '@/components/ui/HarpLogo';

export default function AddFriendPage() {
  const { uid: friendUid } = useParams<{ uid: string }>();
  const { firebaseUser, userDoc, refreshUserDoc } = useAuth();
  const router = useRouter();

  const [friend, setFriend] = useState<User | null>(null);
  const [loadingFriend, setLoadingFriend] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!friendUid) return;
    getUserDoc(friendUid)
      .then(setFriend)
      .finally(() => setLoadingFriend(false));
  }, [friendUid]);

  const alreadyFriends = userDoc?.friendIds?.includes(friendUid) ?? false;
  const isSelf = firebaseUser?.uid === friendUid;

  const handleConnect = async () => {
    if (!firebaseUser) return;
    setConnecting(true);
    try {
      const newBadges = await addFriend(firebaseUser.uid, friendUid);
      await refreshUserDoc();
      setDone(true);

      toast.success(`Connected with ${friend?.displayName ?? 'friend'}!`);
      newBadges.forEach((id) => {
        const cfg = BADGE_CONFIG[id];
        toast.success(`Badge unlocked: ${cfg.icon} ${cfg.name}`, { duration: 4000 });
      });

      setTimeout(() => router.replace('/profile'), 2000);
    } catch {
      toast.error('Could not connect. Try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Logo */}
          <div className="flex justify-center">
            <HarpLogo className="w-10 h-10 text-gold" />
          </div>

          {loadingFriend ? (
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse mx-auto" />
              <div className="h-4 bg-white/10 animate-pulse rounded w-32 mx-auto" />
            </div>
          ) : !friend ? (
            <div className="text-center space-y-3">
              <p className="font-display text-cream text-xl">User not found</p>
              <p className="font-mono text-cream/40 text-xs">This friend link may be invalid.</p>
              <Button variant="secondary" size="md" onClick={() => router.replace('/diary')}>
                Go to Diary
              </Button>
            </div>
          ) : (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-5 text-center">
              {/* Friend avatar */}
              <div className="flex justify-center">
                {friend.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.photoURL}
                    alt={friend.displayName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full border-2 border-gold/30 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gold/20 border-2 border-gold/30 flex items-center justify-center">
                    <span className="font-display text-gold text-2xl">
                      {(friend.displayName ?? 'G')[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="font-display text-cream text-xl">{friend.displayName}</p>
                <p className="font-mono text-cream/40 text-xs mt-0.5">
                  {friend.totalPints} pint{friend.totalPints !== 1 ? 's' : ''} logged
                </p>
              </div>

              {isSelf ? (
                <p className="font-mono text-cream/40 text-xs">This is your own QR code.</p>
              ) : done || alreadyFriends ? (
                <div className="space-y-2">
                  <div className="text-3xl">🤝</div>
                  <p className="font-display text-gold text-lg">
                    {done ? 'Connected!' : 'Already friends'}
                  </p>
                  <p className="font-mono text-cream/40 text-xs">
                    {done ? 'Redirecting to your profile…' : "You're already connected."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-mono text-cream/50 text-xs">
                    Connect to see each other&apos;s pints and earn social badges
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    loading={connecting}
                    onClick={handleConnect}
                  >
                    Connect as Friends
                  </Button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AuthGuard>
  );
}
