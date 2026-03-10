---
title: "Visual Config Editing — Design & Implementation Plan"
summary: Split Clearify config into a machine-writable data layer (JSON) and a code layer (TS), then build an integrated admin panel for managing hub projects, sections, and settings — first in dev-mode, later via a Git gateway on deployed sites.
category: plan
tags: [clearify, config, admin-ui, git-gateway, hub]
projects: [clearify]
status: active
date: 2026-03-09
---

# Visual Config Editing — Design & Implementation Plan

> Status: **Active** | Created: 2026-03-09

## Problem

Clearify's configuration lives in a single `clearify.config.ts` file. This works well for developers, but creates friction for:

1. **Non-IDE workflows** — adding a hub project means opening a code editor, understanding the schema, and writing TypeScript. There's no visual way to manage the doc hub.
2. **Programmatic mutation** — the TS config is expressive but not safely machine-writable. Any UI that wants to update config would need to parse, modify, and re-serialize TypeScript AST — fragile and lossy.
3. **Git-backed editing** — the in-place editing plan (2026-03-03) establishes the pattern of editing content from deployed sites. Config changes (add a project, toggle a section's draft flag) should follow the same model.

## Goal

Enable any Clearify adopter to manage hub projects, sections, and site settings from a built-in admin panel — during local development immediately, and on deployed sites via a Git gateway in a later phase.

## Design Decisions (from brainstorm)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target user | All Clearify adopters | First-class feature, not internal tooling |
| Editable scope | Tier 1 (data) + Tier 2 (settings) | Hub projects, sections, theme, links, logo. Code-level config (CSS, head tags, nav overrides) stays in TS |
| Data format | Plain JSON | Machine-writable, clean Git diffs, zero deps. Humans who want to hand-edit use the TS file |
| Config relationship | Auto-merge with JSON-wins | `loadUserConfig()` finds `clearify.data.json` alongside TS config, deep-merges. JSON fields override TS for data/settings. No explicit import required |
| Admin UI delivery | Built into theme | `/admin` route ships with Clearify. Dev-mode: always available. Production: available when Git gateway is configured |
| Dev-mode transport | REST on Vite dev server | `/__clearify/api/*` endpoints. File write triggers Vite watcher → hot reload for free |
| Auth model | None (dev) → shared secret → OAuth | Phased: localhost is trusted, env var for early gateway, GitHub OAuth later |

## Architecture

### Config Layer Split

```
clearify.config.ts          ← code-level config (Tier 3)
  - customCss, headTags
  - navigation overrides
  - openapi config
  - plugin hooks (future)
  - mermaid strategy

clearify.data.json          ← machine-writable data (Tiers 1 + 2)
  - name, siteUrl
  - theme (primaryColor, mode)
  - logo, links
  - sections[]
  - hub { scan, projects[] }
```

**Merge semantics:** `loadUserConfig()` loads both files. For fields present in both, JSON wins. The TS config acts as a base with code-level extensions; the JSON file is the authoritative source for data fields.

**Precedence example:**
```
clearify.config.ts:  { name: "Docs", theme: { mode: "dark" }, customCss: "..." }
clearify.data.json:  { name: "ERP Suite", theme: { primaryColor: "#10B981" } }
result:              { name: "ERP Suite", theme: { primaryColor: "#10B981", mode: "dark" }, customCss: "..." }
```

JSON wins for `name`. Theme is deep-merged with JSON values taking precedence. `customCss` only exists in TS, passes through unchanged.

### JSON Schema

Ship a generated JSON Schema at `node_modules/@marlinjai/clearify/config-schema.json`, derived from the existing Zod schemas. This gives:
- VS Code autocomplete and inline validation for hand-editing
- Runtime validation in the admin UI
- Documentation of every field

The `clearify.data.json` file references it:
```json
{
  "$schema": "./node_modules/@marlinjai/clearify/config-schema.json",
  "name": "ERP Suite",
  ...
}
```

### Admin Panel Architecture

```
/admin (client route, React)
  ├── ProjectsManager       — CRUD hub projects, mode/inject config
  ├── SectionsManager       — add/edit/reorder sections
  ├── SiteSettings          — name, theme, logo, links
  └── ConfigPreview         — JSON diff before save

Dev-mode:
  Browser  →  POST /__clearify/api/config  →  write clearify.data.json  →  Vite watcher  →  HMR reload

Git gateway (future):
  Browser  →  POST /__clearify/api/config  →  GitHub API commit  →  CI rebuild  →  deploy
```

### Dev-Mode API Endpoints

Added as Vite dev server middleware in the existing `configureServer()` hook:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/__clearify/api/config` | Read current resolved config (merged TS + JSON) |
| `GET` | `/__clearify/api/config/data` | Read raw `clearify.data.json` |
| `PUT` | `/__clearify/api/config/data` | Write full `clearify.data.json` (atomic write + Zod validation) |
| `PATCH` | `/__clearify/api/config/data` | Partial update (deep-merge into existing JSON) |
| `GET` | `/__clearify/api/config/schema` | Serve the JSON Schema |
| `GET` | `/__clearify/api/fs/dirs?root=.` | Browse directories (for docsDir picker in dev-mode) |

All endpoints return JSON. Write endpoints validate against the Zod schema before writing. On validation failure, return 400 with structured errors.

### Sections in the Data File

Sections are included in `clearify.data.json` because they're pure data (label, docsDir, basePath, draft). The admin UI is context-aware:

- **Dev-mode:** all fields editable, directory picker for `docsDir`
- **Git gateway:** `docsDir` shown as read-only display field (it's a repo-relative path). Label, basePath, draft are editable.

### File Write Strategy

To prevent corruption:
1. Validate payload against Zod schema
2. Write to `clearify.data.json.tmp`
3. `rename()` atomically to `clearify.data.json`
4. Vite watcher fires → virtual modules invalidate → client reloads

## Implementation Phases

### Phase 1 — Data Layer Foundation

**Goal:** Split config into TS + JSON. Everything works as before, with a new optional file.

**Files to modify:**

#### `src/core/config.ts`
- Add `loadDataConfig(root)` function:
  - Looks for `clearify.data.json` in `root`
  - Parses with `JSON.parse`, validates against a new `ClearifyDataSchema` (subset of `ClearifyConfigSchema` — Tiers 1 + 2 fields only)
  - Returns parsed object or `{}`
- Modify `loadUserConfig(root)`:
  - Call `loadDataConfig(root)` alongside TS config loading
  - Deep-merge with JSON-wins semantics for data fields
  - Return merged config
- Add `writeDataConfig(root, data)` function:
  - Validate against `ClearifyDataSchema`
  - Atomic write (tmp + rename)
- Add `ClearifyDataSchema` — Zod schema for the JSON file (reuses existing sub-schemas):
  ```typescript
  const ClearifyDataSchema = z.object({
    name: z.string().optional(),
    siteUrl: z.string().optional(),
    theme: z.object({
      primaryColor: z.string().optional(),
      mode: z.enum(['light', 'dark', 'auto']).optional(),
    }).optional(),
    logo: z.object({
      light: z.string().optional(),
      dark: z.string().optional(),
    }).optional(),
    links: z.record(z.string(), z.string()).optional(),
    sections: z.array(SectionConfigSchema).optional(),
    hub: HubConfigSchema,
  });
  ```

#### `src/types/index.ts`
- Export `ClearifyDataConfig` type (inferred from `ClearifyDataSchema`)

#### Build script / `package.json`
- Add `zod-to-json-schema` dev dependency
- Add build step to generate `config-schema.json` from `ClearifyDataSchema`
- Include schema in package `exports`

#### Migration
- Create `clearify.data.json` for ERP Suite with hub projects + sections extracted from TS config
- Slim down `clearify.config.ts` to code-level fields only

**Verification:**
- `clearify dev` and `clearify build` produce identical output before/after split
- VS Code shows autocomplete in the JSON file
- Removing the JSON file falls back to TS-only config (backwards compatible)

### Phase 2 — Dev-Mode Admin Panel

**Goal:** `/admin` route with CRUD for hub projects, REST API on dev server.

**Files to create:**

#### `src/theme/admin/AdminLayout.tsx`
- Shell layout for admin pages: sidebar nav, header with "back to docs" link
- Only rendered in dev-mode (checked via `import.meta.env.DEV` or a virtual module flag)

#### `src/theme/admin/ProjectsManager.tsx`
- Table/card list of hub projects
- Add/edit modal: form fields for name, description, icon, mode (link/embed/inject), git repo, group, injectInto, docsPath
- Delete with confirmation
- Calls `PATCH /__clearify/api/config/data` on save

#### `src/theme/admin/SectionsManager.tsx`
- List of sections with drag-to-reorder
- Edit modal: label, docsDir (with directory picker in dev-mode), basePath, draft toggle
- Add/remove sections

#### `src/theme/admin/SiteSettings.tsx`
- Form for name, siteUrl, theme color picker, theme mode toggle, logo paths, links key-value editor

#### `src/theme/admin/ConfigPreview.tsx`
- Shows JSON diff (before → after) before confirming a write
- Uses a simple inline diff view (no heavy dependency)

**Files to modify:**

#### `src/vite-plugin/index.ts`
- In `configureServer()`: register `/__clearify/api/*` middleware
  - Parse JSON body
  - Route to `loadDataConfig` / `writeDataConfig`
  - Add `/__clearify/api/fs/dirs` endpoint (reads directory listing, dev-mode only)
- In `load()` virtual module handler: add `virtual:clearify/admin-enabled` that exports `true` in dev, `false` in prod

#### `src/client/App.tsx`
- Add `/admin/*` route, lazy-loaded
- Gate on `virtual:clearify/admin-enabled`

#### `src/theme/Sidebar.tsx` or `Header.tsx`
- Add admin gear icon / link in dev-mode

**Verification:**
- Navigate to `/admin` during `clearify dev`
- Add a hub project via the UI → `clearify.data.json` updates → sidebar/homepage reflects change
- `/admin` route returns 404 in production builds

### Phase 3 — Settings & Polish

**Goal:** Complete Tier 2 editing, validation feedback, better UX.

**Additions:**
- Color picker component for theme.primaryColor
- Logo upload (writes file to docsDir, updates path in JSON)
- Links manager (add/remove key-value pairs)
- Inline Zod validation errors displayed next to form fields
- Config diff preview as a confirmation step before every write
- Undo/redo in admin session (in-memory, revert to last known JSON state)
- Toast notifications on save success/failure

**Files to modify:**
- Admin components from Phase 2
- Possible new shared components: `ColorPicker.tsx`, `KeyValueEditor.tsx`, `DiffView.tsx`

### Phase 4 — Git Gateway (Deployed Editing)

**Goal:** Config editing from deployed sites via Git API.

**Files to create:**

#### `src/core/git-gateway.ts`
- `GitGateway` interface:
  ```typescript
  interface GitGateway {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string, message: string): Promise<{ sha: string }>;
    createBranch(name: string, from?: string): Promise<void>;
    createPR(title: string, body: string, branch: string): Promise<{ url: string }>;
  }
  ```
- `GitHubGateway` implementation using GitHub REST API (`@octokit/rest` or plain `fetch`)
- Auth: reads `CLEARIFY_ADMIN_SECRET` env var for bearer token validation
- Git identity: configurable commit author, or derived from GitHub token

#### `src/core/gateway-middleware.ts`
- Express-style middleware that:
  - Checks auth (shared secret from env var)
  - Routes `/__clearify/api/config/data` to gateway read/write instead of filesystem
  - Optionally creates PRs instead of direct commits (configurable)

**Files to modify:**

#### `src/types/index.ts`
- Add `gateway` config field:
  ```typescript
  gateway?: {
    provider: 'github';
    repo: string;         // owner/repo
    branch?: string;      // default: 'main'
    configPath?: string;  // default: 'clearify.data.json'
    mode?: 'direct' | 'pr'; // direct commit or create PR
  }
  ```

#### `src/vite-plugin/index.ts` (or a separate build plugin)
- In production builds with gateway configured: include admin routes, gateway middleware
- Serve admin panel at `/admin` behind auth check

#### `src/theme/admin/AdminLayout.tsx`
- Show "Creating PR..." vs "Saving..." based on gateway mode
- Show commit SHA / PR link after successful save

**Configuration example:**
```json
{
  "gateway": {
    "provider": "github",
    "repo": "marlinjai/erp-suite",
    "mode": "pr"
  }
}
```

**Auth flow:**
1. User navigates to `/admin`
2. Prompted for admin secret (stored in session/cookie)
3. On save: API validates secret → calls GitHub API with a server-side PAT (separate from user's secret)
4. Future: replace shared secret with GitHub OAuth for user-level identity

**Verification:**
- Deploy docs site with gateway configured
- Navigate to `/admin`, authenticate
- Edit a hub project → PR created on GitHub with `clearify.data.json` change
- Merge PR → CI rebuilds → change visible on site

## Data File Example

```json
{
  "$schema": "./node_modules/@marlinjai/clearify/config-schema.json",
  "name": "ERP Suite",
  "siteUrl": "https://docs.lumitra.co",
  "theme": {
    "primaryColor": "#3B82F6",
    "mode": "auto"
  },
  "logo": {
    "light": "./assets/logo-light.svg",
    "dark": "./assets/logo-dark.svg"
  },
  "links": {
    "github": "https://github.com/marlinjai/erp-suite"
  },
  "sections": [
    { "label": "Documentation", "docsDir": "./docs/public" },
    { "label": "Internal", "docsDir": "./docs/internal", "basePath": "/internal", "draft": true }
  ],
  "hub": {
    "scan": "./projects/**/clearify.config.ts",
    "projects": [
      {
        "name": "Clearify",
        "description": "Documentation framework",
        "icon": "book",
        "mode": "inject",
        "injectInto": "Documentation",
        "docsPath": "docs/public",
        "git": { "repo": "https://github.com/marlinjai/clearify.git" },
        "group": "Tooling"
      },
      {
        "name": "Data Table",
        "description": "Headless data table engine",
        "icon": "table",
        "mode": "inject",
        "injectInto": "Documentation",
        "docsPath": "docs",
        "git": { "repo": "https://github.com/marlinjai/marlinjai-data-table.git" }
      },
      {
        "name": "Session Dashboard",
        "description": "Claude Code session analytics",
        "icon": "chart",
        "group": "Tooling",
        "href": "https://github.com/marlinjai/claude-session-dashboard"
      }
    ]
  }
}
```

## Corresponding TS Config (After Split)

```typescript
// clearify.config.ts — code-level config only
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  customCss: './assets/custom.css',
  headTags: ['<link rel="icon" href="/favicon.svg" />'],
  mermaid: { strategy: 'build' },
  openapi: {
    spec: './openapi.yaml',
    basePath: '/api',
  },
});
```

## Deep-Merge Algorithm

```typescript
function deepMergeJsonWins(base: Record<string, any>, json: Record<string, any>): Record<string, any> {
  const result = { ...base };
  for (const key of Object.keys(json)) {
    if (json[key] !== undefined) {
      if (isPlainObject(base[key]) && isPlainObject(json[key])) {
        result[key] = deepMergeJsonWins(base[key], json[key]);
      } else {
        result[key] = json[key]; // JSON wins
      }
    }
  }
  return result;
}
```

Arrays are not merged — JSON replaces the entire array. This is intentional: `hub.projects` in JSON is the authoritative list, not an append to the TS config's list.

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Config merge surprises | User confusion when TS and JSON conflict | Clear docs, console warning when a TS field is overridden by JSON. Admin UI shows the resolved value with source annotation |
| Corrupt JSON write | Broken site | Atomic write (tmp + rename), Zod validation before write, backup of previous version |
| Admin panel bundle size | Larger production builds | Admin routes are lazy-loaded and tree-shaken in production when gateway is not configured |
| Git gateway auth leak | Unauthorized config changes | Shared secret is server-side only, never sent to client. Rate limiting on auth endpoint |
| Schema drift | JSON Schema out of sync with Zod | Schema generated from Zod at build time, not hand-maintained |

## Open Questions

1. **Should `clearify init` generate a JSON file instead of (or alongside) the TS config?** Likely yes for Phase 1 — lower barrier for new users.
2. **Multiple data files?** e.g. `clearify.hub.json` + `clearify.theme.json` for separation of concerns. Probably not worth the complexity — single file is simpler.
3. **Config versioning in the JSON file?** A `"version": 1` field for future schema migrations. Low cost to add, good insurance.
