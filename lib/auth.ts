import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserDoc, getUserDoc } from './firestore';

const googleProvider = new GoogleAuthProvider();

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await createUserDoc(cred.user.uid, {
    displayName,
    email,
    uid: cred.user.uid,
  });
  return cred;
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const cred = await signInWithPopup(auth, googleProvider);
  // Create doc if first time
  const existing = await getUserDoc(cred.user.uid);
  if (!existing) {
    await createUserDoc(cred.user.uid, {
      displayName: cred.user.displayName ?? 'Guinness Drinker',
      email: cred.user.email ?? '',
      uid: cred.user.uid,
      photoURL: cred.user.photoURL ?? undefined,
    });
  }
  return cred;
}

export async function logOut() {
  await signOut(auth);
}
