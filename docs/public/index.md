---
title: Welcome to Clearify
description: An open-source documentation site generator
order: 0
---

# Welcome to Clearify

Clearify turns your markdown files into a beautiful documentation site.

## Features

- **Zero config** — just drop markdown files in `docs/` and go
- **MDX support** — use React components in your docs (Callout, Tabs, Steps, Cards, CodeGroup)
- **Mermaid diagrams** — fenced `mermaid` code blocks render as SVG, theme-aware
- **Built-in search** — instant full-text search across all pages
- **Dark mode** — automatic light/dark theme switching
- **Syntax highlighting** — beautiful code blocks with Shiki
- **Auto changelog** — drop a `CHANGELOG.md` in your project root, it appears as `/changelog`
- **Claude Code hook** — automatic changelog and docs updates after every git commit

## Quick Start

```bash
npm install clearify
npx clearify init
npx clearify dev
```

That's it! Your docs are live at `http://localhost:4747`.

`clearify init` scaffolds everything you need: a `docs/` folder, starter pages, `clearify.config.ts`, and a `CHANGELOG.md`.

## Configuration

Customize with `clearify.config.ts`:

```typescript
import { defineConfig } from 'clearify';

export default defineConfig({
  name: 'My Project',
  port: 4747,
  exclude: ['ROADMAP.md', '**/design-*.md'],
});
```
