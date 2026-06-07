---
title: Plans Inventory: 2026-04-18
type: documentation
status: draft
summary: Snapshot of every plan in docs/plans/ against current implementation state, overlaps, and recommended archiving actions.
date: 2026-04-18
tags: [audit, plans, housekeeping]
---

# Plans Inventory: 2026-04-18

## TL;DR

Eleven plan files + one internal design doc. Counts: **2 shipped**, **1 partially shipped** (OpenAPI renderer: Phase 1 done, Phases 2/3 became separate draft plans), **1 in-progress** (hub-evolution: status decided, code landed but Definition-of-Done partially met), **6 drafts** covering v2.x/v3.0 speculative work, **0 abandoned**, **1 superseded** (the 2025-02-08 design in docs/internal). Biggest surprise: the 2026-03-09 visual-config-editing design was fully implemented in v1.12 (admin panel, clearify.data.json, config schema, /admin routes, dev-server API) but the plan still carries `status: draft`. The two Phase 2/3 OpenAPI plans (auth-ui, try-it) and the entire v3.0 stack (AI, plugins, edge preview, versioned docs, diagram editor, in-place editing) are all pure design docs with zero implementation signal. The oldest drafts (visual-diagram-editor 2026-03-01, in-place-editing 2026-03-03) are ~45 days old but still present on the roadmap, so they are not abandoned, just parked.

## Per-plan status

### 2026-02-16-custom-openapi-renderer-design.md

- **Title**: Custom OpenAPI Reference Renderer for Clearify
- **Date / declared status**: 2026-02-16, frontmatter `status: draft` (body says "Approved")
- **Classification**: **shipped (Phase 1)**, with Phase 2 (Try It Out) and Phase 3 (Auth) split into separate draft plans
- **Evidence**:
  - All components live at `src/theme/components/openapi/`: `ApiHeader.tsx`, `TagGroup.tsx`, `OperationCard.tsx`, `ParameterTable.tsx`, `SchemaViewer.tsx`, `CodeExamples.tsx`, `ResponseList.tsx`, `MethodBadge.tsx`, `generate-snippets.ts`, `index.ts` (mtime 2026-02-27)
  - `@scalar/openapi-parser` present in `package.json:36`; `@scalar/api-reference-react` absent
  - `dereference` used at `src/vite-plugin/index.ts:11`
  - CHANGELOG 1.6.0 (2026-02-16) matches the design 1:1
  - ROADMAP `v1.6` section lists every component as done
- **Notes**: Design doc's Phase 2/3 sketches (TryItPanel, AuthManager) were extracted into `2026-03-08-openapi-auth-ui-design.md` (and an implicit Try-It plan on the roadmap). Current frontmatter `status: draft` is wrong for Phase 1. `openapi-snippet` was never installed: the plan's Task 1 called for it but Clearify shipped a homegrown `generate-snippets.ts` instead.

### 2026-02-16-custom-openapi-renderer-plan.md

- **Title**: Custom OpenAPI Reference Renderer: Implementation Plan
- **Date / declared status**: 2026-02-16, `status: draft`
- **Classification**: **shipped**
- **Evidence**: same as design doc (same feature). Task 1 dependency swap partially divergent (no `openapi-snippet`, wrote `generate-snippets.ts` instead). Tasks 2 through 8 all produced the files listed under the plan's "Files to create" bullets.
- **Notes**: The plan and design are a pair covering the same v1.6 feature; both should transition to `completed` (or be archived together).

### 2026-03-01-visual-diagram-editor-plan.md

- **Title**: Visual Diagram Editor & Whiteboard: Implementation Plan
- **Date / declared status**: 2026-03-01, `status: draft`
- **Classification**: **decided-not-started** (leaning toward parked draft)
- **Evidence**:
  - No matches for `DiagramEditor`, `clearify-diagram`, `remark-diagram`, `@xyflow/react`, or `ReactFlow` anywhere under `src/`
  - No `@xyflow/react` entry in `package.json`
  - No `src/theme/components/diagram/` directory (only existing diagram file is the Mermaid renderer: `src/core/mermaid-renderer.ts`)
  - No references in CHANGELOG or ROADMAP to this feature
- **Notes**: The plan mentions a companion design doc at `docs/plans/2026-03-01-visual-diagram-editor-design.md` ("to be created") that was never created. Feature is not on the roadmap. ~48 days old. Could be archived.

