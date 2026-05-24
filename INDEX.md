# Lottergy — File Index

Each entry links to its `file-summaries/<path>.md` digest (<300 words, what + why + exports + invariants). **Read the summary first; open the full file only if the summary is insufficient** (CLAUDE.md rule 8).

Auto-loaded docs (CLAUDE / CONTEXT / REFERENCE) are imported via CLAUDE.md's `@`-headers and intentionally omitted here.

## Project docs (root, on-demand)

- [GOAL.md](file-summaries/GOAL.md) — full vision, v1 scope, locked decisions, architecture, phased roadmap.
- [HANDOFF.md](file-summaries/HANDOFF.md) — session-to-session state and next-step list.
- [wireframes.md](file-summaries/wireframes.md) — ASCII sketches of the 5 core screens + per-parameter control mapping.
- [README.md](file-summaries/README.md) — public repo entry point: name, tagline, link to GOAL.md.
- [LICENSE](file-summaries/LICENSE.md) — MIT, 2026, "thebitmaptoshi".
- [.gitignore](file-summaries/.gitignore.md) — Node + Python + env + OS + IDE ignores.

## Monorepo root

- [package.json](file-summaries/package.json.md) — root workspace manifest; pnpm-managed; top-level scripts (`web`, `test`, `lint`, `format`).
- [pnpm-workspace.yaml](file-summaries/pnpm-workspace.yaml.md) — workspace globs: `apps/*`, `packages/*`, `scripts/*`.
- [tsconfig.base.json](file-summaries/tsconfig.base.json.md) — shared TS config for `packages/*` and `scripts/*` (strict, ESNext, Bundler).
- [.npmrc](file-summaries/.npmrc.md) — pnpm settings tuned for Expo+RN monorepo (`node-linker=hoisted`).
- [eslint.config.js](file-summaries/eslint.config.js.md) — flat ESLint config for `packages/*` + `scripts/*` (`apps/*` uses Expo's own).

## Apps

- [apps/lottergy](file-summaries/apps/lottergy.md) — the Expo app (web primary, native via EAS). Expo SDK 56, Expo Router, NativeWind v4.

## Packages

- [packages/core](file-summaries/packages/core.md) — game-agnostic logic: 12 modules (frequency, pool, constraints, sampler, generator, top-picks, Monte Carlo kernel + Worker, strategy, scale, rng). 48 vitest tests, all passing.
- [packages/games](file-summaries/packages/games.md) — per-game data only (matrix, eras, data URL, default preset, info copy). No logic.
- [packages/ui](file-summaries/packages/ui.md) — shared cross-platform UI primitives (info bubble, controls, `ResultsVisualizer`).

## Scripts

- [scripts/scraper](file-summaries/scripts/scraper.md) — TS scrapers (Powerball + Mega Millions) targeting NY State Open Data, emit `data/v1/<game>.json`.

## Data

- [data/v1/](file-summaries/data/v1.md) — versioned JSON contract: matrix + eras + draws per game. Served via GitHub Pages (Pages-from-Actions).

## CI

- [.github/workflows](file-summaries/.github/workflows.md) — nightly scrape + Pages deploy.

## Legacy reference (`powerball-legacy/`)

- [powerball_analysis.py](file-summaries/powerball-legacy/powerball_analysis.py.md) — fetches NY Open Data draws, emits frequency tables.
- [powerball_tickets.py](file-summaries/powerball-legacy/powerball_tickets.py.md) — config-driven ticket generator (pool + constraints + sampler).
- [powerball_tickets.ini](file-summaries/powerball-legacy/powerball_tickets.ini.md) — human-editable config schema (spec for `packages/games/<game>/defaults.ts`).
- [powerball_montecarlo.py](file-summaries/powerball-legacy/powerball_montecarlo.py.md) — parallelized Monte Carlo over the same config + sampler.
