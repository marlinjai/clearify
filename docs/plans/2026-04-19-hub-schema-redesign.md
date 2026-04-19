---
title: Hub Schema Redesign (source/placement split)
type: plan
status: draft
date: 2026-04-19
tags: [clearify, hub, schema, breaking-change]
projects: [clearify]
summary: Decompose hub project mode into source (content) + placement (UI) axes, eliminating the inject/embed redundancy and unlocking the "cloned but external-canonical" case needed for standalone products.
---

# Hub Schema Redesign (source/placement split)

## The problem

Today's hub registry has one knob per project: `mode`, which is one of `link`, `embed`, `inject`. That single enum is trying to describe two independent things:

1. **Where does the content come from?** (nothing, a git clone, an external URL)
2. **How is it shown in the hub UI?** (just a card linking out, a full tab, nested inside an existing section)

Collapsing those two axes into one enum works for the three common combos today, but it breaks the moment you want any other combination. The case that broke it (2026-04-19) is real and not exotic:

- **Receipt OCR App** and **Email Editor** are standalone products. They have their own Cloudflare Pages site (`docs.receipts.lumitra.co`, `docs.email-editor.lumitra.co`). We want them listed on the ERP hub grid with a card that links to the external site (like `mode: 'link'`), but we also want their markdown pulled into the hub's search index so Marlin can search across everything from one place (like `mode: 'embed'`).

There is no value of `mode` that expresses this. `link` gives us the card but skips the clone. `embed` does the clone but takes over the URL (renders pages on `docs.lumitra.co/email-editor/...` instead of linking out). `inject` is the same problem, just nested differently.

We end up picking one or the other and losing the other half. For today we picked `link` (no search, just a card) because the standalone site is the canonical URL. But that means the hub's global search will never find "SMTP configuration" in the Email Editor docs. That's the real cost.

## What the two axes actually are

Looked at cleanly, every hub project has:

1. **source**: where the content comes from. Four values: `none` (no content pulled), `git` (clone a repo), `url` (fetch remote docs, not implemented yet), `inline` (markdown in the registry entry itself, also not implemented).
2. **placement**: how it shows up in the hub UI. Three values: `card` (grid entry only, click links out), `tab` (full tab in the hub nav, its own section tree), `nested` (folded into an existing hub section as a subfolder).

Those two axes are orthogonal. Any combination is meaningful:

