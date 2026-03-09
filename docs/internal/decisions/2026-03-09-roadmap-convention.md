---
title: "Decision: Root-Level ROADMAP.md Convention"
summary: Clearify will auto-detect and render ROADMAP.md from the repo root at /roadmap, mirroring the existing CHANGELOG.md pattern. The roadmap represents decided work only — research and exploration happen upstream.
category: decision
tags: [clearify, roadmap, convention, lifecycle]
projects: [clearify]
status: active
date: 2026-03-09
---

# Root-Level ROADMAP.md Convention

## Context

Roadmap files are currently scattered across `docs/internal/` folders in various projects, with inconsistent formats and no tooling support. Meanwhile, Clearify already has a proven pattern: `CHANGELOG.md` lives at the repo root, gets auto-detected at build time, and renders at `/changelog` with zero configuration.

The same pattern should apply to roadmaps.

## Decision

### Convention

Every project using Clearify should have a `ROADMAP.md` at the repository root. Clearify will:

1. **Scaffold** it during `clearify init` (if not present)
2. **Auto-detect** it at build time
3. **Render** it at `/roadmap`
4. **Include** `/roadmap` in link validation (`clearify check`)

### Format

Three sections, manually maintained:

```markdown
# Roadmap

## Planned
<!-- Decided features, ready to be worked on -->

## In Progress
<!-- Currently being implemented -->

## Completed
<!-- Done — move to CHANGELOG.md on release -->
```

Projects with version-based roadmaps (like Clearify itself) can use version headers instead (`## v2.0`, `## v2.1`), with `[x]`/`[ ]` checkboxes for individual items. The tool renders whatever markdown is there — no enforced schema.

### Lifecycle Position

The roadmap represents **decided work only**. It is not a place for exploration or research.

```
Research (unstructured) → Decision → ROADMAP.md → Implementation → CHANGELOG.md
   session dashboard        ADR       Planned →       Code          Shipped
   internal docs                     In Progress →
                                     Completed ──────────────────→
```

- **Research phase**: Explorations, trade-off analysis, spikes. Lives in session dashboard tags, internal docs, knowledge base. No formal structure enforced (yet).
- **Decision**: An ADR or internal doc that concludes "we will build X." This is the gate into the roadmap.
- **ROADMAP.md**: The item enters as `Planned`, moves to `In Progress`, then `Completed`.
- **CHANGELOG.md**: When released, the completed item is described in the changelog. Semantic-release automates this for code changes; doc/roadmap updates are manual.

### CI/CD Implications

Edits to `ROADMAP.md` are meaningful package changes (unlike `docs/**` site content). They should:

- **Trigger** the release pipeline (semantic-release evaluates the commit)
- **Appear** in the changelog when paired with a `docs:` or `feat:` commit prefix
- **Not be excluded** by `paths-ignore` filters (only `docs/**` is ignored)

For the future Git-Backed Production Editing feature: edits to `docs/**` skip CI, but `ROADMAP.md` at root is outside that path and will trigger normally. This is correct — roadmap changes are intentional project-level updates, not casual content edits.

## Migration

Existing roadmap files in `docs/internal/` should be moved to the repo root for each project. The internal docs version can be replaced with a redirect or removed.

## Alternatives Considered

- **GitHub Projects/Issues only**: Good for granular tracking, but doesn't give a narrative overview. ROADMAP.md and GitHub Projects can coexist — the file is the high-level view, issues are the implementation details.
- **Roadmap inside `docs/public/`**: Breaks the symmetry with CHANGELOG.md at root. Also means it wouldn't be visible on GitHub's repo page.
- **Knowledge base convention doc**: This decision is Clearify-specific. Session Dashboard will index it naturally via its doc scanner.
