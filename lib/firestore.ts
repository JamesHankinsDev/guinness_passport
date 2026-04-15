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
  runTransaction,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { haversineMiles } from './geo';
import { Pilgrimage, Pint, PubStats, User, PintFormData, Stats, BadgeId, Badge } from '@/types';

/**
 * Thresholds for "trail eligible" — must match the constants in
 * functions/src/generateOrganicTrails.ts. Kept duplicated (not shared)
 * because the web app and Cloud Functions are separate TS projects.
 */
const TRAIL_MIN_PINT_COUNT = 3;
const TRAIL_MIN_AVG_RATING = 4.0;

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function createUserDoc(uid: string, data: Partial<User>) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    totalPints: 0,
    avgRating: 0,
    socialPints: 0,
    friendIds: [],
    badges: [],
    shareWithFriends: true,
    totalSplits: 0,
    avgSplitScore: 0,
    bestSplitScore: 0,
    splitStreak: 0,
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

// ─── Pub aggregate stats (anonymised, publicly readable) ─────────────────────

/** Rounds to 1 decimal place, matching the convention used for user.avgRating. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Incrementally updates the anonymised pubStats doc for a place when a pint is
 * added, edited, or deleted. `countDelta` is +1/0/-1 and `ratingDelta` is the
 * change in summed rating. Fail-safe: callers should not block user flows on it.
 */
async function adjustPubStats(params: {
  placeId: string;
  pubName: string;
  lat: number;
  lng: number;
  countDelta: 1 | 0 | -1;
  ratingDelta: number;
}) {
  const { placeId, pubName, lat, lng, countDelta, ratingDelta } = params;
  if (!placeId) return; // pints without a valid Google Places ID aren't aggregated

  const ref = doc(db, 'pubStats', placeId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      // First pint at this pub — create the aggregate.
      if (countDelta !== 1) return; // edit/delete with no prior aggregate: nothing to do
      const avg = round1(ratingDelta);
      tx.set(ref, {
        placeId,
        pubName,
        lat,
        lng,
        totalRating: ratingDelta,
        pintCount: 1,
        avgRating: avg,
        trailEligible: 1 >= TRAIL_MIN_PINT_COUNT && avg >= TRAIL_MIN_AVG_RATING,
        lastUpdated: serverTimestamp(),
      });
      return;
    }

    const data = snap.data() as PubStats;
    const newCount = Math.max(0, data.pintCount + countDelta);
    const newTotal = Math.max(0, data.totalRating + ratingDelta);

    if (newCount === 0) {
      // Last pint at this pub removed — zero out the aggregate (can't delete under current rules).
      tx.update(ref, {
        totalRating: 0,
        pintCount: 0,
        avgRating: 0,
        trailEligible: false,
        lastUpdated: serverTimestamp(),
      });
      return;
    }

    const newAvg = round1(newTotal / newCount);
    tx.update(ref, {
      pubName, // refresh in case Place rename
      lat,
      lng,
      totalRating: newTotal,
      pintCount: newCount,
      avgRating: newAvg,
      trailEligible: newCount >= TRAIL_MIN_PINT_COUNT && newAvg >= TRAIL_MIN_AVG_RATING,
      lastUpdated: serverTimestamp(),
    });
  });
}

/**
 * Client-side geo filter for organic pilgrimage trails. Firestore has no
 * native "within X miles" query so we fetch every active organic trail once
 * and haversine-filter in memory. Fine while the count is small; revisit
 * with a geohash index if the collection grows past a few thousand.
 */
export async function getNearbyOrganicTrails({
  lat,
  lng,
  radiusMiles,
}: {
  lat: number;
  lng: number;
  radiusMiles: number;
}): Promise<Pilgrimage[]> {
  const q = query(
    collection(db, 'pilgrimages'),
    where('source', '==', 'organic'),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  const trails = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pilgrimage));
  return trails.filter((trail) =>
    trail.stops.some(
      (stop) => haversineMiles(lat, lng, stop.lat, stop.lng) <= radiusMiles
    )
  );
}

