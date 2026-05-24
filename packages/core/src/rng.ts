// Tiny seedable PRNG (Mulberry32). Math.random() isn't seedable, and exact
// bit-for-bit parity with Python's MT19937 is impractical, so we use a
// pure-TS RNG that's:
//   - fast
//   - seedable (deterministic golden tests possible)
//   - good enough for ticket generation + Monte Carlo (no cryptographic claim)
//
// The default sampler uses Math.random for v1 (per GOAL.md "RNG: native
// Math.random() for Random Weighted"), but tests + the optional seed path
// here use Mulberry32 for reproducibility.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The RNG the production sampler uses by default. */
export const mathRandom: Rng = Math.random;
