'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserDoc } from '@/lib/firestore';
import { User } from '@/types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
  refreshUserDoc: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        .then((doc) => {
          setUserDoc(doc);
          // Sync photoURL from Firebase Auth into Firestore if it's missing
          // (Google OAuth users who signed up before photoURL was stored)
          if (doc && !doc.photoURL && user.photoURL) {
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

  return (
    <AuthContext.Provider value={{ firebaseUser, userDoc, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
