# Custom OpenAPI Reference Renderer for Clearify

**Date:** 2026-02-16
**Status:** Approved
**Scope:** Replace `@scalar/api-reference-react` with a custom-built, fully-styled API reference renderer
**Approach:** Composable libraries for parsing/snippets + custom React components for layout/styling
**Delivery:** Iterative — Phase 1 (read-only), Phase 2 (Try It Out), Phase 3 (Auth + code gen polish)

---

## Problem

Clearify v1.5.3 uses `@scalar/api-reference-react` (v0.8.55) to render OpenAPI specs as interactive API documentation. The integration is broken:

1. **CSS incompatibility** — Clearify's 340+ lines of custom CSS target Scalar class names (`.scalar-app`, `.section-accordion`, `.endpoint-method`) that no longer match Scalar v1.44.x's actual DOM structure.
2. **Aggressive resets** — The `.clearify-openapi-container` block in `globals.css` resets all element styles to `initial`, stripping spacing and layout that Scalar depends on.
3. **Design mismatch** — Scalar's opinionated styling fights Clearify's design system rather than complementing it.

The result: the API reference page renders with broken spacing, concatenated text, missing fonts, and an overall unpolished appearance.

## Decision

Replace Scalar entirely with a custom renderer built from composable libraries. This gives full control over design, eliminates CSS conflicts, and reduces the dependency footprint.

## Architecture

Three layers of components inside `src/theme/components/openapi/`:

```
┌─────────────────────────────────────────────┐
│  OpenAPIPage (route entry point)            │
│  - Receives dereferenced spec via virtual   │
│    module                                   │
│  - Manages global state (auth, server)      │
├─────────────────────────────────────────────┤
│  Layout Components                          │
│  - ApiHeader (title, version, description)  │
│  - TagGroup (collapsible endpoint groups)   │
│  - OperationCard (single endpoint)          │
├─────────────────────────────────────────────┤
│  Detail Components                          │
│  - ParameterTable (path/query/header params)│
│  - SchemaViewer (request/response bodies)   │
│  - CodeExamples (curl/JS/Python tabs)       │
│  - ResponseList (status codes + schemas)    │
│  - TryItPanel (Phase 2)                     │
│  - AuthManager (Phase 3)                    │
└─────────────────────────────────────────────┘
```

## Components (Phase 1)

### OpenAPIPage.tsx (refactored)

Entry point receiving the dereferenced spec from `virtual:clearify/openapi-spec`. Renders `ApiHeader` followed by `TagGroup` components. Manages scroll-to-anchor for sidebar navigation. Wraps content in a container that removes prose max-width constraints.

### ApiHeader.tsx

- Spec title, version badge (pill), description
- Server URL display (from `spec.servers[]`)
- Auth scheme summary badges (Bearer, API Key, etc. from `spec.components.securitySchemes`)
- "Download OpenAPI Spec" link

### TagGroup.tsx

- Collapsible section per tag (Auth, Children, Families, etc.)
- Tag name as heading, optional tag description
- Contains a list of `OperationCard` components
- Generates anchor IDs matching the sidebar navigation pattern (`#tag/{tag}/{method}{path}`)

### OperationCard.tsx

Two-column layout within a bordered card:

- **Left column**: Method badge + path, summary/description, `ParameterTable`, request body `SchemaViewer`, `ResponseList`
- **Right column**: `CodeExamples` panel (dark background, tabbed curl/JS/Python)
- Collapses to single-column on smaller viewports
- Each card has an anchor ID for deep linking from sidebar

### ParameterTable.tsx

Renders `parameters[]` (path, query, header) as a table. Columns: name (mono font), type, required badge (orange), description. Groups by parameter location (`in` field).

### SchemaViewer.tsx

Recursive component rendering JSON Schema as a collapsible property tree:

- Each property: name, type badge, required/optional, description, constraints (min/max/enum/pattern)
- Nested objects indent and are collapsible (default expanded to depth 2)
- Arrays show `items` schema inline
- `oneOf`/`anyOf` render as tabbed alternatives
- Custom-built (no external schema viewer dependency) for full style control

