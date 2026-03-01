---
title: Configuration
description: How to configure Clearify
order: 4
---

# Configuration

Clearify works with zero configuration. But when you need control, create a `clearify.config.ts`:

```typescript
import { defineConfig } from '@marlinjai/clearify';

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
pnpm add puppeteer
```

| Strategy | Client JS | Dark/Light Toggle | Dev Server |
|----------|-----------|-------------------|------------|
| `'client'` (default) | ~2.1MB Mermaid JS | Re-renders on theme toggle | Instant start, diagrams load per-page |
| `'build'` | Zero Mermaid JS | CSS-based toggle (instant) | Starts with client-side, auto-swaps to static SVGs after background warm-up |

## Sections

For multi-section docs (e.g. public + internal), use the `sections` array instead of `docsDir`:

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

## Hub Mode

Hub Mode turns a Clearify site into a project dashboard — ideal for monorepos or multi-project portfolios. It renders a grid of project cards with status badges, descriptions, and links.

### Manual project list

List projects explicitly in `hub.projects`:

```typescript
export default defineConfig({
  name: 'ERP Suite',
  hub: {
    projects: [
      {
        name: 'Storage Brain',
        description: 'File storage & processing service',
        href: 'https://storage-brain.example.com',
        status: 'active',
        icon: '🧠',
        tags: ['cloudflare', 'r2'],
      },
      {
        name: 'Data Table',
        description: 'Notion-like database component',
        status: 'beta',
        tags: ['react', 'component'],
      },
    ],
  },
});
```

### Auto-scan (`hub.scan`)

Instead of listing every project manually, point `hub.scan` at child config files. Each child declares a `hubProject` block and the hub assembles the grid automatically:

**Parent config (hub site):**

```typescript
export default defineConfig({
  name: 'ERP Suite',
  hub: {
    scan: './projects/*/clearify.config.ts',
  },
});
```

**Child config (e.g. `projects/storage-brain/clearify.config.ts`):**

```typescript
export default defineConfig({
  name: 'Storage Brain',
  siteUrl: 'https://storage-brain.example.com',
  hubProject: {
    description: 'File storage & processing service',
    status: 'active',
    icon: '🧠',
    tags: ['cloudflare', 'r2'],
  },
});
```

The scanner uses `name` from the child config and `href` from `hubProject.href` (falling back to `siteUrl`). Manual `hub.projects` entries override scanned ones by name.

### Hub config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hub.projects` | `HubProject[]` | `[]` | Manually listed projects |
| `hub.scan` | `string` | — | Glob pattern to find child `clearify.config.ts` files |

### HubProject fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | Project name (required in manual mode, auto-detected in scan mode) |
| `description` | `string` | — | Short project description |
| `href` | `string` | — | Link to the project's docs site |
| `repo` | `string` | — | GitHub repository URL |
| `status` | `'active' \| 'beta' \| 'planned' \| 'deprecated'` | `'active'` | Project status badge |
| `icon` | `string` | — | Emoji or icon character |
| `tags` | `string[]` | — | Category tags shown on the card |

### Hub components

Hub Mode ships three components that render automatically from the `virtual:clearify/hub` module:

- **`ProjectGrid`** — responsive grid layout (3 columns, collapses to 2 → 1 on smaller screens)
- **`ProjectCard`** — card with name, description, status badge, tags, and optional GitHub link
- **`StatusBadge`** — color-coded status pill (`active` green, `beta` indigo, `planned` amber, `deprecated` red)
