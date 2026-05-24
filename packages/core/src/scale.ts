// Cross-game param scaling for the "Apply Strategy to game Y when it has no
// slot for Y" flow. Per GOAL.md:
//   1. Sum range scales by matrix-sum ratio.
//   2. Per-ball frequency thresholds keep the same percentile relative to
//      the target's uniform baseline.
//   3. Enum constraints (allowed odd/low counts, max consec pairs) carry
//      verbatim where the domain matches; otherwise reset to defaults.
//   4. Decade-related fields recompute for the target's max white ball.
//
// The user then edits the scaled config inline before saving.

import type { GameConfig, Matrix } from "./types.ts";

/**
 * Expected mean sum of K whites drawn uniformly from 1..max is
 * K * (max + 1) / 2. We use this to scale [sum.min, sum.max] preserving the
 * source range's "distance from mean" in mean-multiples.
 */
function uniformWhitesMean(whitesMax: number, whitesPerTicket: number): number {
  return (whitesPerTicket * (whitesMax + 1)) / 2;
}

/**
 * Scale a source GameConfig to a target matrix.
 *
 * @param source the configured slot to translate
 * @param targetGame the target game's id (becomes config.game)
 * @param targetMatrix the target game's matrix
 */
export function scaleConfig(
  source: GameConfig,
  targetGame: string,
  targetMatrix: Matrix,
): GameConfig {
  // Sum range scales by mean ratio.
  // Note: we need the SOURCE matrix to compute the mean ratio. We infer
  // it from the source decadeSpan + sum range — but a safer + cheaper
  // approach is to use the source's lowCutoff as a hint that lowCutoff
  // is typically ~ whitesMax / 2, so whitesMax_source ≈ 2 * lowCutoff.
  // Callers with the real source matrix should prefer scaleConfigKnownSource.
  const inferredSrcWhitesMax = Math.max(source.constraints.lowCutoff * 2, 5);
  return scaleConfigKnownSource(
    source,
    {
      whites_max: inferredSrcWhitesMax,
      reds_max: 1, // not used for sum scaling
      whites_per_ticket: 5,
    },
    targetGame,
    targetMatrix,
  );
}

/**
 * Same as `scaleConfig` but takes the source matrix explicitly. Prefer this
 * when the source game's matrix is known (which is usually the case in the
 * UI — it has the source GameDefinition in scope).
 */
export function scaleConfigKnownSource(
  source: GameConfig,
  sourceMatrix: Matrix,
  targetGame: string,
  targetMatrix: Matrix,
): GameConfig {
  const srcMean = uniformWhitesMean(sourceMatrix.whites_max, sourceMatrix.whites_per_ticket);
  const tgtMean = uniformWhitesMean(targetMatrix.whites_max, targetMatrix.whites_per_ticket);
  const ratio = tgtMean / srcMean;

  const scaledSum = {
    min: Math.max(0, Math.round(source.constraints.sum.min * ratio)),
    max: Math.round(source.constraints.sum.max * ratio),
  };

  // Decade-related fields: cap to the number of decades in the target.
  const targetDecadeCount = Math.ceil(targetMatrix.whites_max / 10);
  const scaledDecadeSpan = {
    min: Math.min(source.constraints.decadeSpan.min, targetDecadeCount),
    max: Math.min(source.constraints.decadeSpan.max, targetDecadeCount),
  };

  // lowCutoff: keep at target's natural midpoint.
  const targetLowCutoff = Math.floor(targetMatrix.whites_max / 2);

  // Enum constraints (allowedOddCounts, allowedLowCounts): the legal domain
  // is 0..whites_per_ticket. Filter source values that are out-of-range; if
  // empty after filtering, reset to a sane default.
  const inRange = (xs: number[]) =>
    xs.filter((x) => x >= 0 && x <= targetMatrix.whites_per_ticket);
  const allowedOddCounts = inRange(source.constraints.allowedOddCounts);
  const allowedLowCounts = inRange(source.constraints.allowedLowCounts);
  const defaultMid = [2, 3].filter((x) => x <= targetMatrix.whites_per_ticket);

  return {
    ...source,
    game: targetGame,
    constraints: {
      sum: scaledSum,
      allowedOddCounts: allowedOddCounts.length > 0 ? allowedOddCounts : defaultMid,
      allowedLowCounts: allowedLowCounts.length > 0 ? allowedLowCounts : defaultMid,
      lowCutoff: targetLowCutoff,
      maxConsecutivePairs: source.constraints.maxConsecutivePairs,
      decadeSpan: scaledDecadeSpan,
    },
  };
}
