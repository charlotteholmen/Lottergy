// Shared types for @lottergy/core. Mirrors the data contract in
// data/v1/<game>.json plus the in-app strategy + config shapes.
//
// NO logic here. Pure type definitions.

// ---------- Data contract (matches scripts/scraper/_common.ts) ----------

export type Draw = {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** sorted ascending */
  whites: number[];
  /** the second-pool ball (Powerball / Mega Ball / etc.) */
  red: number;
};

export type Era = {
  /** ISO date YYYY-MM-DD this era began */
  start: string;
  whites_max: number;
  reds_max: number;
  label: string;
};

export type Matrix = {
  whites_max: number;
  reds_max: number;
  whites_per_ticket: number;
};

export type GamePayload = {
  game: string;
  /** ISO-8601 UTC */
  updated_at: string;
  matrix: Matrix;
  eras: Era[];
  draws: Draw[];
};

// ---------- Frequency analysis ----------

export type BallFrequency = {
  /** the ball number, 1-based */
  number: number;
  /** count of draws this ball appeared in */
  count: number;
  /** draw-appearance rate: count / drawCount (0..1) */
  rate: number;
};

export type FrequencyTable = {
  /** total draws used to compute frequencies */
  drawCount: number;
  /** white-ball frequencies, length = matrix.whites_max */
  whites: BallFrequency[];
  /** red-ball frequencies, length = matrix.reds_max */
  reds: BallFrequency[];
};

// ---------- Pool + constraint config ----------

export type PoolFilter = {
  /**
   * [low, high] percentile range over balls ranked by frequency (0 = coldest,
   * 100 = hottest). Replaces legacy `exclude_top_percent` (which maps to [0, 100 - X]).
   * [0, 100] = include all balls.
   * [10, 90] = exclude coldest 10% AND hottest 10%.
   */
  frequencyPercentileRange: [number, number];
  /** Include only balls whose draw-appearance rate > this value (0..1, STRICT >). */
  minFrequencyRate: number;
  /** Cap to top-N most-frequent of what survived the filters. 0 = no cap. */
  topN: number;
};

export type Constraints = {
  /** Sum of the whites must be in [min, max] inclusive. */
  sum: { min: number; max: number };
  /** Allowed counts of ODD whites (e.g. [2, 3]). */
  allowedOddCounts: number[];
  /** Allowed counts of LOW whites (where "low" = ball <= lowCutoff). */
  allowedLowCounts: number[];
  /** A ball is "low" if its number <= this. */
  lowCutoff: number;
  /** Max number of consecutive pairs (e.g. 22-23 counts as 1 pair). */
  maxConsecutivePairs: number;
  /** Number of distinct decades (1-10, 11-20, ...) the whites span, inclusive range. */
  decadeSpan: { min: number; max: number };
};

export type Preferences = {
  /**
   * Probability of accepting a ticket that has 1 consecutive pair instead of 0.
   * 1.0 = no penalty. 0.0 = effectively hard reject.
   */
  weightOneConsecutivePair: number;
};

/** Two sampling modes per GOAL.md locked decision. */
export type SamplingMode = "random-weighted" | "top-picks";

export type GameConfig = {
  /** game id (e.g. "powerball"). */
  game: string;
  whitesPool: PoolFilter;
  redsPool: PoolFilter;
  constraints: Constraints;
  preferences: Preferences;
  numTickets: number;
  samplingMode: SamplingMode;
};

// ---------- Tickets + Monte Carlo output ----------

export type Ticket = {
  /** sorted ascending */
  whites: number[];
  red: number;
};

export type TicketFeatures = {
  sum: number;
  oddCount: number;
  lowCount: number;
  consecutivePairs: number;
  decadeSpan: number;
};

export type GenerationResult = {
  tickets: Ticket[];
  attempts: number;
  hitAttemptCap: boolean;
};

export type MonteCarloProgress = {
  completed: number;
  total: number;
  elapsedMs: number;
  rate: number; // iter/sec
};

export type MonteCarloResult = {
  totalDraws: number;
  uniqueWhiteCombos: number;
  topWhites: Array<{ whites: number[]; count: number; topRed: number; topRedCount: number }>;
  elapsedMs: number;
};

// ---------- Strategy (named multi-game collection) ----------

export type Strategy = {
  /** UUID v4 */
  id: string;
  name: string;
  /** ISO-8601 */
  createdAt: string;
  /** ISO-8601 */
  updatedAt: string;
  /** Per-game slots. A strategy may hold configs for many games. */
  configs: Partial<Record<string, GameConfig>>;
};

export type ExportBundle = {
  lottergy_version: 1;
  exported_at: string;
  strategies: Strategy[];
  frequent_games: string[];
};
