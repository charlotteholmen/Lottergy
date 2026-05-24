import { describe, expect, it } from "vitest";

import { computeFrequencyTable, currentMatrixDraws } from "./frequency.ts";
import type { GamePayload } from "./types.ts";

const samplePayload: GamePayload = {
  game: "test",
  updated_at: "2026-05-23T00:00:00Z",
  matrix: { whites_max: 10, reds_max: 4, whites_per_ticket: 5 },
  eras: [
    { start: "2020-01-01", whites_max: 8, reds_max: 4, label: "old (5/8 + 1/4)" },
    { start: "2024-01-01", whites_max: 10, reds_max: 4, label: "current (5/10 + 1/4)" },
  ],
  draws: [
    { date: "2020-06-01", whites: [1, 2, 3, 4, 5], red: 1 },
    { date: "2024-02-01", whites: [1, 3, 5, 7, 9], red: 2 },
    { date: "2024-03-01", whites: [2, 3, 4, 8, 10], red: 2 },
    { date: "2024-04-01", whites: [1, 3, 6, 7, 9], red: 3 },
  ],
};

describe("currentMatrixDraws", () => {
  it("filters to the most recent era only (default-correct view)", () => {
    const draws = currentMatrixDraws(samplePayload);
    expect(draws).toHaveLength(3);
    expect(draws[0].date).toBe("2024-02-01");
  });

  it("returns all draws when there are no eras", () => {
    expect(currentMatrixDraws({ ...samplePayload, eras: [] })).toHaveLength(4);
  });
});

describe("computeFrequencyTable", () => {
  it("uses draw count N (not 5N) as the denominator — frequency-denominator gotcha", () => {
    const current = currentMatrixDraws(samplePayload);
    const ft = computeFrequencyTable(current, 10, 4);
    expect(ft.drawCount).toBe(3);

    // Ball 3 appears in all 3 current-era draws → rate = 1.0
    expect(ft.whites.find((b) => b.number === 3)?.rate).toBeCloseTo(1.0);
    // Ball 1 appears in 2/3 draws → 0.6667
    expect(ft.whites.find((b) => b.number === 1)?.rate).toBeCloseTo(2 / 3);
    // Ball 4 appears in 1/3 → 0.3333
    expect(ft.whites.find((b) => b.number === 4)?.rate).toBeCloseTo(1 / 3);
    // Ball 10 appears in 1/3 → 0.3333
    expect(ft.whites.find((b) => b.number === 10)?.rate).toBeCloseTo(1 / 3);
  });

  it("emits one entry per ball number in range, even with zero count", () => {
    const ft = computeFrequencyTable([], 5, 3);
    expect(ft.whites.map((b) => b.number)).toEqual([1, 2, 3, 4, 5]);
    expect(ft.reds.map((b) => b.number)).toEqual([1, 2, 3]);
    expect(ft.whites.every((b) => b.count === 0)).toBe(true);
    expect(ft.whites.every((b) => b.rate === 0)).toBe(true);
  });
});