### 2026-03-03-in-place-editing-plan.md

- **Title**: In-Place Documentation Editing: Implementation Plan
- **Date / declared status**: 2026-03-03, `status: draft`
- **Classification**: **decided-not-started** (on roadmap as v2.5)
- **Evidence**:
  - No matches for `Editor.tsx`, `EditButton.tsx`, `__clearify/save`, `CodeMirror`, or `editing:` config in `src/`
  - ROADMAP `v2.5` (lines 179-205) references this plan explicitly and lists Phase 1/2/3 as unchecked items
  - No `editing` field in the Zod config schema at `src/core/config.ts`
- **Notes**: Kept alive on the roadmap. The roadmap's v2.5 Phase 3 references a Worker package `@marlinjai/clearify-edge` detailed in `2026-03-08-edge-preview-layer-design.md`: the two are complementary.

### 2026-03-08-ai-integration-design.md

- **Title**: AI-Native Documentation Features
- **Date / declared status**: 2026-03-08, `status: draft`
- **Classification**: **draft** (v2.1/v3.0 speculative)
- **Evidence**:
  - No matches for `llms.txt`, `mcp-server`, `llms-full`, `markdownExport`, `vectors.json`, or `RAG` under `src/`
  - ROADMAP lists `llms.txt` under v2.1 Power Features (line 172) and AI chat / MCP / summaries under v3.0 (lines 209-213)
  - `ai:` is not a field in the Zod config schema
- **Notes**: Missing `summary` field in frontmatter. Five distinct capabilities are bundled in one doc; they should probably be split when picked up (llms.txt is ~1-day work per plan; chat is a 2-week project).

### 2026-03-08-edge-preview-layer-design.md

- **Title**: Edge Preview Layer: Detailed Design (v2.5 Phase 3)
- **Date / declared status**: 2026-03-08, `status: draft`
- **Classification**: **draft** (blocked by v2.5 Phase 2)
- **Evidence**:
  - No KV / Worker / JWT / wrangler code under `src/`
  - Explicitly depends on Phase 2 (git-backed editing) which is itself unstarted
  - ROADMAP v2.5 Phase 3 (lines 197-205) matches this design
- **Notes**: Missing `summary` field in frontmatter. Describes a `@marlinjai/clearify-edge` package that does not exist. Correctly gated behind "only build this when demand warrants."

### 2026-03-08-openapi-auth-ui-design.md

- **Title**: OpenAPI Auth Management UI Design
- **Date / declared status**: 2026-03-08, `status: draft`
- **Classification**: **draft** (blocked by Try-It Out v2.0)
- **Evidence**:
  - No matches for `AuthPanel`, `TryItPanel`, `AuthProvider`, `useAuth`, `OAuth2Flow`, or `TokenInput` in `src/`
  - ROADMAP v2.0 section (lines 137-150) lists both Try-It and AuthManager as unchecked items
  - `openapi.auth` is not in the Zod config schema
- **Notes**: Missing `summary` field in frontmatter. Header says "Depends on: Try It Out panel (v2.0, in progress)" but there is no evidence Try-It is in progress (no `TryItPanel.tsx` anywhere).

### 2026-03-08-plugin-system-design.md

- **Title**: v3.0 Plugin System Design
- **Date / declared status**: 2026-03-08, `status: draft`
- **Classification**: **draft** (v3.0 ecosystem)
- **Evidence**:
  - No `ClearifyPlugin` type, no `plugins: []` config field, no `transformMarkdown` / `wrapLayout` / `addComponents` hook surface in `src/`
  - The sole match for `ClearifyPlugin` is `ClearifyPluginOptions` in `src/vite-plugin/index.ts:49`: that is Clearify's internal Vite plugin, unrelated to the design
  - ROADMAP v3.0 (line 221) names "Plugin system" as an unchecked item
- **Notes**: Missing `summary` field in frontmatter. Companion to the AI plan in that it calls for internal features (Mermaid, search, OpenAPI, changelog) to be refactored as plugins: a huge architectural shift.

### 2026-03-08-versioned-docs-architecture.md

- **Title**: Versioned Documentation Architecture
- **Date / declared status**: 2026-03-08, `status: draft`
- **Classification**: **draft** (v2.1)
- **Evidence**:
  - No matches for `versions`, `VersionConfigSchema`, `VersionSourceSchema`, or `sharedPages` under `src/`
  - ROADMAP v2.1 Content Management (line 163): "Versioned docs: version switcher, separate content per version" is unchecked
  - The plan calls for reusing `core/remote`, which does exist (`src/core/remote.ts`)
