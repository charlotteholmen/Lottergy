# packages/core

**What:** Game-agnostic primitives — frequency analysis, pool filters, constraint engine, samplers, generator, deterministic enumerator, Monte Carlo kernel + Worker, strategy schema, cross-game scaler. TS port of `powerball-legacy/`.

**Why:** Adding a new lottery requires ZERO changes here. All game-specific knowledge lives in `packages/games/<game>/`. The math is the same across games.

## Modules (Phase 2 complete)

- **`types.ts`** — every shared type (`Draw`, `Era`, `Matrix`, `GamePayload`, `BallFrequency`, `FrequencyTable`, `PoolFilter`, `Constraints`, `Preferences`, `GameConfig`, `Ticket`, `Strategy`, `ExportBundle`, `MonteCarloProgress/Result`, `SamplingMode`). Pure types, no logic.

- **`frequency.ts`** — `currentMatrixDraws(payload)` (filters to latest era — the default-correct view) and `computeFrequencyTable(draws, whitesMax, redsMax)` (denominator = N, NOT 5N — preserves the legacy invariant).

- **`pool.ts`** — `buildPool(balls, filter)` implements the new `frequencyPercentileRange: [low, high]` shape (0 = coldest, 100 = hottest). Legacy `exclude_top_percent=X` maps to `[0, 100 - X]`. Also exports `decadesCovered(pool)` for the decade-span pre-flight check.

- **`constraints.ts`** — `features(whites, cfg)`, `passesHard(whites, cfg)`, `softAcceptProb(whites, cfg, prefs)`. Direct port of legacy `features` / `passes_hard` / `soft_accept_prob`. decadeSpan is now `{min, max}` instead of two scalars.

- **`rng.ts`** — `mulberry32(seed)` seedable PRNG for deterministic tests + seeded UI runs. `mathRandom` is the default production RNG (per locked decision).

- **`sampler.ts`** — `weightedSampleNoReplace(pool, k, rng?)`. Efraimidis-Spirakis. Default RNG is `Math.random`.

- **`generator.ts`** — `generateTickets(whitesPool, redsPool, cfg, rng?, maxAttempts?)`. The Random Weighted sampling-mode orchestrator. Returns up to `cfg.numTickets` unique constraint-satisfying tickets + `hitAttemptCap` flag.

- **`topPicks.ts`** — `topPicks(whitesPool, redsPool, constraints, n)`. The Top Picks sampling-mode (NEW vs legacy). Enumerates all constraint-satisfying combinations, ranks by joint log-rate, returns top N. Fully deterministic.

- **`montecarloKernel.ts`** — `runMonteCarloKernel(whitesPool, redsPool, cfg, opts)`. Pure function. Iterates N times, tracks top-K white combos + top red per combo. Honors `onProgress` (every 50k iter OR 250ms — locked cadence) and `isCanceled` callbacks.

- **`montecarlo.worker.ts`** — Web Worker entry. Messages: `{type:"start",...}` / `{type:"cancel"}` in; `{type:"progress"|"result"|"error",...}` out. Apps load via `new Worker(new URL("./montecarlo.worker.ts", import.meta.url))`.

- **`strategy.ts`** — `newStrategy`, `setConfig`, `removeConfig` (immutable; never mutates other slots), `exportBundle`, `parseBundle` (rejects unknown `lottergy_version`). UUID v4 via `crypto.randomUUID()`.

- **`scale.ts`** — `scaleConfigKnownSource(source, srcMatrix, targetGame, targetMatrix)` for the "Apply Strategy" cross-game flow. Sum range scales by uniform-mean ratio; decadeSpan clamps to target's decade count; allowedOdd/Low filter to in-range, fall back to `[2,3]` default if empty.

- **`index.ts`** — barrel; the public API. Consumers import from `@lottergy/core`, never from internal files.

## Testing

- `vitest.config.ts` at package root. 10 test files, 48 tests, run via `pnpm --filter @lottergy/core test`.
- Tests cover: frequency denominator invariant, pool filter semantics including the legacy mapping, constraints + soft acceptance, RNG determinism, sampler statistical sanity, top-picks determinism, generator + Monte Carlo cancellation/progress, strategy lifecycle + bundle round-trip, cross-game scaling.

## Key invariants (binding)

- No imports from `@lottergy/games`, `@lottergy/ui`, or `expo*`. Pure TS — runs in browser, Node, and Web Worker.
- Frequency denominator = N (draws), NOT 5N. Whites and reds are both "share of draws this appeared in" — directly comparable to uniform baselines.
- Default UI view is current-matrix-only. All-time mixed eras must be an opt-in with a warning.
- `frequencyPercentileRange: [0, 100]` = include all. NEVER regress to single-direction `exclude_top_percent`.
- Worker progress cadence is 50k iter OR 250ms — both gates enforced.
- Python-golden snapshot tests (GOAL.md Phase 2 detail) deferred — see HANDOFF.md. Bit-for-bit parity with `random.Random(42)` requires an MT19937 port; non-trivial; tracked.
