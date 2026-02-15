# Changelog

All notable changes to Clearify will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.2] - 2026-02-15

### Fixed

- SPA fallback middleware for deep links in Vite dev server — direct navigation and page refresh on OpenAPI routes (e.g. `/api#tag/...`) and non-root section paths (e.g. `/internal/...`) now correctly serve the SPA `index.html` so React Router can handle them client-side

## [1.5.1] - 2026-02-10

### Changed

- Renamed package from `clearify` to `@marlinjai/clearify` for private npm publishing
- Updated all internal references to use the scoped package name

## [1.5.0] - 2026-02-10

### Added

- `<OpenAPI>` MDX component (Scalar-based, lazy-loaded) for rendering API reference docs
- `openapi.spec` config option with Zod validation
- Theme token integration (Clearify CSS variables synced to Scalar)
- Dark/light mode sync via `forceDarkModeState`
- `virtual:clearify/openapi-spec` virtual module for build-time spec loading
- Dev server hot reload on OpenAPI spec file changes
- Auto-generated API pages from spec (catch-all route with Scalar pathRouting)
- Sidebar auto-population from OpenAPI tags (with HTTP method badges)
- Search index integration for API endpoints
- NestJS preset via `clearify openapi:generate` CLI command

## [1.0.0] - 2026-02-09

### Added

- SSG pre-rendering — each route gets its own `index.html` with full server-rendered content
- SEO meta tags per page: `<title>`, `<meta description>`, `<link rel="canonical">`
- Open Graph tags (`og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`)
- Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`)
- JSON-LD structured data (Article schema) per page
- Auto-generated `robots.txt` with sitemap reference
- Auto-generated `sitemap.xml` with section-aware filtering (draft sections excluded)
- Client hydration of SSR-rendered pages (no flash of loading state)
- Build-time Mermaid SVG rendering (`mermaid.strategy: 'build'`) — pre-renders diagrams via Puppeteer, eliminating ~2.1MB of Mermaid JS from the client bundle
- `MermaidStatic` component for CSS-based dark/light theme toggling of pre-rendered diagrams
- `MermaidRenderer` class with batch and persistent modes, file-based caching in `node_modules/.cache/clearify-mermaid/`
- Dev server hybrid warm-up: starts with client-side Mermaid, background-renders all diagrams, then auto-reloads to static SVGs
- Incremental mermaid re-rendering on file change in dev (only changed diagrams re-rendered)
- `virtual:clearify/mermaid-svgs` virtual module for serving pre-rendered SVG data
- TypeScript declarations for all virtual modules (`src/types/virtual.d.ts`)
- Puppeteer as optional peer dependency (only needed with `strategy: 'build'`)
- Active page highlighting in sidebar (color + border indicator)
- Scroll active sidebar item into view on page load
- Breadcrumbs component
- Icon support in sidebar navigation (frontmatter `icon` field rendered as emoji)
- Logo rendering in header (light/dark variants with theme-aware swap)
- Accordion / AccordionGroup component — expandable sections
- Badge component — inline status labels
- Tooltip component — hover information
- Columns component — side-by-side layout (2-4 columns)
- Frame component — styled image/content borders
- Broken link detection via `clearify check` CLI command
- Custom CSS injection (config `customCss` path)
- Custom `<head>` tags (config `headTags`)
- 404 page improvements (suggest similar pages via Levenshtein matching)
- Multi-section support — pill-based section switcher in sidebar, per-section navigation and search
- Unified `docs/public/` + `docs/internal/` folder structure (replaces separate `docs/` and `internal/`)
- `--no-internal` flag for `clearify init` to skip internal docs section
- Internal docs section scaffolded by default with starter content
- Draft section exclusion in production builds
- Loop prevention in post-commit hook (doc-only commits skip the update reminder)

### Fixed

- Dead mermaid JS elimination — stub plugin now uses `enforce: 'pre'` to intercept `import('mermaid')` before Vite's core resolver, fully removing ~2.1MB of dead code when `strategy: 'build'`
- Config file loading when clearify is npm-linked — `defineConfig` import now resolves correctly from temp file
- Dev server now auto-reloads the browser when markdown files are edited (previously only reloaded on file add/delete)

### Changed

- `clearify init` now creates `docs/public/` and `docs/internal/` instead of flat `docs/`
- Generated config uses `sections` array by default (single `docsDir` with `--no-internal`)

## [0.2.0] - 2026-02-08

### Added

- SSG pre-rendering — each route gets its own `index.html` with full server-rendered content
- SEO meta tags per page: `<title>`, `<meta description>`, `<link rel="canonical">`
- Open Graph tags (`og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`)
- Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`)
- JSON-LD structured data (Article schema) per page
- Auto-generated `robots.txt` with sitemap reference
- Auto-generated `sitemap.xml` with section-aware filtering (draft sections excluded)
- Client hydration of SSR-rendered pages (no flash of loading state)
- Mermaid diagram support — fenced `mermaid` code blocks render as SVG diagrams client-side
- Remark plugin (`remarkMermaidToComponent`) transforms mermaid blocks before Shiki processes them
- `<Mermaid>` React component with dynamic import (~800KB code-split, loads only on pages with diagrams)
- Dark/light theme-aware Mermaid rendering with automatic re-render on toggle
- Graceful error state for invalid Mermaid syntax
- `exclude` config option — glob patterns to omit files from navigation and routing
- `port` config option — configurable dev server port (default: 4747)
- Component showcase page (`docs/components.mdx`) exercising all built-in MDX components
- Local development guide (`docs/guides/local-development.md`) documenting `npm link` workflow
- Auto-detection of `CHANGELOG.md` at project root, served as `/changelog` page with HMR
- `clearify init` now scaffolds a starter `CHANGELOG.md` with Keep a Changelog format
- Claude Code hook for automatic changelog + documentation updates after git commits
- Changelog & docs automation guide (`docs/guides/changelog.md`)

### Changed

- Default dev server port changed from 3000 to 4747 (less congested)
- Port priority chain: CLI `--port` > config `port` > default 4747
- `scanDocs()` now accepts optional `exclude` parameter merged into globby ignore patterns

## [0.1.0] - 2026-02-07

### Added

- Initial release of Clearify documentation site generator
- Zero-config markdown-to-docs with Vite + React + MDX
- File-system based routing from `docs/` folder
- Auto-generated sidebar navigation from directory structure
- Frontmatter support (title, description, icon, order)
- Full-text search with FlexSearch
- Dark/light/auto theme modes with CSS custom properties
- Syntax highlighting with Shiki (dual light/dark themes)
- Built-in MDX components: Callout, Tabs, Steps, Card, CardGroup, CodeGroup
- Copy-to-clipboard on code blocks
- `clearify dev` — Vite-powered dev server with HMR
- `clearify build` — static site generation with sitemap.xml
- `clearify init` — project scaffolding
- Customizable via `clearify.config.ts` (name, theme, logo, navigation, links)
- Auto-detection of project name from `package.json`
- Table of contents extracted from page headings
- Responsive layout with mobile sidebar toggle

[Unreleased]: https://github.com/marlinjai/clearify/compare/v1.5.2...HEAD
[1.5.2]: https://github.com/marlinjai/clearify/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/marlinjai/clearify/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/marlinjai/clearify/compare/v1.0.0...v1.5.0
[1.0.0]: https://github.com/marlinjai/clearify/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/marlinjai/clearify/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/marlinjai/clearify/releases/tag/v0.1.0
