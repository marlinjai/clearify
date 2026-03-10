---
title: Configuration
description: How to configure Clearify
order: 4
summary: Configuration reference for Clearify, covering clearify.config.ts options for branding, navigation overrides, theming, and advanced features.
category: documentation
tags: [clearify, configuration, config, theming]
projects: [clearify]
status: active
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
| `logo` | `{ light?: string; dark?: string }` | — | Logo images for light and dark mode (paths relative to project root) |
| `customCss` | `string` | — | Path to a custom CSS file to load after built-in styles |
| `headTags` | `string[]` | `[]` | Raw HTML strings injected into the `<head>` of every page (e.g. analytics scripts) |
| `openapi` | `{ spec, basePath?, generatePages? }` | — | OpenAPI spec path and options for auto-generated API reference pages |
| `hub` | `HubConfig` | — | Enable Hub Mode for multi-project dashboards (see [Hub Mode](#hub-mode)) |

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

## Config File Split

For projects that need a machine-writable data layer (e.g. visual editors, CI pipelines), Clearify supports splitting configuration across two files:

- **`clearify.config.ts`** — code-level options: plugins, custom logic, navigation overrides, mermaid strategy
- **`clearify.data.json`** — data-level options: name, siteUrl, theme, logo, links, sections, hub

When both files exist, they are merged automatically. **JSON values win** for any field present in both files — this lets tooling safely write to `clearify.data.json` without touching the TypeScript config.

### Which fields go where

| `clearify.data.json` (data) | `clearify.config.ts` (code) |
|-----------------------------|-----------------------------|
| `name`, `siteUrl` | `docsDir`, `outDir`, `port` |
| `theme`, `logo`, `links` | `navigation`, `exclude` |
| `sections`, `hub` | `mermaid`, `openapi`, `customCss`, `headTags` |

### Example

**`clearify.data.json`:**

```json
{
  "$schema": "node_modules/@marlinjai/clearify/schema.json",
  "name": "My Project",
  "siteUrl": "https://docs.example.com",
  "theme": {
    "primaryColor": "#8B5CF6",
    "mode": "auto"
  },
  "logo": {
    "light": "./assets/logo-light.svg",
    "dark": "./assets/logo-dark.svg"
  }
}
```

**`clearify.config.ts`:**

```typescript
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  mermaid: { strategy: 'build' },
  customCss: './styles/custom.css',
  navigation: [
    { label: 'Getting Started', path: '/getting-started' },
  ],
});
```

The `$schema` field enables autocomplete and validation in VS Code — it has no effect at runtime.

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
| `git` | `RemoteGitSource` | — | Clone a remote Git repo as the source for this section (see [Remote Sections](#remote-sections)) |

### Remote Sections

A section can pull its docs from a remote Git repository instead of a local directory. Add a `git` field to the section config:

```typescript
export default defineConfig({
  name: 'My Project',
  sections: [
    { label: 'Docs', docsDir: './docs/public' },
    {
      label: 'Design System',
      docsDir: './docs/design-system',
      git: {
        repo: 'https://github.com/acme/design-system.git',
        ref: 'main',
        path: 'docs',
        sparse: true,
      },
    },
  ],
});
```

When `git` is present, Clearify clones the repository at build/dev time and uses the cloned content as the section's docs directory.

#### RemoteGitSource fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `repo` | `string` | — | Git repository URL (required) |
| `ref` | `string` | `'main'` | Branch, tag, or commit to check out |
| `path` | `string` | — | Subdirectory within the repo to use (enables sparse checkout) |
| `sparse` | `boolean` | `false` | Use sparse checkout to clone only the specified `path` |

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

Each hub project has a `mode` that controls how it connects to the hub:

| Mode | What it does | Creates new tabs? | Requires |
|------|-------------|-------------------|----------|
| `'link'` (default) | Card links to an external URL | No | `href` |
| `'embed'` | Clones remote repo, imports its sections as new tabs | Yes | `git.repo` |
| `'inject'` | Clones remote repo, symlinks docs into an existing section's nav tree | No | `git.repo`, `injectInto`, `docsPath` |

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
| `hub.cacheDir` | `string` | `'.clearify-cache'` | Directory for cloned remote repositories (embed/inject modes) |

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
| `group` | `string` | — | Group name for organizing projects in the hub grid |
| `hubUrl` | `string` | — | URL of the parent hub site (enables sidebar backlink) |
| `hubName` | `string` | `'Hub'` | Display name for the hub backlink (e.g. `'ERP Suite'`) |
| `mode` | `'link' \| 'embed' \| 'inject'` | `'link'` | How this project integrates with the hub (see above) |
| `git` | `RemoteGitSource` | — | Remote repository to clone for embed/inject modes |
| `embedSections` | `'all' \| 'public' \| string[]` | `'all'` | Which sections to import in embed mode |
| `injectInto` | `string` | — | Section ID to inject docs into (inject mode) |
| `docsPath` | `string` | — | Subdirectory within the cloned repo containing docs (inject mode) |

### Hub backlink

When a sub-project declares `hubProject.hubUrl`, a `← Hub Name` link appears at the top of the sidebar, letting users navigate back to the parent hub:

```typescript
export default defineConfig({
  name: 'Storage Brain',
  hubProject: {
    description: 'File storage & processing service',
    hubUrl: 'https://docs.example.com',
    hubName: 'ERP Suite',
  },
});
```

### Embed Mode

Embed mode clones a remote project's repository and imports its Clearify sections as new tabs in the hub site. This is useful when you want a unified docs site that aggregates content from multiple repos.

```typescript
export default defineConfig({
  name: 'ERP Suite',
  hub: {
    projects: [
      {
        name: 'Storage Brain',
        description: 'File storage & processing service',
        mode: 'embed',
        git: { repo: 'https://github.com/acme/storage-brain.git' },
        embedSections: 'public',
      },
    ],
  },
});
```

The `embedSections` field controls which sections from the remote project are imported:

- `'all'` (default) — import every section defined in the remote config
- `'public'` — import only non-draft sections
- `string[]` — import specific sections by ID (e.g. `['docs', 'api']`)

The remote project must have its own `clearify.config.ts` with `sections` defined. Each imported section appears as a new tab in the hub site's section switcher.

### Inject Mode

Inject mode clones a remote project's docs and symlinks them into an existing section's navigation tree — no new tabs are created. This is ideal for aggregating docs from many small projects into a single section.

```typescript
export default defineConfig({
  name: 'ERP Suite',
  sections: [
    { label: 'Projects', docsDir: './docs/projects', basePath: '/projects' },
  ],
  hub: {
    projects: [
      {
        name: 'Storage Brain',
        description: 'File storage & processing service',
        mode: 'inject',
        git: { repo: 'https://github.com/acme/storage-brain.git' },
        injectInto: 'projects',
        docsPath: 'docs/public',
        group: 'Services',
      },
      {
        name: 'Data Table',
        description: 'Notion-like database component',
        mode: 'inject',
        git: { repo: 'https://github.com/acme/data-table.git' },
        injectInto: 'projects',
        docsPath: 'docs',
        group: 'Components',
      },
    ],
  },
});
```

| Field | Description |
|-------|-------------|
| `injectInto` | The section ID (derived from the section's `label`) where the docs will appear |
| `docsPath` | Path within the cloned repo to the markdown files |
| `group` | Optional subdirectory name — groups this project's docs under a folder in the sidebar |

Clearify creates a staging directory that overlays the injected docs onto the target section's `docsDir` via symlinks. The target section sees the injected files as if they were local, so navigation, search, and routing work normally.

### Sidebar nesting

The sidebar automatically reflects your docs folder structure. Subdirectories create collapsible groups, and nested subdirectories create nested groups:

```
docs/public/
├── index.md                    → Landing page (not in sidebar)
├── getting-started.md          → Top-level link
└── projects/
    ├── index.md                → "Projects" group label (from frontmatter title)
    ├── my-app/
    │   ├── index.md            → "My App" leaf link (if no children)
    │   ├── quickstart.md       → Nested under "My App" group
    │   └── api.md              → Nested under "My App" group
    └── infrastructure/
        ├── index.md            → "Infrastructure" group (from frontmatter title/icon)
        └── service-a/
            ├── setup.md        → Nested under "Service A" inside "Infrastructure"
            └── api.md
```

Use frontmatter in `index.md` to control the group label, icon, and sort order:

```markdown
---
title: Infrastructure
icon: "🏗️"
order: 0
---
```

### Hub components

Hub Mode ships three components that render automatically from the `virtual:clearify/hub` module:

- **`ProjectGrid`** — responsive grid layout (3 columns, collapses to 2 → 1 on smaller screens)
- **`ProjectCard`** — card with name, description, status badge, tags, and optional GitHub link
- **`StatusBadge`** — color-coded status pill (`active` green, `beta` indigo, `planned` amber, `deprecated` red)
