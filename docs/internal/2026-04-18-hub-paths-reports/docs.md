# Clearify Hub Documentation Architecture

Author: docs agent. Parallel with engineering and product agents. For synthesis into the master plan.

## 1. Current state audit

### README.md (82 lines)

Zero hub mentions. No link to hub-model.md, no `init --hub`, no `HUB_DISPATCH_TOKEN`. A reader landing on GitHub has no way to discover that Clearify does multi-repo aggregation at all.

Edits: lines 5-18 (Features) add hub bullets. After line 39 insert a "Hub mode" paragraph linking to hub-model.md. Lines 66-72 (CLI table) add `init --hub`. Lines 74-78 (Links) add hub entry.

### docs/public/installation.md (36 lines)

Zero hub mentions. Covers Node version and package managers only. A zero-context reader installs Clearify here and is stranded on what else they need (PAT, OAuth App, Terraform).

Edits: lines 13-17 (Requirements) stay as baseline. After line 36 add "Prerequisites for Hub Mode" with a table split by path. Net add: +60 lines.

### docs/public/getting-started.md (139 lines)

Zero hub mentions. `--hub` flag is never referenced. Scaffolded files list (lines 29-35) does not mention `docs-trigger.yml`. No happy path exists for the "I own a sub-repo and want to join a hub" persona.

Edits: lines 12-51 stay (single-project flow). After line 51 add "Hub onboarding" 10-minute walkthrough. Lines 87-99 (Frontmatter table) fix line 94: `category` is legacy, rename to `type`. Line 97 status values don't match the document-lifecycle standard; align them. Net add: +50 in walkthrough, +2 in frontmatter table edits.

### docs/public/hub-model.md (332 lines)

The primary reference. Strong on architecture (modes, sparse, dispatch). Weak on onboarding UX, especially provisioning. Manual path is absent. CLI-assisted path is described but marked as "delegated to Terraform" without flagging that a CLI secret flow was designed and will return. No rotation section. No "which path am I on?" pointer in troubleshooting.

Edits: lines 12-115 (What a hub is through Sparse checkout) keep. Lines 116-191 (Dispatch pipeline) keep. Lines 199-234 (`clearify init --hub`) rewrite to split scaffolding (always) from secret provisioning (flag-gated). Lines 236-285 (Terraform) rewrite as Path 3 of 3, keeping the HCL example. Lines 287-327 (Troubleshooting) keep; add "Which provisioning path am I on?" subsection at the top. Add a new Rotation section before Troubleshooting. Net delta: -40 rewritten, +180 new.

### docs/public/configuration.md (429 lines)

Thorough config reference. Covers `HubConfig`, `HubProject`, manual vs scan, link/embed/inject, backlink, components. Does its job as a reference page, not an entry point.

Edits: line 46 (`hub` row) add an explicit link to hub-model.md for onboarding. Line 204 (Hub Mode section heading) add a 1-line pointer: "For onboarding, see hub-model.md. This section is the config reference." Net delta: +5 lines.

---

## 2. Target information architecture

```
README.md (entry point, GitHub-facing)
  ├── What Clearify is (2-3 lines, kept)
  ├── Quick Start (single-project, kept)
  ├── Hub mode (NEW, 1 paragraph, 3 sentences, link to hub-model.md)
  ├── Features (expanded with hub bullets)
  ├── CLI Commands (expanded with init --hub and planned hub subcommands)
  └── Links (+hub mode link)

docs/public/installation.md (baseline requirements, scan-first)
  ├── Requirements (kept)
  ├── Package Managers (kept)
  └── NEW: Prerequisites for hub mode
      ├── Always need: GitHub account, PAT with repo scope on the hub repo
      ├── For CLI-assisted path: OAuth App + CLEARIFY_GITHUB_CLIENT_ID
      └── For Terraform path: Terraform + a secret manager
  (approx 95 lines total)

docs/public/getting-started.md (happy-path walkthroughs)
  ├── Installation (kept)
  ├── Scaffold your project (kept)
  ├── Start the dev server (kept)
  ├── Adding pages (kept)
  ├── Frontmatter (kept, fix category -> type)
  ├── Configuration (kept)
  ├── Building for production (kept)
  └── NEW: Hub onboarding (10-minute walkthrough)
      ├── What you will end up with (1 paragraph)
      ├── Step 1: install and scaffold with --hub
      ├── Step 2: commit and push
      ├── Step 3: provision the secret (link out to hub-model.md for the three paths)
      └── Step 4: verify the dispatch fires
  (approx 200 lines total)

docs/public/hub-model.md (architectural reference + deep provisioning)
  ├── What a hub is, three project modes, sparse checkout, dispatch pipeline (all kept)
  ├── REWRITE: Provisioning HUB_DISPATCH_TOKEN
  │   ├── Decision tree
  │   ├── Path 1: Manual (GitHub UI)
  │   ├── Path 2: CLI-assisted (clearify init --hub --auto-secret)
  │   └── Path 3: Terraform (github_actions_secret)
  ├── REWRITE: clearify init --hub (scaffolding always, secret provisioning flag-gated)
  ├── NEW: Rotation (general flow, per-path, why Terraform rotation is atomic)
  └── Troubleshooting
      ├── NEW: Which provisioning path am I on?
      └── Existing subsections (all kept)
  (approx 500 lines total, up from 332)

docs/public/configuration.md (kept, add pointer to hub-model.md)
  └── Hub Mode section: 1-line "see hub-model.md for onboarding"
```

