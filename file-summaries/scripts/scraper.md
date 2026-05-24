# scripts/scraper

**What:** Node TypeScript scripts that fetch Powerball + Mega Millions draws from NY State Open Data and emit the v1 data contract.

**Why:** GOAL.md Phase 1 — port `powerball-legacy/powerball_analysis.py::fetch_draws` + era logic to TS, drop the per-script frequency analysis (that lives in `packages/core/` in Phase 2).

## Files

- `_common.ts` — shared types (`Draw`, `Era`, `Matrix`, `GamePayload`), hand-rolled validator, `fetchJson`, `writePayload`, `utcNow`. No runtime deps beyond Node stdlib.
- `powerball.ts` — fetches `data.ny.gov/resource/d6yy-54nr.json`, parses, validates, writes `data/v1/powerball.json`. ERAS table mirrors the legacy Python file.
- `megamillions.ts` — same for `5xaw-6ayf` dataset. Handles both schema variants (mega_ball as separate field OR as 6th token in winning_numbers).
- `package.json` — `@lottergy/scraper` workspace; `tsx`, `@types/node`, `typescript` only.
- `tsconfig.json` — extends root base; `types: ["node"]`.

## Running

```bash
pnpm --filter @lottergy/scraper scrape:powerball
pnpm --filter @lottergy/scraper scrape:megamillions
```

Both scripts resolve output paths via `process.cwd()` + `../../data/v1/<game>.json`. pnpm `--filter` changes cwd into the scraper package automatically.

## Key invariants

- Use Node 22 stdlib `fetch` only. No `node-fetch` / `axios` / `undici`.
- Validate before write (`writePayload`). A bad payload throws — the workflow's `git diff --quiet` then sees no change and skips commit. Last-good file is preserved.
- ERAS in each script is the canonical era table for that game. If the scraper sees a draw outside known eras, it **warns** but does NOT fail — surfaces a matrix-change signal for the maintainer.
- Output sorted ascending by date. Whites within each draw sorted ascending.
- Schema breaking change → bump the path prefix from `/v1/` to `/v2/` and update CLAUDE.md data contract.
