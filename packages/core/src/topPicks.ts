// Top Picks: deterministic top-N enumeration sampling mode (NEW vs legacy).
// Per GOAL.md locked decision: "Ranks all constraint-satisfying combinations
// by joint-frequency score and returns the top `num_tickets`. Deterministic:
// same config → same output every run."
//
// Joint-frequency score = product of individual ball rates (whites + red).
// We rank by SUM OF LOG RATES instead of raw product to avoid floating-point
// underflow on very long pools — log-monotonic gives the same ranking.

import type { BallFrequency, Constraints, Ticket } from "./types.ts";
import { passesHard } from "./constraints.ts";

type ScoredTicket = { ticket: Ticket; score: number };

/**
 * Enumerate every constraint-satisfying (whites, red) combination from the
 * given pools, score by joint log-rate, return the top N.
 *
 * Cost: O(C(|W|,5) * |R|). With typical pools (20-30 whites, 5-15 reds)
 * the upper bound is ~700k combos — sub-second on a laptop. We DO NOT
 * pre-prune by score; the constraint filter does most of the trimming.
 */
export function topPicks(
  whitesPool: BallFrequency[],
  redsPool: BallFrequency[],
  cfg: Constraints,
  n: number,
): Ticket[] {
  if (whitesPool.length < 5 || redsPool.length === 0 || n <= 0) return [];

  // Pre-sort whites by ball number to make 5-combo enumeration stable.
  const whites = [...whitesPool].sort((a, b) => a.number - b.number);
  const reds = [...redsPool].sort((a, b) => a.number - b.number);

  // Pre-compute log rates (clamped) so we don't recompute per combo.
  const logRateW = new Map<number, number>(
    whites.map((b) => [b.number, Math.log(Math.max(b.rate, 1e-12))]),
  );
  const logRateR = new Map<number, number>(
    reds.map((b) => [b.number, Math.log(Math.max(b.rate, 1e-12))]),
  );

  // Enumerate 5-combos of whites, filter by hard constraints first.
  const validWhiteCombos: Array<{ whites: number[]; logScore: number }> = [];
  const W = whites.length;
  for (let a = 0; a < W - 4; a++) {
    for (let b = a + 1; b < W - 3; b++) {
      for (let c = b + 1; c < W - 2; c++) {
        for (let d = c + 1; d < W - 1; d++) {
          for (let e = d + 1; e < W; e++) {
            const sel = [whites[a].number, whites[b].number, whites[c].number, whites[d].number, whites[e].number];
            if (!passesHard(sel, cfg)) continue;
            const ls =
              logRateW.get(sel[0])! +
              logRateW.get(sel[1])! +
              logRateW.get(sel[2])! +
              logRateW.get(sel[3])! +
              logRateW.get(sel[4])!;
            validWhiteCombos.push({ whites: sel, logScore: ls });
          }
        }
      }
    }
  }

  if (validWhiteCombos.length === 0) return [];

  // Pair each valid white combo with each red, rank, return top N.
  const scored: ScoredTicket[] = [];
  for (const wc of validWhiteCombos) {
    for (const r of reds) {
      const lsRed = logRateR.get(r.number)!;
      scored.push({
        ticket: { whites: wc.whites, red: r.number },
        score: wc.logScore + lsRed,
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Deterministic tiebreaker: smaller whites first, then smaller red.
    for (let i = 0; i < 5; i++) {
      if (a.ticket.whites[i] !== b.ticket.whites[i]) {
        return a.ticket.whites[i] - b.ticket.whites[i];
      }
    }
    return a.ticket.red - b.ticket.red;
  });

  return scored.slice(0, n).map((s) => s.ticket);
}