Audience, length, cross-links:

| Node | Audience | Lines | Links out to |
|------|----------|-------|--------------|
| README hub paragraph | GitHub browser, zero context | 4 | hub-model.md |
| installation.md hub prereqs | Developer post-install | 60 | hub-model.md, getting-started.md |
| getting-started.md hub onboarding | Sub-repo owner onboarding | 50 | hub-model.md |
| hub-model.md three-paths | Reader provisioning the secret | 180 | configuration.md, installation.md |
| hub-model.md rotation | Operator maintaining a hub | 40 | (internal anchors) |
| configuration.md hub reference | Developer tuning fields | kept | hub-model.md |

---

## 3. Doc rewrite task list

Ordered, PR-ready.

| # | File | Change | Est line delta | Depends on |
|---|------|--------|----------------|------------|
| 1 | README.md | Add Hub mode paragraph, update Features, update CLI Commands table | +15 | none |
| 2 | installation.md | Add Prerequisites for Hub Mode section | +60 | none |
| 3 | hub-model.md | Rewrite Provisioning section as three paths with decision tree | +120, -50 | engineering agent's CLI spec (for Path 2 wording) |
| 4 | hub-model.md | Rewrite clearify init --hub section (scaffolding vs secret-provisioning split) | +30, -20 | CLI implementation decision (flag name, default behavior) |
| 5 | hub-model.md | Add Rotation section | +40 | none |
| 6 | hub-model.md | Add "Which provisioning path am I on?" troubleshooting subsection | +20 | none |
| 7 | getting-started.md | Add Hub onboarding walkthrough | +50 | #3 and #4 must be drafted first so the walkthrough can link to stable anchors |
| 8 | getting-started.md | Fix frontmatter table (category -> type, align status values) | +2, -3 | document-lifecycle standard |
| 9 | configuration.md | Add pointer to hub-model.md from Hub Mode section | +5 | none |

Sequence: 1 and 2 in parallel. 3, 4, 5, 6 in one PR (all hub-model.md). 7 after 3-6 are merged. 8 and 9 as cleanup PRs.

---

## 4. README redesign (full draft)

```markdown
# Clearify

An open-source documentation site generator. Turn markdown into beautiful docs. Run one site per project, or aggregate many repos into a single hub.

## Quick Start

\`\`\`bash
pnpm add -D @marlinjai/clearify
pnpm exec clearify init
pnpm exec clearify dev
\`\`\`

Your docs are live at `http://localhost:4747`.

## Hub mode

Hub mode aggregates docs from many repos into one site. Each sub-repo owns its `docs/public/` folder. The hub clones only the docs from each registered repo, assembles them, and deploys once. To add a project to an existing hub, run `clearify init --hub`. See [Hub Model](./docs/public/hub-model.md) for the full onboarding walkthrough and provisioning paths.

## Features

- Zero config: drop markdown in `docs/public/` and go
- MDX support (Callout, Tabs, Steps, Cards, CodeGroup, Accordion, Badge, Tooltip, Columns, Frame)
- Mermaid diagrams (client or build-time via Puppeteer)
- Built-in full-text search
- Dark mode, syntax highlighting (Shiki, dual themes)
- SSG and SEO: pre-rendered HTML, Open Graph, Twitter Cards, JSON-LD, sitemap, robots.txt
- OpenAPI API Reference: custom renderer with code examples and schema viewer
- Multi-section support (pill-based section switcher)
- Hub mode: aggregate many repos into one site with sparse checkout and dispatch-triggered rebuilds
- Auto changelog, README as landing page

