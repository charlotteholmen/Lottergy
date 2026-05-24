// Efraimidis-Spirakis weighted sampling without replacement. Direct port
// of powerball_tickets.py::weighted_sample_no_replace.
//
// For each item, draw a key = U^(1/w) where U ~ Uniform(0,1); take the
// top-k items by key. This is well-known and stable for k << n.

import type { BallFrequency } from "./types.ts";
import { mathRandom, type Rng } from "./rng.ts";

/**
 * Sample k items from a weighted pool, without replacement.
 * Returns the picked ball numbers (NOT sorted — caller decides).
 */
export function weightedSampleNoReplace(
  pool: BallFrequency[],
  k: number,
  rng: Rng = mathRandom,
): number[] {
  if (k <= 0 || pool.length === 0) return [];
  if (k >= pool.length) return pool.map((b) => b.number);

  // Keys = (sortKey, ballNumber). Floor weight by epsilon to avoid divide-by-zero.
  const keys: Array<[number, number]> = pool.map((b) => {
    const w = Math.max(b.rate, 1e-9);
    return [Math.pow(rng(), 1 / w), b.number];
  });
  keys.sort((a, b) => b[0] - a[0]); // descending by key
  return keys.slice(0, k).map(([, n]) => n);
}
