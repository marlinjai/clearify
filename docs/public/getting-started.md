---
title: Getting Started
description: How to set up Clearify in your project
order: 1
summary: Getting started guide for Clearify, covering installation, creating your first docs folder, and running the dev server.
category: documentation
tags: [clearify, getting-started, setup, quickstart]
projects: [clearify]
status: active
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
- `docs/public/index.md` — your home page
- `docs/public/getting-started.md` — a starter guide
- `docs/internal/index.md` — internal docs section (use `--no-internal` to skip)
- `clearify.config.ts` — project configuration with sections
- `CHANGELOG.md` — a Keep a Changelog formatted changelog
- `ROADMAP.md` — a roadmap with Planned / In Progress / Completed sections

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
category: documentation
tags: [guide, setup]
projects: [my-project]
status: active
date: 2026-03-01
---
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | `string` | Filename | Page title shown in sidebar and browser tab |
| `description` | `string` | — | Meta description for SEO and search |
| `order` | `number` | — | Sort position in sidebar (lower = higher) |
| `icon` | `string` | — | Emoji or icon shown next to the page in navigation |
| `summary` | `string` | — | Short summary for search results and card previews |
| `category` | `string` | — | One of: `documentation`, `internal`, `plan`, `research`, `decision`, `roadmap`, `changelog` |
| `tags` | `string[]` | — | Tags for categorization and search filtering |
| `projects` | `string[]` | — | Related project names (useful in multi-project setups) |
| `status` | `string` | — | Document status: `active`, `superseded`, or `archived` |
| `date` | `string` | — | Document date in ISO format (e.g. `2026-03-01`) |

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
| `sections` | — | Array of `{ label, docsDir, basePath?, draft? }` for multi-section |
| `outDir` | `./docs-dist` | Build output path |
| `exclude` | `[]` | Glob patterns to exclude from navigation |
| `theme.primaryColor` | `#3B82F6` | Accent color |
| `theme.mode` | `auto` | `light`, `dark`, or `auto` |

## Building for production

```bash
pnpm exec clearify build
```

Outputs a static site to `docs-dist/` with a `sitemap.xml`. Deploy anywhere that serves static files.
