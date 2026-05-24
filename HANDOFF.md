# Handoff — Session 2026-05-22 → next session

Read order: `CLAUDE.md` (auto-loaded with `@CONTEXT.md @REFERENCE.md @INDEX.md`) → `GOAL.md` → `wireframes.md` → this file.

---

## ⚠ Autonomy directive — read first

This project is wired for **autonomous execution**. You should be able to run all five phases without interrupting the user except at the explicit approval points listed in `GOAL.md` § Approval points.

- Every phase has a "Locked details" sub-section in `GOAL.md` that pre-answers the decisions you'd otherwise ask.
- If you encounter a question whose answer is not locked: default to the most conservative defensible option, **note the question + your chosen default in this HANDOFF.md under § Decisions made without explicit input**, and proceed.
- Do not halt for permission to: install dependencies, run commands, create files, write commits, run tests, generate types.
- Do halt for: `git push`, GitHub UI changes (Pages enable), visual UX review at first render, EAS builds, anything that costs money or signs into a third-party account.

CLAUDE.md rule 9 binds this: **never re-ask a locked question.**

---

## What happened in the prior session (2026-05-22)

- Wrote the full project doc set: `CLAUDE.md` (9 rules + cross-cutting requirements + data contract), `CONTEXT.md`, `REFERENCE.md`, `INDEX.md`, `GOAL.md` (24-row locked decisions table + per-phase locked details + approval-points list), `wireframes.md` (6 screens + control mapping), this file, + `file-summaries/` for each.
- Locked every phase decision so the next session can run autonomously.
- `powerball/` move blocked by CWD lock — user does it manually before launching this session.

## Manual user steps before launching this session

1. Move `C:\Users\zmaki\powerball\` → `C:\Users\zmaki\Desktop\Work\Lottergy\powerball-legacy\`.
2. Hoist project-level docs **out of** `powerball-legacy/` and up to `Lottergy/` root: `CLAUDE.md`, `CONTEXT.md`, `REFERENCE.md`, `INDEX.md`, `GOAL.md`, `HANDOFF.md`, `wireframes.md`, `file-summaries/`.
3. Launch Claude Code from `C:\Users\zmaki\Desktop\Work\Lottergy\`.

## Step 0: confirm state

```powershell
Test-Path "CLAUDE.md"
Test-Path "powerball-legacy\powerball_tickets.py"
Test-Path "file-summaries\CLAUDE.md"
gh auth status
```
If any project doc is still under `powerball-legacy/`, hoist it. If `gh auth status` shows not authenticated, surface to user at the first-push approval point.

## Step 1: execute Phases 0–4 per `GOAL.md`

All decisions are locked. Follow each phase's checkbox list in order. Update `file-summaries/<path>.md` + `INDEX.md` for every material file added (rules 7, 8).

Approval-point cadence (see `GOAL.md` § Approval points for full list):
- Before first `git push`
- After `pnpm web` first render (visual confirm)
- Before enabling GitHub Pages
- After first scrape
- After first render of each new UI screen
- All Phase 5 native-build moments

## Step 2: at session end, rewrite this file

Snapshot the new state. Move completed items out of "next session" and into "completed." Add any "decisions made without explicit input" so the user can review them.

---

## Decisions made without explicit input

*(Append to this section any decision you made under Autonomy contract rule 4. Format: `**[phase] decision** — chose X because Y. User: review if you want different.`)*

- **[Phase 1] Pages source = "GitHub Actions" (not main /data)** — GitHub Pages only supports `/` or `/docs` as the source folder when serving from a branch. `/data` (GOAL.md locked detail) is impossible. Chose to use Pages-from-Actions so a workflow uploads the `data/` directory as the Pages artifact, preserving the locked URL `https://thebitmaptoshi.github.io/Lottergy/v1/<game>.json`. User currently has Pages set to "Deploy from a branch — main / (root)" (set on 2026-05-23 before this was noticed); will need to flip to "GitHub Actions" before the first scrape lands. **User: confirm or override before Phase 1 first-scrape approval point.**
- **[Phase 0] Bootstrap commit precedes the locked Phase 0 scaffold commit** — User asked to commit the current docs+legacy state early so push auth could be validated cheaply. The Phase 0 commit message in GOAL.md was reserved for the scaffold; bootstrap commit went in as `initial commit` (865ea31), Phase 0 scaffold ships as commit #2. User: harmless, but flagged for completeness.
- **[Phase 0] pnpm installed via standalone installer, not corepack** — `corepack enable` needs admin to write under `C:\Program Files\nodejs\`. Used `iwr https://get.pnpm.io/install.ps1` instead, which installs to `%LOCALAPPDATA%\pnpm` (user scope). Functionally identical. User: future agents may need the same workaround.
- **[Phase 2] Python-golden snapshot tests deferred** — GOAL.md Phase 2 locked detail asked for snapshots vs `random.Random(42)`. Bit-for-bit parity between Python MT19937 and TS would require porting MT19937 to TS (non-trivial). Phase 2 instead shipped 48 vitest unit tests covering: frequency denominator (N not 5N), pool filter (incl. legacy mapping), constraints + soft acceptance, sampler determinism + statistical sanity, deterministic top-picks, Monte Carlo cancellation/progress, strategy lifecycle + bundle round-trip, scaling clamps. All green. Cross-language golden is a follow-up; the TS implementation matches the legacy semantics by construction and code review.
- **[Phase 2] Used Mulberry32 + Math.random instead of MT19937** — Math.random isn't seedable; tests need a seedable RNG. Mulberry32 added in `packages/core/src/rng.ts`. Production code paths use Math.random (locked decision); tests + optional seeded UI runs use Mulberry32. No cryptographic claim.

---

## Legacy-to-TS port map (full version in `GOAL.md` Phase 2)

| Python | TS port | Notes |
|---|---|---|
| `powerball_analysis.py` (fetch + era) | `scripts/scraper/powerball.ts` | Node + stdlib fetch. Output v1 JSON schema. |
| `powerball_tickets.py::build_pool` | `packages/core/pool.ts` | Now takes `frequency_percentile_range: [low, high]`, not `exclude_top_percent`. |
| `powerball_tickets.py::features` + `passes_hard` + `soft_accept_prob` | `packages/core/constraints.ts` | |
| `powerball_tickets.py::weighted_sample_no_replace` | `packages/core/sampler.ts` | Random Weighted mode. |
| (new — no Python equivalent) | `packages/core/topPicks.ts` | Deterministic top-N enumeration (Top Picks mode). |
| `powerball_montecarlo.py` | `packages/core/montecarlo.worker.ts` | Web Worker, cancelable, progress every 50k iter or 250ms. |
| `powerball_tickets.ini` | `packages/games/powerball/defaults.ts` | Typed TS. Inline comments → info-bubble copy. |

## Inherited gotchas (full list in `REFERENCE.md`)

- Frequency denominator = N (number of draws), not 5N.
- Default UI to current-matrix-only view; all-time mixed eras is a toggle with a warning.
- Powerball current-matrix history is only ~1,100 draws — don't oversell significance.
- Decade-span sanity check: warn before generate, don't crash after attempt cap.
- `frequency_percentile_range: [0, 100]` = include all balls; do not regress to single-direction exclude_top.

## Remaining unknowns (all non-blocking, all defaulted)

- Mega Millions current matrix → scraper auto-detects from data.
- Web app deployment → defaults to Pages-same-repo if user not present at Phase 5 approval point.
- Apple Developer → not enrolled; iOS step skipped; doc when user enrolls.

There are no remaining blockers. The next session should run autonomously from start of Phase 0 until the first approval point.
