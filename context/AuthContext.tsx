'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserDoc, getUserDoc } from '@/lib/firestore';
import { User } from '@/types';
import { DEMO_UID, DEMO_USER } from '@/lib/demoData';

const DEMO_FIREBASE_USER = { uid: DEMO_UID, photoURL: null, email: null } as unknown as FirebaseUser;

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
  refreshUserDoc: () => Promise<void>;
  isDemo: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
  refreshUserDoc: async () => {},
  isDemo: false,
  enterDemo: () => {},
  exitDemo: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('demo_mode') === '1'
  );

  const enterDemo = () => {
    sessionStorage.setItem('demo_mode', '1');
    setIsDemo(true);
  };

  const exitDemo = () => {
    sessionStorage.removeItem('demo_mode');
    setIsDemo(false);
  };

  const refreshUserDoc = async () => {
    if (auth.currentUser) {
      try {
        const doc = await getUserDoc(auth.currentUser.uid);
        setUserDoc(doc);
      } catch {
        // Firestore not yet set up — non-fatal
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Set auth state and unblock loading immediately — don't await Firestore
      setFirebaseUser(user);
      if (!user) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      setLoading(false);

      // Fetch the Firestore user doc in the background
      getUserDoc(user.uid)
        .then(async (doc) => {
          if (!doc) {
            // Self-heal: if the user is authenticated but has no Firestore doc
            // (e.g. their original createUserDoc on first sign-in failed), create
            // one now from their Firebase Auth profile.
            await createUserDoc(user.uid, {
              displayName: user.displayName ?? 'Guinness Drinker',
              email: user.email ?? '',
              uid: user.uid,
              photoURL: user.photoURL ?? undefined,
            });
            const fresh = await getUserDoc(user.uid);
            setUserDoc(fresh);
            return;
          }

          setUserDoc(doc);
          // Sync photoURL from Firebase Auth into Firestore if it's missing
          // (Google OAuth users who signed up before photoURL was stored)
          if (!doc.photoURL && user.photoURL) {
            import('@/lib/firestore').then(({ updateUserDoc }) => {
              updateUserDoc(user.uid, { photoURL: user.photoURL! }).catch(() => {});
            });
          }
        })
        .catch(() => {
          // Firestore DB may not be initialised yet — the app still works
          // without the doc (totalPints/avgRating just show 0)
        });
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = isDemo
    ? {
        firebaseUser: DEMO_FIREBASE_USER,
        userDoc: DEMO_USER,
        loading: false,
        refreshUserDoc: async () => {},
        isDemo: true,
        enterDemo,
        exitDemo,
      }
    : { firebaseUser, userDoc, loading, refreshUserDoc, isDemo: false, enterDemo, exitDemo };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