- **Notes**: Missing `summary` field in frontmatter. The Option C (hybrid) approach sensibly builds on the shipped remote-sections infra.

### 2026-03-09-visual-config-editing-design.md

- **Title**: Visual Config Editing: Design & Implementation Plan
- **Date / declared status**: 2026-03-09, `status: draft` (body header says "Active")
- **Classification**: **shipped** (Phases 1-3 done, Phase 4 git gateway not done)
- **Evidence**:
  - Config split: `loadDataConfig`, `writeDataConfig`, `ClearifyDataSchema`, `deepMergeJsonWins` at `src/core/config.ts:118,170,182,301`
  - API endpoints: `/__clearify/api/config`, `/__clearify/api/config/data` (GET/PUT/PATCH), `/__clearify/api/config/schema`, `/__clearify/api/fs/dirs` all present in `src/vite-plugin/index.ts:560-625`
  - Admin routes in `src/client/App.tsx:99-112` (lazy-loaded AdminLayout, AdminDashboard, ProjectsManager, SectionsManager, SiteSettings)
  - Components exist: `src/theme/admin/{AdminDashboard,AdminLayout,ProjectsManager,SectionsManager,SiteSettings}.tsx` + `src/theme/admin/components/{ConfigPreview,ConfirmDialog,FormField,Modal,Toast}.tsx`
  - Virtual module `virtual:clearify/admin-enabled` at `src/vite-plugin/index.ts:34`
  - Public docs exist at `docs/public/admin-panel.md` and `docs/public/configuration.md` (Config File Split section)
  - CHANGELOG v1.12.0 (2026-03-10): "add admin panel for visual config editing"
  - Schema generation: `scripts/generate-schema.mjs` + `exports["./config-schema.json"]` in `package.json:18`
  - Phase 4 (git gateway): no `src/core/git-gateway.ts`, no `GitHubGateway`, no `gateway` config field
- **Notes**: Frontmatter still says `draft` but the implementation shipped in v1.12. The only remaining phase is Phase 4 (deployed git gateway), which overlaps conceptually with the hub-evolution plan's GitHub API work.

### hub-evolution.md

- **Title**: Hub Evolution: Self-Registration & Sparse Sync
- **Date / declared status**: 2026-04-07, `status: decided`
- **Classification**: **in-progress / mostly shipped** (Definition of Done partially met, plan still relevant)
- **Evidence**:
  - Task 1 (clearify init hub registration): `src/node/hub-register.ts` (12.3KB, mtime 2026-04-18) with GitHub device-flow OAuth (`githubDeviceAuth`), `updateHubRegistry`, `generateConfig`, dispatch workflow generator. Wired in from `src/node/init.ts:317,328`. `--hub` CLI flag in `src/cli/index.ts:50`
  - Task 2 (sparse checkout default): `src/core/remote.ts:43` sets `sparse = source.sparse !== false`. Sparse clone path at `remote.ts:72-83`
  - CHANGELOG v1.14.0 (2026-04-07): "simplify hub-register: remove secret encryption, delegate to Terraform"
  - Public docs: `docs/public/hub-model.md` covers embed / link / inject modes, sparse checkout, dispatch pipeline (but uses `clearify init --hub`, not a standalone prompt)
  - Task 3-6 (migrate hub registry, simplify hub CI workflow, retire standalone sites, infra docs trigger): these are downstream repo changes (ERP-suite, storage-brain, brain-core, data-brain, infra), not changes to the Clearify repo itself, so they cannot be verified from this codebase
- **Notes**: The 2026-04-07 commit note "remove secret encryption, delegate to Terraform" signals an explicit design pivot from the plan as written (original plan had libsodium sealing + GitHub Secrets API). The plan's "Do Not Re-Discuss" decisions list still mentions direct secrets API usage. Status `decided` is correct but could move to `in-progress` or `completed` depending on which tasks have landed in consuming repos.

### docs/internal/2025-02-08-clearify-design.md

