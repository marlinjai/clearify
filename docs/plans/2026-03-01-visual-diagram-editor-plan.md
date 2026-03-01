# Visual Diagram Editor & Whiteboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive, visual diagram editor to Clearify with a modern UI (animated borders, neon glows, gradient nodes) that persists diagrams as code in markdown files. Users create and modify architecture diagrams visually in the Clearify frontend during dev mode.

**Architecture:** ReactFlow-based editor with custom node/edge types, Remark AST plugin for code block transformation, and a dev-server API for write-back to source `.md` files. All styling via inline `style={{}}` props using Clearify CSS variables (`--clearify-*`), matching existing component patterns.

**Tech Stack:** React 18/19, TypeScript, Vite, `@xyflow/react` v12, Zod

**Working directory:** `/Users/marlinjai/software development/ERP-suite/projects/clearify`

**Testing:** No test framework exists. Verify visually — create a test `.md` file with a `clearify-diagram` code block, run `clearify dev`, interact with the editor, and verify save writes back to the file.

**Design doc:** `docs/plans/2026-03-01-visual-diagram-editor-design.md` (to be created)

---

## Important Context for the Implementer

- **Styling convention:** This project uses **inline `style={{}}` props** with CSS variable references, NOT Tailwind utility classes. Look at `src/theme/components/Accordion.tsx` and `src/theme/components/Mermaid.tsx` for the pattern. Every component uses `var(--clearify-border)`, `var(--clearify-bg-secondary)`, `var(--font-mono)`, etc.
- **Component location:** All theme components live in `src/theme/components/`. New diagram components go in `src/theme/components/diagram/` subdirectory.
- **Exports:** Components are re-exported through `src/theme/components/index.ts` and registered in `src/theme/MDXComponents.tsx`.
- **Remark plugin pattern:** Follow `src/core/remark-mermaid.ts` exactly — same AST transformation approach using `unist-util-visit`.
- **SSR fallback pattern:** Follow `src/theme/components/Mermaid.tsx` — check `typeof window === 'undefined'` and render a `<pre><code>` fallback.
- **Vite plugin:** `src/vite-plugin/index.ts` handles dev server middleware, virtual modules, and HMR. Add the diagram save endpoint here.
- **No build step needed for theme components** — they're shipped as source (`src/theme/` is in the `files` array in `package.json`). Only `src/cli/`, `src/core/`, `src/vite-plugin/` go through tsup.

---

## Library Choice: @xyflow/react (ReactFlow v12)

**Why ReactFlow over Excalidraw/tldraw:**
- Purpose-built for node-based diagrams (architecture, flowcharts, ER diagrams) — exactly what documentation needs
- ~30KB gzipped vs ~400-500KB for Excalidraw/tldraw
- Renders DOM elements (not canvas), so Clearify's CSS tokens and theme switching integrate natively
- State is a simple `{ nodes, edges }` JSON — maps directly to a fenced code block
- React-native (hooks, context), matching Clearify's architecture
- MIT licensed, supports React 18 + 19

---

## Persistence Format

Diagrams stored as `clearify-diagram` fenced code blocks in markdown:

````markdown
```clearify-diagram
{
  "version": 1,
  "title": "Architecture Overview",
  "nodes": [
    { "id": "api", "type": "neon", "position": { "x": 250, "y": 0 },
      "data": { "label": "API Gateway", "color": "#22d3ee" } }
  ],
  "edges": [
    { "id": "e1", "source": "api", "target": "db", "type": "animated", "label": "queries" }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```
````

Coexists with existing `mermaid` code blocks — both work in the same document.

---

## Task 1: Install dependency and create types

**Add `@xyflow/react` to `package.json`:**
```bash
cd "/Users/marlinjai/software development/ERP-suite/projects/clearify"
pnpm add @xyflow/react
```

**Create `src/theme/components/diagram/diagram-types.ts`:**
- TypeScript interfaces for `ClearifyDiagramData`, `DiagramNode`, `DiagramEdge`
- Node types enum: `default`, `gradient`, `neon`, `group`, `annotation`
- Edge types enum: `default`, `animated`, `glow`

