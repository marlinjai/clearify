# Clearify Roadmap

> Last updated: 2026-02-10 — added v1.5 OpenAPI/Scalar integration

## v0.2.0 — Done

- [x] Markdown + MDX rendering with Shiki syntax highlighting
- [x] Auto-generated navigation from folder structure
- [x] `clearify.config.ts` for overrides (nav, branding, colors, logo)
- [x] Frontmatter support (`title`, `description`, `order`, `icon`)
- [x] Dev server with hot reload (`clearify dev`)
- [x] Static export (`clearify build`)
- [x] Scaffolding command (`clearify init` — includes CHANGELOG.md)
- [x] Client-side full-text search (custom scored search: title/description/content)
- [x] Responsive default theme with light/dark mode
- [x] Code blocks with copy button + CodeGroup language tabs
- [x] Built-in MDX components: Callout, CodeGroup, Steps, Card, Tabs
- [x] On-this-page TOC sidebar
- [x] Mermaid diagram support (client-side, theme-aware)
- [x] Exclude patterns for navigation filtering
- [x] Configurable port (default 4747)
- [x] CHANGELOG.md auto-detection → `/changelog` page
- [x] Claude Code hook for automatic changelog + docs updates

## v1.0 — Production Ready

The gap between v0.2 and v1.0 is **SEO and polish**. Everything below is needed before recommending Clearify for public-facing docs.

### SSG (Static Site Generation) — Critical
- [x] Pre-render HTML per route (`/getting-started/index.html`, etc.)
- [x] Proper `<head>` with title, description, canonical URL per page
- [x] Open Graph + Twitter Card meta tags
- [x] Auto-generated `robots.txt`
- [x] Structured data (JSON-LD for articles)

### Performance
- [x] Build-time Mermaid SVG rendering (`mermaid.strategy: 'build'`) — eliminates ~2.1MB client JS
- [x] Dev server hybrid warm-up with incremental re-rendering

### Navigation Polish
- [x] Active page highlighting in sidebar (color + border indicator)
- [ ] Scroll active sidebar item into view on page load
- [ ] Breadcrumbs component
- [ ] Icon support in sidebar navigation (frontmatter `icon` field is parsed but not rendered)
- [ ] Logo rendering in header (config schema exists but Header doesn't render it)

### Additional Components (Mintlify parity)
- [ ] Accordion / AccordionGroup — expandable sections
- [ ] Badge — inline status labels
- [ ] Tooltip — hover information
- [ ] Columns — side-by-side layout (2-4 columns)
- [ ] Frame — styled image/content borders

### Developer Experience
- [x] Broken link detection (`clearify check`)
- [ ] Custom CSS injection (config `customCss` path)
- [ ] Custom `<head>` tags (config `headTags`)
- [ ] 404 page improvements (suggest similar pages)

## v1.5 — API Documentation

### OpenAPI Integration (Phase 1 — Done)
- [x] `<OpenAPI>` MDX component (Scalar-based, lazy-loaded)
- [x] `openapi.spec` config option with Zod validation
- [x] Theme token integration (Clearify CSS variables → Scalar)
- [x] Dark/light mode sync via `forceDarkModeState`
- [x] `virtual:clearify/openapi-spec` virtual module for build-time spec loading
- [x] Dev server hot reload on spec file changes

### OpenAPI Phase 2 (Planned)
- [ ] Auto-generated API pages from spec (remark plugin `remark-openapi.ts`)
- [ ] Sidebar auto-population from OpenAPI tags
- [ ] NestJS preset (auto spec generation as pre-build step)

## v2.0 — Power Features

### API Documentation (Advanced)
- [ ] API playground — interactive request builder in docs
- [ ] SDK code example generation (cURL, Python, JS, Go)
- [ ] Request/response schema display with nested types

### Content Management
- [x] Multi-section support — pill-based section switcher (Guides / Internal / etc.)
- [x] Unified `docs/public/` + `docs/internal/` folder structure
- [x] Draft sections excluded from production builds
- [x] `clearify init --no-internal` flag
- [ ] Versioned docs — version switcher, separate content per version
- [ ] Reusable snippets — define once, `<Snippet file="path" />` anywhere
- [ ] Conditional content — show/hide based on context (version, audience)
- [ ] Dropdown menus in header navigation

### Search & Discovery
- [x] Keyboard navigation in search results (arrow keys + Enter)
- [x] Section-scoped search result badges
- [ ] Search analytics — track what users search for
- [ ] `llms.txt` auto-generation for AI discoverability

### Analytics
- [ ] Page view tracking (pluggable: Plausible, Umami, PostHog)
- [ ] Inline feedback widget (thumbs up/down per page)
- [ ] Popular pages dashboard

## v3.0 — AI-Native & Ecosystem

### AI Features
- [ ] AI chat over docs — RAG-powered Q&A widget
- [ ] AI-generated summaries per page
- [ ] MCP server — expose docs to AI agents
- [ ] Markdown export endpoint for LLM consumption

### i18n
- [ ] Multi-language support with language switcher
- [ ] Per-language navigation and content
- [ ] RTL layout support (Arabic, Hebrew)

### Ecosystem
- [ ] Plugin system (extend build pipeline, add custom transforms)
- [ ] Community themes (swap default theme)
- [ ] Monorepo support (multiple doc sites from one repo)
- [ ] Migration tools (import from Mintlify, Docusaurus, GitBook)

## Out of Scope

- Web editor / cloud editor — we're code-first
- Managed hosting — deploy anywhere, we don't host for you
- Authentication / access control — use a proxy or CDN rules
- Paid features — Clearify is fully open source
