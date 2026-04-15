import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { haversineMiles, parseCity, UnionFind } from './utils';

// ─── Thresholds ──────────────────────────────────────────────────────────────
// Keep these in sync with lib/firestore.ts on the web side.

const MIN_PINT_COUNT = 3;
const MIN_AVG_RATING = 4.0;
const MAX_TRAIL_STOPS = 4;
const MIN_TRAIL_STOPS = 2;
const PROXIMITY_MILES = 1.0;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PubStatsDoc {
  placeId: string;
  pubName: string;
  lat: number;
  lng: number;
  pintCount: number;
  totalRating: number;
  avgRating: number;
  trailEligible?: boolean;
  lastUpdated?: Timestamp;
  // Populated from the pint collection during the run — used to derive titles.
  sampleAddress?: string;
}

interface PilgrimageStop {
  order: number;
  placeId: string;
  pubName: string;
  lat: number;
  lng: number;
  avgRating: number;
  pintCount: number;
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Nightly 02:00 UTC: scan eligible pubs, cluster by proximity, upsert
 * organic pilgrimage trails, and deactivate any that no longer cluster.
 *
 * Runs in a single pass — no pagination because the eligible set is
 * small by definition (pubs with 3+ high-rated logs). Revisit with
 * cursor pagination if the eligible count pushes past a few thousand.
 */
export const generateOrganicTrails = onSchedule(
  {
    schedule: '0 2 * * *',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const db = getFirestore();
    const runStart = Date.now();
    logger.info('generateOrganicTrails: run started');

    // 1. Fetch candidate pubs — start from the eligibility flag for efficiency,
    //    then re-verify in memory so we never trust the denormalised hint blindly.
    const pubSnap = await db
      .collection('pubStats')
      .where('trailEligible', '==', true)
      .get();

    const eligible: PubStatsDoc[] = [];
    for (const doc of pubSnap.docs) {
      const data = doc.data() as PubStatsDoc;
      if (
        data.pintCount >= MIN_PINT_COUNT &&
        data.avgRating >= MIN_AVG_RATING &&
        Number.isFinite(data.lat) &&
        Number.isFinite(data.lng) &&
        (Math.abs(data.lat) > 0.001 || Math.abs(data.lng) > 0.001)
      ) {
        eligible.push({ ...data, placeId: data.placeId ?? doc.id });
      }
    }

    logger.info(`Found ${eligible.length} eligible pubs`);

    if (eligible.length < MIN_TRAIL_STOPS) {
      logger.info('Not enough eligible pubs to form any trail; exiting.');
      await deactivateMissingTrails(db, new Set<string>());
      return;
    }

    // 2. Build proximity graph + union-find the connected components.
    const uf = new UnionFind();
    for (const pub of eligible) uf.add(pub.placeId);

    for (let i = 0; i < eligible.length; i++) {
      for (let j = i + 1; j < eligible.length; j++) {
        const a = eligible[i];
        const b = eligible[j];
        const dist = haversineMiles(a.lat, a.lng, b.lat, b.lng);
        if (dist <= PROXIMITY_MILES) {
          uf.union(a.placeId, b.placeId);
        }
      }
    }

    const pubById = new Map(eligible.map((p) => [p.placeId, p]));
    const rawClusters = uf.clusters();

    // 3. Build cluster definitions — top N pubs per cluster by rating, then count.
    const clusters: ClusterBuild[] = [];
    for (const memberIds of rawClusters.values()) {
      if (memberIds.length < MIN_TRAIL_STOPS) continue;

      const ranked = memberIds
        .map((id) => pubById.get(id)!)
        .filter(Boolean)
        .sort((a, b) => {
          if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
          return b.pintCount - a.pintCount;
        });

      const selected = ranked.slice(0, MAX_TRAIL_STOPS);
      if (selected.length < MIN_TRAIL_STOPS) continue;

      // Deterministic clusterId: sort the *selected* placeIds alphabetically
      // so the same roster always maps to the same document, even across runs.
      const clusterId = selected
        .map((p) => p.placeId)
        .slice()
        .sort()
        .join('_');

      clusters.push({ clusterId, selected });
    }

    logger.info(`Built ${clusters.length} viable clusters`);

    // 4. Enrich each cluster's top pub with a city name (for the title) by
    //    pulling one representative pint's address from the pints collection.
    //    We only do this per cluster, not per pub, to keep reads cheap.
    await Promise.all(clusters.map((c) => enrichWithCity(db, c)));

    // 5. Upsert each cluster as a pilgrimage document, then deactivate anything
    //    that didn't show up in this run.
    const activeClusterIds = new Set<string>();
    for (const cluster of clusters) {
      activeClusterIds.add(cluster.clusterId);
      await upsertPilgrimage(db, cluster);
    }

    await deactivateMissingTrails(db, activeClusterIds);

    logger.info(
      `generateOrganicTrails: done in ${Date.now() - runStart}ms — ${clusters.length} clusters upserted`
    );
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ClusterBuild {
  clusterId: string;
  selected: PubStatsDoc[];
  city?: string;
}

async function enrichWithCity(
  db: FirebaseFirestore.Firestore,
  cluster: ClusterBuild
): Promise<void> {
  const topPub = cluster.selected[0];
  try {
    const pintSnap = await db
      .collection('pints')
      .where('placeId', '==', topPub.placeId)
      .limit(1)
      .get();
    if (pintSnap.empty) return;
    const address = pintSnap.docs[0].data().address as string | undefined;
    if (address) {
      cluster.city = parseCity(address);
    }
  } catch (err) {
    logger.warn(`enrichWithCity failed for cluster ${cluster.clusterId}`, err);
  }
}

async function upsertPilgrimage(
  db: FirebaseFirestore.Firestore,
  cluster: ClusterBuild
): Promise<void> {
  const { clusterId, selected, city } = cluster;
  const stops: PilgrimageStop[] = selected.map((p, idx) => ({
    order: idx + 1,
    placeId: p.placeId,
    pubName: p.pubName,
    lat: p.lat,
    lng: p.lng,
    avgRating: p.avgRating,
    pintCount: p.pintCount,
  }));

  const avgRating =
    Math.round(
      (stops.reduce((sum, s) => sum + s.avgRating, 0) / stops.length) * 10
    ) / 10;
  const minRating = Math.min(...stops.map((s) => s.avgRating));
  const title = city ? `${city} Trail` : 'Local Trail';

  // Look up by clusterId + source=organic. This covers reactivation of
  // previously-inactive clusters automatically.
  const existingSnap = await db
    .collection('pilgrimages')
    .where('clusterId', '==', clusterId)
    .where('source', '==', 'organic')
    .limit(1)
    .get();

  if (existingSnap.empty) {
    await db.collection('pilgrimages').add({
      clusterId,
      source: 'organic',
      status: 'active',
      title,
      stops,
      totalStops: stops.length,
      minRating,
      avgRating,
      radiusMiles: PROXIMITY_MILES,
      createdAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
    });
    logger.info(`Created organic trail ${clusterId} (${title}, ${stops.length} stops)`);
  } else {
    const ref = existingSnap.docs[0].ref;
    await ref.update({
      status: 'active',
      title,
      stops,
      totalStops: stops.length,
      minRating,
      avgRating,
      lastUpdated: FieldValue.serverTimestamp(),
    });
    logger.info(`Updated organic trail ${clusterId} (${title})`);
  }
}

/**
 * Any organic trail whose clusterId isn't in the current run gets flipped
 * to status='inactive'. Organic trails are never hard-deleted — keeping the
 * history lets us revive them automatically if the cluster reforms.
 */
async function deactivateMissingTrails(
  db: FirebaseFirestore.Firestore,
  activeClusterIds: Set<string>
): Promise<void> {
  const activeSnap = await db
    .collection('pilgrimages')
    .where('source', '==', 'organic')
    .where('status', '==', 'active')
    .get();

  let deactivated = 0;
  for (const doc of activeSnap.docs) {
    const data = doc.data() as { clusterId?: string };
    if (!data.clusterId || !activeClusterIds.has(data.clusterId)) {
      await doc.ref.update({
        status: 'inactive',
        lastUpdated: FieldValue.serverTimestamp(),
      });
      deactivated++;
    }
  }
  if (deactivated > 0) {
    logger.info(`Deactivated ${deactivated} stale organic trail(s)`);
  }
}