## Configuration

Customize with `clearify.config.ts`:

\`\`\`typescript
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: 'My Project',
  sections: [
    { label: 'Docs', docsDir: './docs/public' },
    { label: 'Internal', docsDir: './docs/internal', basePath: '/internal', draft: true },
  ],
  theme: { primaryColor: '#3B82F6', mode: 'auto' },
  openapi: { spec: './docs/openapi.json' },
});
\`\`\`

## CLI Commands

| Command | Description |
|---------|-------------|
| `clearify dev` | Start Vite-powered dev server with HMR |
| `clearify build` | Build static documentation site |
| `clearify init` | Scaffold a docs folder (use `--no-internal` to skip internal section) |
| `clearify init --hub` | Scaffold and register the project with an existing hub (prompts for hub owner/repo) |
| `clearify check` | Check for broken internal links |
| `clearify openapi:generate` | Generate OpenAPI spec from a NestJS app |

## Requirements

- Node.js 22 or later
- npm, pnpm, or yarn
- For hub onboarding: a GitHub account and (for CLI-assisted secret provisioning) a GitHub OAuth App. See [Installation](./docs/public/installation.md) for prerequisites per path.

## Links

- [Documentation](https://docs.lumitra.co/clearify)
- [Hub Model](./docs/public/hub-model.md)
- [GitHub](https://github.com/marlinjai/clearify)
- [Changelog](./CHANGELOG.md)

## License

[MIT](./LICENSE)
```

Line count: 102. Under the 120 target.

---

## 5. Installation page redesign (full draft)

```markdown
---
title: Installation
description: Installation guide and prerequisites per usage mode
order: 3
summary: Installation guide for Clearify covering system requirements, package manager options, and prerequisites for hub mode onboarding.
type: documentation
tags: [clearify, installation, setup, npm, hub]
projects: [clearify]
---

# Installation

## Requirements

- Node.js 22 or later
- npm, pnpm, or yarn

## Package Managers

### pnpm (recommended)

\`\`\`bash
pnpm add -D @marlinjai/clearify
\`\`\`

### npm

\`\`\`bash
npm install @marlinjai/clearify --save-dev
\`\`\`

### yarn

\`\`\`bash
yarn add -D @marlinjai/clearify
\`\`\`

## Prerequisites for Hub Mode

Hub mode aggregates docs from many repos into one site. Onboarding a sub-repo requires one secret, `HUB_DISPATCH_TOKEN`, a GitHub Actions secret on the sub-repo. Three paths to provision it (see [Hub Model](./hub-model.md) for the decision tree).

**Always need:** a GitHub account with access to both repos, and a PAT with `Contents: Write` on the hub repo (classic `repo` scope also works). This PAT is the `HUB_DISPATCH_TOKEN` value.

**Path-specific:**

| Path | Extra prerequisites |
|------|---------------------|
| Manual (GitHub UI) | None. Good for one-off onboarding. |
| CLI-assisted (`clearify init --hub --auto-secret`, planned) | A GitHub OAuth App with `repo` scope. Export `CLEARIFY_GITHUB_CLIENT_ID`. |
| Terraform (`github_actions_secret`) | Terraform 1.6+, `integrations/github` provider, secret manager (Infisical, Vault, etc) for the raw PAT. |

Next: follow the [Hub onboarding walkthrough](./getting-started.md#hub-onboarding).
```

---

## 6. Hub-model.md major edits

**Stay unchanged:** lines 12-19, 21-87, 89-114, 116-191, 287-327.

**Line 197 edit:** change "Distribution is handled by Terraform..." to "There are three paths to get this secret onto every sub-repo. See below."

**Replace lines 199-285** with the new Provisioning + Rotation sections below.

### NEW section: Provisioning HUB_DISPATCH_TOKEN

