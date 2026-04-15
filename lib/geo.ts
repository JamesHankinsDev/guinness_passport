/** Mean radius of Earth in miles — used by the haversine distance formula. */
const EARTH_RADIUS_MILES = 3958.8;

/**
 * Great-circle distance in miles between two lat/lng points.
 * Used client-side for `getNearbyOrganicTrails`; the Cloud Function carries
 * its own copy so the two codebases don't need to share a package.
 */
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
