#!/usr/bin/env node
/**
 * One-off backfill for the anonymised pubStats collection.
 *
 * Reads every doc in /pints, groups by placeId, and writes the aggregate
 * { totalRating, pintCount, avgRating, ... } into /pubStats/{placeId}.
 * Safe to re-run — it rebuilds each aggregate from scratch.
 *
 * Prerequisites:
 *   1. npm install --save-dev firebase-admin
 *   2. Auth — either:
 *        a. gcloud auth application-default login   (easiest, picks up your user creds)
 *        b. Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON key
 *
 * Run:
 *   node scripts/backfill-pub-stats.mjs
 *   node scripts/backfill-pub-stats.mjs --dry-run     (prints what it would write)
 */

import admin from 'firebase-admin';

const PROJECT_ID = 'guinness-passport';
const DRY_RUN = process.argv.includes('--dry-run');

admin.initializeApp({
  projectId: PROJECT_ID,
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

function round1(n) {
  return Math.round(n * 10) / 10;
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Reading pints from project ${PROJECT_ID}...`);
  const snap = await db.collection('pints').get();
  console.log(`Found ${snap.size} pint documents`);

  // Group by placeId
  const byPlace = new Map();
  let skippedNoPlaceId = 0;

  for (const docSnap of snap.docs) {
    const p = docSnap.data();
    if (!p.placeId) {
      skippedNoPlaceId++;
      continue;
    }
    const existing = byPlace.get(p.placeId);
    if (!existing) {
      byPlace.set(p.placeId, {
        placeId: p.placeId,
        pubName: p.pubName ?? '',
        lat: p.lat ?? 0,
        lng: p.lng ?? 0,
        totalRating: Number(p.rating ?? 0),
        pintCount: 1,
      });
    } else {
      existing.totalRating += Number(p.rating ?? 0);
      existing.pintCount += 1;
      // Prefer the most recent pubName/lat/lng if we encounter non-empty values
      if (p.pubName) existing.pubName = p.pubName;
      if (p.lat) existing.lat = p.lat;
      if (p.lng) existing.lng = p.lng;
    }
  }

  console.log(`Aggregated into ${byPlace.size} pubs`);
  console.log(`Skipped ${skippedNoPlaceId} pints with no placeId`);

  if (byPlace.size === 0) {
    console.log('Nothing to write.');
    return;
  }

  if (DRY_RUN) {
    for (const pub of byPlace.values()) {
      console.log(
        `  ${pub.pubName.padEnd(40)} pints=${pub.pintCount.toString().padStart(3)}  avg=${round1(pub.totalRating / pub.pintCount).toFixed(1)}`
      );
    }
    console.log('\n[DRY RUN] — no writes performed. Re-run without --dry-run to apply.');
    return;
  }

  // Batch writes (Firestore limit: 500 per batch)
  const pubs = Array.from(byPlace.values());
  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < pubs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const slice = pubs.slice(i, i + BATCH_SIZE);
    for (const pub of slice) {
      const ref = db.collection('pubStats').doc(pub.placeId);
      batch.set(ref, {
        placeId: pub.placeId,
        pubName: pub.pubName,
        lat: pub.lat,
        lng: pub.lng,
        totalRating: pub.totalRating,
        pintCount: pub.pintCount,
        avgRating: round1(pub.totalRating / pub.pintCount),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    written += slice.length;
    console.log(`Wrote ${written}/${pubs.length} pub aggregates`);
  }

  console.log('\n✔ Backfill complete.');
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
