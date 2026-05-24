import { describe, expect, it } from "vitest";

import { generateTickets } from "./generator.ts";
import { mulberry32 } from "./rng.ts";
import type { BallFrequency, GameConfig } from "./types.ts";

const whites: BallFrequency[] = Array.from({ length: 30 }, (_, i) => ({
  number: i + 1,
  count: 10,
  rate: 0.1,
}));
const reds: BallFrequency[] = Array.from({ length: 10 }, (_, i) => ({
  number: i + 1,
  count: 5,
  rate: 0.05,
}));

const cfg: GameConfig = {
  game: "test",
  whitesPool: { frequencyPercentileRange: [0, 100], minFrequencyRate: 0, topN: 0 },
  redsPool: { frequencyPercentileRange: [0, 100], minFrequencyRate: 0, topN: 0 },
  constraints: {
    sum: { min: 50, max: 130 },
    allowedOddCounts: [0, 1, 2, 3, 4, 5],
    allowedLowCounts: [0, 1, 2, 3, 4, 5],
    lowCutoff: 15,
    maxConsecutivePairs: 5,
    decadeSpan: { min: 1, max: 3 },
  },
  preferences: { weightOneConsecutivePair: 1.0 },
  numTickets: 5,
  samplingMode: "random-weighted",
};

describe("generateTickets", () => {
  it("produces N unique tickets that satisfy hard constraints", () => {
    const rng = mulberry32(42);
    const result = generateTickets(whites, reds, cfg, rng);
    expect(result.tickets).toHaveLength(5);

    for (const t of result.tickets) {
      const s = t.whites.reduce((a, b) => a + b, 0);
      expect(s).toBeGreaterThanOrEqual(50);
      expect(s).toBeLessThanOrEqual(130);
      expect(t.whites).toEqual([...t.whites].sort((a, b) => a - b));
    }

    const keys = new Set(result.tickets.map((t) => t.whites.join(",") + "|" + t.red));
    expect(keys.size).toBe(5);
  });

  it("reports hitAttemptCap when constraints are impossible", () => {
    const impossible: GameConfig = {
      ...cfg,
      constraints: { ...cfg.constraints, sum: { min: 9999, max: 99999 } },
    };
    const result = generateTickets(whites, reds, impossible, mulberry32(1), 1000);
    expect(result.tickets).toHaveLength(0);
    expect(result.hitAttemptCap).toBe(true);
  });
});
