'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { updateUserDoc, getFriends } from '@/lib/firestore';
import { logOut } from '@/lib/auth';
import type { User } from '@/types';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/Button';
import { HarpLogo } from '@/components/ui/HarpLogo';
import { QRCodeModal } from '@/components/social/QRCodeModal';

export default function ProfilePage() {
  const { firebaseUser, userDoc, refreshUserDoc } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(userDoc?.displayName ?? '');
  const [homePub, setHomePub] = useState(userDoc?.homePub ?? '');
  const [loggingOut, setLoggingOut] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    setLoadingFriends(true);
    getFriends(firebaseUser.uid)
      .then(setFriends)
      .finally(() => setLoadingFriends(false));
  }, [firebaseUser?.uid, userDoc?.friendIds?.length]);

  const handleSave = async () => {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await updateUserDoc(firebaseUser.uid, { displayName, homePub });
      await refreshUserDoc();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogOut = async () => {
    setLoggingOut(true);
    try {
      await logOut();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const joinDate = userDoc?.createdAt?.toDate?.();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black">
        <TopBar />
        <main className="max-w-xl mx-auto px-4 pt-20 pb-24">
          <div className="mt-4 mb-8 flex items-center justify-between">
            <h1 className="font-display text-2xl text-cream">Profile</h1>
            <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)}>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75V16.5zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
              My QR
            </Button>
          </div>

          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 overflow-hidden flex items-center justify-center mb-3">
              {(firebaseUser?.photoURL ?? userDoc?.photoURL) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firebaseUser?.photoURL ?? userDoc!.photoURL!} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <HarpLogo className="w-8 h-10" />
              )}
            </div>
            <p className="font-display text-cream text-xl">{userDoc?.displayName ?? 'Drinker'}</p>
            <p className="font-mono text-cream/40 text-xs mt-0.5">{userDoc?.email}</p>
            {joinDate && (
              <p className="font-mono text-cream/20 text-[10px] mt-1 tracking-wide">
                Member since {joinDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </motion.div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Pints', value: userDoc?.totalPints ?? 0 },
              { label: 'Avg Rating', value: userDoc?.avgRating ? userDoc.avgRating.toFixed(1) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#111] border border-white/5 rounded-xl p-3 text-center">
                <div className="font-display text-xl text-gold">{value}</div>
                <div className="font-mono text-[10px] text-cream/40 tracking-widest uppercase mt-0.5">{label}</div>
              </div>
            ))}
            {userDoc?.homePub && (
              <div className="col-span-1 bg-[#111] border border-white/5 rounded-xl p-3 text-center">
                <div className="font-display text-xs text-gold truncate">{userDoc.homePub.split(' ')[0]}</div>
                <div className="font-mono text-[10px] text-cream/40 tracking-widest uppercase mt-0.5">Home Pub</div>
              </div>
            )}
          </div>

          {/* Friends */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-cream text-base">Friends</h2>
              <span className="font-mono text-cream/30 text-xs">
                {userDoc?.friendIds?.length ?? 0} connected
              </span>
            </div>

            {loadingFriends ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="bg-[#111] border border-white/5 rounded-xl p-5 text-center space-y-3">
                <p className="text-2xl">🤝</p>
                <p className="font-mono text-cream/40 text-xs">No friends yet</p>
                <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)}>
                  Share your QR code
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((f) => (
                  <Link key={f.uid} href={`/passport/${f.uid}`}>
                    <div className="bg-[#111] border border-white/5 hover:border-gold/20 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
                        {f.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="font-display text-gold text-sm">
                            {(f.displayName ?? 'G')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-cream text-sm truncate">{f.displayName}</p>
                        <p className="font-mono text-cream/40 text-xs">
                          {f.totalPints} pint{f.totalPints !== 1 ? 's' : ''}
                          {(f.badges?.length ?? 0) > 0 && ` · ${f.badges!.length} badge${f.badges!.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-cream/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="w-full border border-dashed border-white/10 hover:border-gold/30 rounded-xl px-4 py-3 font-mono text-cream/30 hover:text-cream/50 text-xs transition-colors"
                >
                  + Invite another friend
                </button>
              </div>
            )}
          </div>

          {/* Edit form */}
          <div className="bg-[#111] border border-white/5 rounded-xl p-5 space-y-4">
            <h2 className="font-display text-cream text-base">Edit Profile</h2>
            <div className="space-y-3">
              <div>
                <label className="font-mono text-cream/50 text-xs tracking-wide block mb-1.5">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                />
              </div>
              <div>
                <label className="font-mono text-cream/50 text-xs tracking-wide block mb-1.5">Home pub</label>
                <input
                  type="text"
                  placeholder="e.g. The Stag's Head"
                  value={homePub}
                  onChange={(e) => setHomePub(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/20 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                />
              </div>
            </div>
            <Button variant="primary" size="md" className="w-full" loading={saving} onClick={handleSave}>
              Save changes
            </Button>
          </div>

          {/* Sign out */}
          <div className="mt-6">
            <Button
              variant="danger"
              size="md"
              className="w-full"
              loading={loggingOut}
              onClick={handleLogOut}
            >
              Sign out
            </Button>
          </div>

          <p className="text-center font-mono text-cream/20 text-[10px] mt-6 tracking-widest">
            GUINNESS PASSPORT v1.0
          </p>
        </main>
        <BottomNav />

        {firebaseUser && (
          <QRCodeModal uid={firebaseUser.uid} open={qrOpen} onClose={() => setQrOpen(false)} />
        )}
      </div>
    </AuthGuard>
  );
}
