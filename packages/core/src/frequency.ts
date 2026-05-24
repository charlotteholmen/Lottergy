// Compute frequency tables from a GamePayload. This is the v1 input
// to pool building, constraint checking, and the Monte Carlo worker.
//
// Critical invariant (CLAUDE.md gotcha): the denominator is N (number of
// draws), NOT 5N. Whites and reds are both "share of draws this number
// appeared in" — directly comparable to uniform baselines.

import type { Draw, FrequencyTable, GamePayload } from "./types.ts";

/**
 * Filter draws to the current-matrix era only. This is the default-correct
 * view (per CLAUDE.md / REFERENCE.md). All-time mixed-era views must be
 * explicit opt-ins (with a warning) because they bias post-matrix-change
 * numbers cold.
 */
export function currentMatrixDraws(payload: GamePayload): Draw[] {
  if (payload.eras.length === 0) return payload.draws.slice();
  const currentEraStart = payload.eras[payload.eras.length - 1].start;
  return payload.draws.filter((d) => d.date >= currentEraStart);
}

/**
 * Build a FrequencyTable from a list of draws.
 *
 * @param draws — usually currentMatrixDraws(payload). Pass payload.draws
 *   directly only for explicit all-time analysis (with caveats).
 * @param whitesMax — max white-ball number (1..whitesMax).
 * @param redsMax — max red-ball number (1..redsMax).
 */
export function computeFrequencyTable(
  draws: Draw[],
  whitesMax: number,
  redsMax: number,
): FrequencyTable {
  const N = draws.length;
  const whiteCounts = new Array<number>(whitesMax + 1).fill(0);
  const redCounts = new Array<number>(redsMax + 1).fill(0);

  for (const d of draws) {
    for (const w of d.whites) {
      if (w >= 1 && w <= whitesMax) whiteCounts[w] += 1;
    }
    if (d.red >= 1 && d.red <= redsMax) redCounts[d.red] += 1;
  }

  const whites = [];
  for (let n = 1; n <= whitesMax; n++) {
    const count = whiteCounts[n];
    whites.push({ number: n, count, rate: N === 0 ? 0 : count / N });
  }
  const reds = [];
  for (let n = 1; n <= redsMax; n++) {
    const count = redCounts[n];
    reds.push({ number: n, count, rate: N === 0 ? 0 : count / N });
  }

  return { drawCount: N, whites, reds };
}
