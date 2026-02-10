# Clearify — Design Document

An open-source, self-hostable documentation site generator. Install it as a package, point it at your markdown files, and get a beautiful docs site.

## Goals

- **Zero-config start** — `npm install @marlinjai/clearify`, drop a `docs/` folder, run `npx clearify dev`
- **Full control when needed** — optional `clearify.config.ts` for branding, nav overrides, theming
- **In-sync with your code** — docs live in your repo, rebuild on every push
- **Free and open source** — no managed hosting, no vendor lock-in
- **Single package, clean boundaries** — ships as one `clearify` package, structured internally for future splitting

## Tech Stack

- **Vite** — dev server + build tool
- **React** — rendering framework
- **MDX** — markdown with JSX component support
- **Shiki** — syntax highlighting (VS Code TextMate grammars)
- **FlexSearch** — client-side full-text search
- **TailwindCSS** — theme styling

## Package Structure

```
clearify/
├── src/
│   ├── cli/              # CLI entry point (dev, build, init commands)
│   ├── core/             # Markdown/MDX processing, config resolution, nav generation
│   ├── theme/            # Default React components (layout, sidebar, search, code blocks)
│   ├── vite-plugin/      # Vite plugin that wires it all together
│   └── types/            # Shared TypeScript types
├── template/             # Scaffolding template for `clearify init`
├── bin/
│   └── clearify.js       # CLI binary entry
├── package.json
└── tsconfig.json
```

**Internal module boundaries are designed for future extraction** into `@clearify/cli`, `@clearify/core`, `@clearify/theme`, etc. — but we ship as one package until real usage patterns emerge.

## User's Project Layout

```
my-project/
├── docs/
│   ├── index.md
│   ├── getting-started.md
│   ├── guides/
│   │   ├── index.md
│   │   ├── installation.md
│   │   └── configuration.md
│   └── api/
│       └── overview.md
├── clearify.config.ts      # Optional
├── package.json
└── src/
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx clearify init` | Scaffolds a `docs/` folder + optional config file |
| `npx clearify dev` | Starts dev server with hot reload |
| `npx clearify build` | Outputs static site to `docs-dist/` |

## Configuration System

### `clearify.config.ts`

Fully optional. Without it, Clearify auto-discovers `docs/` and generates everything with sensible defaults.

```typescript
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  // Branding
  name: 'My Project',
  logo: {
    light: './assets/logo-light.svg',
    dark: './assets/logo-dark.svg',
  },

  // Theme
  theme: {
    primaryColor: '#3B82F6',
    mode: 'auto',           // 'light' | 'dark' | 'auto'
  },

  // Docs source (default: './docs')
  docsDir: './docs',

  // Output (default: './docs-dist')
  outDir: './docs-dist',

  // Navigation override — if omitted, derived from folder structure
  navigation: [
    { label: 'Getting Started', path: '/getting-started' },
    {
      label: 'Guides',
      children: [
        { label: 'Installation', path: '/guides/installation' },
        { label: 'Configuration', path: '/guides/configuration' },
      ],
    },
  ],

  // Footer links, social icons, etc.
  links: {
    github: 'https://github.com/marlinjai/my-project',
  },
});
```

### Config Resolution Order

1. Sensible defaults (dark/light auto, `docs/` dir, folder-based nav)
2. `clearify.config.ts` overrides
3. Frontmatter in individual `.md` files overrides page-level settings

### Frontmatter

```markdown
---
title: Installation Guide
description: How to install the thing
icon: download
order: 2
---
```

The `order` field controls sort order within a folder without needing a full nav config override.

## Core Engine

### Markdown Pipeline

```
.md/.mdx file
  → frontmatter extraction (gray-matter)
  → MDX compilation (mdx-js)
  → syntax highlighting (shiki)
  → React component tree
  → rendered page
```

Shiki over Prism: uses VS Code TextMate grammars — more languages, more accurate highlighting, line highlighting and diff views out of the box.

### Auto-Navigation Generation

```
docs/
├── index.md              → /           (home page)
├── getting-started.md    → /getting-started
├── guides/
│   ├── index.md          → /guides     (section landing)
│   ├── installation.md   → /guides/installation
│   └── configuration.md  → /guides/configuration
└── api/
    ├── overview.md        → /api/overview
    └── endpoints.md       → /api/endpoints
```

**Rules:**
1. Folders become nav groups, folder name → Title Case label
2. `index.md` in a folder becomes that group's landing page
3. Within a group, pages sort by `order` frontmatter, then alphabetically
4. Files/folders prefixed with `_` are ignored (drafts)

### Client-Side Search

At build time, a FlexSearch index is generated from all page content. The search component loads this JSON index and provides instant full-text search. No external service required.

## Theme & Components

### Layout

```
┌─────────────────────────────────────────────┐
│  Header (logo, nav links, search, theme)    │
├──────────┬──────────────────┬───────────────┤
│          │                  │               │
│ Sidebar  │  Content area    │  On-this-page │
│ (nav)    │  (rendered md)   │  (TOC)        │
│          │                  │               │
├──────────┴──────────────────┴───────────────┤
│  Footer (links, copyright)                  │
└─────────────────────────────────────────────┘
```

### Built-in MDX Components

Auto-imported in all MDX files — no import statement needed:

- `<Callout type="info|warning|error|tip">` — styled admonition boxes
- `<CodeGroup>` — tabbed code blocks (multiple languages)
- `<Steps>` — numbered step-by-step instructions
- `<Card>` / `<CardGroup>` — linked cards for landing pages
- `<Tabs>` — generic tabbed content

### Styling

- TailwindCSS for theme internals
- CSS custom properties exposed for theming (`--clearify-primary`, `--clearify-bg`, etc.)
- Config `primaryColor` maps to custom properties automatically
- Users never need to touch CSS unless they want to
- Mobile: sidebar collapses to hamburger, TOC moves below content

## Vite Plugin

The `clearify` Vite plugin is the glue:

1. **Resolves config** — loads `clearify.config.ts`, merges with defaults
2. **Watches `docs/`** — triggers HMR on any markdown change
3. **Generates virtual modules** — navigation, search index, and config exposed as virtual imports:

```typescript
import { navigation } from 'virtual:clearify/navigation';
import { searchIndex } from 'virtual:clearify/search-index';
import { config } from 'virtual:clearify/config';
```

4. **Handles MDX transform** — intercepts `.md`/`.mdx` files, runs through the pipeline
5. **Injects auto-imports** — built-in components available without explicit imports

## Build Output

```
docs-dist/
├── index.html
├── getting-started/index.html
├── guides/installation/index.html
├── assets/
│   ├── style-[hash].css
│   └── app-[hash].js
└── search-index.json
```

Clean URLs, pre-rendered HTML for each page, single JS bundle for client-side navigation after initial load. Good SEO, fast first paint.
