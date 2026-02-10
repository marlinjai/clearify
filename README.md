# Clearify

An open-source documentation site generator. Turn markdown into beautiful docs.

## Features

- **Zero config** — drop markdown files in `docs/public/` and go
- **MDX support** — use React components in your docs (Callout, Tabs, Steps, Cards, CodeGroup, Accordion, Badge, Tooltip, Columns, Frame)
- **Mermaid diagrams** — fenced `mermaid` code blocks render as SVG, with optional build-time pre-rendering via Puppeteer
- **Built-in search** — instant full-text search across all pages and API endpoints
- **Dark mode** — automatic light/dark theme switching
- **Syntax highlighting** — beautiful code blocks with Shiki (dual light/dark themes)
- **SSG & SEO** — pre-rendered HTML, Open Graph, Twitter Cards, JSON-LD, sitemap, robots.txt
- **OpenAPI / Scalar** — render API reference docs from an OpenAPI spec, with theme sync and dark mode
- **Multi-section support** — pill-based section switcher (e.g. public docs + internal docs)
- **Auto changelog** — drop a `CHANGELOG.md` in your project root, it appears as `/changelog`

## Quick Start

Install Clearify as a dev dependency:

```bash
npm install clearify --save-dev
```

Scaffold your project:

```bash
npx clearify init
```

Start the dev server:

```bash
npx clearify dev
```

Your docs are live at `http://localhost:4747`.

## Configuration

Customize with `clearify.config.ts`:

```typescript
import { defineConfig } from 'clearify';

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
  openapi: {
    spec: './docs/openapi.json',
  },
});
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `clearify dev` | Start Vite-powered dev server with HMR |
| `clearify build` | Build static documentation site |
| `clearify init` | Scaffold a docs folder (use `--no-internal` to skip internal section) |
| `clearify check` | Check for broken internal links |
| `clearify openapi:generate` | Generate OpenAPI spec from a NestJS app |

## Links

- [Documentation](https://github.com/marlinjai/clearify)
- [GitHub](https://github.com/marlinjai/clearify)
- [Changelog](./CHANGELOG.md)

## License

[MIT](./LICENSE)
