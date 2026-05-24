// @lottergy/core barrel. Public API for everything consumers (apps/lottergy,
// packages/games, packages/ui) should import from here, not from internal
// files.

export type {
  BallFrequency,
  Constraints,
  Draw,
  Era,
  ExportBundle,
  FrequencyTable,
  GameConfig,
  GamePayload,
  GenerationResult,
  Matrix,
  MonteCarloProgress,
  MonteCarloResult,
  PoolFilter,
  Preferences,
  SamplingMode,
  Strategy,
  Ticket,
  TicketFeatures,
} from "./types.ts";

export { computeFrequencyTable, currentMatrixDraws } from "./frequency.ts";
export { buildPool, decadesCovered } from "./pool.ts";
export { features, passesHard, softAcceptProb } from "./constraints.ts";
export { weightedSampleNoReplace } from "./sampler.ts";
export { generateTickets } from "./generator.ts";
export { topPicks } from "./topPicks.ts";
export { runMonteCarloKernel } from "./montecarloKernel.ts";
export type { KernelOptions } from "./montecarloKernel.ts";
export {
  exportBundle,
  newStrategy,
  parseBundle,
  removeConfig,
  setConfig,
} from "./strategy.ts";
export { scaleConfig, scaleConfigKnownSource } from "./scale.ts";
export { mulberry32, mathRandom } from "./rng.ts";
export type { Rng } from "./rng.ts";
