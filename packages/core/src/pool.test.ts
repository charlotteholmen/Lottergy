import { describe, expect, it } from "vitest";

import { buildPool, decadesCovered } from "./pool.ts";
import type { BallFrequency, PoolFilter } from "./types.ts";

function mk(n: number, rate: number): BallFrequency {
  return { number: n, count: Math.round(rate * 1000), rate };
}

// 10 balls with linearly increasing rate; ball 1 is coldest, ball 10 is hottest.
const balls: BallFrequency[] = Array.from({ length: 10 }, (_, i) => mk(i + 1, (i + 1) / 100));

const defaultFilter: PoolFilter = {
  frequencyPercentileRange: [0, 100],
  minFrequencyRate: 0,
  topN: 0,
};

describe("buildPool — frequencyPercentileRange", () => {
  it("[0, 100] includes all balls", () => {
    const pool = buildPool(balls, defaultFilter);
    expect(pool).toHaveLength(10);
  });

  it("[10, 90] excludes coldest 10% AND hottest 10% (one ball each side)", () => {
    const pool = buildPool(balls, { ...defaultFilter, frequencyPercentileRange: [10, 90] });
    expect(pool.map((b) => b.number).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("legacy exclude_top_percent=25 -> [0, 75] keeps coldest 75% (excludes hottest 25%)", () => {
    const pool = buildPool(balls, { ...defaultFilter, frequencyPercentileRange: [0, 75] });
    // Coldest 75% of 10 = the 7-8 coldest. Math.ceil(0.75 * 10) = 8.
    expect(pool.map((b) => b.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("clamps out-of-range percentiles instead of throwing", () => {
    const pool = buildPool(balls, { ...defaultFilter, frequencyPercentileRange: [-10, 200] });
    expect(pool).toHaveLength(10);
  });
});

describe("buildPool — minFrequencyRate (strict >)", () => {
  it("strict > excludes balls exactly at the threshold", () => {
    const pool = buildPool(balls, { ...defaultFilter, minFrequencyRate: 0.05 });
    expect(pool.map((b) => b.number).sort((a, b) => a - b)).toEqual([6, 7, 8, 9, 10]);
  });
});

describe("buildPool — topN cap", () => {
  it("caps to top N hottest (descending), tiebreak by ascending ball number", () => {
    const pool = buildPool(balls, { ...defaultFilter, topN: 3 });
    expect(pool.map((b) => b.number)).toEqual([10, 9, 8]);
  });

  it("topN = 0 means no cap", () => {
    const pool = buildPool(balls, { ...defaultFilter, topN: 0 });
    expect(pool).toHaveLength(10);
  });
});

describe("decadesCovered", () => {
  it("groups balls into 1-10, 11-20, ... buckets", () => {
    const pool = [mk(1, 0.1), mk(9, 0.1), mk(11, 0.1), mk(35, 0.1), mk(70, 0.1)];
    const d = decadesCovered(pool);
    expect([...d].sort((a, b) => a - b)).toEqual([0, 1, 3, 6]);
  });
});
