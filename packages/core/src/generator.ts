// Ticket generator. Orchestrates pool + constraints + sampler to produce
// N unique tickets that satisfy the hard constraints (after soft acceptance).
// Direct port of powerball_tickets.py::generate.

import type { BallFrequency, GameConfig, GenerationResult, Ticket } from "./types.ts";
import { passesHard, softAcceptProb } from "./constraints.ts";
import { mathRandom, type Rng } from "./rng.ts";
import { weightedSampleNoReplace } from "./sampler.ts";

const DEFAULT_MAX_ATTEMPTS = 500_000;

/**
 * Generate up to `cfg.numTickets` unique constraint-satisfying tickets.
 * Returns early (with hitAttemptCap=true) if the cap is reached.
 */
export function generateTickets(
  whitesPool: BallFrequency[],
  redsPool: BallFrequency[],
  cfg: GameConfig,
  rng: Rng = mathRandom,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): GenerationResult {
  const tickets: Ticket[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (tickets.length < cfg.numTickets && attempts < maxAttempts) {
    attempts += 1;
    const whitesUnsorted = weightedSampleNoReplace(whitesPool, 5, rng);
    if (whitesUnsorted.length < 5) break; // pool too small
    const whites = whitesUnsorted.slice().sort((a, b) => a - b);

    if (!passesHard(whites, cfg.constraints)) continue;
    if (rng() > softAcceptProb(whites, cfg.constraints, cfg.preferences)) continue;

    const reds = weightedSampleNoReplace(redsPool, 1, rng);
    if (reds.length === 0) break;
    const red = reds[0];

    const key = whites.join(",") + "|" + red;
    if (seen.has(key)) continue;
    seen.add(key);
    tickets.push({ whites, red });
  }

  return {
    tickets,
    attempts,
    hitAttemptCap: attempts >= maxAttempts && tickets.length < cfg.numTickets,
  };
}
