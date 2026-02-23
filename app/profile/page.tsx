'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { updateUserDoc } from '@/lib/firestore';
import { logOut } from '@/lib/auth';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/Button';
import { HarpLogo } from '@/components/ui/HarpLogo';

export default function ProfilePage() {
  const { firebaseUser, userDoc, refreshUserDoc } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(userDoc?.displayName ?? '');
  const [homePub, setHomePub] = useState(userDoc?.homePub ?? '');
  const [loggingOut, setLoggingOut] = useState(false);

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
          </div>

          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mb-3">
              {userDoc?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userDoc.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
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
      </div>
    </AuthGuard>
  );
}
