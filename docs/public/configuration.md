---
title: Configuration
description: How to configure Clearify
order: 4
---

# Configuration

Clearify works with zero configuration. But when you need control, create a `clearify.config.ts`:

```typescript
import { defineConfig } from 'clearify';

export default defineConfig({
  name: 'My Project',
  theme: {
    primaryColor: '#8B5CF6',
    mode: 'auto',
  },
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'Documentation'` | Site name shown in header and footer |
| `docsDir` | `string` | `'./docs'` | Path to docs folder (used when no `sections` defined) |
| `outDir` | `string` | `'./docs-dist'` | Build output directory |
| `port` | `number` | `4747` | Dev server port |
| `siteUrl` | `string` | — | Production URL for canonical links, sitemap, and OG tags |
| `theme.primaryColor` | `string` | `'#3B82F6'` | Primary brand color |
| `theme.mode` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Color scheme |
| `navigation` | `NavigationItem[]` | `null` | Override auto-generated sidebar navigation |
| `exclude` | `string[]` | `[]` | Glob patterns to exclude files from navigation and routing |
| `mermaid.strategy` | `'client' \| 'build'` | `'client'` | Mermaid rendering strategy (see below) |
| `links` | `Record<string, string>` | — | Links shown in header/footer (e.g. `{ github: 'https://...' }`) |

## Mermaid Diagrams

By default, Mermaid diagrams render client-side using the full Mermaid JS library (~2.1MB). For production sites, you can switch to build-time rendering which pre-renders diagrams to SVGs via Puppeteer and eliminates all Mermaid JS from the client bundle:

```typescript
export default defineConfig({
  mermaid: {
    strategy: 'build',
  },
});
```

Requires Puppeteer as a dev dependency:

```bash
npm install puppeteer
```

| Strategy | Client JS | Dark/Light Toggle | Dev Server |
|----------|-----------|-------------------|------------|
| `'client'` (default) | ~2.1MB Mermaid JS | Re-renders on theme toggle | Instant start, diagrams load per-page |
| `'build'` | Zero Mermaid JS | CSS-based toggle (instant) | Starts with client-side, auto-swaps to static SVGs after background warm-up |

## Sections

For multi-section docs (e.g. public + internal), use the `sections` array instead of `docsDir`:

```typescript
import { defineConfig } from 'clearify';

export default defineConfig({
  name: 'My Project',
  sections: [
    { label: 'Docs', docsDir: './docs/public' },
    { label: 'Internal', docsDir: './docs/internal', basePath: '/internal', draft: true },
  ],
});
```

### Section options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `label` | `string` | — | Display name in the section switcher pill |
| `docsDir` | `string` | — | Path to this section's markdown files |
| `basePath` | `string` | `'/'` (first) or `'/<id>'` | URL prefix for this section's routes |
| `draft` | `boolean` | `false` | Draft sections are shown in dev but excluded from production builds |
| `sitemap` | `boolean` | `!draft` | Whether to include this section's routes in `sitemap.xml` |
| `exclude` | `string[]` | `[]` | Additional glob patterns to exclude (merged with top-level `exclude`) |

## SEO

Set `siteUrl` to enable canonical URLs, Open Graph tags, and sitemap generation in production builds:

```typescript
export default defineConfig({
  name: 'My Project',
  siteUrl: 'https://docs.example.com',
});
```

The build generates:
- Per-page `<title>`, `<meta description>`, `<link rel="canonical">`
- Open Graph and Twitter Card meta tags
- JSON-LD structured data (Article schema)
- `sitemap.xml` (respects section `sitemap` option)
- `robots.txt` with sitemap reference
