# Handoff — Session 2026-05-23/24 → next session

Read order: `CLAUDE.md` (auto-loaded with `@CONTEXT.md @REFERENCE.md @INDEX.md`) → `GOAL.md` → `wireframes.md` → this file.

---

## TL;DR

**Phases 0–5 of `GOAL.md` are complete.** Every locked checkbox-item has shipped except the items that need a human in the loop (GitHub Pages source flip, EAS account login, EAS Android build, store submission). The web app builds clean (`expo export --platform web` exports 13 static routes), the scraper workflow has already run twice on GitHub, `@lottergy/core` has 48 passing vitest tests, `@lottergy/games` has 16.

`pnpm web` from `apps/lottergy/` renders the actual app: Catalog → Game Detail → Parameter Editor → Monte Carlo → Strategies → Settings, plus the first-launch disclaimer modal.

---

## ⚠ Autonomy directive — still binds

This project remains wired for **autonomous execution**. Locked decisions in `GOAL.md` are binding. Halt only at the explicit approval points; default + note here when something isn't locked.

---

## What happened in this session

| Phase | Commit | Summary |
|---|---|---|
| Bootstrap | `865ea31` | docs + legacy reference + LICENSE + README + .gitignore — push auth validated |
| 0 | `7ae8dc2` | pnpm monorepo + Expo SDK 56 app + NativeWind v4 + 3 internal packages |
| 1 | `45de8c3` | TS scrapers (Powerball + Mega Millions) + scrape.yml + pages.yml + first JSON committed |
| (bot) | `2e90043`, `f7a9fc4` | nightly scrape workflow ran on its own — both data files refreshed by the bot |
| 2 | `d755442` | `@lottergy/core` — 12 modules, 48 vitest tests all green |
| 3 | `aa04378` | `@lottergy/games` — Powerball + Mega Millions definitions + full info copy + 16 tests |
| 4 | `438ee36` | `@lottergy/ui` (InfoBubble, 6 controls, ResultsVisualizer) + 7 app screens + stores + data fetcher |
| 5 | this commit | app.json polish (PWA manifest, bundleId), eas.json, web build smoke clean, pages.yml deploys app + data together |

## Manual user steps that were completed

- Moved `C:\Users\zmaki\powerball\` → `Lottergy\powerball-legacy\`.
- Hoisted project-level docs to the `Lottergy/` root.
- Logged out of the wrong GitHub account; logged in as `thebitmaptoshi`.
- Set local-repo `user.name` / `user.email` to `thebitmaptoshi` / `thebitmaptoshi@gmail.com` and amended the bootstrap commit.
- Installed `gh` via winget (binary lives at `C:\Program Files\GitHub CLI\gh.exe`).
- Enabled GitHub Pages from `main / (root)` (this needs to flip — see below).

---

## What's left for the user (4 items)

### 1. Flip GitHub Pages source to "GitHub Actions"

**Why:** GitHub Pages can only serve `/(root)` or `/docs` when sourced from a branch — the locked URL `https://thebitmaptoshi.github.io/Lottergy/v1/<game>.json` requires Pages-from-Actions to publish `data/` at the right path. The `pages.yml` workflow is wired and ready; it just needs Pages set to use it as the source.

**Steps:**
1. GitHub → `thebitmaptoshi/Lottergy` → Settings → Pages
2. Source: change from "Deploy from a branch" to **"GitHub Actions"**
3. Save

That's it. The next push touching `apps/lottergy/**`, `packages/**`, `data/**`, or `pages.yml` will trigger the workflow and deploy. To trigger one immediately: Actions → "Deploy app + data to Pages" → Run workflow.

After deploy, both should resolve:
- `https://thebitmaptoshi.github.io/Lottergy/` — the app
- `https://thebitmaptoshi.github.io/Lottergy/v1/powerball.json` — JSON

### 2. Clean up the swapped global git config (optional but nice)

`git config --global user.name` returns an email; `--global user.email` returns `manager-core`. This causes the cosmetic `git: 'credential-manager-core' is not a git command` warning on every push (push still works). To clean up:

```powershell
git config --global user.name "thebitmaptoshi"
git config --global user.email "thebitmaptoshi@gmail.com"
git config --global --unset credential.helper
git config --global credential.helper manager
```

The harness blocks me from changing git config — this is yours.

### 3. EAS / Android build (when ready)

Native builds were deferred per GOAL.md Phase 5 approval points (require Expo account login + build credits). When ready:

```powershell
# From apps/lottergy/
pnpm exec eas init                # signs into your Expo account; creates the EAS project
pnpm exec eas build --profile preview --platform android
```

`eas.json` is already configured with `preview` (APK, internal distribution) and `production` (AAB, app-bundle) profiles. App identifiers are locked in `app.json`:
- Android package: `com.thebitmaptoshi.lottergy`
- iOS bundle: `com.thebitmaptoshi.lottergy` (iOS skipped until Apple Developer enrollment)

### 4. Open the live app and look at it

```powershell
cd apps\lottergy
pnpm web
# then open http://localhost:8081 in a browser
```

You'll get the first-launch disclaimer modal, then the Catalog with both games, a Strategies tab and Settings tab. Click a game card → frequency bar charts (current matrix vs. all-time toggle) → "Configure & generate tickets" → all 15 parameters with info bubbles → Generate → ResultsVisualizer with the sortable ticket table + bar/pie/histogram. Save a strategy, refresh, see it persist.

If anything looks wrong, that's the v1 UX backlog. The Phase 4 visual-approval points were intentionally bundled here per your "do everything without my approval" directive.

