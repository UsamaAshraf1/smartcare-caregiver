/**
 * Rough, non-traffic-aware distance/ETA — straight-line (haversine)
 * distance inflated by a road-windiness factor, divided by an assumed
 * average city speed. A copy of the patient app's frontend/src/lib/eta.ts,
 * kept identical on purpose so the caregiver and the patient see the same
 * number for the same position: retune both files together.
 */
export const ROAD_FACTOR = 1.4;
export const AVG_SPEED_KMH = 30;
const ARRIVING_NOW_THRESHOLD_KM = 0.3;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function roughEtaMinutes(distanceKm: number): number {
  return ((distanceKm * ROAD_FACTOR) / AVG_SPEED_KMH) * 60;
}

/** "2.4 km away · about 8 min", "Arriving now", or "about 2.4 km away · about 8 min"
 *  when the destination itself is only an approximate (geocoded) pin. */
export function formatDistanceEta(distanceKm: number, approx: boolean): string {
  if (!approx && distanceKm < ARRIVING_NOW_THRESHOLD_KM) return 'Arriving now';
  const etaMin = Math.max(1, Math.round(roughEtaMinutes(distanceKm)));
  const distLabel = `${approx ? 'about ' : ''}${distanceKm.toFixed(1)} km away`;
  return `${distLabel} · about ${etaMin} min`;
}
