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
  arrayUnion,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Pint, User, PintFormData, Stats, BadgeId, Badge } from '@/types';

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function createUserDoc(uid: string, data: Partial<User>) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    totalPints: 0,
    avgRating: 0,
    socialPints: 0,
    friendIds: [],
    badges: [],
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
  const hasFriends = (formData.withFriends ?? []).length > 0;

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
    withFriends: formData.withFriends ?? [],
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
    const update: Record<string, unknown> = {
      totalPints: increment(1),
      avgRating: Math.round(newAvg * 10) / 10,
    };
    if (hasFriends) {
      update.socialPints = increment(1);
    }
    await updateDoc(userRef, update);
  }

  // Award pint-related badges if friends were tagged
  if (hasFriends) {
    const freshSnap = await getDoc(userRef);
    if (freshSnap.exists()) {
      const freshData = freshSnap.data() as User;
      await checkAndAwardPintBadges(
        uid,
        { ...pintData, id: ref.id } as Pint,
        freshData.socialPints ?? 1,
        freshData.badges ?? []
      );
    }
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

export interface PintEditFields {
  pubName: string;
  address: string;
  placeId: string;
  lat: number;
  lng: number;
  rating: number;
  tags: string[];
  note: string;
}

export async function updatePint(pintId: string, uid: string, fields: PintEditFields) {
  const pintRef = doc(db, 'pints', pintId);
  const pintSnap = await getDoc(pintRef);
  if (!pintSnap.exists() || pintSnap.data().userId !== uid) {
    throw new Error('Unauthorized');
  }

  const oldRating = pintSnap.data().rating as number;
  await updateDoc(pintRef, fields as unknown as Record<string, unknown>);

  // Re-compute avgRating on the user doc if rating changed
  if (oldRating !== fields.rating) {
    const allPints = await getAllPints(uid);
    if (allPints.length > 0) {
      const newAvg =
        allPints.reduce((sum, p) => sum + (p.id === pintId ? fields.rating : p.rating), 0) /
        allPints.length;
      await updateDoc(doc(db, 'users', uid), {
        avgRating: Math.round(newAvg * 10) / 10,
      });
    }
  }
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

// ─── Friends ──────────────────────────────────────────────────────────────────

/** Adds a mutual friendship between myUid and friendUid. */
export async function addFriend(myUid: string, friendUid: string): Promise<BadgeId[]> {
  if (myUid === friendUid) throw new Error('Cannot add yourself');

  const myRef = doc(db, 'users', myUid);
  const friendRef = doc(db, 'users', friendUid);

  // Own-doc write (always allowed)
  await updateDoc(myRef, { friendIds: arrayUnion(friendUid) });
  // Other-doc write (allowed by Firestore rule: self-UID append only)
  await updateDoc(friendRef, { friendIds: arrayUnion(myUid) });

  // Award badges for both parties
  const mySnap = await getDoc(myRef);
  const myData = mySnap.data() as User;
  const earnedBadges = await checkAndAwardFriendBadges(myUid, myData);

  // Award friend's badges (fire-and-forget)
  const friendSnap = await getDoc(friendRef);
  checkAndAwardFriendBadges(friendUid, friendSnap.data() as User).catch(() => {});

  return earnedBadges;
}

/** Fetches User docs for all of uid's friends. */
export async function getFriends(uid: string): Promise<User[]> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return [];
  const friendIds: string[] = userSnap.data().friendIds ?? [];
  if (friendIds.length === 0) return [];

  const results = await Promise.all(
    friendIds.map((fid) => getDoc(doc(db, 'users', fid)))
  );
  return results
    .filter((s) => s.exists())
    .map((s) => ({ uid: s.id, ...s.data() } as User));
}

/** Paginated fetch of pints from a list of friend UIDs. */
export async function getFriendsPints(
  friendIds: string[],
  pageSize = 10,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ pints: Pint[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> {
  if (friendIds.length === 0) return { pints: [], lastDoc: null, hasMore: false };

  const ids = friendIds.slice(0, 30);

  let q = query(
    collection(db, 'pints'),
    where('userId', 'in', ids),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  if (lastDoc) {
    q = query(
      collection(db, 'pints'),
      where('userId', 'in', ids),
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

/** Fetches all pints from a list of friend UIDs (for map view). */
export async function getAllFriendsPints(friendIds: string[]): Promise<Pint[]> {
  if (friendIds.length === 0) return [];

  // Batch into groups of 30 (Firestore 'in' limit)
  const batches: Pint[][] = [];
  for (let i = 0; i < friendIds.length; i += 30) {
    const ids = friendIds.slice(i, i + 30);
    const q = query(
      collection(db, 'pints'),
      where('userId', 'in', ids),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    batches.push(snap.docs.map(pintFromSnap));
  }

  return batches.flat().sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

/** Badge shape used only at write time (earnedAt is a FieldValue sentinel). */
type BadgeWrite = { id: BadgeId; earnedAt: ReturnType<typeof serverTimestamp> };

async function awardBadges(uid: string, newBadges: BadgeWrite[]) {
  if (newBadges.length === 0) return;
  await updateDoc(doc(db, 'users', uid), {
    badges: arrayUnion(...newBadges),
  });
}

/** Check and award friend-connection badges. Returns newly awarded badge IDs. */
export async function checkAndAwardFriendBadges(
  uid: string,
  userData: Partial<User>
): Promise<BadgeId[]> {
  const existingIds = (userData.badges ?? []).map((b) => b.id);
  const friendCount = (userData.friendIds ?? []).length;
  const newBadges: BadgeWrite[] = [];

  if (friendCount >= 1 && !existingIds.includes('first_friend')) {
    newBadges.push({ id: 'first_friend', earnedAt: serverTimestamp() });
  }
  if (friendCount >= 5 && !existingIds.includes('social_butterfly')) {
    newBadges.push({ id: 'social_butterfly', earnedAt: serverTimestamp() });
  }

  await awardBadges(uid, newBadges);
  return newBadges.map((b) => b.id);
}

/** Check and award pint-social badges. Returns newly awarded badge IDs. */
export async function checkAndAwardPintBadges(
  uid: string,
  pint: Pint,
  socialPintsCount: number,
  existingBadges: Badge[]
): Promise<BadgeId[]> {
  const existingIds = existingBadges.map((b) => b.id);
  const newBadges: BadgeWrite[] = [];

  if (socialPintsCount >= 1 && !existingIds.includes('social_pint')) {
    newBadges.push({ id: 'social_pint', earnedAt: serverTimestamp() });
  }
  if ((pint.withFriends?.length ?? 0) >= 3 && !existingIds.includes('round_buyer')) {
    newBadges.push({ id: 'round_buyer', earnedAt: serverTimestamp() });
  }
  if (socialPintsCount >= 5 && !existingIds.includes('pub_crawlers')) {
    newBadges.push({ id: 'pub_crawlers', earnedAt: serverTimestamp() });
  }
  if (socialPintsCount >= 10 && !existingIds.includes('the_regular')) {
    newBadges.push({ id: 'the_regular', earnedAt: serverTimestamp() });
  }

  await awardBadges(uid, newBadges);
  return newBadges.map((b) => b.id);
}
