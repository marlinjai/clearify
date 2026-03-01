# Release Automation Strategy — Changelogs, Versioning & semantic-release

**Status:** Draft / Long-term roadmap
**Created:** 2026-03-01
**Context:** No release automation exists across any project. All 8 npm packages are manually versioned and published. Clearify already generates changelogs via a post-commit Claude Code hook. This plan defines how semantic-release fits into the ecosystem and how Clearify could become the orchestration layer.

---

## Current State

### Published npm packages (all `@marlinjai/` scope)

| Package | Version | Repo Structure | Publish method |
|---------|---------|---------------|----------------|
| `@marlinjai/clearify` | 1.8.0 | Standalone | Manual (`npm publish`) |
| `@marlinjai/brain-core` | 0.1.0 | Standalone | Manual |
| `@marlinjai/storage-brain-sdk` | 0.5.1 | Monorepo (`packages/sdk/`) | Manual (`publish:sdk` script) |
| `@marlinjai/data-brain-sdk` | 0.2.0 | Monorepo (`packages/sdk/`) | Manual (`publish:sdk` script) |
| `@marlinjai/data-table-core` | 0.2.0 | Monorepo (`packages/core/`) | Manual |
| `@marlinjai/data-table-react` | 0.2.0 | Monorepo (`packages/react/`) | Manual |
| `@marlinjai/email-editor-core` | 0.0.1 | Monorepo (`packages/core/`) | Manual |
| `@marlinjai/email-editor` | 0.0.1 | Monorepo (`packages/editor/`) | Manual |

### Commit conventions

| Project | Conventional Commits | Enforced |
|---------|---------------------|----------|
| Lola Stories | Yes | Yes (commitlint + husky) |
| ERP Suite | Informal | No |

### Existing changelog tooling