- **Title**: Clearify: Design Document
- **Date / declared status**: 2025-02-08, frontmatter `status: superseded`, `type: documentation`
- **Classification**: **superseded** (by CHANGELOG.md + ROADMAP.md + public configuration docs)
- **Evidence**: The design doc describes the v0.1 goals and architecture; the actually-shipped Clearify is v1.14.1 with ~10x more surface area (SSG, SEO, Hub Mode, OpenAPI renderer, Admin panel, Remote Git Sections). Frontmatter already marks it superseded.
- **Notes**: Fine as-is: serves as a historical reference. `status: superseded` is not one of the canonical lifecycle values (canonical set: draft / decided / in-progress / completed / archived / rejected) but is self-explanatory and close enough to `archived`.

### docs/internal/decisions/2026-03-09-roadmap-convention.md

- **Title**: Decision: Root-Level ROADMAP.md Convention
- **Date / declared status**: 2026-03-09, `status: draft`, `type: plan`
- **Classification**: **shipped**
- **Evidence**:
  - CHANGELOG v1.11.0 (2026-03-09): "auto-detect and render ROADMAP.md at /roadmap"
  - ROADMAP.md exists at repo root, served at /roadmap
  - Grep for `ROADMAP.md` / `/roadmap` hits `src/node/init.ts`, `src/vite-plugin/index.ts`, `src/node/build.ts`, `src/core/navigation.ts`, `src/node/check.ts` (five files)
- **Notes**: Frontmatter lists `type: plan` but this is an ADR / decisions doc. The decision was implemented the same day it was recorded. Could move to `status: completed` or `status: decided`.

## Overlap map

| Plan A | Plan B | Subsystem | Relationship |
|---|---|---|---|
| 2026-03-01 visual-diagram-editor | 2026-03-03 in-place-editing | In-browser editing of markdown files via dev-server save endpoint | Complementary: both want a `POST /__clearify/save`-style middleware. Diagram editor writes fenced code blocks, in-place editor writes whole files. Same infra primitive. |
| 2026-03-03 in-place-editing | 2026-03-09 visual-config-editing | Dev-server write-back API, git-gateway, admin UI | Complementary: visual-config-editing shipped the `/__clearify/api/config/*` pattern that in-place-editing Phase 1 proposed. A future Phase 2 git gateway would be shared. |
| 2026-03-03 in-place-editing (Phase 3) | 2026-03-08 edge-preview-layer | Cloudflare Worker + KV instant preview | Contradictory in status, complementary in design: the edge-preview design is explicitly the detailed design of in-place-editing's Phase 3. Edge preview should be merged into the in-place-editing plan or cross-linked. |
| 2026-03-08 plugin-system | 2026-03-08 ai-integration | Plugin hooks to deliver features (llms.txt, MCP, chat) as plugins | Complementary / depends-on: AI features could ship as internal plugins once the plugin system exists; alternatively they ship as core features first, and the plugin system refactors them later. |
| 2026-03-08 plugin-system | 2026-03-01 visual-diagram-editor | Plugin hooks (`addComponents`, `transformMarkdown`) | Complementary: diagram editor could ship as an internal `@clearify/plugin-diagram` once the plugin system is extracted (mirrors the Mermaid plan). |
| 2026-03-08 versioned-docs | 2026-03-08 edge-preview-layer | Multi-source content resolution at the edge | Mild conflict: versioned-docs assumes pure static build output (per-version sitemaps, canonical tags); edge-preview assumes a Worker fronts all traffic. Compatible but someone will have to reconcile when both ship. |
| 2026-03-08 versioned-docs | hub-evolution | Multi-source doc aggregation via `RemoteGitSource` | Complementary: both build on `core/remote.ts`. Versioned-docs is about one repo with multiple refs; hub-evolution is about multiple repos with one ref each. Same infra, different dimensions. |
| 2026-02-16 openapi-renderer-design | 2026-02-16 openapi-renderer-plan | Same feature (design vs implementation) | Duplicate-ish pair: the plan is the step-by-step of the design. Both shipped. |
| 2026-02-16 openapi-renderer-design (Phase 2/3) | 2026-03-08 openapi-auth-ui | Auth management in OpenAPI pages | Complementary: openapi-auth-ui is the detailed expansion of the original design's Phase 3. |
| 2026-03-08 openapi-auth-ui | (implicit Try-It plan, v2.0) | Client-side credentials injected into API requests | Depends-on: auth UI only makes sense after Try-It is built. No Try-It plan file currently exists; it's only a ROADMAP entry. |

## Mutually exclusive plans

No pair of plans proposes architecturally incompatible approaches. The closest is:

