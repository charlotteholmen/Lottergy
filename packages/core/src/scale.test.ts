import { describe, expect, it } from "vitest";

import { scaleConfigKnownSource } from "./scale.ts";
import type { GameConfig, Matrix } from "./types.ts";

const powerballMatrix: Matrix = { whites_max: 69, reds_max: 26, whites_per_ticket: 5 };
const megamillionsMatrix: Matrix = { whites_max: 70, reds_max: 24, whites_per_ticket: 5 };

const sourcePowerball: GameConfig = {
  game: "powerball",
  whitesPool: { frequencyPercentileRange: [0, 100], minFrequencyRate: 0, topN: 0 },
  redsPool: { frequencyPercentileRange: [0, 100], minFrequencyRate: 0, topN: 0 },
  constraints: {
    sum: { min: 125, max: 224 },
    allowedOddCounts: [2, 3],
    allowedLowCounts: [2, 3],
    lowCutoff: 34,
    maxConsecutivePairs: 1,
    decadeSpan: { min: 3, max: 4 },
  },
  preferences: { weightOneConsecutivePair: 0.55 },
  numTickets: 10,
  samplingMode: "random-weighted",
};

describe("scaleConfigKnownSource", () => {
  it("scales sum range by uniform-mean ratio (Powerball -> Mega Millions)", () => {
    const scaled = scaleConfigKnownSource(sourcePowerball, powerballMatrix, "megamillions", megamillionsMatrix);
    // PB mean = 5*(70)/2 = 175. MM mean = 5*(71)/2 = 177.5. Ratio ≈ 1.01428.
    const expectedMin = Math.round(125 * (177.5 / 175));
    const expectedMax = Math.round(224 * (177.5 / 175));
    expect(scaled.constraints.sum.min).toBe(expectedMin);
    expect(scaled.constraints.sum.max).toBe(expectedMax);
  });

  it("updates game id + lowCutoff to target midpoint", () => {
    const scaled = scaleConfigKnownSource(sourcePowerball, powerballMatrix, "megamillions", megamillionsMatrix);
    expect(scaled.game).toBe("megamillions");
    expect(scaled.constraints.lowCutoff).toBe(35);
  });

  it("carries over allowedOdd/Low if still in legal domain", () => {
    const scaled = scaleConfigKnownSource(sourcePowerball, powerballMatrix, "megamillions", megamillionsMatrix);
    expect(scaled.constraints.allowedOddCounts).toEqual([2, 3]);
    expect(scaled.constraints.allowedLowCounts).toEqual([2, 3]);
  });

  it("resets to sane defaults when source values are out of target domain", () => {
    const broken: GameConfig = {
      ...sourcePowerball,
      constraints: { ...sourcePowerball.constraints, allowedOddCounts: [99, 100] },
    };
    const scaled = scaleConfigKnownSource(broken, powerballMatrix, "megamillions", megamillionsMatrix);
    expect(scaled.constraints.allowedOddCounts).toEqual([2, 3]);
  });

  it("clamps decadeSpan to fit the target's decade count", () => {
    // Target with 30 whites = 3 decades; source min/max decade span of 3-4 must clamp to <= 3.
    const small: Matrix = { whites_max: 30, reds_max: 10, whites_per_ticket: 5 };
    const scaled = scaleConfigKnownSource(sourcePowerball, powerballMatrix, "small", small);
    expect(scaled.constraints.decadeSpan.max).toBe(3);
  });
});
