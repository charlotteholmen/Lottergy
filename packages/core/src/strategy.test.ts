import { describe, expect, it } from "vitest";

import {
  exportBundle,
  newStrategy,
  parseBundle,
  removeConfig,
  setConfig,
} from "./strategy.ts";
import type { GameConfig } from "./types.ts";

const sampleCfg: GameConfig = {
  game: "powerball",
  whitesPool: { frequencyPercentileRange: [0, 100], minFrequencyRate: 0, topN: 0 },
  redsPool: { frequencyPercentileRange: [0, 100], minFrequencyRate: 0, topN: 0 },
  constraints: {
    sum: { min: 100, max: 200 },
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

describe("Strategy lifecycle", () => {
  it("newStrategy produces UUID v4 + matching createdAt/updatedAt", () => {
    const s = newStrategy("Hot-heavy balanced");
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(s.createdAt).toBe(s.updatedAt);
    expect(s.configs).toEqual({});
  });

  it("setConfig adds a game slot without touching other slots", () => {
    let s = newStrategy("Hot");
    s = setConfig(s, "powerball", sampleCfg);
    s = setConfig(s, "megamillions", { ...sampleCfg, game: "megamillions" });
    expect(Object.keys(s.configs).sort()).toEqual(["megamillions", "powerball"]);
    // Replacing one slot must not affect the other.
    const updated = setConfig(s, "powerball", { ...sampleCfg, numTickets: 99 });
    expect(updated.configs.powerball?.numTickets).toBe(99);
    expect(updated.configs.megamillions).toBeDefined();
  });

  it("removeConfig deletes a slot, leaves others intact", () => {
    let s = newStrategy("Hot");
    s = setConfig(s, "powerball", sampleCfg);
    s = setConfig(s, "megamillions", { ...sampleCfg, game: "megamillions" });
    const after = removeConfig(s, "powerball");
    expect(after.configs.powerball).toBeUndefined();
    expect(after.configs.megamillions).toBeDefined();
  });
});

describe("Export / import bundle", () => {
  it("round-trips through JSON", () => {
    let s = newStrategy("Hot");
    s = setConfig(s, "powerball", sampleCfg);
    const bundle = exportBundle([s], ["powerball", "megamillions"]);
    const json = JSON.stringify(bundle);
    const parsed = parseBundle(JSON.parse(json));
    expect(parsed?.lottergy_version).toBe(1);
    expect(parsed?.strategies).toHaveLength(1);
    expect(parsed?.strategies[0].id).toBe(s.id);
    expect(parsed?.frequent_games).toEqual(["powerball", "megamillions"]);
  });

  it("parseBundle rejects unknown version", () => {
    expect(parseBundle({ lottergy_version: 2, exported_at: "x", strategies: [], frequent_games: [] })).toBeNull();
  });

  it("parseBundle rejects shape problems", () => {
    expect(parseBundle(null)).toBeNull();
    expect(parseBundle("string")).toBeNull();
    expect(parseBundle({ lottergy_version: 1 })).toBeNull();
  });
});
