// Pool construction. Replaces legacy `build_pool` with the new
// `frequencyPercentileRange: [low, high]` shape per GOAL.md locked decision.
//
// Filter order (deterministic):
//   1. Slice by frequency percentile (0 = coldest, 100 = hottest).
//   2. Drop balls with rate <= minFrequencyRate (STRICT >).
//   3. Sort hot→cold, cap to topN (0 = no cap).

import type { BallFrequency, PoolFilter } from "./types.ts";

export function buildPool(balls: BallFrequency[], filter: PoolFilter): BallFrequency[] {
  if (balls.length === 0) return [];

  // Step 1: sort ascending by rate (cold→hot), then take percentile slice.
  // Ties broken by ball number (ascending) for determinism.
  const sortedAsc = [...balls].sort((a, b) => a.rate - b.rate || a.number - b.number);
  const n = sortedAsc.length;
  const [low, high] = filter.frequencyPercentileRange;

  const lowClamped = Math.max(0, Math.min(100, low));
  const highClamped = Math.max(lowClamped, Math.min(100, high));
  const startIdx = Math.floor((lowClamped / 100) * n);
  const endIdx = Math.ceil((highClamped / 100) * n);
  let pool = sortedAsc.slice(startIdx, endIdx);

  // Step 2: strict > minFrequencyRate
  pool = pool.filter((b) => b.rate > filter.minFrequencyRate);

  // Step 3: sort hot→cold (ties broken by ascending ball number for determinism)
  pool.sort((a, b) => b.rate - a.rate || a.number - b.number);

  // Step 4: cap to topN
  if (filter.topN > 0) {
    pool = pool.slice(0, filter.topN);
  }

  return pool;
}

/**
 * Decade-coverage sanity. The legacy generator pre-flighted this before
 * starting sampling to avoid burning the attempt cap. The UI shows this as
 * a warning before "generate." Returns the set of distinct decade indices
 * (0-based: 0 = 1-10, 1 = 11-20, ...) represented in the pool.
 */
export function decadesCovered(pool: BallFrequency[]): Set<number> {
  return new Set(pool.map((b) => Math.floor((b.number - 1) / 10)));
}
