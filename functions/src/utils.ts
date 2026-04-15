/**
 * Self-contained helpers for generateOrganicTrails. Kept in the functions
 * codebase (not shared with the web app) so the two TS projects stay
 * independent — duplication is intentional here.
 */

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles between two lat/lng points. */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * A minimal union-find (disjoint-set) over string keys with path compression
 * and union-by-rank. Used to merge pub proximity pairs into clusters where
 * every pub is within 1 mile of at least one other pub in the same cluster.
 */
export class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  add(key: string): void {
    if (!this.parent.has(key)) {
      this.parent.set(key, key);
      this.rank.set(key, 0);
    }
  }

  find(key: string): string {
    let root = key;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression: point every node on the path directly at the root.
    let cur = key;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    const rankA = this.rank.get(rootA) ?? 0;
    const rankB = this.rank.get(rootB) ?? 0;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }

  /** Returns clusters as arrays of member keys, keyed by root. */
  clusters(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      const bucket = groups.get(root);
      if (bucket) {
        bucket.push(key);
      } else {
        groups.set(root, [key]);
      }
    }
    return groups;
  }
}

/**
 * Heuristic: pull a city/neighbourhood name out of a Google Places formatted
 * address. Google addresses are comma-separated and usually land in one of:
 *   "Name, Street, City, Postcode, Country"
 *   "Street, City, Postcode, Country"
 *   "Street, City, Country"
 *   "Street, City Postcode, Country"  (e.g. "Dublin 2")
 *
 * Strategy: peel off country (last segment if all letters) and postcode (any
 * segment containing a digit that *isn't* a "{Name} {N}" suffix like "Dublin 2"),
 * then take the last remaining segment as the city.
 *
 * Returns an empty string on failure — callers should fall back to "Local".
 */
export function parseCity(address: string): string {
  if (!address) return '';
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';

  // Walk from the back. Skip the country (last), skip postcodes (pure
  // alphanumeric with digits), keep the first "word-like" segment as the city.
  for (let i = parts.length - 1; i >= 0; i--) {
    const segment = parts[i];
    // Country: last segment only, always skipped.
    if (i === parts.length - 1) continue;
    // Postcode heuristic: segment contains a digit and either (a) has no space,
    // or (b) is short and alphanumeric (e.g. "D02 XH56", "SW1A 1AA").
    const hasDigit = /\d/.test(segment);
    const looksLikePostcode =
      hasDigit && (!/\s/.test(segment) || /^[A-Z0-9\s]{5,10}$/i.test(segment));
    if (looksLikePostcode) continue;
    // Otherwise this is the city (or "City N" district label). Strip trailing
    // district number: "Dublin 2" → "Dublin".
    return segment.replace(/\s+\d+$/, '').trim();
  }
  return '';
}