```markdown
## Provisioning HUB_DISPATCH_TOKEN

This secret is the one thing that has to be on every sub-repo for hub mode to work. There are three paths to get it there. They trade automation for setup cost. Pick the one that matches where you are.

### Decision tree

\`\`\`
Starting a new hub, one or two sub-repos?
  -> Path 1: Manual. Click through GitHub UI. Move on.

Onboarding a handful of sub-repos, comfortable with a CLI?
  -> Path 2: CLI-assisted. Run clearify init --hub --auto-secret.

Operating a hub with 5+ sub-repos, care about rotation?
  -> Path 3: Terraform. Declare the repos, apply once, rotate in one place.
\`\`\`

You can mix paths. Start with Manual on repo 1, graduate to Terraform when you have 5. The secret itself is identical: a PAT with `Contents: Write` on the hub repo. What differs is who writes it onto each sub-repo.

### Path 1: Manual (GitHub UI)

Lowest-ceremony path. For one-off onboarding.

1. Create a fine-grained PAT at https://github.com/settings/personal-access-tokens/new. Scope: `Contents: Read and write` on the hub repo only. Expiration: 90 days.
2. Copy the token to your secret manager (you reuse it for every sub-repo and for rotation).
3. In the sub-repo, Settings: Secrets and variables: Actions: New repository secret. Name `HUB_DISPATCH_TOKEN`, value the PAT.
4. Push a doc change. Confirm `Docs Trigger` runs green.

Stop using this path when you have added the same PAT to 3+ repos by hand. Switch to Path 3.

### Path 2: CLI-assisted (`clearify init --hub --auto-secret`)

Status: planned. The CLI currently scaffolds config and workflow files but does not write the Actions secret. The `--auto-secret` flag will restore secret provisioning via the GitHub Secrets API after OAuth device flow.

Prerequisites (see [Installation](./installation.md#prerequisites-for-hub-mode)): a GitHub OAuth App with `repo` scope, `CLEARIFY_GITHUB_CLIENT_ID` exported.

\`\`\`bash
export CLEARIFY_GITHUB_CLIENT_ID=Iv1.abc123
pnpm exec clearify init --hub --auto-secret
\`\`\`

The CLI prompts for the hub repo, opens a browser for device flow, then appends a `HubProject` entry to the hub's `clearify.data.json`, writes local `clearify.config.ts` and `.github/workflows/docs-trigger.yml`, and `PUT`s `HUB_DISPATCH_TOKEN` on the sub-repo via the Secrets API.

Without `--auto-secret`, `clearify init --hub` does everything except the secret. Finish with Path 1 or Path 3.

Stop using this path when you operate a hub with 5+ sub-repos and need atomic rotation. Switch to Path 3.

### Path 3: Terraform (`github_actions_secret`)

Recommended for 5+ sub-repos or any operator who cares about rotation correctness. One Terraform deployment declares every sub-repo, one `terraform apply` writes the same secret value to all of them.

Example at `infra/deployments/hub-dispatch/github.tf`:

\`\`\`hcl
locals {
  hub_repos = toset(["analytics-platform", "brain-core", "clearify", "storage-brain"])
}

resource "github_actions_secret" "hub_dispatch_token" {
  for_each        = local.hub_repos
  repository      = each.value
  secret_name     = "HUB_DISPATCH_TOKEN"
  plaintext_value = var.hub_dispatch_token
}
\`\`\`

`var.hub_dispatch_token` comes from your secret manager (Infisical, Vault, etc).

Onboarding a new sub-repo:

1. Run `clearify init --hub` (no `--auto-secret`) in the new project. Config and workflow written.
2. Add the new repo name to `local.hub_repos` in the Terraform file.
3. Apply:
   \`\`\`bash
   cd infra/deployments/hub-dispatch
   terraform apply
   \`\`\`
4. The new repo now has `HUB_DISPATCH_TOKEN`. Dispatch will fire on the next doc push.

Commit the Terraform change in the same PR as the sub-repo's config, so the pipeline turns on and the infra is in sync in one reviewable unit.
```

### NEW section: Rotation (full draft)

```markdown
## Rotation

The PAT in `HUB_DISPATCH_TOKEN` is long-lived write access to the hub repo. Treat it like any production secret: rotate every 90 days, and immediately if a sub-repo is archived, transferred, or forked to an untrusted party.

### General flow

1. Create a new PAT with the same permissions (`Contents: Write` on the hub repo).
2. Update it everywhere (see per-path instructions).
3. Verify: push a doc change on one sub-repo, confirm the hub's `Deploy Docs` run fires.
4. Revoke the old PAT at https://github.com/settings/personal-access-tokens.

### Per-path rotation

- **Path 1 (Manual):** update the secret on each sub-repo by hand. Painful above 2 repos. Migrate to Path 3 before your first rotation.
- **Path 2 (CLI-assisted):** run `clearify hub rotate` (planned) against each sub-repo. Writes a new value via the Secrets API. Faster than Path 1, still per-repo.
- **Path 3 (Terraform):** update the PAT value in your secret manager, run `terraform apply` in `infra/deployments/hub-dispatch`. Every sub-repo in `local.hub_repos` gets the new value atomically.

This is the core reason Path 3 exists. A 10-repo hub goes from a 20-minute manual rotation to a 30-second apply.
```

