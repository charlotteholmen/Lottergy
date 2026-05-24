// Shared types + validator for scraper output. Kept dependency-free
// (no zod, no schema lib in v1 — locked decision in GOAL.md Phase 1).
//
// The shape here is the public data contract served via GitHub Pages.
// Breaking changes bump the path prefix `/v1/` -> `/v2/`.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type Draw = {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** sorted ascending */
  whites: number[];
  /** the second-pool ball (Powerball / Mega Ball) */
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
  /** ISO-8601 UTC timestamp the scraper ran */
  updated_at: string;
  matrix: Matrix;
  eras: Era[];
  /** ascending by date */
  draws: Draw[];
};

/**
 * Validate a GamePayload before write. Returns null if OK,
 * or an array of human-readable issues if not.
 */
export function validatePayload(p: unknown): string[] | null {
  const issues: string[] = [];
  if (!p || typeof p !== "object") return ["payload is not an object"];
  const o = p as Record<string, unknown>;

  if (typeof o.game !== "string" || !o.game) issues.push("game: missing or empty");
  if (typeof o.updated_at !== "string" || !o.updated_at) issues.push("updated_at: missing");

  const m = o.matrix as Matrix | undefined;
  if (!m || typeof m !== "object") {
    issues.push("matrix: missing");
  } else {
    if (typeof m.whites_max !== "number" || m.whites_max <= 0) issues.push("matrix.whites_max: invalid");
    if (typeof m.reds_max !== "number" || m.reds_max <= 0) issues.push("matrix.reds_max: invalid");
    if (typeof m.whites_per_ticket !== "number" || m.whites_per_ticket <= 0)
      issues.push("matrix.whites_per_ticket: invalid");
  }

  if (!Array.isArray(o.eras) || o.eras.length === 0) {
    issues.push("eras: empty or missing");
  } else {
    o.eras.forEach((e, i) => {
      const era = e as Partial<Era>;
      if (!era.start || !/^\d{4}-\d{2}-\d{2}$/.test(era.start))
        issues.push(`eras[${i}].start: must be YYYY-MM-DD`);
      if (typeof era.whites_max !== "number") issues.push(`eras[${i}].whites_max: invalid`);
      if (typeof era.reds_max !== "number") issues.push(`eras[${i}].reds_max: invalid`);
      if (typeof era.label !== "string" || !era.label) issues.push(`eras[${i}].label: missing`);
    });
  }

  if (!Array.isArray(o.draws)) {
    issues.push("draws: missing or not an array");
  } else {
    o.draws.forEach((d, i) => {
      const dr = d as Partial<Draw>;
      if (!dr.date || !/^\d{4}-\d{2}-\d{2}$/.test(dr.date))
        issues.push(`draws[${i}].date: must be YYYY-MM-DD`);
      if (!Array.isArray(dr.whites) || dr.whites.some((n) => typeof n !== "number"))
        issues.push(`draws[${i}].whites: must be number[]`);
      if (typeof dr.red !== "number") issues.push(`draws[${i}].red: must be number`);
    });
    // Ascending-by-date invariant
    for (let i = 1; i < o.draws.length; i++) {
      const a = (o.draws[i - 1] as Draw).date;
      const b = (o.draws[i] as Draw).date;
      if (a && b && a > b) {
        issues.push(`draws: not sorted ascending at index ${i} (${a} > ${b})`);
        break;
      }
    }
  }

  return issues.length === 0 ? null : issues;
}

export async function writePayload(outPath: string, payload: GamePayload): Promise<void> {
  const issues = validatePayload(payload);
  if (issues) {
    throw new Error(`payload validation failed:\n  - ${issues.join("\n  - ")}`);
  }
  const abs = resolve(outPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

/**
 * Fetch JSON from a URL with a UA header. Throws on non-200.
 * Uses Node 22 stdlib fetch (no node-fetch dep).
 */
export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "lottergy-scraper/1.0 (+https://github.com/thebitmaptoshi/Lottergy)" },
  });
  if (!resp.ok) {
    throw new Error(`fetch ${url} -> HTTP ${resp.status} ${resp.statusText}`);
  }
  return (await resp.json()) as T;
}

/** ISO YYYY-MM-DDTHH:MM:SSZ for the updated_at field. */
export function utcNow(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}
