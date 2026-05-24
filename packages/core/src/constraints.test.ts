import { describe, expect, it } from "vitest";

import { features, passesHard, softAcceptProb } from "./constraints.ts";
import type { Constraints, Preferences } from "./types.ts";

const tight: Constraints = {
  sum: { min: 125, max: 224 },
  allowedOddCounts: [2, 3],
  allowedLowCounts: [2, 3],
  lowCutoff: 34,
  maxConsecutivePairs: 1,
  decadeSpan: { min: 3, max: 4 },
};

const prefs: Preferences = {
  weightOneConsecutivePair: 0.55,
};

describe("features", () => {
  it("computes sum / odd / low / consec / decadeSpan", () => {
    const f = features([3, 14, 27, 41, 62], tight);
    expect(f.sum).toBe(147);
    expect(f.oddCount).toBe(3); // 3, 27, 41
    expect(f.lowCount).toBe(3); // 3, 14, 27 (all <= 34)
    expect(f.consecutivePairs).toBe(0);
    expect(f.decadeSpan).toBe(5); // 0, 1, 2, 4, 6 → 5 buckets
  });

  it("counts a single consecutive pair (22-23)", () => {
    expect(features([5, 22, 23, 40, 55], tight).consecutivePairs).toBe(1);
  });

  it("counts run of 3 as 2 consecutive pairs (22-23-24)", () => {
    expect(features([5, 22, 23, 24, 40], tight).consecutivePairs).toBe(2);
  });
});

describe("passesHard", () => {
  it("accepts a clean middle-of-the-road ticket", () => {
    // sum 147, 3 odd, 2 low, 0 consec, but 5 decades > max 4 → rejected
    expect(passesHard([3, 14, 27, 41, 62], tight)).toBe(false);
  });

  it("accepts a 4-decade-span 3-odd 2-low ticket", () => {
    // 3-14-27-41-50: sum 135, 3 odd (3,27,41), 2 low, 0 consec, decades {0,1,2,4} = 4
    expect(passesHard([3, 14, 27, 41, 50], tight)).toBe(true);
  });

  it("rejects on too many consecutive pairs", () => {
    // 5-22-23-24-40: sum 114 < 125 — fails on sum already, so widen.
    const widened: Constraints = { ...tight, sum: { min: 0, max: 999 } };
    expect(passesHard([5, 22, 23, 24, 40], widened)).toBe(false); // 2 consec > max 1
  });

  it("rejects on disallowed odd count", () => {
    // All-odd: 1+3+5+7+9 = 25 → also fails sum, widen to isolate
    const widened: Constraints = { ...tight, sum: { min: 0, max: 999 }, decadeSpan: { min: 1, max: 5 } };
    expect(passesHard([1, 3, 5, 7, 9], widened)).toBe(false); // 5 odd not in [2,3]
  });
});

describe("softAcceptProb", () => {
  it("returns weightOneConsecutivePair when there's 1 consec pair", () => {
    expect(softAcceptProb([5, 22, 23, 40, 55], tight, prefs)).toBeCloseTo(0.55);
  });

  it("returns 1.0 when there are 0 consec pairs", () => {
    expect(softAcceptProb([3, 14, 27, 41, 50], tight, prefs)).toBe(1.0);
  });
});
