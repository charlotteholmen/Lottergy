// Web Worker entry for the Monte Carlo kernel. Listens on postMessage:
//   { type: "start", whitesPool, redsPool, cfg, iterations, topK, seed? }
//   { type: "cancel" }
// Replies with:
//   { type: "progress", completed, total, elapsedMs }
//   { type: "result", result }
//   { type: "error", message }
//
// Locked detail (GOAL.md Phase 2): "Worker progress cadence: post every
// 50_000 iterations OR every 250ms, whichever comes first."

/// <reference lib="webworker" />

import type { BallFrequency, GameConfig, MonteCarloResult } from "./types.ts";
import { mathRandom, mulberry32 } from "./rng.ts";
import { runMonteCarloKernel } from "./montecarloKernel.ts";

type StartMsg = {
  type: "start";
  whitesPool: BallFrequency[];
  redsPool: BallFrequency[];
  cfg: GameConfig;
  iterations: number;
  topK?: number;
  /** If provided, uses mulberry32 for reproducibility. Otherwise Math.random. */
  seed?: number;
};

type CancelMsg = { type: "cancel" };
type InMsg = StartMsg | CancelMsg;

type ProgressOut = { type: "progress"; completed: number; total: number; elapsedMs: number };
type ResultOut = { type: "result"; result: MonteCarloResult };
type ErrorOut = { type: "error"; message: string };
type OutMsg = ProgressOut | ResultOut | ErrorOut;

let canceled = false;

function postOut(msg: OutMsg): void {
  (self as unknown as { postMessage: (m: OutMsg) => void }).postMessage(msg);
}

self.addEventListener("message", (event: MessageEvent<InMsg>) => {
  const data = event.data;
  if (data.type === "cancel") {
    canceled = true;
    return;
  }
  if (data.type !== "start") return;

  canceled = false;
  try {
    const rng = typeof data.seed === "number" ? mulberry32(data.seed) : mathRandom;
    const result = runMonteCarloKernel(data.whitesPool, data.redsPool, data.cfg, {
      iterations: data.iterations,
      topK: data.topK,
      rng,
      isCanceled: () => canceled,
      onProgress: (completed, elapsedMs) => {
        postOut({ type: "progress", completed, total: data.iterations, elapsedMs });
      },
    });
    postOut({ type: "result", result });
  } catch (err) {
    postOut({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
