---
title: Hub Evolution — Self-Registration & Sparse Sync
type: plan
status: completed
date: 2026-04-07
summary: Replace manual hub wiring with a clearify init command that self-registers projects via GitHub OAuth. Hub-only docs model, sparse checkout by default, no standalone per-project sites.
tags: [clearify, hub, init, github-oauth, sparse-checkout, dx]
---

# Hub Evolution — Self-Registration & Sparse Sync

> Phase B wrapped 2026-04-19: CLI-assisted provisioning shipped end-to-end (see [2026-04-18-hub-provisioning-paths.md](./2026-04-18-hub-provisioning-paths.md) for the superseding plan).

## Context

The hub at `docs.lumitra.co` aggregates documentation from all Lumitra and Lola Stories
projects. Currently, adding a project requires three manual steps across two repos:
editing `clearify.data.json`, adding a `git clone` line to the hub CI workflow, and
setting up a PAT secret. The `hubProject` declaration in each project's
`clearify.config.ts` expresses intent but has no effect without these manual steps.
Two sources of truth, tight coupling between repos.

The goal is to make project registration a single CLI command with one browser
authentication step — and nothing else.

---

## Decisions Made — Do Not Re-Discuss

- **Hub-only model** — `docs.lumitra.co` is the single docs destination. No standalone
  per-project docs sites.
- **Retire standalone sites** — `storage-brain-docs`, `data-brain-docs`,
  `brain-core-docs` Cloudflare Pages projects get decommissioned.
- **No persistent webhook service** — Mintlify-style real-time sync requires a hosted
  service. Out of scope. Dispatch-based rebuild is sufficient.
- **Sparse checkout as default** — hub never clones full repos. Always fetches only
  `docs/public/` via `git sparse-checkout`.
- **`clearify init` is the primary feature** — onboarding must be one command,
  one browser OAuth step, zero manual steps after.

---

## Target Architecture

### Hub model

Every project:
- Has a `docs/public/` folder (source of truth for its docs)
- Has no standalone docs deployment
- Registers via `clearify init`
- Triggers hub rebuild on every push via `repository_dispatch`

The hub:
- Clones only `docs/public/` from each registered project (sparse checkout)
- Deploys once to `docs.lumitra.co`
- Rebuilds automatically whenever any registered project dispatches

### `clearify init` flow

```
clearify init
  → "Does this project belong to a hub?" [Y/n]
  → Opens browser — GitHub OAuth device flow (repo scope)
  → Lists hubs the authenticated user owns
  → User selects hub (e.g. "ERP Suite — docs.lumitra.co")
  → Automatically:
      1. Commits entry to hub's clearify.data.json via GitHub API
         (mode: embed, git: { repo, ref: main, path: docs/public })
      2. Generates clearify.config.ts with hubProject block
      3. Generates .github/workflows/docs-trigger.yml with dispatch
      4. Creates HUB_DISPATCH_TOKEN Actions secret via Secrets API
  → Done.
```

---

## Implementation Tasks

### 1. `clearify init` — hub registration

**Extend:** `src/node/init.ts`
**Add:** `src/node/hub-register.ts`

- Hub registration prompt added to existing init flow
- GitHub OAuth via device flow (`POST /login/device/code`) — no redirect server needed
- GitHub API calls:
  - `GET /repos/{owner}/{repo}/contents/clearify.data.json` — read current registry
  - `PUT /repos/{owner}/{repo}/contents/clearify.data.json` — commit updated registry
  - `GET /repos/{owner}/{repo}/actions/secrets/public-key` — get encryption key
  - `PUT /repos/{owner}/{repo}/actions/secrets/HUB_DISPATCH_TOKEN` — store token
- Auto-generate `clearify.config.ts` and `.github/workflows/docs-trigger.yml`

### 2. Sparse checkout as default

**File:** `src/core/config.ts` — `scanHubProjects()`
**File:** `src/core/remote.ts` — `resolveRemoteSource()`

`RemoteGitSource.path` and `RemoteGitSource.sparse` already exist. Make sparse checkout
the default when `path` is set. Ensure all hub embed entries use `path: 'docs/public'`
unless overridden.

### 3. Migrate hub registry

**File:** `ERP-suite/clearify.data.json`

Remove `hub.scan`. Replace with explicit `hub.projects` entries — all `mode: embed`
with `git: { repo, ref: main, path: docs/public }`. Existing `link` entries for
projects with standalone sites migrate to `embed` as those sites are retired.

### 4. Simplify hub CI workflow

**File:** `ERP-suite/.github/workflows/deploy-docs.yml`

- Remove entire `git clone` block
- Add `repository_dispatch` trigger
- Clearify handles all cloning internally

### 5. Retire standalone docs sites

- Simplify `deploy-docs.yml` in storage-brain, data-brain, brain-core to dispatch-only
  (no `wrangler pages deploy` step)
- Delete Cloudflare Pages projects: `storage-brain-docs`, `data-brain-docs`,
  `brain-core-docs`

### 6. Infra docs trigger

**New file:** `/Users/marlinjai/software-dev/infra/.github/workflows/docs-trigger.yml`

On push to main (paths: `docs/**`, `clearify.config.ts`): fire `repository_dispatch`
to ERP-suite. No build, no deploy — hub handles it.

---

## Key Files

| File | Purpose |
|---|---|
| `src/node/init.ts` | Existing init command — extend with hub flow |
| `src/node/hub-register.ts` | New — GitHub OAuth + API calls |
| `src/core/remote.ts` | Sparse checkout, SHA caching, clone logic |
| `src/core/config.ts` | `scanHubProjects()`, embed/link/inject modes |
| `src/types/index.ts` | `RemoteGitSource`, `HubProject`, `ClearifyConfig` |
| `src/cli/index.ts` | CLI entry — how commands are registered |
| `ERP-suite/clearify.data.json` | Hub registry — gets migrated |
| `ERP-suite/.github/workflows/deploy-docs.yml` | Hub CI — gets simplified |
| `ERP-suite/projects/lumitra-infra/storage-brain/.github/workflows/deploy-docs.yml` | Example to simplify |

---

## What NOT to Build

- Persistent webhook service — requires hosted infrastructure, out of scope
- GitHub App — over-engineered for single-owner, OAuth device flow is sufficient
- Per-project standalone docs deployments — the point is to eliminate these
- Real-time incremental sync — dispatch-based rebuild is sufficient

---

## Definition of Done

- [ ] `clearify init` in a new repo wires everything in under 60 seconds, one browser auth
- [ ] Hub `deploy-docs.yml` has zero `git clone` commands
- [ ] `clearify.data.json` is the single registry, `hub.scan` removed
- [ ] Pushing a doc change to `infra` triggers hub rebuild and appears on `docs.lumitra.co`
- [ ] `storage-brain-docs`, `data-brain-docs`, `brain-core-docs` Pages projects decommissioned
- [ ] All embed entries use sparse checkout — only `docs/public/` cloned
