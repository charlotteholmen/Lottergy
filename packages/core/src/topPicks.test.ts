import { describe, expect, it } from "vitest";

import { topPicks } from "./topPicks.ts";
import type { BallFrequency, Constraints } from "./types.ts";

// 10 white balls with strictly increasing rates → ball N is hotter than ball N-1.
const whites: BallFrequency[] = Array.from({ length: 10 }, (_, i) => ({
  number: i + 1,
  count: i + 1,
  rate: (i + 1) / 100,
}));

const reds: BallFrequency[] = [
  { number: 1, count: 1, rate: 0.10 },
  { number: 2, count: 2, rate: 0.20 },
];

const loose: Constraints = {
  sum: { min: 0, max: 999 },
  allowedOddCounts: [0, 1, 2, 3, 4, 5],
  allowedLowCounts: [0, 1, 2, 3, 4, 5],
  lowCutoff: 5,
  maxConsecutivePairs: 5,
  decadeSpan: { min: 1, max: 2 },
};

describe("topPicks", () => {
  it("returns the deterministic top-N highest-joint-score combinations", () => {
    const picks = topPicks(whites, reds, loose, 3);
    expect(picks).toHaveLength(3);

    // Best 5-whites combination by score = 5 hottest = {6,7,8,9,10}, paired with
    // hottest red (2). All top picks should be subsets of the hottest balls.
    expect(picks[0].whites).toEqual([6, 7, 8, 9, 10]);
    expect(picks[0].red).toBe(2);
  });

  it("is deterministic: same input -> identical output across runs", () => {
    const a = topPicks(whites, reds, loose, 5);
    const b = topPicks(whites, reds, loose, 5);
    expect(a).toEqual(b);
  });

  it("returns [] when whites pool is too small", () => {
    expect(topPicks(whites.slice(0, 4), reds, loose, 3)).toEqual([]);
  });

  it("returns [] when constraint filter rejects every combo", () => {
    const impossible: Constraints = { ...loose, sum: { min: 9999, max: 99999 } };
    expect(topPicks(whites, reds, impossible, 3)).toEqual([]);
  });
});
