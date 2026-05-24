// Constraint engine. Direct port of powerball_tickets.py::{features,
// passes_hard, soft_accept_prob} with TS types and the new Constraints
// schema (decadeSpan is now {min, max}, formerly two scalars).

import type { Constraints, Preferences, TicketFeatures } from "./types.ts";

/**
 * Compute the 5 features the constraint engine cares about for a
 * white-ball-only ticket. Whites are expected sorted ascending.
 */
export function features(whites: readonly number[], cfg: Constraints): TicketFeatures {
  let sum = 0;
  let oddCount = 0;
  let lowCount = 0;
  let consecutivePairs = 0;
  const decades = new Set<number>();

  for (let i = 0; i < whites.length; i++) {
    const n = whites[i];
    sum += n;
    if (n % 2 === 1) oddCount += 1;
    if (n <= cfg.lowCutoff) lowCount += 1;
    decades.add(Math.floor((n - 1) / 10));
    if (i > 0 && whites[i] - whites[i - 1] === 1) consecutivePairs += 1;
  }

  return {
    sum,
    oddCount,
    lowCount,
    consecutivePairs,
    decadeSpan: decades.size,
  };
}

export function passesHard(whites: readonly number[], cfg: Constraints): boolean {
  const f = features(whites, cfg);
  return (
    f.sum >= cfg.sum.min &&
    f.sum <= cfg.sum.max &&
    cfg.allowedOddCounts.includes(f.oddCount) &&
    cfg.allowedLowCounts.includes(f.lowCount) &&
    f.consecutivePairs <= cfg.maxConsecutivePairs &&
    f.decadeSpan >= cfg.decadeSpan.min &&
    f.decadeSpan <= cfg.decadeSpan.max
  );
}

export function softAcceptProb(
  whites: readonly number[],
  cfg: Constraints,
  prefs: Preferences,
): number {
  const f = features(whites, cfg);
  let p = 1.0;
  if (f.consecutivePairs === 1) p *= prefs.weightOneConsecutivePair;
  return p;
}
