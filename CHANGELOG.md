# Changelog

All notable changes to Clearify will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-02-08

### Added

- Mermaid diagram support — fenced `mermaid` code blocks render as SVG diagrams client-side
- Remark plugin (`remarkMermaidToComponent`) transforms mermaid blocks before Shiki processes them
- `<Mermaid>` React component with dynamic import (~800KB code-split, loads only on pages with diagrams)
- Dark/light theme-aware Mermaid rendering with automatic re-render on toggle
- Graceful error state for invalid Mermaid syntax
- `exclude` config option — glob patterns to omit files from navigation and routing
- `port` config option — configurable dev server port (default: 4747)
- Component showcase page (`docs/components.mdx`) exercising all built-in MDX components
- Local development guide (`docs/guides/local-development.md`) documenting `npm link` workflow
- Auto-detection of `CHANGELOG.md` at project root, served as `/changelog` page
- Claude Code hook for automatic changelog updates after git commits

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

[Unreleased]: https://github.com/marlinjai/clearify/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/marlinjai/clearify/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/marlinjai/clearify/releases/tag/v0.1.0
