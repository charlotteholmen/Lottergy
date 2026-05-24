// Strategy schema + JSON export/import. Per GOAL.md:
//   "A strategy is a NAMED COLLECTION of per-game configurations, not a
//    single config. configs is Partial<Record<GameId, GameConfig>>."
//
// Export/import bundles all strategies + frequent-games list as a single
// JSON file the user owns and carries between devices.

import type { ExportBundle, GameConfig, Strategy } from "./types.ts";

/**
 * Create a new empty strategy. ID via `crypto.randomUUID()` per locked
 * decision (UUID v4). Works in browser, Node 22, and Web Workers.
 */
export function newStrategy(name: string, now: () => Date = () => new Date()): Strategy {
  const iso = now().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: iso,
    updatedAt: iso,
    configs: {},
  };
}

/**
 * Add or replace a slot for game `gameId` in `strategy`. Other slots are
 * untouched. UI never uses "overwrite" because it implies destruction of
 * other slots.
 */
export function setConfig(
  strategy: Strategy,
  gameId: string,
  cfg: GameConfig,
  now: () => Date = () => new Date(),
): Strategy {
  return {
    ...strategy,
    configs: { ...strategy.configs, [gameId]: cfg },
    updatedAt: now().toISOString(),
  };
}

/** Remove a game slot. No-op if it didn't exist. */
export function removeConfig(
  strategy: Strategy,
  gameId: string,
  now: () => Date = () => new Date(),
): Strategy {
  if (!(gameId in strategy.configs)) return strategy;
  const next = { ...strategy.configs };
  delete next[gameId];
  return { ...strategy, configs: next, updatedAt: now().toISOString() };
}

/** Build a portable export bundle. */
export function exportBundle(
  strategies: Strategy[],
  frequentGames: string[],
  now: () => Date = () => new Date(),
): ExportBundle {
  return {
    lottergy_version: 1,
    exported_at: now().toISOString(),
    strategies: strategies.slice(),
    frequent_games: frequentGames.slice(),
  };
}

/**
 * Validate + parse an import bundle. Returns null if invalid (caller surfaces
 * a user error). No automatic migration in v1 — bundles must be
 * `lottergy_version: 1`.
 */
export function parseBundle(raw: unknown): ExportBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<ExportBundle>;
  if (o.lottergy_version !== 1) return null;
  if (typeof o.exported_at !== "string") return null;
  if (!Array.isArray(o.strategies)) return null;
  if (!Array.isArray(o.frequent_games)) return null;
  // Per-strategy validation: minimal — id + name present.
  for (const s of o.strategies) {
    if (!s || typeof s !== "object") return null;
    const st = s as Partial<Strategy>;
    if (typeof st.id !== "string" || typeof st.name !== "string") return null;
    if (typeof st.createdAt !== "string" || typeof st.updatedAt !== "string") return null;
    if (!st.configs || typeof st.configs !== "object") return null;
  }
  return o as ExportBundle;
}
