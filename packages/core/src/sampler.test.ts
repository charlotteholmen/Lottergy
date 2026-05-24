import { describe, expect, it } from "vitest";

import { mulberry32 } from "./rng.ts";
import { weightedSampleNoReplace } from "./sampler.ts";
import type { BallFrequency } from "./types.ts";

const balls: BallFrequency[] = [
  { number: 1, count: 1, rate: 0.01 },
  { number: 2, count: 5, rate: 0.05 },
  { number: 3, count: 10, rate: 0.10 },
  { number: 4, count: 20, rate: 0.20 },
  { number: 5, count: 40, rate: 0.40 },
];

describe("weightedSampleNoReplace", () => {
  it("returns k distinct ball numbers", () => {
    const rng = mulberry32(42);
    const sample = weightedSampleNoReplace(balls, 3, rng);
    expect(sample).toHaveLength(3);
    expect(new Set(sample).size).toBe(3);
    for (const n of sample) expect(balls.some((b) => b.number === n)).toBe(true);
  });

  it("returns all balls when k >= pool size", () => {
    const sample = weightedSampleNoReplace(balls, 99);
    expect(sample.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns [] for k <= 0", () => {
    expect(weightedSampleNoReplace(balls, 0)).toEqual([]);
    expect(weightedSampleNoReplace(balls, -1)).toEqual([]);
  });

  it("over many trials, hotter balls appear more often (statistical sanity)", () => {
    const rng = mulberry32(7);
    const counts = new Map<number, number>();
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const sample = weightedSampleNoReplace(balls, 1, rng);
      counts.set(sample[0], (counts.get(sample[0]) ?? 0) + 1);
    }
    // ball 5 (rate 0.40) should appear strictly more than ball 1 (rate 0.01)
    expect((counts.get(5) ?? 0)).toBeGreaterThan((counts.get(1) ?? 0));
    // ball 4 (rate 0.20) should appear strictly more than ball 2 (rate 0.05)
    expect((counts.get(4) ?? 0)).toBeGreaterThan((counts.get(2) ?? 0));
  });
});
