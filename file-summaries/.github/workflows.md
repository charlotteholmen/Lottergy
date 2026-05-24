# .github/workflows

**What:** Two CI workflows — one to scrape draws nightly, one to publish the data via GitHub Pages.

**Why:** GOAL.md Phase 1 + the Pages-folder correction memory (`project-pages-folder-correction`): GitHub Pages from a branch can only serve `/(root)` or `/docs`, not `/data`. To keep the locked URL `https://thebitmaptoshi.github.io/Lottergy/v1/<game>.json` working, we publish `data/` via Pages-from-Actions.

## scrape.yml

- **Triggers:** daily 09:00 UTC + `workflow_dispatch`.
- **Concurrency:** `cancel-in-progress: true` so overlapping runs don't conflict.
- **Steps:** checkout → pnpm 11.2.2 → Node 22 (cache: pnpm) → `pnpm install --frozen-lockfile` → run each scraper → commit per game with locked message format `data: refresh <game> (<date>)` → push only if something changed.
- **Auth:** default `GITHUB_TOKEN` with `contents: write`. No PAT needed.

## pages.yml

- **Triggers:** push to `main` touching `data/**` (or the workflow itself) + `workflow_dispatch`.
- **Permissions:** `contents: read`, `pages: write`, `id-token: write`.
- **Steps:** checkout → `configure-pages` → `upload-pages-artifact path: data` → `deploy-pages`.
- **Result:** `data/v1/<game>.json` → `https://thebitmaptoshi.github.io/Lottergy/v1/<game>.json`.

## Key invariants

- Pages source MUST be "GitHub Actions" in repo Settings → Pages. Branch-based source will break the URL contract.
- scrape.yml uses `--frozen-lockfile` — never let CI mutate `pnpm-lock.yaml`. Local agents update the lock, CI verifies.
- Pages workflow ONLY triggers on `data/**` paths (plus workflow itself). Don't add other paths or it'll deploy on every README typo.
- Era tables live in `scripts/scraper/<game>.ts`, not in the workflow. Matrix changes are a code edit, not a CI tweak.
- Action emails on 2 consecutive failures (GitHub default) — do not customize.
