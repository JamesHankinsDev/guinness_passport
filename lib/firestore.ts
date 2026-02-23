import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Pint, User, PintFormData, Stats } from '@/types';

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function createUserDoc(uid: string, data: Partial<User>) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    totalPints: 0,
    avgRating: 0,
    createdAt: serverTimestamp(),
  });
}

export async function getUserDoc(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

export async function updateUserDoc(uid: string, data: Partial<User>) {
  await updateDoc(doc(db, 'users', uid), data as Record<string, unknown>);
}

// ─── Pint helpers ─────────────────────────────────────────────────────────────

function pintFromSnap(snap: DocumentSnapshot | QueryDocumentSnapshot): Pint {
  return { id: snap.id, ...snap.data() } as Pint;
}

export async function addPint(
  uid: string,
  formData: PintFormData,
  photoUrl?: string
): Promise<string> {
  const pintData = {
    userId: uid,
    pubName: formData.pubName,
    address: formData.address,
    placeId: formData.placeId,
    lat: formData.lat,
    lng: formData.lng,
    rating: formData.rating,
    tags: formData.tags,
    note: formData.note,
    photoUrl: photoUrl ?? '',
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'pints'), pintData);

  // Update denormalised user stats
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data() as User;
    const newTotal = (userData.totalPints || 0) + 1;
    const newAvg =
      ((userData.avgRating || 0) * (userData.totalPints || 0) + formData.rating) / newTotal;
    await updateDoc(userRef, {
      totalPints: increment(1),
      avgRating: Math.round(newAvg * 10) / 10,
    });
  }

  return ref.id;
}

export async function getPints(uid: string, pageSize = 10, lastDoc?: QueryDocumentSnapshot) {
  let q = query(
    collection(db, 'pints'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(
      collection(db, 'pints'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }

  const snap = await getDocs(q);
  return {
    pints: snap.docs.map(pintFromSnap),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}

export async function getAllPints(uid: string): Promise<Pint[]> {
  const q = query(
    collection(db, 'pints'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(pintFromSnap);
}

export async function deletePint(pintId: string, uid: string) {
  const pintRef = doc(db, 'pints', pintId);
  const pintSnap = await getDoc(pintRef);
  if (!pintSnap.exists() || pintSnap.data().userId !== uid) {
    throw new Error('Unauthorized');
  }
  await deleteDoc(pintRef);

  // Decrement stats (simplified)
  await updateDoc(doc(db, 'users', uid), {
    totalPints: increment(-1),
  });
}

export async function computeStats(uid: string): Promise<Stats> {
  const pints = await getAllPints(uid);

  if (pints.length === 0) {
    return {
      totalPints: 0,
      uniquePubs: 0,
      avgRating: 0,
      bestPub: null,
      bestPubRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      dayOfWeekDistribution: {
        Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0,
      },
    };
  }

  const pubMap: Record<string, { total: number; count: number }> = {};
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const dayDist: Record<string, number> = {
    Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0,
  };
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let totalRating = 0;

  for (const p of pints) {
    totalRating += p.rating;
    ratingDist[p.rating] = (ratingDist[p.rating] || 0) + 1;

    if (!pubMap[p.pubName]) pubMap[p.pubName] = { total: 0, count: 0 };
    pubMap[p.pubName].total += p.rating;
    pubMap[p.pubName].count += 1;

    const date = p.createdAt?.toDate?.() ?? new Date();
    dayDist[days[date.getDay()]] += 1;
  }

  const uniquePubs = Object.keys(pubMap).length;
  const avgRating = Math.round((totalRating / pints.length) * 10) / 10;

  let bestPub: string | null = null;
  let bestPubRating = 0;
  for (const [name, { total, count }] of Object.entries(pubMap)) {
    if (count >= 2) {
      const avg = total / count;
      if (avg > bestPubRating) {
        bestPubRating = Math.round(avg * 10) / 10;
        bestPub = name;
      }
    }
  }

  return {
    totalPints: pints.length,
    uniquePubs,
    avgRating,
    bestPub,
    bestPubRating,
    ratingDistribution: ratingDist,
    dayOfWeekDistribution: dayDist,
  };
}