**Create `src/theme/components/diagram/DiagramSchema.ts`:**
- Zod schema for validating diagram JSON from code blocks
- Validate nodes (id, type, position, data), edges (id, source, target), viewport

**Create `src/theme/components/diagram/diagram-theme.ts`:**
- Theme-aware color mappings for light/dark mode
- Neon color presets: cyan `#22d3ee`, green `#4ade80`, magenta `#f472b6`, orange `#fb923c`
- Node style generators that use `--clearify-*` CSS variables

---

## Task 2: Create Remark plugin

**Create `src/core/remark-diagram.ts`:**
- Follow the exact pattern of `src/core/remark-mermaid.ts`
- Transform `clearify-diagram` code blocks into `<DiagramEditor>` MDX JSX elements
- Pass `data` (raw JSON string), `filePath`, and `blockIndex` attributes
- Track block index per file for multi-diagram support

**Modify `src/node/index.ts`:**
- Import and register `remarkDiagramToComponent` in the MDX remark plugins array

**Modify `src/node/build.ts`:**
- Import and register `remarkDiagramToComponent` in the MDX remark plugins array

---

## Task 3: Create read-only viewer and custom node/edge types

**Create `src/theme/components/diagram/DiagramNodeTypes.tsx`:**
- `DefaultNode` — Clean card with border, label, optional icon
- `GradientNode` — Animated gradient border (uses `--clearify-gradient`)
- `NeonNode` — Glowing border with configurable neon color
- `GroupNode` — Container for child nodes (subgraph grouping)
- `AnnotationNode` — Borderless text label
- All nodes use `var(--clearify-*)` CSS variables, `var(--font-sans)`, proper border-radius

**Create `src/theme/components/diagram/DiagramEdgeTypes.tsx`:**
- `DefaultEdge` — Bezier curve with arrow
- `AnimatedEdge` — Dashed line with CSS flow animation
- `GlowEdge` — Edge with neon glow drop-shadow

**Create `src/theme/components/diagram/DiagramEditor.tsx` (viewer-only first):**
- SSR guard: `typeof window === 'undefined'` → render `<pre><code>` fallback
- Parse `data` prop JSON string, validate with Zod schema
- Render `<ReactFlow>` with `nodesDraggable={false}`, `nodesConnectable={false}`
- Use `useTheme()` for light/dark color switching
- Lazy-load `@xyflow/react` via dynamic `import()` (same pattern as `Mermaid.tsx`)

**Modify `src/theme/MDXComponents.tsx`:**
- Add `DiagramEditor` to component registry

**Modify `src/theme/components/index.ts`:**
- Export new diagram components

---

## Task 4: Make editor interactive (dev mode)

**Expand `DiagramEditor.tsx`:**
- Accept `readOnly` prop — false in dev mode, true in production
- When interactive: nodes draggable, edges connectable, selection enabled
- `onNodesChange`, `onEdgesChange`, `onConnect` handlers via `useNodesState`/`useEdgesState`

**Create `src/theme/components/diagram/DiagramToolbar.tsx`:**
- Add Node dropdown (select type, click canvas to place)
- Edge Mode toggle (click source → target to connect)
- Style preset selector: "Clean", "Gradient", "Neon Cyan", "Neon Green", "Neon Magenta"
- Zoom controls (fit view, zoom in/out)
- Export button (SVG/PNG download)
- Save button (dev mode only)
- Styled with inline `style={{}}` using `--clearify-*` variables

**Create `src/theme/components/diagram/DiagramStylePanel.tsx`:**
- Appears when a node or edge is selected
- Node: label text, node type dropdown, color picker, icon
- Edge: label, line style (solid/dashed), animated toggle, color
- Positioned below or beside the diagram editor

---

## Task 5: Implement save & export

**Create `src/core/diagram-save-api.ts`:**
- `replaceDiagramBlock(markdown, blockIndex, newJson)` — finds Nth `clearify-diagram` code block in markdown string and replaces its content with pretty-printed JSON

