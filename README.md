# Clearify

An open-source documentation site generator. Turn markdown into beautiful docs. Run one site per project, or aggregate many repos into a single hub.

## Quick Start

```bash
pnpm add -D @marlinjai/clearify
pnpm exec clearify init
pnpm exec clearify dev
```

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

```typescript
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
```

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
