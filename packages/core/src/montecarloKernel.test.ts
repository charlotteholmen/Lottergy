import { describe, expect, it } from "vitest";

import { runMonteCarloKernel } from "./montecarloKernel.ts";
import { mulberry32 } from "./rng.ts";
import type { BallFrequency, GameConfig } from "./types.ts";

const whites: BallFrequency[] = Array.from({ length: 20 }, (_, i) => ({
  number: i + 1,
  count: 10,
  rate: 0.1,
}));
const reds: BallFrequency[] = Array.from({ length: 5 }, (_, i) => ({
  number: i + 1,
  count: 5,
  rate: 0.05,
}));

const cfg: GameConfig = {
  game: "test",
  whitesPool: { frequencyPercentileRange: [0, 100], minFrequencyRate: 0, topN: 0 },
  redsPool: { frequencyPercentileRange: [0, 100], minFrequencyRate: 0, topN: 0 },
  constraints: {
    sum: { min: 30, max: 80 },
    allowedOddCounts: [0, 1, 2, 3, 4, 5],
    allowedLowCounts: [0, 1, 2, 3, 4, 5],
    lowCutoff: 10,
    maxConsecutivePairs: 5,
    decadeSpan: { min: 1, max: 2 },
  },
  preferences: { weightOneConsecutivePair: 1.0 },
  numTickets: 1,
  samplingMode: "random-weighted",
};

describe("runMonteCarloKernel", () => {
  it("aggregates totals and reports topK whites combos", () => {
    const result = runMonteCarloKernel(whites, reds, cfg, {
      iterations: 2000,
      topK: 3,
      rng: mulberry32(42),
    });
    expect(result.totalDraws).toBeGreaterThan(0);
    expect(result.topWhites).toHaveLength(3);
    for (const combo of result.topWhites) {
      expect(combo.whites).toHaveLength(5);
      expect(combo.count).toBeGreaterThan(0);
    }
  });

  it("invokes onProgress with monotonically increasing completed counts", () => {
    const seen: number[] = [];
    runMonteCarloKernel(whites, reds, cfg, {
      iterations: 200_000,
      progressEveryIter: 25_000,
      onProgress: (c) => {
        seen.push(c);
      },
      rng: mulberry32(7),
    });
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    }
    expect(seen.length).toBeGreaterThanOrEqual(2);
  });

  it("honors isCanceled and returns partial result", () => {
    let calls = 0;
    const result = runMonteCarloKernel(whites, reds, cfg, {
      iterations: 1_000_000,
      progressEveryIter: 1000,
      isCanceled: () => ++calls > 3,
      rng: mulberry32(9),
    });
    expect(result.totalDraws).toBeGreaterThan(0);
    expect(result.totalDraws).toBeLessThan(1_000_000);
  });
});