### CodeExamples.tsx

Tabbed panel showing generated code snippets:

- Tabs: Shell (curl), JavaScript (fetch), Python (requests)
- Generated via `openapi-snippet` from the operation definition
- Syntax-highlighted with Shiki (already a Clearify dependency)
- Copy-to-clipboard button
- Dark background regardless of theme mode for code contrast

### ResponseList.tsx

Lists response status codes with expandable details:

- Status code colored: 2xx green, 4xx orange, 5xx red
- Each response expandable to show description + response body `SchemaViewer`
- Default: first success response expanded, others collapsed

### MethodBadge.tsx

Small utility component for HTTP method pills:

- GET (green), POST (blue), PUT (amber), DELETE (red), PATCH (purple)
- Mono font, uppercase, rounded pill
- Reuses colors from the existing sidebar badge system

## Spec Parsing & $ref Resolution

Add `@scalar/openapi-parser` to dereference specs at load time in the Vite plugin:

```typescript
// In loadOpenAPISpec() / loadOpenAPISpecData()
import { dereference } from '@scalar/openapi-parser'

const { schema } = await dereference(rawSpec)
```

- The virtual module delivers a flat, fully resolved spec (no `$ref` pointers)
- Components never deal with reference resolution
- `loadOpenAPISpecData()` becomes async (minor refactor to Vite plugin)
- The existing `parseOpenAPISpec()` in `core/openapi-parser.ts` continues working for sidebar navigation

## Dependency Changes

| Action | Package | Reason |
|--------|---------|--------|
| **Add** | `@scalar/openapi-parser` | Spec parsing + $ref dereferencing (~50KB, browser + Node) |
| **Add** | `openapi-snippet` | Code example generation (curl/JS/Python from spec) |
| **Remove** | `@scalar/api-reference-react` | Entire Scalar UI replaced by custom components |

Net footprint shrinks (Scalar's CSS alone was ~280KB).

## CSS & Styling Strategy

No custom CSS file for the OpenAPI components. Everything uses Tailwind utility classes + Clearify's existing CSS variables:

- Card borders: `border border-[var(--clearify-border)] rounded-[var(--clearify-radius)]`
- Backgrounds: `bg-[var(--clearify-bg-secondary)]`
- Text hierarchy: `text-[var(--clearify-text)]`, `text-[var(--clearify-text-secondary)]`
- Mono text: `font-[var(--font-mono)]`
- Dark mode: Automatic via CSS variable toggling (already works)

**Deletions from existing code:**

- `globals.css`: entire `.clearify-openapi-container` reset block (~120 lines)
- `globals.css`: `.clearify-prose:has(.clearify-openapi-page)` override
- `OpenAPI.tsx`: entire `SCALAR_CUSTOM_CSS` constant (~340 lines)
- `OpenAPI.tsx`: Scalar lazy-loading and SSR guard logic

## Routing & Navigation

No changes to the Vite plugin's routing or navigation generation. The current system already handles:

- Sidebar entries with method badges from the parsed spec
- Catch-all route `${basePath}/*` pointing to `OpenAPIPage`
- Search entries for each operation
- Hot reload on spec file changes

The anchor ID format (`#tag/Auth/post/auth/login`) stays the same for backwards compatibility. The `pathRouting` prop goes away since React Router + anchor scrolling replaces Scalar's client-side router.

## Phase 2: Try It Out (future v1.7)

- `TryItPanel.tsx` inside `OperationCard`, toggled by a "Try It" button
- `@rjsf/core` generates forms from operation parameter + request body schemas
- Requests sent via configurable proxy URL (new `openapi.proxyUrl` config option)
- Response displayed with status code, headers, syntax-highlighted body

## Phase 3: Auth Management (future v1.8)

- `AuthManager.tsx` — persistent panel reading `components.securitySchemes`
- Bearer token input, API key input, OAuth2 flow
- Auth state in React context, injected into Try It requests and code examples
- Server selector dropdown (from `spec.servers[]`)

Phase 1 accommodates these by structuring `OperationCard` with an extension slot for `TryItPanel` and `OpenAPIPage` with context providers ready for auth state.