- Clearify scaffolds `CHANGELOG.md` on `clearify init`
- A Claude Code post-commit hook updates `CHANGELOG.md` with `[Unreleased]` entries
- Format follows [Keep a Changelog](https://keepachangelog.com)
- No automated version bumps or npm publish

---

## Decision: semantic-release

**Why semantic-release over standard-version:**

- Multiple npm packages need coordinated but independent releases
- Monorepo projects (Storage Brain, Data Brain, Data Table, Email Editor) need per-package versioning
- Full automation eliminates human error — commit → CI → npm publish → GitHub release
- Scales with the ecosystem as more packages are added
- Conventional commits are already partially adopted

**When semantic-release is overkill:**

- Apps that aren't published (Receipt OCR, Framer Clone, Lumitra Cloud/Self-Hosted) don't need it
- Very early packages (Email Editor at 0.0.1) may not need automated releases yet

---

## Architecture Decision: Per-Repo vs Clearify-Orchestrated

### Option A: Per-repo semantic-release (standard approach)

Each publishable repo/package gets its own `.releaserc` config and CI pipeline.

```
brain-core/
├── .releaserc.json
├── .github/workflows/release.yml

storage-brain/
├── packages/sdk/.releaserc.json
├── .github/workflows/release.yml
```

**Pros:** Standard, well-documented, each project is self-contained
**Cons:** Config duplication across 8+ packages, no centralized view of releases

### Option B: Clearify as release orchestrator (long-term vision)

Clearify already scans projects via `hub.scan`. It could also:
- Read `release` config from `clearify.config.ts`
- Generate `.releaserc` configs for each project
- Provide `clearify release` as a unified CLI
- Aggregate changelogs across the entire hub into a unified release feed
- Tie into the infrastructure awareness plan (Phase 2 deployment status)

```ts
// clearify.config.ts
export default {
  name: 'Brain Core',
  release: {
    npm: true,
    channel: 'latest',
    branches: ['main'],
  },
} satisfies Partial<ClearifyConfig>;
```

**Pros:** Single source of truth, centralized dashboard, synergy with existing hub features
**Cons:** Custom tooling to build and maintain, deviation from standard semantic-release patterns

### Recommendation: Start with A, evolve toward B

Phase 1 sets up standard semantic-release per-repo. Phase 2 adds Clearify as an aggregation and visibility layer. Phase 3 lets Clearify generate and manage the configs.

---

## Phase 1: Foundation — Conventional Commits & semantic-release

**Goal:** Every publishable package gets automated releases via CI.

### Step 1.1: Enforce conventional commits across ERP Suite

Currently only Lola Stories enforces this. ERP Suite needs it too.

**Root-level setup in ERP Suite:**
- Add `commitlint` + `@commitlint/config-conventional`
- Add `husky` for pre-commit hooks
- Document commit format in `CONTRIBUTING.md`

**Commit format reminder:**
```
feat(brain-core): add rate limiting middleware
fix(storage-brain-sdk): correct upload timeout handling
chore(clearify): update Vite to v6
```

The scope in parentheses matters for monorepo filtering — semantic-release uses it to determine which package a commit affects.

### Step 1.2: semantic-release for standalone packages

Start with the simplest cases — packages that aren't in monorepos:

**Clearify** (`@marlinjai/clearify`):
```json
// .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    "@semantic-release/npm",
    "@semantic-release/github",
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}"
    }]
  ]
}
```

**Brain Core** (`@marlinjai/brain-core`): Same pattern.

**GitHub Actions workflow:**
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Step 1.3: semantic-release for monorepos

Monorepos need `semantic-release-monorepo` or `multi-semantic-release` to handle per-package releases.

**Recommended tool:** `multi-semantic-release` — runs semantic-release for each package in a workspace, respects inter-package dependencies.

**Storage Brain example:**
```
storage-brain/
├── packages/
│   ├── api/           ← private, no release
│   ├── sdk/           ← published, gets semantic-release
│   └── shared/        ← private, no release
├── .releaserc.json    ← root config
├── .github/workflows/release.yml
```

**Root `.releaserc.json`:**
```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    "@semantic-release/npm",
    "@semantic-release/github",
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}"
    }]
  ]
}
```

Only packages without `"private": true` get published. The monorepo roots (which are private) are skipped automatically.

**Applies to:**
- Storage Brain (sdk only)
- Data Brain (sdk only)
- Data Table (core + react)
- Email Editor (core + editor) — when ready

### Step 1.4: Changelog reconciliation

**Current state:** Clearify's Claude Code hook writes `[Unreleased]` entries to `CHANGELOG.md` in Keep a Changelog format.

**Conflict:** semantic-release's `@semantic-release/changelog` plugin also generates `CHANGELOG.md` from commits.

**Resolution options:**

1. **Let semantic-release own CHANGELOG.md** — Remove the Claude Code hook's changelog writing. semantic-release generates it on release. Simpler, no conflicts.

2. **Two-file approach** — Claude Code hook writes to `CHANGELOG-unreleased.md` (human-friendly, detailed). semantic-release writes to `CHANGELOG.md` (automated, from commits). On release, unreleased file gets cleared.

3. **Hook feeds into commits** — The Claude Code hook ensures commit messages are well-structured conventional commits, rather than writing the changelog directly. semantic-release then generates the changelog from those commits.

**Recommendation:** Option 3. The Claude Code hook's value is ensuring commits are descriptive — let semantic-release handle the changelog artifact. This aligns with the "conventional commits are the foundation" principle.

---

## Phase 2: Clearify as Release Visibility Layer

**Goal:** Clearify aggregates release information across all hub projects.

### Step 2.1: Release feed in hub dashboard

The hub already shows projects with status badges. Add a releases tab/section showing:
- Latest version of each package
- Release date
- Link to changelog / GitHub release
- Version diff since last visit

**Data source:** npm registry API (`https://registry.npmjs.org/@marlinjai/<pkg>/latest`) or GitHub releases API.

### Step 2.2: `clearify releases` CLI command

```
$ clearify releases

Package                           Version   Released
@marlinjai/clearify               1.9.0     2 days ago
@marlinjai/brain-core             0.2.0     1 week ago
@marlinjai/storage-brain-sdk      0.6.0     3 days ago
@marlinjai/data-brain-sdk         0.3.0     5 days ago
@marlinjai/data-table-core        0.3.0     1 week ago
@marlinjai/data-table-react       0.3.0     1 week ago
```

### Step 2.3: Unified changelog page

Clearify hub gets a `/releases` page that merges changelogs from all scanned projects into a chronological feed. Think GitHub's organization activity feed but for your packages.

---

## Phase 3: Clearify-Managed Release Config (Future)

**Goal:** Clearify generates and maintains semantic-release configs from `clearify.config.ts`.

```ts
// clearify.config.ts
export default {
  name: 'Storage Brain SDK',
  release: {
    npm: true,
    branches: ['main'],
    changelog: true,
    github: true,
  },
} satisfies Partial<ClearifyConfig>;
```

**`clearify release init`** — Generates `.releaserc.json` and GitHub Actions workflow from the above config.

**`clearify release check`** — Validates that release configs are in sync with `clearify.config.ts`.

This phase only makes sense once the ecosystem has 10+ packages and config drift becomes a real problem. For now, manual `.releaserc` files are fine.

---

## Relationship to Other Plans

### Infrastructure Awareness (2026-03-01)
- Phase 2 deployment status + Phase 2 release visibility = full operational dashboard
- `clearify status` shows runtime health, `clearify releases` shows package versions
- Combined: "Is my deployed service running the latest published version?"

### Clearify Roadmap
- Fits into **v2.1 Power Features** or a dedicated **v2.2 Release Automation** milestone
- The hub already has the project scanning infrastructure needed
- Release feed is a natural extension of the hub dashboard

---

## Implementation Priority

| Priority | What | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Enforce conventional commits in ERP Suite (commitlint + husky) | Small | Foundation for everything else |
| **P1** | semantic-release for Clearify + Brain Core (standalone packages) | Medium | Proves the pattern, automates most-published packages |
| **P2** | multi-semantic-release for monorepos (Storage Brain, Data Brain, Data Table) | Medium | Covers all published packages |
| **P3** | Reconcile Clearify changelog hook with semantic-release | Small | Eliminates conflict |
| **P4** | `clearify releases` CLI + hub release feed | Medium | Visibility layer |
| **P5** | Clearify-managed release config generation | Large | Only when config drift is a problem |

## Open Questions

- Should all ERP Suite projects live in a single GitHub org with shared CI secrets, or stay as separate repos?
- Should the GitHub Actions workflow be a reusable workflow (`.github/workflows/reusable-release.yml`) to avoid duplication?
- How to handle the initial release — semantic-release expects to own versioning from the start. Existing versions (e.g., Clearify at 1.8.0) need the git tags to exist for semantic-release to pick up from the right point.
- Should apps (Receipt OCR, Lumitra Cloud) also use conventional commits even though they don't publish to npm? Consistency says yes, but there's no automation benefit.

## Dependencies

- `NPM_TOKEN` secret needed in each GitHub repo (or org-level secret)
- `GITHUB_TOKEN` is automatic in GitHub Actions
- npm 2FA must be configured for automation (publish tokens with `--auth-type=legacy`)

## References

- [semantic-release docs](https://semantic-release.gitbook.io/)
- [multi-semantic-release](https://github.com/dhoulb/multi-semantic-release)
- [Conventional Commits spec](https://www.conventionalcommits.org/)
- [commitlint](https://commitlint.js.org/)
- Infrastructure Awareness plan: `docs/plans/2026-03-01-infrastructure-awareness-vision.md`
