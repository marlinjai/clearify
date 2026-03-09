---
title: Clearify
description: An open-source documentation site generator
order: 0
summary: Landing page for Clearify documentation, an open-source site generator that turns markdown files into beautiful documentation sites with zero config.
category: documentation
tags: [clearify, index, documentation-generator]
projects: [clearify]
status: active
---

# Welcome to Clearify

Clearify turns your markdown files into a beautiful documentation site.

## Features

- **Zero config** — just drop markdown files in `docs/public/` and go
- **MDX support** — use React components in your docs (Callout, Tabs, Steps, Cards, CodeGroup)
- **Mermaid diagrams** — fenced `mermaid` code blocks render as SVG, theme-aware
- **Built-in search** — instant full-text search across all pages
- **Dark mode** — automatic light/dark theme switching
- **Syntax highlighting** — beautiful code blocks with Shiki
- **Auto changelog** — drop a `CHANGELOG.md` in your project root, it appears as `/changelog`
- **Auto roadmap** — drop a `ROADMAP.md` in your project root, it appears as `/roadmap`

## Quick Start

```bash
pnpm add @marlinjai/clearify
pnpm exec clearify init
pnpm exec clearify dev
```

That's it! Your docs are live at `http://localhost:4747`.

`clearify init` scaffolds everything you need: a `docs/public/` folder (plus `docs/internal/` for private docs), starter pages, `clearify.config.ts`, `CHANGELOG.md`, and `ROADMAP.md`.

## Configuration

Customize with `clearify.config.ts`:

```typescript
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: 'My Project',
  sections: [
    { label: 'Docs', docsDir: './docs/public' },
    { label: 'Internal', docsDir: './docs/internal', basePath: '/internal', draft: true },
  ],
});
```