| source | placement | What you get |
|--------|-----------|--------------|
| `none` | `card` | External link card, no docs pulled. (Today's `link` mode.) |
| `git` | `tab` | Clone sub-repo, render its `docs/public/` as a new tab. (Today's `embed` mode.) |
| `git` | `nested` | Clone sub-repo, overlay into an existing section. (Today's `inject` mode.) |
| `git` | `card` | **New.** Clone for search, render as a card linking to an external canonical URL. |
| `none` | `tab` | Useless in practice (empty tab). Ignore. |
| `none` | `nested` | Same, ignore. |
| `url` | `tab` | Future: render external OpenAPI spec or Markdown URL as a tab. |
| `inline` | `nested` | Future: write the docs directly in the registry entry. |

The new combo we need (`git` + `card`) is the whole reason we're doing this.

## Proposed schema

Discriminated unions for both axes. The TypeScript:

```typescript
// Where content comes from
export type HubProjectSource =
  | { kind: 'none' }
  | {
      kind: 'git';
      repo: string;
      ref?: string;           // branch, tag, or SHA. Default: 'main'
      path?: string;          // subdirectory to sparse-checkout. Default: 'docs/public'
      sparse?: boolean;       // defaults to true when path is set
    }
  | { kind: 'url'; url: string }           // reserved, not implemented
  | { kind: 'inline'; markdown: string };  // reserved, not implemented

// How it shows up in the hub UI
export type HubProjectPlacement =
  | { kind: 'card'; href: string }         // external link card, href is where the card goes
  | { kind: 'tab'; sections?: 'all' | 'public' | string[] }
  | { kind: 'nested'; into: string; docsPath?: string; group?: string };

export interface HubProject {
  name: string;
  description: string;
  status?: 'active' | 'beta' | 'planned' | 'deprecated';
  icon?: string;
  tags?: string[];
  group?: string;
  source: HubProjectSource;
  placement: HubProjectPlacement;
}
```

Two concrete examples under the new schema:

```typescript
// Standalone product: cloned for search, card links to external docs site
{
  name: 'Receipt OCR App',
  description: 'Receipt scanning & expense tracking with AI chat',
  status: 'active',
  source: {
    kind: 'git',
    repo: 'https://github.com/marlinjai/receipt-ocr-app.git',
    ref: 'main',
    path: 'docs/public',
  },
  placement: {
    kind: 'card',
    href: 'https://docs.receipts.lumitra.co',
  },
}

// First-party tab: full structure preserved as a hub tab
{
  name: 'Storage Brain',
  description: 'Edge-native file storage on Cloudflare Workers, R2, D1',
  status: 'active',
  source: {
    kind: 'git',
    repo: 'https://github.com/marlinjai/storage-brain.git',
    ref: 'main',
    path: 'docs/public',
  },
  placement: {
    kind: 'tab',
    sections: 'public',
  },
}
```

Clean, no overloading, extends naturally when we add `url` or `inline` sources later.

## Mapping from today's three modes

Every existing `mode` value maps to exactly one (source, placement) pair:

| Old `mode` | New `source.kind` | New `placement.kind` | Notes |
|-----------|-------------------|----------------------|-------|
| `link` | `none` | `card` | `href` moves from top level to `placement.href` |
| `embed` | `git` | `tab` | `git` block moves to `source`, `embedSections` becomes `placement.sections` |
| `inject` | `git` | `nested` | `git` block moves to `source`, `injectInto` becomes `placement.into`, `docsPath`/`group` move to `placement` |

The unlocked new combo (`git` + `card`) had no representation before. That's the whole point.

## Migration plan

### 1. Schema change in `src/types/index.ts`

Add the new `HubProjectSource` and `HubProjectPlacement` types. Keep the current `HubProject` shape around as `LegacyHubProject` under a `@deprecated` JSDoc tag. Runtime accepts both shapes for one release.

### 2. Normalization layer in `src/utils/hub.ts`

Add `normalizeHubProject(entry: HubProject | LegacyHubProject): HubProject` that:

1. If the entry already has `source` and `placement`, return it unchanged.
2. If it has the legacy `mode`/`git`/`href` fields, translate per the mapping table above. Emit a one-line warning: `⚠ Clearify hub: project "<name>" uses legacy mode field, migrate to source+placement (docs/plans/2026-04-19-hub-schema-redesign.md)`.
3. If it has neither, treat as `{ source: { kind: 'none' }, placement: { kind: 'card', href: '#' } }` and warn.

Every downstream consumer (`scanHubProjects`, registry writer, generator) reads through `normalizeHubProject`. No consumer reads `mode` directly after this change.

### 3. Update existing clearify.data.json

In the hub (ERP-suite) and any other registry file, rewrite every entry to the new shape. The old file is:

```json
{
  "name": "Storage Brain",
  "mode": "embed",
  "git": { "repo": "...", "ref": "main", "path": "docs/public" }
}
```

Becomes:

```json
{
  "name": "Storage Brain",
  "source": {
    "kind": "git",
    "repo": "...",
    "ref": "main",
    "path": "docs/public"
  },
  "placement": { "kind": "tab" }
}
```

A codemod script at `scripts/migrate-hub-schema.ts` takes a `clearify.data.json` path, reads, normalizes, writes. Runs idempotently (no-op if already new shape). Ship as part of the release for anyone else migrating.

### 4. CLI `init --hub` writes new shape

`src/node/hub-register.ts` emits `source` + `placement` directly. The legacy-shape branch is removed from the writer (reader keeps it for one release).

### 5. Deprecation timeline

- **v1.16.0**: ship the new schema, reader accepts both shapes, writer emits only new shape. Warning on read of legacy shape.
- **v1.17.0**: reader still accepts, louder warning with line number.
- **v2.0.0**: reader drops legacy shape. Removal is a major bump because downstream registry files may still have the old shape.

## Terraform module sketch

Once source + placement are discriminated unions, each project entry maps cleanly to a Terraform resource:

```hcl
resource "clearify_hub_project" "receipt_ocr" {
  hub_repo    = "marlinjai/ERP-suite"
  name        = "Receipt OCR App"
  description = "Receipt scanning & expense tracking with AI chat"
  status      = "active"
  icon        = "🧾"
  tags        = ["app", "ai", "ocr"]
  group       = "Applications"

  source {
    kind = "git"
    repo = "https://github.com/marlinjai/receipt-ocr-app.git"
    ref  = "main"
    path = "docs/public"
  }

  placement {
    kind = "card"
    href = "https://docs.receipts.lumitra.co"
  }
}
```

The provider writes this entry into the hub's `clearify.data.json` via a commit on a feature branch (or direct to main, configurable), opens a PR, and fires the dispatch. That's a later plan (depends on the IaC alignment plan landing), but the schema here is the one the provider needs. Keeping the two nested blocks instead of flattening keeps HCL readable and matches the TypeScript 1:1.

## Backwards-compat shim

Dynamic reader in `normalizeHubProject`:

```typescript
export function normalizeHubProject(entry: HubProject | LegacyHubProject): HubProject {
  if ('source' in entry && 'placement' in entry) {
    return entry;
  }

  const legacy = entry as LegacyHubProject;
  const mode = legacy.mode ?? (legacy.href ? 'link' : 'embed');

  console.warn(
    `[clearify hub] "${legacy.name}" uses legacy mode="${mode}". ` +
    `Migrate to source+placement (see docs/plans/2026-04-19-hub-schema-redesign.md).`
  );

  if (mode === 'link') {
    return {
      ...common(legacy),
      source: { kind: 'none' },
      placement: { kind: 'card', href: legacy.href ?? '#' },
    };
  }
  if (mode === 'embed') {
    return {
      ...common(legacy),
      source: gitFromLegacy(legacy.git!),
      placement: { kind: 'tab', sections: legacy.embedSections },
    };
  }
  if (mode === 'inject') {
    return {
      ...common(legacy),
      source: gitFromLegacy(legacy.git!),
      placement: {
        kind: 'nested',
        into: legacy.injectInto!,
        docsPath: legacy.docsPath,
        group: legacy.group,
      },
    };
  }

  throw new Error(`Unknown hub project shape for "${legacy.name}"`);
}
```

Accept old shape for one minor release (v1.16 -> v1.17). Remove in v2.0.

## Pros and cons

**Pros**

1. Unlocks the `git + card` combo we actually need today (standalone products with cloned-for-search docs).
2. Kills the `embed` vs `inject` redundancy: they were always "git source, different placement," not separate concepts.
3. Makes future sources (remote URL, inline markdown) trivially addable: new entry in the `source.kind` union, no enum bikeshedding.
4. Maps 1:1 to a Terraform resource with nested blocks, which makes the IaC plan (2026-04-19-clearify-iac-alignment.md) much cleaner.
5. Discriminated unions give exhaustiveness checks at compile time: `switch (placement.kind)` fails the build if you forget a case.

**Cons**

1. Breaking change for any external consumer that wrote directly against `HubProject.mode`. We control every known consumer today, but npm publishes this package, so we owe a major bump.
2. Every entry in `clearify.data.json` gets longer (two nested objects instead of one flat object). Readability is slightly worse for the simplest cases (pure link cards).
3. The normalization shim is extra code to maintain for one release cycle.
4. We pay a small migration cost in every hub registry file at once, not just ours.

None of those are blockers. The `git + card` gap is a real one, not hypothetical, and the alternative (another ad-hoc boolean like `cloneOnly: true` on top of `mode`) would rot faster.

## Open questions

1. Should `placement: { kind: 'tab' }` default `sections` to `'public'`, or require it? Current `embed` leaves it implicit and defaults to `'public'`. Keep that default.
2. What does the grid card show for a `placement: 'tab'` project? Today `embed` projects get both a grid card and a tab. Keep that behavior. The grid is a navigation aid regardless of placement.
3. Do we expose `source.kind = 'url'` and `'inline'` in the types now, or wait? Expose in types (documented as "reserved"), reject at the normalizer level with a "not implemented" error for now. Cheap way to lock in the shape.

## Dependencies

- **Depends on**: nothing. This is a pure schema/type change with a shim.
- **Unblocks**: 2026-04-19-clearify-iac-alignment.md (the Terraform module is much cleaner against the new schema).
- **Related**: 2026-04-18-hub-provisioning-paths.md (secret provisioning is orthogonal, but the init flow writes in the new shape going forward).