**Modify `src/vite-plugin/index.ts`:**
- In `configureServer()`, add middleware for `POST /__clearify/diagram/save`
- Parse `{ filePath, blockIndex, diagramJson }` from request body
- Validate filePath is within a known docs section (security)
- Read file, call `replaceDiagramBlock`, write file back
- Vite file watcher handles HMR automatically

**Create `src/theme/components/diagram/DiagramExport.tsx`:**
- SVG export via ReactFlow's `toSvg()` utility
- PNG export via SVG → canvas → blob
- Copy SVG to clipboard option

**Wire save in `DiagramEditor.tsx`:**
- Ctrl+S keyboard shortcut
- Save button in toolbar
- `POST /__clearify/diagram/save` with serialized state
- Visual feedback (save indicator)

---

## Task 6: CSS effects and polish

**Modify `src/theme/styles/globals.css`:**

```css
/* Diagram container */
.clearify-diagram-container { ... }
.clearify-diagram-toolbar { ... }

/* Neon glow node effect */
.clearify-node-neon {
  box-shadow: 0 0 8px var(--node-neon-color, #22d3ee),
              0 0 24px rgba(var(--node-neon-rgb, 34, 211, 238), 0.15);
  border: 1.5px solid var(--node-neon-color, #22d3ee);
}

/* Animated gradient border */
.clearify-node-gradient::before { ... animated rotating gradient ... }

/* Animated edge flow */
@keyframes clearify-edge-flow { stroke-dashoffset animation }
.clearify-edge-animated path { stroke-dasharray + animation }

/* Glow edge */
.clearify-edge-glow path { filter: drop-shadow with neon color }
```

**Add to `DiagramEditor.tsx`:**
- Minimap component with Clearify styling
- Keyboard shortcuts: Delete (remove selected), Ctrl+Z (undo)

**Modify `src/types/index.ts`:**
- Add `diagram?: { defaultStyle?, minimap?, colors? }` to `ClearifyConfig`

**Modify `src/core/config.ts`:**
- Add diagram config to Zod schema with defaults

**Modify `tsup.config.ts`:**
- Add `core/remark-diagram` and `core/diagram-save-api` entry points

---

## Node Type Reference

| Type | Visual | CSS |
|------|--------|-----|
| `default` | Clean card, border, optional icon | `var(--clearify-bg)`, `var(--clearify-border)` |
| `gradient` | Animated gradient border (indigo→purple→violet) | `var(--clearify-gradient)`, `clearify-shimmer` animation |
| `neon` | Glowing border, configurable color | `box-shadow` glow, `border-color` from data |
| `group` | Container with dashed border, holds child nodes | Lighter bg, dashed border |
| `annotation` | Borderless floating text | `color: var(--clearify-text-secondary)`, no border/bg |

## Save Flow (Dev Mode Only)

1. User edits diagram visually → clicks Save (or Ctrl+S)
2. `DiagramEditor` serializes ReactFlow state → JSON
3. `POST /__clearify/diagram/save` → `{ filePath, blockIndex, diagramJson }`
4. Dev server reads `.md` file, finds Nth `clearify-diagram` block, replaces content
5. File watcher detects change → HMR (editor state matches, no flash)

## Key Files to Reference

| File | Why |
|------|-----|
| `src/core/remark-mermaid.ts` | Exact pattern for the remark plugin |
| `src/theme/components/Mermaid.tsx` | SSR fallback, lazy loading, theme-awareness |
| `src/vite-plugin/index.ts` | Dev server middleware, HMR, virtual modules |
| `src/theme/MDXComponents.tsx` | Component registry |
| `src/theme/styles/globals.css` | Design tokens, existing animations |
| `src/theme/components/Accordion.tsx` | Inline style pattern reference |

## Verification

1. **Dev mode**: Create test `.md` with `clearify-diagram` block → `clearify dev` → diagram renders interactively → drag nodes → Save → verify JSON in source file
2. **Build**: `clearify build` → diagram renders as static, non-interactive
3. **Coexistence**: Page with both `mermaid` and `clearify-diagram` → both render
4. **Theme**: Toggle light/dark → nodes and edges switch colors
5. **Export**: Export → SVG/PNG output matches visual