- **2026-03-03 in-place-editing Phase 2 vs Phase 3** (within the same plan): Phase 2 is pure browser-to-GitHub-API (zero Clearify backend), Phase 3 is Worker-middleware-in-front-of-static-assets. Phase 3 supersedes Phase 2 only for Cloudflare deployments; for every other deployment target Phase 2 remains the approach. Not strictly exclusive but architecturally divergent.

- **2026-03-08 versioned-docs Option A vs B vs C**: The plan itself picks Option C (hybrid). Options A (folder-based) and B (branch-based) are analysis, not competing plans.

- **2026-03-09 visual-config-editing's JSON-wins merge semantics vs TypeScript AST mutation**: the plan explicitly argues for JSON sidecar over in-place TS mutation. Not mutually exclusive with any other plan.

## Blocked-by chains

1. **openapi-auth-ui (v2.0)** depends on Try-It Panel (v2.0, no plan file, only ROADMAP item). Try-It depends on a `proxyUrl` config option that is also only on the roadmap.
2. **edge-preview-layer (v2.5 Phase 3)** depends on **in-place-editing Phase 2 (git-backed)**, which depends on **Phase 1 (local dev editing)**, none of which have landed.
3. **ai-integration chat widget** depends on a vector-store subsystem (`_clearify/vectors.json`) and optionally a deployed Worker: both unstarted. Llms.txt and markdown-export have no dependencies and could ship today.
4. **plugin-system** indirectly blocks the "Mermaid as plugin / OpenAPI as plugin" refactor called for in its own "Built-in Plugins" section. No user-facing feature currently blocks on it.
5. **versioned-docs** depends only on `core/remote.ts` (shipped), so it is independently buildable.
6. **hub-evolution Task 3 onwards** depends on coordinated changes across ERP-suite, storage-brain, brain-core, data-brain, and infra repos: the Clearify package changes are shipped, the ecosystem migration is the remaining work.

## Frontmatter hygiene