/** Fetches all pub aggregates with enough samples to appear on the heatmap. */
export async function getHeatmapPubStats(minPintCount = 3): Promise<PubStats[]> {
  const q = query(
    collection(db, 'pubStats'),
    where('pintCount', '>=', minPintCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ placeId: d.id, ...d.data() } as PubStats));
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
    splitScore: formData.splitAttempted ? (formData.splitScore ?? 0) : null,
    splitAttempted: formData.splitAttempted ?? false,
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

    // Update split stats if attempted
    if (formData.splitAttempted && formData.splitScore !== undefined) {
      const currentTotalSplits = userData.totalSplits ?? 0;
      const currentAvgSplit = userData.avgSplitScore ?? 0;
      const currentBest = userData.bestSplitScore ?? 0;
      const currentStreak = userData.splitStreak ?? 0;

      const newTotalSplits = currentTotalSplits + 1;
      const newAvgSplit =
        Math.round(((currentAvgSplit * currentTotalSplits + formData.splitScore) / newTotalSplits) * 10) / 10;

      update.totalSplits = newTotalSplits;
      update.avgSplitScore = newAvgSplit;
      update.bestSplitScore = Math.max(currentBest, formData.splitScore);
      update.splitStreak = formData.splitScore >= 70 ? currentStreak + 1 : 0;
    }

    await updateDoc(userRef, update);
  }

  // Award split badges if attempted
  if (formData.splitAttempted && formData.splitScore !== undefined) {
    const splitSnap = await getDoc(userRef);
    if (splitSnap.exists()) {
      const splitData = splitSnap.data() as User;
      await checkAndAwardSplitBadges(uid, formData.splitScore, splitData);
    }
  }

  // Update anonymised pub aggregate — fail-safe, never blocks the pint log.
  try {
    await adjustPubStats({
      placeId: formData.placeId,
      pubName: formData.pubName,
      lat: formData.lat,
      lng: formData.lng,
      countDelta: 1,
      ratingDelta: formData.rating,
    });
  } catch (err) {
    console.warn('pubStats update failed (non-fatal):', err);
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
  const oldPlaceId = pintSnap.data().placeId as string | undefined;
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

  // Update anonymised pub aggregate for this edit (fail-safe).
  try {
    if (oldPlaceId && oldPlaceId !== fields.placeId) {
      // Pub changed entirely — remove the old pint from the old pub, add to the new.
      await adjustPubStats({
        placeId: oldPlaceId,
        pubName: pintSnap.data().pubName,
        lat: pintSnap.data().lat,
        lng: pintSnap.data().lng,
        countDelta: -1,
        ratingDelta: -oldRating,
      });
      await adjustPubStats({
        placeId: fields.placeId,
        pubName: fields.pubName,
        lat: fields.lat,
        lng: fields.lng,
        countDelta: 1,
        ratingDelta: fields.rating,
      });
    } else if (oldRating !== fields.rating) {
      // Same pub, rating changed — adjust the running total only.
      await adjustPubStats({
        placeId: fields.placeId,
        pubName: fields.pubName,
        lat: fields.lat,
        lng: fields.lng,
        countDelta: 0,
        ratingDelta: fields.rating - oldRating,
      });
    }
  } catch (err) {
    console.warn('pubStats update failed (non-fatal):', err);
  }
}

