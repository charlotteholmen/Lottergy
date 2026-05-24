// Pure Monte Carlo kernel. Runs N iterations of weighted sampling against
// the same pool + constraints used by the generator, accumulating top-K
// most-frequent white combos. Decoupled from any worker harness so it
// can be unit-tested directly (and reused inside a Worker).

import type { BallFrequency, GameConfig, MonteCarloResult } from "./types.ts";
import { passesHard, softAcceptProb } from "./constraints.ts";
import { mathRandom, type Rng } from "./rng.ts";
import { weightedSampleNoReplace } from "./sampler.ts";

const PER_TICKET_ATTEMPT_CAP = 10_000;

export type KernelOptions = {
  /** Total iterations to attempt. */
  iterations: number;
  /** Called every `progressEveryIter` iterations or `progressEveryMs` ms. */
  onProgress?: (completed: number, elapsedMs: number) => boolean | void;
  progressEveryIter?: number;
  progressEveryMs?: number;
  /** If returns true, abort. Checked alongside onProgress. */
  isCanceled?: () => boolean;
  /** Top-K white combos to track. */
  topK?: number;
  rng?: Rng;
};

/**
 * Run the kernel. Returns the aggregated result up to the point of
 * completion or cancellation.
 */
export function runMonteCarloKernel(
  whitesPool: BallFrequency[],
  redsPool: BallFrequency[],
  cfg: GameConfig,
  opts: KernelOptions,
): MonteCarloResult {
  const rng = opts.rng ?? mathRandom;
  const topK = opts.topK ?? 5;
  const progEveryIter = opts.progressEveryIter ?? 50_000;
  const progEveryMs = opts.progressEveryMs ?? 250;

  const whitesCount = new Map<string, number>(); // joinedWhitesKey -> count
  const fullCount = new Map<string, number>(); // joinedWhitesKey|red -> count
  // Track the top red per whites combo for the final report.
  const topRedPerCombo = new Map<string, { red: number; count: number }>();

  const start = Date.now();
  let lastProgressAt = start;
  let lastProgressIter = 0;

  const target = Math.max(0, Math.floor(opts.iterations));

  for (let i = 0; i < target; i++) {
    // Progress + cancel check
    const now = Date.now();
    if (
      i > 0 &&
      (i - lastProgressIter >= progEveryIter || now - lastProgressAt >= progEveryMs)
    ) {
      lastProgressIter = i;
      lastProgressAt = now;
      const cont = opts.onProgress?.(i, now - start);
      if (cont === false || opts.isCanceled?.()) break;
    }

    // Sample one constraint-satisfying ticket (bounded attempts to avoid wedging).
    let whites: number[] | null = null;
    for (let t = 0; t < PER_TICKET_ATTEMPT_CAP; t++) {
      const sampled = weightedSampleNoReplace(whitesPool, 5, rng);
      if (sampled.length < 5) return finish();
      const sorted = sampled.slice().sort((a, b) => a - b);
      if (!passesHard(sorted, cfg.constraints)) continue;
      if (rng() > softAcceptProb(sorted, cfg.constraints, cfg.preferences)) continue;
      whites = sorted;
      break;
    }
    if (whites === null) continue; // could not satisfy; skip this iter

    const redArr = weightedSampleNoReplace(redsPool, 1, rng);
    if (redArr.length === 0) return finish();
    const red = redArr[0];

    const wKey = whites.join(",");
    whitesCount.set(wKey, (whitesCount.get(wKey) ?? 0) + 1);

    const fullKey = wKey + "|" + red;
    fullCount.set(fullKey, (fullCount.get(fullKey) ?? 0) + 1);

    const cur = topRedPerCombo.get(wKey);
    const newRedCount = fullCount.get(fullKey)!;
    if (!cur || newRedCount > cur.count) {
      topRedPerCombo.set(wKey, { red, count: newRedCount });
    }
  }

  return finish();

  function finish(): MonteCarloResult {
    let totalDraws = 0;
    for (const c of whitesCount.values()) totalDraws += c;

    const sortedCombos = [...whitesCount.entries()].sort((a, b) => b[1] - a[1]);
    const topWhites = sortedCombos.slice(0, topK).map(([key, count]) => {
      const whites = key.split(",").map((s) => Number.parseInt(s, 10));
      const tr = topRedPerCombo.get(key)!;
      return { whites, count, topRed: tr.red, topRedCount: tr.count };
    });

    return {
      totalDraws,
      uniqueWhiteCombos: whitesCount.size,
      topWhites,
      elapsedMs: Date.now() - start,
    };
  }
}
