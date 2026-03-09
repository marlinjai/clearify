---
title: Changelog & Roadmap
description: Automatic changelog and roadmap rendering from root-level markdown files
order: 6
summary: How Clearify auto-detects CHANGELOG.md and ROADMAP.md at the project root and renders them as /changelog and /roadmap pages with zero configuration.
category: documentation
tags: [clearify, changelog, roadmap, automation]
projects: [clearify]
status: active
---

# Changelog & Roadmap

Clearify auto-detects two root-level markdown files and renders them as pages — no configuration needed.

| File | Route | Purpose |
|------|-------|---------|
| `CHANGELOG.md` | `/changelog` | What shipped — release history |
| `ROADMAP.md` | `/roadmap` | What's coming — planned and in-progress work |

Both are scaffolded by `clearify init`, watched during development (hot reload on save), included in `clearify check` link validation, and indexed for search.

## CHANGELOG.md

### Auto-detected as a docs page

1. Place a `CHANGELOG.md` in your project root (or let `clearify init` create one)
2. Run `clearify dev` or `clearify build`
3. The changelog appears in the sidebar at `/changelog`

### Recommended format

We recommend the [Keep a Changelog](https://keepachangelog.com) format:

```markdown
# Changelog

## [Unreleased]

### Added

- New feature description

## [1.0.0] - 2026-02-08

### Added

- Initial release
```

### Semantic Release

If you use [semantic-release](https://github.com/semantic-release/semantic-release), it automatically updates `CHANGELOG.md` on every release. Add `docs/**` to your workflow's `paths-ignore` so doc-only edits don't trigger the release pipeline, while changelog and roadmap changes (at root) still do:

```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
```

## ROADMAP.md

### Convention

The roadmap represents **decided work only** — items that have passed the research and decision phase. It lives at the project root for visibility on GitHub and in the docs site.

### Recommended format

```markdown
# Roadmap

## Planned

- Feature A — brief description
- Feature B — brief description

## In Progress

- Feature C — brief description

## Completed

- Feature D — shipped in v1.5
```

Projects with version-based roadmaps can use version headers (`## v2.0`, `## v2.1`) with checkboxes instead. Clearify renders whatever markdown is there — no enforced schema.

### Lifecycle

```
Research → Decision → ROADMAP.md → Implementation → CHANGELOG.md
                      Planned →
                      In Progress →
                      Completed ──────────────────→ Released
```

Items enter as **Planned**, move to **In Progress** during development, then to **Completed** when done. On release, they appear in the changelog.

## Claude Code rules

`clearify init` scaffolds a `.claude/rules/clearify-docs.md` file that instructs Claude to keep the changelog, roadmap, and docs in sync when making changes. This works with any Claude Code workflow — no hooks or scripts required.

## Per-project support

Every project using Clearify gets this automatically:

```bash
cd my-project
pnpm exec clearify init
# → Creates CHANGELOG.md, ROADMAP.md, docs/, config
pnpm exec clearify dev
# → /changelog and /roadmap appear in sidebar
```
