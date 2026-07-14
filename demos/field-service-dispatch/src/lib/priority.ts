import { SLA_BY_URGENCY, URGENCIES } from './dispatch';

/**
 * Geo-priority logic for dispatch assignments (Suggested Extension #1).
 *
 * Each open ticket is scored 0–100 from three weighted factors so dispatchers
 * can work the queue in the most operationally sensible order:
 *
 *   • Urgency      — the customer-facing severity of the issue.
 *   • Proximity    — how close the job is to the dispatch depot (closer jobs
 *                    can be reached faster, reducing windshield time).
 *   • SLA pressure — how much of the response SLA has already elapsed.
 *
 * Keeping the scoring here (rather than in the UI) means it can later be
 * replaced by a Power Automate flow or a routing service without touching any
 * screen code.
 */

/** Dispatch depot the field crew rolls out from (Seattle, WA by default). */
export const DEPOT = { lat: 47.6062, lon: -122.3321, label: 'Seattle Depot' };

/** Distance, in km, beyond which the proximity bonus is effectively zero. */
const MAX_USEFUL_DISTANCE_KM = 60;

// Factor weights (sum to 100).
const W_URGENCY = 50;
const W_PROXIMITY = 25;
const W_SLA = 25;

/** Great-circle distance between two coordinates in kilometres (haversine). */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371; // Earth radius (km)
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface PriorityInput {
  urgency?: number;
  latitude?: number;
  longitude?: number;
  reportedOn?: string; // ISO
}

export interface PriorityResult {
  /** Composite score, 0–100 (higher = dispatch sooner). */
  score: number;
  /** Distance from the depot in km, or undefined when no coordinates exist. */
  distanceKm?: number;
  /** Human-readable factors explaining the score. */
  factors: string[];
  /** Bucketed band for badge colouring. */
  band: 'Critical' | 'High' | 'Medium' | 'Low';
}

/** Computes a dispatch priority score and an explanation for a single ticket. */
export function computePriority(input: PriorityInput): PriorityResult {
  const factors: string[] = [];
  const urgency = input.urgency ?? 2;

  // 1. Urgency — Critical(4) → full weight, Low(1) → quarter weight.
  const urgencyFraction = urgency / 4;
  const urgencyPoints = urgencyFraction * W_URGENCY;
  factors.push(`${URGENCIES[urgency] ?? 'Medium'} urgency (+${Math.round(urgencyPoints)})`);

  // 2. Proximity — nearer to the depot scores higher.
  let proximityPoints = 0;
  let distanceKm: number | undefined;
  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    distanceKm = haversineKm(DEPOT, { lat: input.latitude, lon: input.longitude });
    const closeness = Math.max(0, 1 - distanceKm / MAX_USEFUL_DISTANCE_KM);
    proximityPoints = closeness * W_PROXIMITY;
    factors.push(`${distanceKm.toFixed(1)} km from depot (+${Math.round(proximityPoints)})`);
  } else {
    factors.push('No location — proximity not scored');
  }

  // 3. SLA pressure — the more of the SLA window consumed, the higher the score.
  let slaPoints = 0;
  if (input.reportedOn) {
    const reported = new Date(input.reportedOn).getTime();
    if (!Number.isNaN(reported)) {
      const elapsedHours = Math.max(0, (Date.now() - reported) / (1000 * 60 * 60));
      const target = SLA_BY_URGENCY[urgency] ?? 48;
      const consumed = Math.min(1, elapsedHours / target);
      slaPoints = consumed * W_SLA;
      const pct = Math.round(consumed * 100);
      factors.push(`${pct}% of SLA window used (+${Math.round(slaPoints)})`);
    }
  }

  const score = Math.round(Math.min(100, urgencyPoints + proximityPoints + slaPoints));
  return { score, distanceKm, factors, band: bandFor(score) };
}

function bandFor(score: number): PriorityResult['band'] {
  if (score >= 75) return 'Critical';
  if (score >= 55) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

export function bandColor(band: PriorityResult['band']): 'danger' | 'warning' | 'informative' | 'subtle' {
  switch (band) {
    case 'Critical':
      return 'danger';
    case 'High':
      return 'warning';
    case 'Medium':
      return 'informative';
    default:
      return 'subtle';
  }
}
