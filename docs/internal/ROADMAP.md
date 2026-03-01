# Clearify Roadmap

> Last updated: 2026-03-02 — v1.9 Nested Navigation & Hub Backlinks

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
- [x] Scroll active sidebar item into view on page load
- [x] Breadcrumbs component
- [x] Icon support in sidebar navigation (frontmatter `icon` field rendered as emoji)
- [x] Logo rendering in header (light/dark variants with theme-aware swap)

### Additional Components (Mintlify parity)
- [x] Accordion / AccordionGroup — expandable sections
- [x] Badge — inline status labels
- [x] Tooltip — hover information
- [x] Columns — side-by-side layout (2-4 columns)
- [x] Frame — styled image/content borders

### Developer Experience
- [x] Broken link detection (`clearify check`)
- [x] Custom CSS injection (config `customCss` path)
- [x] Custom `<head>` tags (config `headTags`)
- [x] 404 page improvements (suggest similar pages via Levenshtein matching)

## v1.5 — API Documentation

### OpenAPI Integration (Phase 1 — Done)
- [x] `<OpenAPI>` MDX component (Scalar-based, lazy-loaded)
- [x] `openapi.spec` config option with Zod validation
- [x] Theme token integration (Clearify CSS variables → Scalar)
- [x] Dark/light mode sync via `forceDarkModeState`
- [x] `virtual:clearify/openapi-spec` virtual module for build-time spec loading
- [x] Dev server hot reload on spec file changes

### OpenAPI Phase 2 — Done
- [x] Auto-generated API pages from spec (catch-all route with Scalar pathRouting)
- [x] Sidebar auto-population from OpenAPI tags (with HTTP method badges)
- [x] Search index integration for API endpoints
- [x] NestJS preset (`clearify openapi:generate` CLI command)

## v1.6 — Custom OpenAPI Renderer (Phase 1 — Read-Only)

Replaced `@scalar/api-reference-react` with a fully custom-built renderer using Clearify's design system.

### Custom Renderer — Done
- [x] `ApiHeader` — spec title, version badge, server URL, auth scheme summary
- [x] `TagGroup` — collapsible endpoint groups per OpenAPI tag
- [x] `OperationCard` — two-column layout (docs + code examples), responsive collapse
- [x] `ParameterTable` — grouped parameter display with required badges
- [x] `SchemaViewer` — recursive collapsible JSON Schema tree with `oneOf`/`anyOf` tabs
- [x] `CodeExamples` — tabbed curl/JS/Python snippets with copy-to-clipboard
- [x] `ResponseList` — color-coded status codes with expandable response schemas
- [x] `MethodBadge` — HTTP method pills matching sidebar badge colors
- [x] Built-in snippet generation (no external dependency)
- [x] `$ref` dereferencing at build time via `@scalar/openapi-parser`
- [x] Removed `@scalar/api-reference-react` and all Scalar CSS (~340 lines custom CSS + ~120 lines resets)

## v1.8 — Hub Mode & DX

### Hub Mode — Done
- [x] `HubProject` type and `HubConfig` with `projects` array
- [x] `virtual:clearify/hub` virtual module serving hub data to client
- [x] `ProjectGrid` component — responsive grid layout (3 → 2 → 1 columns)
- [x] `ProjectCard` component — name, description, status badge, tags, repo link
- [x] `StatusBadge` component — color-coded status pills (active/beta/planned/deprecated)
- [x] Hub auto-scan (`hub.scan`) — glob child `clearify.config.ts` files to build project grid
- [x] `hubProject` config option — child projects declare hub metadata in their own config
- [x] Manual `hub.projects` entries override scanned ones by name

### Developer Experience — Done
- [x] `clearify init` scaffolds `.claude/rules/clearify-docs.md` for AI-assisted doc sync
- [x] `--no-claude-rules` flag to skip rules file creation
- [x] Rules content adapts to `--no-internal` flag

## v1.9 — Nested Navigation & Hub Backlinks

### Navigation Improvements — Done
- [x] Multi-level nested sidebar navigation (subdirectories produce proper nested collapsible groups)
- [x] Index page `title` and `icon` used for group labels (instead of folder name title-casing)
- [x] Index-only directories rendered as leaf links (not dropped)

### Hub Backlinks — Done
- [x] `hubProject.hubUrl` and `hubProject.hubName` config options
- [x] Sidebar backlink rendering (`← Hub Name`) at top of sidebar when configured
- [x] Hub project grouping via `hubProject.group`

## v2.0 — Try It Out & Auth (OpenAPI Phase 2-3)

### API Playground
- [ ] `TryItPanel` inside `OperationCard` — toggled by "Try It" button
- [ ] Auto-generated forms from operation parameter + request body schemas
- [ ] Configurable proxy URL (`openapi.proxyUrl` config option)
- [ ] Response display with status code, headers, syntax-highlighted body

### Auth Management
- [ ] `AuthManager` — persistent panel reading `components.securitySchemes`
- [ ] Bearer token input, API key input, OAuth2 flow
- [ ] Auth state injected into Try It requests and code examples
- [ ] Server selector dropdown (from `spec.servers[]`)

## v2.1 — Power Features

### API Documentation (Advanced)
- [x] SDK code example generation (cURL, Python, JS) — built into v1.6 custom renderer
- [x] Request/response schema display with nested types — built into v1.6 SchemaViewer
- [ ] API playground — interactive request builder (planned for v1.9)

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
