import { describe, expect, it } from "vitest";

import { mulberry32 } from "./rng.ts";

describe("mulberry32", () => {
  it("is deterministic across runs for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it("produces values in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds produce different streams", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const first10A = Array.from({ length: 10 }, () => a());
    const first10B = Array.from({ length: 10 }, () => b());
    expect(first10A).not.toEqual(first10B);
  });
});