Missing `summary` (required by the codebase's own doc-lifecycle standard):

- `2026-03-08-ai-integration-design.md`
- `2026-03-08-edge-preview-layer-design.md`
- `2026-03-08-openapi-auth-ui-design.md`
- `2026-03-08-plugin-system-design.md`
- `2026-03-08-versioned-docs-architecture.md`

Missing `projects: [clearify]` (all the 2026-03-08 plans). Every other plan in the folder declares it.

Status mismatched with reality:

- `2026-02-16-custom-openapi-renderer-design.md` — frontmatter says `draft`, body says "Approved", implementation shipped. Should be `completed`.
- `2026-02-16-custom-openapi-renderer-plan.md` — same as above. Should be `completed`.
- `2026-03-09-visual-config-editing-design.md` — frontmatter `draft`, body says "Active", implementation shipped in v1.12. Should be `completed` (Phase 4 git-gateway still pending; either carve it into its own plan or keep `in-progress`).
- `2025-02-08-clearify-design.md` — uses non-canonical `status: superseded`. Canonical value would be `archived`.
- `2026-03-09-roadmap-convention.md` — `status: draft` but feature shipped same day. Should be `completed` or `decided`.
- `hub-evolution.md` — `status: decided`, code mostly landed. Could move to `in-progress` (downstream migrations) or `completed` if the Definition-of-Done checks are ticked.

Status consistent with reality (no change needed):

- `2026-03-01-visual-diagram-editor-plan.md`, `2026-03-03-in-place-editing-plan.md`, all four `2026-03-08-*.md` plans: `status: draft` matches "designed but not started."

## Gaps vs ROADMAP.md

**Features on the roadmap with no plan file:**

- v2.0 API Playground (`TryItPanel`, proxy URL, response display): has auth design (`openapi-auth-ui`) but no plan for the TryItPanel itself. The openapi-auth-ui even lists Try-It as a dependency.
- v2.1 Reusable snippets (`<Snippet file="..." />`): on the roadmap, no plan.
- v2.1 Conditional content (show/hide by version/audience): on the roadmap, no plan.
- v2.1 Dropdown menus in header navigation: on the roadmap, no plan.
- v2.1 Search analytics: on the roadmap, no plan.
- v2.1 Analytics (Plausible/Umami/PostHog integration, feedback widget, popular pages): on the roadmap, no plan.
- v3.0 i18n (multi-language, RTL): on the roadmap, no plan.
- v3.0 Community themes, monorepo support, migration tools: on the roadmap, no plans.

**Plans with no direct roadmap entry:**

- `2026-03-01-visual-diagram-editor-plan.md`: not on the roadmap. Either add it to a target version or mark as out-of-scope.
- `2026-03-09-roadmap-convention.md`: process/convention doc, correctly not on the roadmap. Fine.
- `hub-evolution.md`: its core features (embed mode, sparse checkout, inject mode) are mentioned in v1.10 and v1.11 sections of ROADMAP but the hub-evolution-specific items (`clearify init --hub`, sparse default, standalone-site retirement) are not explicitly listed. Consider adding to v1.14 section of ROADMAP since 1.14.0 shipped the feature.

**ROADMAP drift to fix:**

- ROADMAP says "Last updated: 2026-03-03, v1.10 Remote Sections & Hub Embed" at the top (line 3), but we are at v1.14.1. Missing sections: v1.11 roadmap rendering, v1.12 admin panel, v1.13 includeReadme, v1.14 simplified hub-register.
- ROADMAP v1.5 OpenAPI section lists "NestJS preset" as done; the corresponding file exists at `src/presets/nestjs.ts`. That's correct, no drift, but the status label is buried.

## Recommended actions

Prioritized so Marlin can walk top-down. Each entry names the plan file and the minimum action.

1. **Update frontmatter on shipped plans.**
   - `2026-02-16-custom-openapi-renderer-design.md` → `status: completed`
   - `2026-02-16-custom-openapi-renderer-plan.md` → `status: completed`
   - `2026-03-09-visual-config-editing-design.md` → `status: completed` (note Phase 4 gateway as out-of-scope or split to its own plan)
   - `2026-03-09-roadmap-convention.md` → `status: decided` or `completed`
   - Rationale: these are the only plans whose frontmatter actively lies. Five-minute fix.

2. **Resolve hub-evolution status.** Walk the Definition-of-Done checklist (in the plan body) against what shipped in each consuming repo. If all six checks pass, mark `status: completed`. Otherwise mark `status: in-progress` and move the remaining work (standalone-sites decommission, infra workflow) into concrete GitHub issues so the plan file stops being the task tracker.

3. **Update ROADMAP.md.** Add v1.11, v1.12, v1.13, v1.14 sections (mirror the CHANGELOG). Also backfill hub-evolution items into v1.14. Fix the "Last updated" line at the top.

4. **Split the OpenAPI design doc from its plan doc.** They are redundant (design is ~200 lines, plan is ~1800 lines covering the same ground). Archive the plan (`status: archived`) and keep the design as the historical record, or vice versa. They shouldn't both live as active plans.

5. **Decide the visual-diagram-editor fate.** It's 48 days old, has no companion design doc, and isn't on the roadmap. Either (a) add it to a target roadmap version and update frontmatter (`status: decided`), or (b) archive it. Not building Excalidraw/tldraw as a docs feature is a defensible product decision; the plan can be archived without regret.

6. **Merge edge-preview-layer into in-place-editing.** They are the same plan at different altitudes: in-place-editing has a 30-line Phase 3 sketch, edge-preview is the 440-line detailed design of that same Phase 3. Either (a) reference edge-preview from in-place-editing with a link and keep both, or (b) fold the content into one document. Current setup makes it look like two separate v2.5 plans.

7. **Rename the AI plan.** `2026-03-08-ai-integration-design.md` bundles five distinct features (llms.txt, summaries, MCP, markdown export, chat). When llms.txt or MCP is picked up, carve out its own plan so the parent doc doesn't get marked as "in-progress" while the other four are still drafts.

8. **Add missing `summary` and `projects` frontmatter to all four 2026-03-08 plans.** The repo's own `document-lifecycle.md` standard calls for them; Clearify's session-dashboard consumer relies on summary for search previews.

9. **Rename `2025-02-08-clearify-design.md` status `superseded` to `archived`.** Canonical value, indexer-friendly. The content doesn't need to change.

10. **Move `2026-03-09-roadmap-convention.md` out of decisions/ and into plans/** (or the other way: promote it to an explicit ADR folder). Currently it lives at `docs/internal/decisions/` while other implemented decisions live directly in `docs/plans/`. Pick one location and stick with it.

11. **Do nothing yet with plugin-system, versioned-docs, openapi-auth-ui, ai-integration, edge-preview.** They are all drafts covering v2.x/v3.0 work with no code signal and no imminent work trigger. Leave them parked. Revisit the next time one of them becomes actionable.
