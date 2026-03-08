---
title: Versioned Documentation Architecture
category: plan
status: draft
date: 2026-03-08
tags: [versioning, v2.1]
---

# Versioned Documentation Architecture

## Overview

Versioned docs let Clearify projects maintain multiple documentation versions simultaneously (e.g. v1, v2, latest). Users can switch between versions via a UI control, and each version resolves to its own content tree, navigation, and search index. This is essential for libraries and APIs where consumers may be pinned to older releases.

## Content Organization

Three approaches considered:

### Option A: Folder-Based

Each version lives in a subfolder under `docsDir`:

```
docs/
  v1/
    getting-started.md
    api/overview.md
  v2/
    getting-started.md
    api/overview.md
  latest -> v2 (symlink or alias)
```

**Pros:** Simple mental model, works with any editor, no git knowledge required, easy to diff between versions.
**Cons:** Content duplication, large repos, hard to maintain shared pages.

### Option B: Branch/Tag-Based

Pull versioned content from git refs, reusing the existing `RemoteGitSource` infrastructure from v1.10:

```ts
versions: [
  { label: 'v1', source: { git: { repo: '.', ref: 'v1.x' } } },
  { label: 'v2', source: { git: { repo: '.', ref: 'v2.x' } } },
  { label: 'latest', source: { docsDir: './docs' }, default: true },
]
```

**Pros:** Zero duplication, aligns with release workflow, older versions are immutable.
**Cons:** Slower builds (git clones), harder local preview of old versions, requires discipline around tagging.

### Option C: Hybrid (Recommended)

Latest/active version lives in the working tree. Older versions are pulled from git tags at build time via `RemoteGitSource`. This is the natural extension of the existing remote sections feature.

**Pros:** Best of both worlds -- fast iteration on current docs, immutable history for past versions. Minimal new infrastructure (reuses `core/remote`). No content duplication.
**Cons:** Slightly more complex mental model than pure folder-based.

**Recommendation: Option C.** It leverages existing remote section machinery, keeps the working tree clean, and scales to many versions without repo bloat.

## URL Routing

Version appears as a path prefix:

```
/v1/getting-started
/v2/getting-started
/latest/getting-started    (alias for default version)
```

Rules:
- The **default** version is served at the root path (`/getting-started`) with no prefix.
- Non-default versions always include the prefix.
- `/latest/` redirects to the root (302) to avoid duplicate content.
- Version prefix is injected before the section basePath: `/v1/api/endpoints`.

## Version Switcher UI

- Dropdown in the site header, right-aligned next to the search bar.
- Shows the current version label with a chevron.
- Lists all configured versions; the default version shows a "latest" badge.
- Selection is persisted in `localStorage` (`clearify-version`).
- On navigation, the switcher attempts to resolve the same page path in the target version. If it does not exist, it falls back to that version's root.
- Versions with `status: 'deprecated'` show a warning banner at the top of every page.

## Sidebar Per Version

Each version produces its own navigation tree via the standard `scanDocs` + `buildNavigation` pipeline. Implementation:

- `resolveSections()` runs once per version, producing `ResolvedSection[]` arrays keyed by version label.
- The sidebar component receives the active version's nav tree.
- **Shared pages** (e.g. changelog, contributing) can be declared in config and are symlinked/injected into every version's tree at build time:

```ts
versions: [
  { label: 'v2', source: { docsDir: './docs' }, default: true },
  { label: 'v1', source: { git: { repo: '.', ref: 'v1.0.0' } } },
],
sharedPages: ['CHANGELOG.md', 'docs/contributing.md'],
```

## Build Strategy

- **Parallel version builds.** Each version is resolved and built independently. The existing Vite build can be extended with a version loop that produces separate route manifests.
- **Incremental builds.** Git-sourced versions are cached in `node_modules/.cache/clearify-remote/` (already implemented). Only the current working-tree version triggers a full rebuild on file change.
- **Build time impact.** First build clones all git-sourced versions (one `--depth 1` clone each). Subsequent builds use the cache unless the ref changes. Expected overhead: ~2-5s per cached version, ~10-15s per cold clone.
- **Dev server.** Only the default version is hot-reloaded. Other versions are built once at dev server start and served statically. A `--all-versions` flag enables full dev mode for all versions (slower).

## Configuration

New `versions` field in `clearify.config.ts`:

```ts
import { defineConfig } from 'clearify';

export default defineConfig({
  name: 'My Library',
  docsDir: './docs',
  versions: [
    {
      label: 'v2',
      source: { docsDir: './docs' },
      default: true,
    },
    {
      label: 'v1',
      source: {
        git: { repo: '.', ref: 'v1.0.0', path: 'docs' },
      },
      status: 'deprecated',
    },
  ],
  sharedPages: ['CHANGELOG.md'],
});
```

Schema additions:

```ts
const VersionSourceSchema = z.object({
  docsDir: z.string().optional(),
  git: RemoteGitSourceSchema.optional(),
}).refine(d => d.docsDir || d.git, 'Either docsDir or git is required');

const VersionConfigSchema = z.object({
  label: z.string(),
  source: VersionSourceSchema,
  default: z.boolean().optional(),
  status: z.enum(['active', 'deprecated']).default('active'),
});
```

Validation: exactly one version must have `default: true`. Labels must be unique and URL-safe.

## Search

- **Separate index per version.** Each version produces its own `search-index-{label}.json` at build time.
- The search component loads only the active version's index.
- Search results display a version badge when the user has toggled "search all versions" (opt-in toggle in search modal).
- Unified search performs a merge-sort across all loaded indices, deduplicating by page path and preferring the default version.

## SEO

- **Canonical URLs** always point to the default version (no prefix). Non-default version pages include `<link rel="canonical" href="/getting-started">`.
- **`noindex` for deprecated versions.** Pages under a `status: 'deprecated'` version emit `<meta name="robots" content="noindex">`.
- **Sitemap.** One sitemap per version (`sitemap-v1.xml`, `sitemap-v2.xml`) plus a sitemap index. Only the default version's sitemap omits the version prefix.
- **`hreflang`-style version hints.** Each page emits `<link rel="alternate">` tags pointing to the same page in other versions, helping search engines understand the relationship.

## Migration Path

Adopting versioning on an existing Clearify site:

1. **No breaking changes.** If `versions` is omitted, behavior is identical to today (single unversioned site).
2. **Step 1: Tag your current release.** `git tag v1.0.0` on the commit representing your current docs.
3. **Step 2: Add the versions array.** Set the current working tree as `default: true`, add the tagged version as a non-default entry.
4. **Step 3: Build and verify.** Run `clearify build`. The default version's URLs are unchanged. The old version appears under `/v1/`.
5. **Existing links remain stable** because the default version has no URL prefix. No redirects needed for the happy path.
6. **Gradual adoption.** Projects can start with a single version entry (the current docs) and add historical versions later as they tag releases.

## Implementation Order

1. `VersionConfigSchema` + config validation (1 day)
2. Multi-version `resolveSections()` with parallel resolution (2 days)
3. Version-prefixed routing in Vite plugin (2 days)
4. Version switcher UI component (1 day)
5. Per-version sidebar rendering (1 day)
6. Per-version search index generation + search UI toggle (1 day)
7. SEO: canonical tags, sitemap generation, noindex for deprecated (1 day)
8. Dev server: default-version HMR + static serving of other versions (1 day)
9. Documentation and migration guide (0.5 days)

**Estimated total: ~10.5 dev days.**