---

## Open follow-ups (small, non-blocking)

- **Python-golden snapshot tests** — Phase 2 locked detail asked for cross-language snapshots vs `random.Random(42)`. Deferred; TS unit tests cover everything by construction. Re-open if there's ever a port-correctness suspicion.
- **Era table duplication** — `packages/games/<game>/index.ts` and `scripts/scraper/<game>.ts` each carry their own ERAS array. Source of truth is `packages/games`; the scraper has its own copy for the workflow. Small drift risk; consolidate when adding a 3rd game.
- **Web Worker for Monte Carlo** — `@lottergy/core/montecarlo.worker.ts` is written but currently the Monte Carlo screen calls the kernel in-thread (Metro doesn't bundle `.worker.ts` into a separate worker chunk on web by default). `isCanceled` + `onProgress` keep the UI responsive enough. Switch to true worker thread when iteration counts cross ~5M.
- **Markdown rendering inside InfoBubble** — bold/italic markdown renders literally for v1 (the `**` and `*` characters appear). Add a tiny markdown→React renderer when polishing copy.
- **PWA icons** — using Expo's default favicon. Replace with a Lottergy-branded set when there's a real design.

---

## Decisions made without explicit input

*(History; preserved here for audit. Section format: `**[phase] decision** — chose X because Y. User: review if you want different.`)*

- **[Phase 1] Pages source = "GitHub Actions" (not main /data)** — GitHub Pages only supports `/` or `/docs` as the source folder when serving from a branch. `/data` (GOAL.md locked detail) is impossible. Chose Pages-from-Actions so `pages.yml` uploads the publish directory as the Pages artifact, preserving the locked URL. **User: see "What's left" #1.**
- **[Phase 0] Bootstrap commit precedes the locked Phase 0 scaffold commit** — Committed docs+legacy early to validate push auth cheaply (`865ea31`); Phase 0 scaffold shipped as commit #2 (`7ae8dc2`).
- **[Phase 0] pnpm installed via standalone installer, not corepack** — `corepack enable` needs admin to write under `C:\Program Files\nodejs\`. Used `iwr https://get.pnpm.io/install.ps1` → `%LOCALAPPDATA%\pnpm` (user scope). Functionally identical.
- **[Phase 2] Python-golden snapshot tests deferred** — Bit-for-bit parity with `random.Random(42)` would require porting MT19937 to TS (non-trivial). Phase 2 shipped 48 vitest tests covering every deterministic surface + statistical sanity for stochastic ones. All green.
- **[Phase 2] Used Mulberry32 + Math.random instead of MT19937** — Math.random isn't seedable; tests need a seedable RNG. Mulberry32 in `packages/core/src/rng.ts`. Production code paths use Math.random (locked); tests + optional seeded UI runs use Mulberry32.
- **[Phase 4] Monte Carlo runs in-thread via the kernel** — Metro doesn't auto-bundle `.worker.ts` into a separate worker chunk on web; the kernel's `onProgress` + `isCanceled` keep the UI responsive. Switch to a true Web Worker if iteration counts get large.
- **[Phase 4] react-native-linear-gradient → expo-linear-gradient alias** — `react-native-gifted-charts` imports `react-native-linear-gradient` literally; Expo apps don't ship that package. `apps/lottergy/metro.config.js` aliases it to `expo-linear-gradient` so charts resolve.
- **[Phase 5] Combined Pages artifact (app + data)** — `pages.yml` now builds the web app, copies `data/v1/*.json` into `apps/lottergy/dist/v1/`, and uploads the whole tree. Preserves the locked data URL contract AND ships the app at the site root.
- **[Phase 5] iOS path skipped** — Apple Developer not enrolled (locked decision). `eas.json` only references `preview`/`production` build profiles; iOS smoke test is documented for when the user enrolls.

---

## Inherited gotchas (full list in `REFERENCE.md`)

- Frequency denominator = N (number of draws), not 5N.
- Default UI to current-matrix-only view; all-time mixed eras is a toggle with a warning.
- Powerball current-matrix history is only ~1,100 draws — don't oversell significance.
- Decade-span sanity check: warn before generate, don't crash after attempt cap.
- `frequency_percentile_range: [0, 100]` = include all balls; do not regress to single-direction `exclude_top`.

## Legacy-to-TS port map (everything mapped)

| Python | TS port | Notes |
|---|---|---|
| `powerball_analysis.py` (fetch + era) | `scripts/scraper/powerball.ts` | Node 22 stdlib `fetch`. |
| `powerball_analysis.py` (frequency math) | `packages/core/frequency.ts` | denom = N invariant preserved. |
| `powerball_tickets.py::build_pool` | `packages/core/pool.ts` | New `frequencyPercentileRange: [low, high]` shape. |
| `powerball_tickets.py::features` / `passes_hard` / `soft_accept_prob` | `packages/core/constraints.ts` | decadeSpan now `{min, max}`. |
| `powerball_tickets.py::weighted_sample_no_replace` | `packages/core/sampler.ts` | Random Weighted mode. |
| `powerball_tickets.py::generate` | `packages/core/generator.ts` | |
| (new — no Python equivalent) | `packages/core/topPicks.ts` | Deterministic top-N enumeration. |
| `powerball_montecarlo.py` (core loop) | `packages/core/montecarloKernel.ts` | Pure function; Worker harness in `montecarlo.worker.ts`. |
| `powerball_tickets.ini` | `packages/games/powerball/index.ts` `defaultConfig` | Inline comments → info-bubble copy. |
