// Mega Millions scraper. Pulls draws from NY State Open Data and emits
// the v1 JSON contract to data/v1/megamillions.json.
//
// NY Open Data dataset: 5xaw-6ayf. Fields observed:
//   draw_date     (ISO timestamp)
//   winning_numbers (space-separated 5 whites)
//   mega_ball     (the second-pool ball)
//   multiplier    (megaplier; unused here)

import { resolve } from "node:path";
import {
  type Draw,
  type Era,
  type GamePayload,
  fetchJson,
  utcNow,
  writePayload,
} from "./_common.ts";

const DATA_URL = "https://data.ny.gov/resource/5xaw-6ayf.json?$limit=50000";

/**
 * Mega Millions era history. Current matrix: 5/70 + 1/25 (since 2025-04-08).
 * Prior era: 5/70 + 1/25 (2017-10-31 was 5/70 + 1/25); 2013-2017 was 5/75 + 1/15.
 * Scraper will warn-not-fail if a draw falls outside these — that signals a
 * matrix change that needs a manual era-table update.
 */
const ERAS: Era[] = [
  { start: "2013-10-22", whites_max: 75, reds_max: 15, label: "2013-2017 (5/75 + 1/15)" },
  { start: "2017-10-31", whites_max: 70, reds_max: 25, label: "2017-2025 (5/70 + 1/25)" },
  { start: "2025-04-08", whites_max: 70, reds_max: 24, label: "2025-present (5/70 + 1/24)" },
];

type NyRow = {
  draw_date?: string;
  winning_numbers?: string;
  mega_ball?: string;
  multiplier?: string;
};

function parseRow(row: NyRow): Draw | null {
  const date = row.draw_date?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  // mega_ball may be a separate field OR the 6th token in winning_numbers
  // (depending on dataset version). Handle both.
  const tokens = (row.winning_numbers ?? "").split(/\s+/).filter(Boolean);
  let whiteTokens: string[];
  let redToken: string | undefined;

  if (row.mega_ball && tokens.length === 5) {
    whiteTokens = tokens;
    redToken = row.mega_ball;
  } else if (tokens.length === 6) {
    whiteTokens = tokens.slice(0, 5);
    redToken = tokens[5];
  } else {
    return null;
  }

  const whites = whiteTokens.map((s) => Number.parseInt(s, 10));
  const red = Number.parseInt(redToken ?? "", 10);
  if (whites.some((n) => !Number.isFinite(n)) || !Number.isFinite(red)) return null;
  whites.sort((a, b) => a - b);
  return { date, whites, red };
}

export async function scrape(): Promise<GamePayload> {
  console.log(`Mega Millions: fetching ${DATA_URL}`);
  const rows = await fetchJson<NyRow[]>(DATA_URL);
  const draws = rows
    .map(parseRow)
    .filter((d): d is Draw => d !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`Mega Millions: parsed ${draws.length} draws (of ${rows.length} rows)`);

  for (const d of draws) {
    const era = ERAS.findLast((e) => d.date >= e.start);
    if (!era) continue;
    const maxWhite = Math.max(...d.whites);
    if (maxWhite > era.whites_max) {
      console.warn(
        `Mega Millions: WARN draw ${d.date} has white ${maxWhite} > era max ${era.whites_max}. Matrix may have changed; update ERAS.`,
      );
    }
    if (d.red > era.reds_max) {
      console.warn(
        `Mega Millions: WARN draw ${d.date} has red ${d.red} > era max ${era.reds_max}. Matrix may have changed; update ERAS.`,
      );
    }
  }

  const current = ERAS[ERAS.length - 1];
  return {
    game: "megamillions",
    updated_at: utcNow(),
    matrix: {
      whites_max: current.whites_max,
      reds_max: current.reds_max,
      whites_per_ticket: 5,
    },
    eras: ERAS,
    draws,
  };
}

async function main(): Promise<void> {
  const out = resolve(process.cwd(), "../../data/v1/megamillions.json");
  const payload = await scrape();
  await writePayload(out, payload);
  console.log(`Mega Millions: wrote ${out} (${payload.draws.length} draws)`);
}

main().catch((err) => {
  console.error("Mega Millions scraper failed:", err);
  process.exit(1);
});