### NEW subsection under Troubleshooting

Insert before existing "My docs don't appear on the hub" subsection at line 289.

```markdown
### Which provisioning path am I on?

Before debugging the dispatch, identify how the secret got onto the sub-repo. Different paths fail differently.

- Check `infra/deployments/hub-dispatch/github.tf` (or wherever your Terraform lives). If the sub-repo is in `local.hub_repos`, you are on Path 3. Debug by running `terraform plan` and checking for drift.
- Check your shell history (or ask the person who onboarded the repo) for `clearify init --hub --auto-secret`. If it was used, you are on Path 2.
- Otherwise, you are on Path 1. The secret was clicked in by hand. Go to Settings: Secrets and variables: Actions on the sub-repo and confirm `HUB_DISPATCH_TOKEN` is listed.

Common mode of failure per path:
- Path 1: the operator forgot to add the secret after running `clearify init --hub`. Symptom: workflow runs, curl returns 401 silently (unless you have `--fail-with-body`).
- Path 2: OAuth token expired or the OAuth App lost `repo` scope. Symptom: re-running `clearify init --hub --auto-secret` errors on the secret-write step.
- Path 3: the repo name is missing from `local.hub_repos` or the apply was never run. Symptom: secret is simply absent.
```

---

## 7. Cross-linking and entry-points map

**Entry 1: `docs.lumitra.co` sidebar.** Lands on hub grid, clicks Clearify card, scans sidebar. Reads "Hub Model" (order: 5). Dead-end risk: clicks "Installation" first without seeing hub prereqs. Fixed by installation.md's new section.

**Entry 2: `clearify --help`.** Sees `init --hub` but no link to docs. Gap: `--help` output should include a 1-line pointer to hub-model.md (engineering-agent concern).

**Entry 3: GitHub README.** With rewrite, sees "Hub mode" section, follows link. Without rewrite, no hub mention anywhere, dead end.

**Entry 4: Search "how do I add a project to a Clearify hub".** Hits hub-model.md (good), getting-started.md (after walkthrough is added), configuration.md. Without the walkthrough, search dumps readers into the middle of hub-model.md's architecture sections before the provisioning story.

---

## 8. Voice and style consistency checklist

1. No em-dashes (U+2014) or en-dashes (U+2013). Use colons, parens, commas, periods.
2. Terminology: "sub-repo" (hyphenated) throughout. Reserve "project" for the broader concept.
3. Three-paths ordering always Manual, CLI-assisted, Terraform. Matches progressive complexity.
4. Code block languages always declared (```bash, ```typescript, ```hcl, ```yaml). No bare triple-backticks.
5. Planned vs shipped always called out. Say "planned" for unshipped flags, never present tense without a marker.
6. `HUB_DISPATCH_TOKEN` in backticks and uppercase in every reference.
7. Decision trees and choice tables pair "what X does" with "when to use X". Never just feature lists.
8. Anchor slugs stable. If docs link to `#prerequisites-for-hub-mode`, heading stays verbatim.
9. Frontmatter aligned to document-lifecycle standard: `type`, optional `status`, `tags`, `summary`. Remove legacy `category`.
10. Mermaid for architecture only, not trivial lists.
11. Tables over bullets when comparing 2+ dimensions.
12. No emoji in docs body. Keep status-badge emoji in config examples only.

---

## 9. Open questions for engineering and product agents

1. CLI surface: should hub operations be flags on `init` (`clearify init --hub --auto-secret`) or a subcommand tree (`clearify hub register`, `clearify hub rotate`, `clearify hub list`)? Docs structure is stable either way, but the command tables in README and hub-model.md need to match.
2. Should the hub-model page split into two (`hub-architecture.md` for modes/sparse/dispatch, `hub-onboarding.md` for the three provisioning paths)? Current draft keeps them together because they cross-reference heavily, but the file is approaching 500 lines post-rewrite.
3. For Path 2 (CLI-assisted), does the OAuth session produce a PAT the CLI can install directly, or does the user still paste an existing PAT? This changes the walkthrough meaningfully. The engineering agent's implementation plan determines this.
4. Is there a planned `clearify hub doctor` or `clearify hub status` command? If yes, the troubleshooting "Which provisioning path am I on?" subsection should reference it. If not, users are told to inspect Terraform and shell history manually.
5. Should the plans inventory (2026-04-18-plans-inventory.md) and the hub-evolution plan be archived or marked completed after the hub-register secret flow is restored? The docs changes above assume the CLI spec is stable.
