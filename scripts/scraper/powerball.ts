// Powerball scraper. Pulls draws from NY State Open Data and emits the
// v1 JSON contract to data/v1/powerball.json.
//
// Port of powerball-legacy/powerball_analysis.py::fetch_draws +
// era logic, minus the frequency analysis (which moves to
// packages/core/ in Phase 2).

import { resolve } from "node:path";
import {
  type Draw,
  type Era,
  type GamePayload,
  fetchJson,
  utcNow,
  writePayload,
} from "./_common.ts";

const DATA_URL = "https://data.ny.gov/resource/d6yy-54nr.json?$limit=50000";

/** Era table — kept here mirroring the legacy ERAS list. */
const ERAS: Era[] = [
  { start: "2009-01-07", whites_max: 59, reds_max: 39, label: "2009-2012 (5/59 + 1/39)" },
  { start: "2012-01-15", whites_max: 59, reds_max: 35, label: "2012-2015 (5/59 + 1/35)" },
  { start: "2015-10-07", whites_max: 69, reds_max: 26, label: "2015-present (5/69 + 1/26)" },
];

/** NY Open Data row shape (lenient — only what we read is typed). */
type NyRow = {
  draw_date?: string;
  winning_numbers?: string;
  multiplier?: string;
};

function parseRow(row: NyRow): Draw | null {
  const date = row.draw_date?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parts = (row.winning_numbers ?? "").split(/\s+/).filter(Boolean);
  if (parts.length !== 6) return null;
  const nums = parts.map((s) => Number.parseInt(s, 10));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const whites = nums.slice(0, 5).sort((a, b) => a - b);
  const red = nums[5];
  return { date, whites, red };
}

export async function scrape(): Promise<GamePayload> {
  console.log(`Powerball: fetching ${DATA_URL}`);
  const rows = await fetchJson<NyRow[]>(DATA_URL);
  const draws = rows
    .map(parseRow)
    .filter((d): d is Draw => d !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`Powerball: parsed ${draws.length} draws (of ${rows.length} rows)`);

  // Sanity: warn if any draw is outside known eras. Don't fail — could be
  // a new matrix change that needs an ERAS update.
  for (const d of draws) {
    const era = ERAS.findLast((e) => d.date >= e.start);
    if (!era) continue;
    const maxWhite = Math.max(...d.whites);
    if (maxWhite > era.whites_max) {
      console.warn(
        `Powerball: WARN draw ${d.date} has white ${maxWhite} > era max ${era.whites_max}. Matrix may have changed; update ERAS.`,
      );
    }
    if (d.red > era.reds_max) {
      console.warn(
        `Powerball: WARN draw ${d.date} has red ${d.red} > era max ${era.reds_max}. Matrix may have changed; update ERAS.`,
      );
    }
  }

  const current = ERAS[ERAS.length - 1];
  return {
    game: "powerball",
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
  const out = resolve(process.cwd(), "../../data/v1/powerball.json");
  const payload = await scrape();
  await writePayload(out, payload);
  console.log(`Powerball: wrote ${out} (${payload.draws.length} draws)`);
}

main().catch((err) => {
  console.error("Powerball scraper failed:", err);
  process.exit(1);
});
