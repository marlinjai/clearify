---
title: Getting Started
description: How to set up Clearify in your project
order: 1
summary: Getting started guide for Clearify, covering installation, creating your first docs folder, and running the dev server.
type: documentation
tags: [clearify, getting-started, setup, quickstart]
projects: [clearify]
---

# Getting Started

## Installation

Install Clearify as a dev dependency:

```bash
pnpm add -D @marlinjai/clearify
```

## Scaffold your project

The fastest way to get started:

```bash
pnpm exec clearify init
```

This creates:
- `docs/public/index.md`: your home page
- `docs/public/getting-started.md`: a starter guide
- `docs/internal/index.md`: internal docs section (use `--no-internal` to skip)
- `clearify.config.ts`: project configuration with sections
- `CHANGELOG.md`: a Keep a Changelog formatted changelog
- `ROADMAP.md`: a roadmap with Planned / In Progress / Completed sections

## Start the dev server

```bash
pnpm exec clearify dev
```

Open `http://localhost:4747` to see your docs. The server hot-reloads on every file change.

### Custom port

Override the port with `--port` or in your config:

```bash
pnpm exec clearify dev --port 9999
```

## Adding pages

Create `.md` or `.mdx` files in the `docs/public/` folder. Each file becomes a page. Subfolders become navigation groups.

```
docs/
├── public/                 # User-facing docs
│   ├── index.md            # Home page (/)
│   ├── getting-started.md  # /getting-started
│   └── guides/
│       ├── installation.md # /guides/installation
│       └── configuration.md
└── internal/               # Design docs, decisions (draft)
    └── index.md
```

## Frontmatter

Control page metadata with YAML frontmatter:

```yaml
---
title: My Page Title
description: A brief description for SEO and search
order: 1
icon: "📘"
summary: A short summary shown in search results and cards
type: documentation
tags: [guide, setup]
projects: [my-project]
date: 2026-03-01
---
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | `string` | Filename | Page title shown in sidebar and browser tab |
| `description` | `string` | - | Meta description for SEO and search |
| `order` | `number` | - | Sort position in sidebar (lower = higher) |
| `icon` | `string` | - | Emoji or icon shown next to the page in navigation |
| `summary` | `string` | - | Short summary for search results and card previews |
| `type` | `string` | Inferred from path | One of: `readme`, `documentation`, `plan`, `roadmap`, `changelog`, `handover` |
| `tags` | `string[]` | - | Tags for categorization and search filtering |
| `projects` | `string[]` | - | Related project names (useful in multi-project setups) |
| `status` | `string` | - | For `plan`: `draft`, `decided`, `in-progress`, `completed`, `archived`, `rejected`. For `documentation`: omit (published) or `draft` (admin-only). |
| `date` | `string` | - | Document date in ISO format (e.g. `2026-03-01`) |

## Configuration

Create a `clearify.config.ts` in your project root:

```typescript
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: 'My Project',
  sections: [
    { label: 'Docs', docsDir: './docs/public' },
    { label: 'Internal', docsDir: './docs/internal', basePath: '/internal', draft: true },
  ],
  theme: {
    primaryColor: '#3B82F6',
    mode: 'auto',
  },
});
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `name` | Auto-detected from `package.json` | Site name shown in header |
| `port` | `4747` | Dev server port |
| `docsDir` | `./docs` | Docs folder path (single-section mode) |
| `sections` | - | Array of `{ label, docsDir, basePath?, draft? }` for multi-section |
| `outDir` | `./docs-dist` | Build output path |
| `exclude` | `[]` | Glob patterns to exclude from navigation |
| `theme.primaryColor` | `#3B82F6` | Accent color |
| `theme.mode` | `auto` | `light`, `dark`, or `auto` |

## Building for production

```bash
pnpm exec clearify build
```

Outputs a static site to `docs-dist/` with a `sitemap.xml`. Deploy anywhere that serves static files.

## Hub onboarding

A 10-minute walkthrough for the Persona A happy path: solo dev, one sub-repo, joining an existing hub. If you own the hub itself, follow [Hub Model](./hub-model.md) for the architecture first, then come back.

### What you will end up with

Your sub-repo registered on the hub, a `Docs Trigger` workflow wired to fire on every push to `docs/**`, and `HUB_DISPATCH_TOKEN` provisioned so the dispatch call actually hits the hub. One doc push later, the hub rebuilds and your pages are live at the hub's URL.

### Step 1: install and scaffold with `--hub`

From your sub-repo root, install Clearify and run `init --hub`:

```bash
pnpm add -D @marlinjai/clearify
pnpm exec clearify init --hub
```

The CLI prompts for the hub repo as `owner/repo` (e.g. `marlinjai/ERP-suite`), writes `clearify.config.ts`, scaffolds `docs/public/`, and generates `.github/workflows/docs-trigger.yml` pointed at the hub you selected. It also appends a `HubProject` entry to the hub's `clearify.data.json` via the GitHub Contents API (requires `CLEARIFY_GITHUB_CLIENT_ID` exported, or pass `--hub-token <pat>`).

### Step 2: commit and push

```bash
git add clearify.config.ts docs/ .github/workflows/docs-trigger.yml
git commit -m "docs: join hub"
git push
```

The push fires `Docs Trigger`. Expect it to turn red on this first run: the secret is not provisioned yet, so the dispatch curl returns 401. That is normal. Fix it in Step 3.

### Step 3: provision the secret

`HUB_DISPATCH_TOKEN` is a GitHub Actions secret on your sub-repo. Three paths to write it, ordered by scale:

- Path 1: Manual (GitHub UI). Fastest for one repo.
- Path 2: CLI-assisted (planned, `clearify init --hub --auto-secret`).
- Path 3: Terraform (`github_actions_secret`). Best above 5 sub-repos.

Pick one and follow the instructions at [Hub Model: Provisioning HUB_DISPATCH_TOKEN](./hub-model.md#provisioning-hub_dispatch_token). For a solo dev onboarding one sub-repo today, Path 1 takes 2 minutes.

### Step 4: verify the dispatch fires

Make a trivial doc change and push:

```bash
echo "- test entry" >> docs/public/getting-started.md
git commit -am "docs: trigger hub rebuild"
git push
```

Open your sub-repo's Actions tab. `Docs Trigger` should go green within 30 seconds. Open the hub repo's Actions tab. A `Deploy Docs` run triggered by `repository_dispatch` should appear seconds later. When it finishes (3 to 5 minutes for a typical hub build), your page is live on the hub.

If anything fails, jump to [Hub Model: Troubleshooting](./hub-model.md#troubleshooting). The "Which provisioning path am I on?" subsection narrows the diagnosis fast.