export async function deletePint(pintId: string, uid: string) {
  const pintRef = doc(db, 'pints', pintId);
  const pintSnap = await getDoc(pintRef);
  if (!pintSnap.exists() || pintSnap.data().userId !== uid) {
    throw new Error('Unauthorized');
  }
  const pintData = pintSnap.data() as Pint;
  await deleteDoc(pintRef);

  // Decrement stats (simplified)
  await updateDoc(doc(db, 'users', uid), {
    totalPints: increment(-1),
  });

  // Update anonymised pub aggregate (fail-safe).
  try {
    await adjustPubStats({
      placeId: pintData.placeId,
      pubName: pintData.pubName,
      lat: pintData.lat,
      lng: pintData.lng,
      countDelta: -1,
      ratingDelta: -pintData.rating,
    });
  } catch (err) {
    console.warn('pubStats update failed (non-fatal):', err);
  }
}

export async function computeStats(uid: string): Promise<Stats> {
  const pints = await getAllPints(uid);

  const emptySplitDist: Record<string, number> = {
    '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0,
  };

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
      totalSplits: 0,
      avgSplitScore: null,
      bestSplitScore: null,
      splitScoreDistribution: { ...emptySplitDist },
    };
  }

  const pubMap: Record<string, { total: number; count: number }> = {};
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const dayDist: Record<string, number> = {
    Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0,
  };
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let totalRating = 0;
  let splitCount = 0;
  let splitTotal = 0;
  let bestSplit: number | null = null;
  const splitBuckets: Record<string, number> = { ...emptySplitDist };

  for (const p of pints) {
    totalRating += p.rating;
    ratingDist[p.rating] = (ratingDist[p.rating] || 0) + 1;

    if (!pubMap[p.pubName]) pubMap[p.pubName] = { total: 0, count: 0 };
    pubMap[p.pubName].total += p.rating;
    pubMap[p.pubName].count += 1;

    const date = p.createdAt?.toDate?.() ?? new Date();
    dayDist[days[date.getDay()]] += 1;

    if (p.splitAttempted && p.splitScore != null) {
      splitCount++;
      splitTotal += p.splitScore;
      if (bestSplit === null || p.splitScore > bestSplit) bestSplit = p.splitScore;
      if (p.splitScore <= 20) splitBuckets['0-20']++;
      else if (p.splitScore <= 40) splitBuckets['21-40']++;
      else if (p.splitScore <= 60) splitBuckets['41-60']++;
      else if (p.splitScore <= 80) splitBuckets['61-80']++;
      else splitBuckets['81-100']++;
    }
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
    totalSplits: splitCount,
    avgSplitScore: splitCount > 0 ? Math.round((splitTotal / splitCount) * 10) / 10 : null,
    bestSplitScore: bestSplit,
    splitScoreDistribution: splitBuckets,
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

/** Check and award split-the-G badges. Returns newly awarded badge IDs. */
export async function checkAndAwardSplitBadges(
  uid: string,
  splitScore: number,
  userData: Partial<User>
): Promise<BadgeId[]> {
  const existingIds = (userData.badges ?? []).map((b) => b.id);
  const newBadges: BadgeWrite[] = [];

  const totalSplits = userData.totalSplits ?? 0;
  const avgSplitScore = userData.avgSplitScore ?? 0;
  const splitStreak = userData.splitStreak ?? 0;

  if (totalSplits >= 1 && !existingIds.includes('first_split')) {
    newBadges.push({ id: 'first_split', earnedAt: serverTimestamp() });
  }
  if (splitScore >= 95 && !existingIds.includes('perfect_split')) {
    newBadges.push({ id: 'perfect_split', earnedAt: serverTimestamp() });
  }
  if (splitStreak >= 5 && !existingIds.includes('split_streak')) {
    newBadges.push({ id: 'split_streak', earnedAt: serverTimestamp() });
  }
  if (totalSplits >= 10 && avgSplitScore >= 80 && !existingIds.includes('split_master')) {
    newBadges.push({ id: 'split_master', earnedAt: serverTimestamp() });
  }
  if (totalSplits >= 25 && !existingIds.includes('g_whiz')) {
    newBadges.push({ id: 'g_whiz', earnedAt: serverTimestamp() });
  }

  await awardBadges(uid, newBadges);
  return newBadges.map((b) => b.id);
}
