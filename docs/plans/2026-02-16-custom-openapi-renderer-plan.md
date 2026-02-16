# Custom OpenAPI Reference Renderer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `@scalar/api-reference-react` with custom React components that render OpenAPI specs using Clearify's design system.

**Architecture:** Composable library stack — `@scalar/openapi-parser` for `$ref` resolution, `openapi-snippet` for code generation, custom React components for layout. All styling via inline `style={{}}` props using Clearify CSS variables (`--clearify-*`), matching existing component patterns (see `Accordion.tsx`, `CodeBlock.tsx`).

**Tech Stack:** React 18/19, TypeScript, Vite, `@scalar/openapi-parser`, `openapi-snippet`, Shiki (already in project)

**Working directory:** `/Users/marlinjai/software dev/ERP-suite/projects/clearify`

**Testing:** No test framework exists. Verify visually using lola-stories project at `/Users/marlinjai/software dev/lola-stories` — run `pnpm docs:dev` there after building Clearify.

**Design doc:** `docs/plans/2026-02-16-custom-openapi-renderer-design.md`

---

## Important Context for the Implementer

- **Styling convention:** This project uses **inline `style={{}}` props** with CSS variable references, NOT Tailwind utility classes. Look at `src/theme/components/Accordion.tsx` and `src/theme/CodeBlock.tsx` for the pattern. Every component uses `var(--clearify-border)`, `var(--clearify-bg-secondary)`, `var(--font-mono)`, etc.
- **Component location:** All theme components live in `src/theme/components/`. The new OpenAPI components go in `src/theme/components/openapi/` subdirectory.
- **Exports:** Components are re-exported through `src/theme/components/index.ts` and registered in `src/theme/MDXComponents.tsx`.
- **Vite plugin:** `src/vite-plugin/index.ts` handles spec loading, route generation, and virtual modules. The OpenAPI spec is served via `virtual:clearify/openapi-spec`.
- **The entry point** `OpenAPIPage.tsx` is loaded by the Vite plugin's route system via `componentPath: '@clearify/theme/components/OpenAPIPage'`.
- **No build step needed for theme components** — they're shipped as source (`src/theme/` is in the `files` array in `package.json`). Only the Node.js code in `src/cli/`, `src/core/`, `src/vite-plugin/` goes through tsup.

---

### Task 1: Swap Dependencies

**Files:**
- Modify: `package.json:29-53` (dependencies section)

**Step 1: Remove Scalar dependency**

In `package.json`, remove this line from `dependencies`:
```json
"@scalar/api-reference-react": "^0.8.52",
```

**Step 2: Add new dependencies**

Add these to `dependencies`:
```json
"@scalar/openapi-parser": "^0.10.7",
"openapi-snippet": "^0.14.0",
```

**Step 3: Install**

Run: `pnpm install`

Expected: Clean install, no errors. The `@scalar/api-reference-react` and its transitive dependencies (`@scalar/api-reference`, Vue, etc.) should be removed.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: swap @scalar/api-reference-react for openapi-parser + openapi-snippet"
```

---

### Task 2: Add $ref Dereferencing to Vite Plugin

**Files:**
- Modify: `src/vite-plugin/index.ts:1-8` (imports), `168-231` (spec loading functions)

The current `loadOpenAPISpec()` and `loadOpenAPISpecData()` functions read the raw JSON and pass it through. We need to dereference `$ref` pointers so components receive a flat spec.

**Step 1: Add import**

At the top of `src/vite-plugin/index.ts`, add after the existing imports (line 8):

```typescript
import { dereference } from '@scalar/openapi-parser';
```

**Step 2: Make `loadOpenAPISpecData()` async and add dereferencing**

Replace the `loadOpenAPISpecData()` function (lines 168-201) with:

```typescript
async function loadOpenAPISpecData(): Promise<Record<string, any> | null> {
  if (specDataInitialized) return cachedSpecData;
  specDataInitialized = true;

  const specPath = config.openapi?.spec;
  if (!specPath) { cachedSpecData = null; return null; }

  const resolvedPath = resolve(userRoot, specPath);
  if (!existsSync(resolvedPath)) { cachedSpecData = null; return null; }

  try {
    const content = readFileSync(resolvedPath, 'utf-8');
    const isYaml = /\.ya?ml$/i.test(resolvedPath);

    let parsed: Record<string, any>;
    if (isYaml) {
      try {
        parsed = JSON.parse(content);
      } catch {
        console.warn('  YAML OpenAPI specs require js-yaml for page generation. Install it or use a JSON spec.');
        cachedSpecData = null;
        return null;
      }
    } else {
      parsed = JSON.parse(content);
    }

    // Dereference all $ref pointers so components get a flat spec
    const { schema } = await dereference(parsed);
    cachedSpecData = schema as Record<string, any>;
    return cachedSpecData;
  } catch {
    cachedSpecData = null;
    return null;
  }
}
```

**Step 3: Update `loadOpenAPISpec()` to use dereferenced data**

Replace `loadOpenAPISpec()` (lines 203-231) with:

```typescript
async function loadOpenAPISpec(): Promise<string> {
  const specData = await loadOpenAPISpecData();
  if (!specData) {
    return 'export default null;';
  }
  return `export default ${JSON.stringify(specData)};`;
}
```

**Step 4: Update all callers to handle async**

In the `refreshDocs()` function (line 48), the call to `loadOpenAPISpecData()` on line 68 now returns a Promise. Make `refreshDocs()` async:

```typescript
async function refreshDocs() {
```

And `await` the spec data call on line 68:

```typescript
const specData = await loadOpenAPISpecData();
```

In the `load()` handler (line 264), the `loadOpenAPISpec()` call on line 281 is now async. Change:

```typescript
if (id === RESOLVED_VIRTUAL_OPENAPI_SPEC) {
  return loadOpenAPISpec();
}
```

to:

```typescript
if (id === RESOLVED_VIRTUAL_OPENAPI_SPEC) {
  return await loadOpenAPISpec();
}
```

And make the `load` function async:

```typescript
async load(id) {
```

In `configResolved` (line 237), `refreshDocs()` is already awaited since the function is async. Just add `await`:

```typescript
await refreshDocs();
```

In the watcher callbacks (lines 304-321, 451-468) that call `refreshDocs()`, add `await` or use `.then()` since watcher callbacks may not be async-friendly. The simplest approach:

```typescript
// Line ~309 in the OpenAPI spec watcher
refreshDocs().then(() => { ... });
```

Wrap the invalidation/reload logic inside the `.then()` callback.

Similarly for the `'all'` watcher on line 451:

```typescript
refreshDocs().then(() => {
  // invalidation logic stays the same
});
```

**Step 5: Verify build**

Run: `pnpm build`

Expected: Clean build with no TypeScript errors.

**Step 6: Commit**

```bash
git add src/vite-plugin/index.ts
git commit -m "feat: add $ref dereferencing to OpenAPI spec loading"
```

---

### Task 3: Create MethodBadge Component

**Files:**
- Create: `src/theme/components/openapi/MethodBadge.tsx`

This is a small utility component. Build it first since other components depend on it.

**Step 1: Create the openapi directory**

```bash
mkdir -p src/theme/components/openapi
```

**Step 2: Write the component**

Create `src/theme/components/openapi/MethodBadge.tsx`:

```tsx
import React from 'react';

const METHOD_STYLES: Record<string, { bg: string; color: string; darkColor: string }> = {
  GET:    { bg: 'rgba(5, 150, 105, 0.12)',  color: '#059669', darkColor: '#34d399' },
  POST:   { bg: 'rgba(37, 99, 235, 0.12)',  color: '#2563eb', darkColor: '#60a5fa' },
  PUT:    { bg: 'rgba(217, 119, 6, 0.12)',   color: '#d97706', darkColor: '#fbbf24' },
  DELETE: { bg: 'rgba(220, 38, 38, 0.12)',   color: '#dc2626', darkColor: '#f87171' },
  PATCH:  { bg: 'rgba(124, 58, 237, 0.12)',  color: '#7c3aed', darkColor: '#a78bfa' },
};

interface MethodBadgeProps {
  method: string;
}

export function MethodBadge({ method }: MethodBadgeProps) {
  const upper = method.toUpperCase();
  const style = METHOD_STYLES[upper] ?? { bg: 'rgba(0,0,0,0.06)', color: 'inherit', darkColor: 'inherit' };

  return (
    <>
      <span
        className={`clearify-method-badge clearify-method-${upper.toLowerCase()}`}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          lineHeight: 1.5,
          display: 'inline-block',
          background: style.bg,
          color: style.color,
        }}
      >
        {upper}
      </span>
      <style>{`
        .dark .clearify-method-get { color: ${METHOD_STYLES.GET.darkColor} !important; }
        .dark .clearify-method-post { color: ${METHOD_STYLES.POST.darkColor} !important; }
        .dark .clearify-method-put { color: ${METHOD_STYLES.PUT.darkColor} !important; }
        .dark .clearify-method-delete { color: ${METHOD_STYLES.DELETE.darkColor} !important; }
        .dark .clearify-method-patch { color: ${METHOD_STYLES.PATCH.darkColor} !important; }
      `}</style>
    </>
  );
}
```

**Step 3: Commit**

```bash
git add src/theme/components/openapi/MethodBadge.tsx
git commit -m "feat: add MethodBadge component for HTTP method pills"
```

---

### Task 4: Create SchemaViewer Component

**Files:**
- Create: `src/theme/components/openapi/SchemaViewer.tsx`

This is the most complex component — a recursive tree renderer for JSON Schema objects. It needs to handle nested objects, arrays, enums, `oneOf`/`anyOf`, and required fields.

**Step 1: Write the component**

Create `src/theme/components/openapi/SchemaViewer.tsx`:

```tsx
import React, { useState } from 'react';

interface SchemaViewerProps {
  schema: Record<string, any>;
  name?: string;
  required?: boolean;
  defaultExpanded?: boolean;
  depth?: number;
}

export function SchemaViewer({
  schema,
  name,
  required = false,
  defaultExpanded = true,
  depth = 0,
}: SchemaViewerProps) {
  if (!schema || typeof schema !== 'object') return null;

  // Handle oneOf / anyOf
  const variants = schema.oneOf ?? schema.anyOf;
  if (variants && Array.isArray(variants)) {
    return (
      <SchemaVariants
        variants={variants}
        label={schema.oneOf ? 'oneOf' : 'anyOf'}
        name={name}
        required={required}
        depth={depth}
      />
    );
  }

  // Handle array type
  if (schema.type === 'array' && schema.items) {
    return (
      <SchemaProperty name={name} schema={schema} required={required} depth={depth}>
        <SchemaViewer schema={schema.items} depth={depth + 1} defaultExpanded={depth < 2} />
      </SchemaProperty>
    );
  }

  // Handle object type (or object with properties)
  if (schema.type === 'object' || schema.properties) {
    const properties = schema.properties ?? {};
    const requiredProps: string[] = schema.required ?? [];

    if (Object.keys(properties).length === 0 && !name) {
      return (
        <div style={{ fontSize: '0.8125rem', color: 'var(--clearify-text-tertiary)', padding: '0.5rem 0' }}>
          No properties defined
        </div>
      );
    }

    const propertyEntries = Object.entries(properties);

    // If this is a named property (nested object), wrap in collapsible
    if (name) {
      return (
        <SchemaProperty name={name} schema={schema} required={required} depth={depth}>
          <div style={{ borderLeft: '2px solid var(--clearify-border)', marginLeft: '0.5rem', paddingLeft: '0.75rem' }}>
            {propertyEntries.map(([propName, propSchema]) => (
              <SchemaViewer
                key={propName}
                schema={propSchema as Record<string, any>}
                name={propName}
                required={requiredProps.includes(propName)}
                depth={depth + 1}
                defaultExpanded={depth < 1}
              />
            ))}
          </div>
        </SchemaProperty>
      );
    }

    // Top-level object — render properties directly
    return (
      <div>
        {propertyEntries.map(([propName, propSchema]) => (
          <SchemaViewer
            key={propName}
            schema={propSchema as Record<string, any>}
            name={propName}
            required={requiredProps.includes(propName)}
            depth={depth}
            defaultExpanded={depth < 2}
          />
        ))}
      </div>
    );
  }

  // Primitive type — render as leaf property
  if (name) {
    return <SchemaProperty name={name} schema={schema} required={required} depth={depth} />;
  }

  // Unnamed primitive (e.g., array items that are strings)
  return (
    <div style={{ fontSize: '0.8125rem', color: 'var(--clearify-text-secondary)', padding: '0.25rem 0' }}>
      <TypeBadge type={schema.type} format={schema.format} />
      {schema.description && (
        <span style={{ marginLeft: '0.5rem' }}>{schema.description}</span>
      )}
    </div>
  );
}

/** A single property row with name, type, required badge, constraints, description */
function SchemaProperty({
  name,
  schema,
  required,
  depth,
  children,
}: {
  name?: string;
  schema: Record<string, any>;
  required: boolean;
  depth: number;
  children?: React.ReactNode;
}) {
  const hasChildren = !!children;
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <div
      style={{
        borderBottom: depth === 0 ? '1px solid var(--clearify-border)' : undefined,
        padding: '0.5rem 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
          cursor: hasChildren ? 'pointer' : undefined,
        }}
        onClick={hasChildren ? () => setExpanded(!expanded) : undefined}
      >
        {hasChildren && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              flexShrink: 0,
              marginTop: '0.15rem',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              color: 'var(--clearify-text-tertiary)',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {name && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--clearify-text)',
              }}>
                {name}
              </span>
            )}
            <TypeBadge
              type={schema.type === 'array' ? `${schema.items?.type ?? 'any'}[]` : schema.type}
              format={schema.format}
            />
            {required && (
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.04em',
                color: '#d97706',
              }}
              className="clearify-required-badge"
              >
                required
              </span>
            )}
            {schema.nullable && (
              <span style={{
                fontSize: '0.6875rem',
                color: 'var(--clearify-text-tertiary)',
              }}>
                nullable
              </span>
            )}
          </div>

          {schema.description && (
            <div style={{
              fontSize: '0.8125rem',
              color: 'var(--clearify-text-secondary)',
              marginTop: '0.25rem',
              lineHeight: 1.5,
            }}>
              {schema.description}
            </div>
          )}

          {/* Constraints */}
          <SchemaConstraints schema={schema} />

          {/* Enum values */}
          {schema.enum && (
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
              {schema.enum.map((val: any, i: number) => (
                <span
                  key={i}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    background: 'var(--clearify-bg-secondary)',
                    border: '1px solid var(--clearify-border)',
                    borderRadius: '4px',
                    padding: '0.1rem 0.4rem',
                  }}
                >
                  {String(val)}
                </span>
              ))}
            </div>
          )}

          {/* Example */}
          {schema.example !== undefined && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--clearify-text-tertiary)' }}>
              Example: <code style={{ fontFamily: 'var(--font-mono)' }}>{JSON.stringify(schema.example)}</code>
            </div>
          )}
        </div>
      </div>

      {/* Nested children */}
      {hasChildren && expanded && (
        <div style={{ marginTop: '0.25rem' }}>
          {children}
        </div>
      )}

      <style>{`
        .dark .clearify-required-badge { color: #fbbf24 !important; }
      `}</style>
    </div>
  );
}

function TypeBadge({ type, format }: { type?: string; format?: string }) {
  if (!type) return null;
  const label = format ? `${type}<${format}>` : type;
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',
      color: 'var(--clearify-text-tertiary)',
      background: 'var(--clearify-bg-secondary)',
      padding: '0.05rem 0.375rem',
      borderRadius: '4px',
      border: '1px solid var(--clearify-border)',
    }}>
      {label}
    </span>
  );
}

function SchemaConstraints({ schema }: { schema: Record<string, any> }) {
  const constraints: string[] = [];
  if (schema.minLength !== undefined) constraints.push(`minLength: ${schema.minLength}`);
  if (schema.maxLength !== undefined) constraints.push(`maxLength: ${schema.maxLength}`);
  if (schema.minimum !== undefined) constraints.push(`min: ${schema.minimum}`);
  if (schema.maximum !== undefined) constraints.push(`max: ${schema.maximum}`);
  if (schema.pattern !== undefined) constraints.push(`pattern: ${schema.pattern}`);
  if (schema.minItems !== undefined) constraints.push(`minItems: ${schema.minItems}`);
  if (schema.maxItems !== undefined) constraints.push(`maxItems: ${schema.maxItems}`);
  if (schema.uniqueItems) constraints.push('uniqueItems');
  if (schema.default !== undefined) constraints.push(`default: ${JSON.stringify(schema.default)}`);

  if (constraints.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      gap: '0.375rem',
      flexWrap: 'wrap',
      marginTop: '0.25rem',
    }}>
      {constraints.map((c, i) => (
        <span
          key={i}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: 'var(--clearify-text-tertiary)',
            background: 'var(--clearify-bg-secondary)',
            padding: '0.05rem 0.375rem',
            borderRadius: '4px',
            border: '1px solid var(--clearify-border)',
          }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function SchemaVariants({
  variants,
  label,
  name,
  required,
  depth,
}: {
  variants: Record<string, any>[];
  label: string;
  name?: string;
  required: boolean;
  depth: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div style={{ padding: '0.5rem 0', borderBottom: depth === 0 ? '1px solid var(--clearify-border)' : undefined }}>
      {name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--clearify-text)' }}>
            {name}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--clearify-text-tertiary)' }}>{label}</span>
          {required && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: '#d97706' }}>
              required
            </span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {variants.map((v, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--clearify-border)',
              background: i === activeIndex ? 'var(--clearify-primary-soft)' : 'transparent',
              color: i === activeIndex ? 'var(--clearify-primary)' : 'var(--clearify-text-secondary)',
              cursor: 'pointer',
              fontWeight: i === activeIndex ? 600 : 400,
            }}
          >
            {v.title ?? v.type ?? `Option ${i + 1}`}
          </button>
        ))}
      </div>
      <div style={{ borderLeft: '2px solid var(--clearify-border)', marginLeft: '0.5rem', paddingLeft: '0.75rem' }}>
        <SchemaViewer schema={variants[activeIndex]} depth={depth + 1} />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/theme/components/openapi/SchemaViewer.tsx
git commit -m "feat: add recursive SchemaViewer component for JSON Schema rendering"
```

---

### Task 5: Create ParameterTable Component

**Files:**
- Create: `src/theme/components/openapi/ParameterTable.tsx`

**Step 1: Write the component**

Create `src/theme/components/openapi/ParameterTable.tsx`:

```tsx
import React from 'react';

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: Record<string, any>;
  description?: string;
  deprecated?: boolean;
}

interface ParameterTableProps {
  parameters: Parameter[];
}

const LOCATION_ORDER = ['path', 'query', 'header', 'cookie'];

export function ParameterTable({ parameters }: ParameterTableProps) {
  if (!parameters || parameters.length === 0) return null;

  // Group by location
  const grouped = new Map<string, Parameter[]>();
  for (const param of parameters) {
    const loc = param.in ?? 'query';
    const existing = grouped.get(loc);
    if (existing) existing.push(param);
    else grouped.set(loc, [param]);
  }

  const sortedGroups = [...grouped.entries()].sort(
    ([a], [b]) => LOCATION_ORDER.indexOf(a) - LOCATION_ORDER.indexOf(b)
  );

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {sortedGroups.map(([location, params]) => (
        <div key={location} style={{ marginBottom: '0.75rem' }}>
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: 'var(--clearify-text-tertiary)',
            marginBottom: '0.375rem',
          }}>
            {location} parameters
          </div>
          <div style={{
            border: '1px solid var(--clearify-border)',
            borderRadius: 'var(--clearify-radius)',
            overflow: 'hidden',
          }}>
            {params.map((param, i) => (
              <div
                key={param.name}
                className="clearify-param-row"
                style={{
                  padding: '0.625rem 0.875rem',
                  borderBottom: i < params.length - 1 ? '1px solid var(--clearify-border)' : undefined,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: param.deprecated ? 'var(--clearify-text-tertiary)' : 'var(--clearify-text)',
                    textDecoration: param.deprecated ? 'line-through' : undefined,
                  }}>
                    {param.name}
                  </span>
                  {param.schema?.type && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--clearify-text-tertiary)',
                    }}>
                      {param.schema.type}
                    </span>
                  )}
                  {param.required && (
                    <span className="clearify-required-badge" style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.04em',
                      color: '#d97706',
                    }}>
                      required
                    </span>
                  )}
                  {param.deprecated && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--clearify-text-tertiary)' }}>deprecated</span>
                  )}
                </div>
                {param.description && (
                  <div style={{
                    fontSize: '0.8125rem',
                    color: 'var(--clearify-text-secondary)',
                    marginTop: '0.25rem',
                    lineHeight: 1.5,
                  }}>
                    {param.description}
                  </div>
                )}
                {param.schema?.enum && (
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                    {param.schema.enum.map((val: any, j: number) => (
                      <span key={j} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        background: 'var(--clearify-bg-secondary)',
                        border: '1px solid var(--clearify-border)',
                        borderRadius: '4px',
                        padding: '0.1rem 0.4rem',
                      }}>
                        {String(val)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <style>{`
        .clearify-param-row:hover { background-color: var(--clearify-bg-secondary) !important; }
        .dark .clearify-required-badge { color: #fbbf24 !important; }
      `}</style>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/theme/components/openapi/ParameterTable.tsx
git commit -m "feat: add ParameterTable component for operation parameters"
```

---

### Task 6: Create CodeExamples Component

**Files:**
- Create: `src/theme/components/openapi/CodeExamples.tsx`

This component generates code snippets (curl, JS, Python) from an OpenAPI operation using `openapi-snippet`, then renders them in a tabbed panel.

**Important:** `openapi-snippet` expects a full OpenAPI document + path + method to generate snippets. We pass the full spec through and reference the specific operation.

**Step 1: Write the component**

Create `src/theme/components/openapi/CodeExamples.tsx`:

```tsx
import React, { useState, useMemo, useRef } from 'react';

interface CodeExamplesProps {
  /** The full dereferenced OpenAPI spec */
  spec: Record<string, any>;
  /** The endpoint path, e.g. "/auth/login" */
  path: string;
  /** The HTTP method, e.g. "post" */
  method: string;
}

interface SnippetTab {
  label: string;
  code: string;
}

const TARGETS = [
  { id: 'shell_curl', label: 'curl' },
  { id: 'node_fetch', label: 'JavaScript' },
  { id: 'python_requests', label: 'Python' },
];

export function CodeExamples({ spec, path, method }: CodeExamplesProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const snippets: SnippetTab[] = useMemo(() => {
    try {
      // Dynamic import is not ideal in useMemo, so we use require-style
      // openapi-snippet is a CJS module that works at runtime
      const OpenAPISnippet = (window as any).__openapiSnippet;
      if (!OpenAPISnippet) {
        return TARGETS.map(t => ({ label: t.label, code: '// Loading...' }));
      }

      const result = OpenAPISnippet.getEndpointSnippets(
        spec,
        path,
        method.toLowerCase(),
        TARGETS.map(t => t.id)
      );

      return TARGETS.map((target, i) => ({
        label: target.label,
        code: result.snippets[i]?.content ?? `// No ${target.label} example available`,
      }));
    } catch {
      return TARGETS.map(t => ({
        label: t.label,
        code: `// Could not generate ${t.label} example`,
      }));
    }
  }, [spec, path, method]);

  const handleCopy = async () => {
    const text = codeRef.current?.textContent ?? snippets[activeTab]?.code ?? '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      border: '1px solid var(--clearify-border)',
      borderRadius: 'var(--clearify-radius)',
      overflow: 'hidden',
      background: '#1e1e2e',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 0.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.125rem' }}>
          {snippets.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: i === activeTab ? 600 : 400,
                padding: '0.5rem 0.625rem',
                background: 'none',
                border: 'none',
                borderBottom: i === activeTab ? '2px solid #818cf8' : '2px solid transparent',
                color: i === activeTab ? '#e2e8f0' : '#94a3b8',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            fontSize: '0.6875rem',
            color: copied ? '#818cf8' : '#94a3b8',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <pre
        ref={codeRef}
        style={{
          padding: '1rem 1.25rem',
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          lineHeight: 1.7,
          color: '#e2e8f0',
          overflow: 'auto',
          maxHeight: '400px',
        }}
      >
        <code>{snippets[activeTab]?.code ?? ''}</code>
      </pre>
    </div>
  );
}
```

**Step 2: Important note about `openapi-snippet`**

The `openapi-snippet` library may not work well as a direct ESM import in the browser since it's a CJS module with Node.js dependencies. If it causes issues at runtime, the fallback approach is to **generate snippets at build time in the Vite plugin** and pass them through the virtual module alongside the spec. This would be a Task 6b if needed.

A simpler alternative that avoids the `openapi-snippet` dependency entirely: build a small helper that generates curl/fetch/requests examples from the operation data directly. Since we have the full dereferenced spec, we know the method, path, parameters, and request body schema. Create `src/theme/components/openapi/generate-snippets.ts`:

```typescript
interface SnippetInput {
  method: string;
  path: string;
  baseUrl: string;
  parameters?: Array<{ name: string; in: string; required?: boolean; schema?: { type?: string } }>;
  requestBody?: Record<string, any>;
  security?: Array<Record<string, string[]>>;
}

export function generateSnippets(input: SnippetInput): { label: string; code: string }[] {
  const { method, path, baseUrl, parameters = [], requestBody, security } = input;
  const upper = method.toUpperCase();
  const url = `${baseUrl}${path}`;

  // Replace path params with placeholder values
  const urlWithParams = url.replace(/\{(\w+)\}/g, ':$1');

  const hasBody = !!requestBody;
  const bodySchema = requestBody?.content?.['application/json']?.schema;
  const bodyExample = bodySchema ? generateExample(bodySchema) : null;
  const bodyJson = bodyExample ? JSON.stringify(bodyExample, null, 2) : null;

  const hasAuth = security && security.length > 0;
  const authHeader = hasAuth ? 'Authorization: Bearer YOUR_TOKEN' : '';

  const queryParams = parameters.filter(p => p.in === 'query');
  const queryString = queryParams.length > 0
    ? '?' + queryParams.map(p => `${p.name}=VALUE`).join('&')
    : '';

  // curl
  const curlParts = [`curl -X ${upper} '${urlWithParams}${queryString}'`];
  if (hasAuth) curlParts.push(`  -H '${authHeader}'`);
  if (hasBody) {
    curlParts.push("  -H 'Content-Type: application/json'");
    curlParts.push(`  -d '${bodyJson}'`);
  }
  const curl = curlParts.join(' \\\n');

  // JavaScript fetch
  const fetchHeaders: string[] = [];
  if (hasAuth) fetchHeaders.push(`    'Authorization': 'Bearer YOUR_TOKEN'`);
  if (hasBody) fetchHeaders.push(`    'Content-Type': 'application/json'`);

  let jsParts = `const response = await fetch('${urlWithParams}${queryString}', {\n  method: '${upper}',\n`;
  if (fetchHeaders.length > 0) {
    jsParts += `  headers: {\n${fetchHeaders.join(',\n')}\n  },\n`;
  }
  if (hasBody) {
    jsParts += `  body: JSON.stringify(${bodyJson}),\n`;
  }
  jsParts += '});\n\nconst data = await response.json();';

  // Python requests
  let pyParts = `import requests\n\n`;
  pyParts += `response = requests.${method.toLowerCase()}(\n    '${urlWithParams}${queryString}'`;
  if (hasAuth || hasBody) pyParts += ',';
  pyParts += '\n';
  if (hasAuth) {
    pyParts += `    headers={'Authorization': 'Bearer YOUR_TOKEN'}`;
    if (hasBody) pyParts += ',';
    pyParts += '\n';
  }
  if (hasBody) {
    pyParts += `    json=${bodyJson},\n`;
  }
  pyParts += ')\n\ndata = response.json()';

  return [
    { label: 'curl', code: curl },
    { label: 'JavaScript', code: jsParts },
    { label: 'Python', code: pyParts },
  ];
}

/** Generate a minimal example object from a JSON Schema */
function generateExample(schema: Record<string, any>): any {
  if (schema.example !== undefined) return schema.example;

  switch (schema.type) {
    case 'string':
      return schema.enum?.[0] ?? schema.default ?? 'string';
    case 'number':
    case 'integer':
      return schema.default ?? schema.minimum ?? 0;
    case 'boolean':
      return schema.default ?? true;
    case 'array':
      return schema.items ? [generateExample(schema.items)] : [];
    case 'object': {
      const obj: Record<string, any> = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExample(prop as Record<string, any>);
        }
      }
      return obj;
    }
    default:
      return null;
  }
}
```

Then update `CodeExamples.tsx` to use this helper instead of `openapi-snippet`:

```tsx
import React, { useState, useMemo, useRef } from 'react';
import { generateSnippets } from './generate-snippets.js';

interface CodeExamplesProps {
  method: string;
  path: string;
  baseUrl: string;
  parameters?: any[];
  requestBody?: Record<string, any>;
  security?: Array<Record<string, string[]>>;
}

export function CodeExamples({ method, path, baseUrl, parameters, requestBody, security }: CodeExamplesProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const snippets = useMemo(
    () => generateSnippets({ method, path, baseUrl, parameters, requestBody, security }),
    [method, path, baseUrl, parameters, requestBody, security]
  );

  const handleCopy = async () => {
    const text = codeRef.current?.textContent ?? snippets[activeTab]?.code ?? '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ... rest of the render stays the same as the original CodeExamples above,
  // using `snippets` array for tabs and code display
  return (
    <div style={{
      border: '1px solid var(--clearify-border)',
      borderRadius: 'var(--clearify-radius)',
      overflow: 'hidden',
      background: '#1e1e2e',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 0.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.125rem' }}>
          {snippets.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: i === activeTab ? 600 : 400,
                padding: '0.5rem 0.625rem',
                background: 'none',
                border: 'none',
                borderBottom: i === activeTab ? '2px solid #818cf8' : '2px solid transparent',
                color: i === activeTab ? '#e2e8f0' : '#94a3b8',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            fontSize: '0.6875rem',
            color: copied ? '#818cf8' : '#94a3b8',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        ref={codeRef}
        style={{
          padding: '1rem 1.25rem',
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          lineHeight: 1.7,
          color: '#e2e8f0',
          overflow: 'auto',
          maxHeight: '400px',
        }}
      >
        <code>{snippets[activeTab]?.code ?? ''}</code>
      </pre>
    </div>
  );
}
```

**Decision for implementer:** Use the built-in `generate-snippets.ts` approach (avoids the `openapi-snippet` dependency entirely). This means you can skip adding `openapi-snippet` to `package.json` in Task 1 — only `@scalar/openapi-parser` is needed.

**Step 3: Commit**

```bash
git add src/theme/components/openapi/generate-snippets.ts src/theme/components/openapi/CodeExamples.tsx
git commit -m "feat: add CodeExamples component with built-in snippet generation"
```

---

### Task 7: Create ResponseList Component

**Files:**
- Create: `src/theme/components/openapi/ResponseList.tsx`

**Step 1: Write the component**

Create `src/theme/components/openapi/ResponseList.tsx`:

```tsx
import React, { useState } from 'react';
import { SchemaViewer } from './SchemaViewer.js';

interface ResponseListProps {
  responses: Record<string, any>;
}

function statusColor(code: string): string {
  if (code.startsWith('2')) return '#059669';
  if (code.startsWith('3')) return '#2563eb';
  if (code.startsWith('4')) return '#d97706';
  if (code.startsWith('5')) return '#dc2626';
  return 'var(--clearify-text-secondary)';
}

function statusDarkColor(code: string): string {
  if (code.startsWith('2')) return '#34d399';
  if (code.startsWith('3')) return '#60a5fa';
  if (code.startsWith('4')) return '#fbbf24';
  if (code.startsWith('5')) return '#f87171';
  return 'var(--clearify-text-secondary)';
}

export function ResponseList({ responses }: ResponseListProps) {
  if (!responses || Object.keys(responses).length === 0) return null;

  const entries = Object.entries(responses).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: 'var(--clearify-text-tertiary)',
        marginBottom: '0.375rem',
      }}>
        Responses
      </div>
      <div style={{
        border: '1px solid var(--clearify-border)',
        borderRadius: 'var(--clearify-radius)',
        overflow: 'hidden',
      }}>
        {entries.map(([statusCode, response], i) => (
          <ResponseItem
            key={statusCode}
            statusCode={statusCode}
            response={response}
            isLast={i === entries.length - 1}
            defaultExpanded={i === 0 && statusCode.startsWith('2')}
          />
        ))}
      </div>
    </div>
  );
}

function ResponseItem({
  statusCode,
  response,
  isLast,
  defaultExpanded,
}: {
  statusCode: string;
  response: Record<string, any>;
  isLast: boolean;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const schema = response.content?.['application/json']?.schema;
  const hasDetails = !!(schema || response.description);

  return (
    <div style={{ borderBottom: isLast ? undefined : '1px solid var(--clearify-border)' }}>
      <button
        onClick={hasDetails ? () => setExpanded(!expanded) : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          width: '100%',
          padding: '0.625rem 0.875rem',
          background: 'none',
          border: 'none',
          cursor: hasDetails ? 'pointer' : 'default',
          textAlign: 'left',
          fontFamily: 'var(--font-sans)',
          transition: 'background-color 0.15s ease',
        }}
        className="clearify-response-row"
      >
        {hasDetails && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              flexShrink: 0,
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              color: 'var(--clearify-text-tertiary)',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
        <span
          className={`clearify-status-${statusCode.charAt(0)}xx`}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: statusColor(statusCode),
          }}
        >
          {statusCode}
        </span>
        <span style={{
          fontSize: '0.8125rem',
          color: 'var(--clearify-text-secondary)',
        }}>
          {response.description || ''}
        </span>
      </button>

      {expanded && hasDetails && (
        <div style={{ padding: '0 0.875rem 0.75rem 2.5rem' }}>
          {schema && <SchemaViewer schema={schema} />}
        </div>
      )}

      <style>{`
        .clearify-response-row:hover { background-color: var(--clearify-bg-secondary) !important; }
        .dark .clearify-status-2xx { color: ${statusDarkColor('200')} !important; }
        .dark .clearify-status-3xx { color: ${statusDarkColor('300')} !important; }
        .dark .clearify-status-4xx { color: ${statusDarkColor('400')} !important; }
        .dark .clearify-status-5xx { color: ${statusDarkColor('500')} !important; }
      `}</style>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/theme/components/openapi/ResponseList.tsx
git commit -m "feat: add ResponseList component for status codes and response schemas"
```

---

### Task 8: Create OperationCard Component

**Files:**
- Create: `src/theme/components/openapi/OperationCard.tsx`

This is the main workhorse — a two-column card for a single endpoint.

**Step 1: Write the component**

Create `src/theme/components/openapi/OperationCard.tsx`:

```tsx
import React from 'react';
import { MethodBadge } from './MethodBadge.js';
import { ParameterTable } from './ParameterTable.js';
import { SchemaViewer } from './SchemaViewer.js';
import { ResponseList } from './ResponseList.js';
import { CodeExamples } from './CodeExamples.js';

interface OperationCardProps {
  method: string;
  path: string;
  operation: Record<string, any>;
  baseUrl: string;
  anchorId: string;
}

export function OperationCard({ method, path, operation, baseUrl, anchorId }: OperationCardProps) {
  const summary = operation.summary ?? operation.description ?? `${method.toUpperCase()} ${path}`;
  const description = operation.description && operation.description !== summary ? operation.description : null;
  const parameters = operation.parameters ?? [];
  const requestBody = operation.requestBody;
  const responses = operation.responses ?? {};
  const security = operation.security;
  const deprecated = !!operation.deprecated;

  const bodySchema = requestBody?.content?.['application/json']?.schema;

  return (
    <div
      id={anchorId}
      style={{
        border: '1px solid var(--clearify-border)',
        borderRadius: 'var(--clearify-radius)',
        overflow: 'hidden',
        marginBottom: '1rem',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      className="clearify-operation-card"
    >
      {/* Two-column layout */}
      <div className="clearify-operation-layout" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
      }}>
        {/* Left column — documentation */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRight: '1px solid var(--clearify-border)',
        }}>
          {/* Method + Path header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <MethodBadge method={method} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: deprecated ? 'var(--clearify-text-tertiary)' : 'var(--clearify-text)',
              textDecoration: deprecated ? 'line-through' : undefined,
              letterSpacing: '-0.01em',
            }}>
              {path}
            </span>
            {deprecated && (
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                color: '#d97706',
                background: 'rgba(217, 119, 6, 0.1)',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
              }}>
                Deprecated
              </span>
            )}
            {security && security.length > 0 && (
              <span style={{
                fontSize: '0.6875rem',
                color: 'var(--clearify-text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Auth
              </span>
            )}
          </div>

          {/* Summary */}
          <div style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--clearify-text)',
            marginTop: '0.625rem',
            letterSpacing: '-0.01em',
          }}>
            {summary}
          </div>

          {/* Description */}
          {description && (
            <div style={{
              fontSize: '0.8125rem',
              color: 'var(--clearify-text-secondary)',
              marginTop: '0.375rem',
              lineHeight: 1.6,
            }}>
              {description}
            </div>
          )}

          {/* Parameters */}
          {parameters.length > 0 && <ParameterTable parameters={parameters} />}

          {/* Request Body */}
          {bodySchema && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                color: 'var(--clearify-text-tertiary)',
                marginBottom: '0.375rem',
              }}>
                Request Body
                {requestBody?.required && (
                  <span className="clearify-required-badge" style={{
                    marginLeft: '0.5rem',
                    color: '#d97706',
                  }}>
                    required
                  </span>
                )}
              </div>
              <div style={{
                border: '1px solid var(--clearify-border)',
                borderRadius: 'var(--clearify-radius)',
                padding: '0.625rem 0.875rem',
              }}>
                <SchemaViewer schema={bodySchema} />
              </div>
            </div>
          )}

          {/* Responses */}
          <ResponseList responses={responses} />
        </div>

        {/* Right column — code examples */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--clearify-bg-secondary)',
        }}>
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: 'var(--clearify-text-tertiary)',
            marginBottom: '0.625rem',
          }}>
            Examples
          </div>
          <CodeExamples
            method={method}
            path={path}
            baseUrl={baseUrl}
            parameters={parameters}
            requestBody={requestBody}
            security={security}
          />
        </div>
      </div>

      <style>{`
        .clearify-operation-card:hover {
          border-color: var(--clearify-border-strong) !important;
          box-shadow: var(--clearify-shadow-sm);
        }
        @media (max-width: 900px) {
          .clearify-operation-layout {
            grid-template-columns: 1fr !important;
          }
          .clearify-operation-layout > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid var(--clearify-border) !important;
          }
        }
        .dark .clearify-required-badge { color: #fbbf24 !important; }
      `}</style>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/theme/components/openapi/OperationCard.tsx
git commit -m "feat: add OperationCard component with two-column layout"
```

---

### Task 9: Create TagGroup and ApiHeader Components

**Files:**
- Create: `src/theme/components/openapi/TagGroup.tsx`
- Create: `src/theme/components/openapi/ApiHeader.tsx`

**Step 1: Write TagGroup**

Create `src/theme/components/openapi/TagGroup.tsx`:

```tsx
import React, { useState } from 'react';
import { OperationCard } from './OperationCard.js';

interface TagGroupProps {
  tag: string;
  description?: string;
  operations: Array<{ method: string; path: string; operation: Record<string, any> }>;
  baseUrl: string;
}

/** Build an anchor ID matching the sidebar navigation pattern */
function operationAnchorId(tag: string, method: string, path: string): string {
  const slug = `${method.toLowerCase()}${path.replace(/[{}]/g, '')}`;
  return `tag/${encodeURIComponent(tag)}/${slug}`;
}

export function TagGroup({ tag, description, operations, baseUrl }: TagGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      id={`tag/${encodeURIComponent(tag)}`}
      style={{ marginBottom: '2rem' }}
    >
      {/* Tag header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem 0',
          textAlign: 'left',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            color: 'var(--clearify-text-secondary)',
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--clearify-text)',
          letterSpacing: '-0.02em',
        }}>
          {tag}
        </span>
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--clearify-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {operations.length} endpoint{operations.length !== 1 ? 's' : ''}
        </span>
      </button>

      {description && (
        <div style={{
          fontSize: '0.875rem',
          color: 'var(--clearify-text-secondary)',
          marginBottom: '0.75rem',
          paddingLeft: '2.125rem',
          lineHeight: 1.6,
        }}>
          {description}
        </div>
      )}

      {/* Operations */}
      {expanded && (
        <div style={{ animation: 'clearify-fade-in 0.2s ease-out' }}>
          {operations.map(({ method, path, operation }) => (
            <OperationCard
              key={`${method}-${path}`}
              method={method}
              path={path}
              operation={operation}
              baseUrl={baseUrl}
              anchorId={operationAnchorId(tag, method, path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Write ApiHeader**

Create `src/theme/components/openapi/ApiHeader.tsx`:

```tsx
import React from 'react';

interface ApiHeaderProps {
  spec: Record<string, any>;
}

export function ApiHeader({ spec }: ApiHeaderProps) {
  const info = spec.info ?? {};
  const servers = spec.servers ?? [];
  const securitySchemes = spec.components?.securitySchemes ?? {};
  const schemeEntries = Object.entries(securitySchemes);

  return (
    <div style={{
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid var(--clearify-border)',
    }}>
      {/* Title + Version */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--clearify-text)',
          letterSpacing: '-0.035em',
          lineHeight: 1.2,
          margin: 0,
        }}>
          {info.title ?? 'API Reference'}
        </h1>
        {info.version && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--clearify-primary)',
            background: 'var(--clearify-primary-soft)',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
          }}>
            v{info.version}
          </span>
        )}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          color: 'var(--clearify-text-tertiary)',
        }}>
          OAS {spec.openapi ?? '3.0'}
        </span>
      </div>

      {/* Description */}
      {info.description && (
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--clearify-text-secondary)',
          marginTop: '0.5rem',
          lineHeight: 1.6,
          maxWidth: '60ch',
        }}>
          {info.description}
        </p>
      )}

      {/* Server + Auth row */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.875rem' }}>
        {/* Server URL */}
        {servers.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--clearify-text-tertiary)' }}>
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--clearify-text-secondary)' }}>
              {servers[0].url}
            </span>
          </div>
        )}

        {/* Auth schemes */}
        {schemeEntries.map(([name, scheme]: [string, any]) => (
          <div
            key={name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.8125rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--clearify-text-tertiary)' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--clearify-text-secondary)',
              background: 'var(--clearify-bg-secondary)',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              border: '1px solid var(--clearify-border)',
            }}>
              {scheme.type === 'http' ? `${scheme.scheme} (${scheme.bearerFormat ?? 'token'})` : `${scheme.type}: ${name}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/theme/components/openapi/TagGroup.tsx src/theme/components/openapi/ApiHeader.tsx
git commit -m "feat: add TagGroup and ApiHeader components"
```

---

### Task 10: Create Barrel Export and Rewrite OpenAPIPage

**Files:**
- Create: `src/theme/components/openapi/index.ts`
- Rewrite: `src/theme/components/OpenAPIPage.tsx`
- Rewrite: `src/theme/components/OpenAPI.tsx` (keep as MDX component, simplified)
- Modify: `src/theme/components/index.ts:9` (update OpenAPI export)

**Step 1: Create barrel export**

Create `src/theme/components/openapi/index.ts`:

```typescript
export { ApiHeader } from './ApiHeader.js';
export { TagGroup } from './TagGroup.js';
export { OperationCard } from './OperationCard.js';
export { ParameterTable } from './ParameterTable.js';
export { SchemaViewer } from './SchemaViewer.js';
export { CodeExamples } from './CodeExamples.js';
export { ResponseList } from './ResponseList.js';
export { MethodBadge } from './MethodBadge.js';
```

**Step 2: Rewrite OpenAPIPage.tsx**

This is the route entry point. Replace the entire file:

```tsx
// @ts-expect-error virtual module
import config from 'virtual:clearify/config';
// @ts-expect-error virtual module
import openapiSpec from 'virtual:clearify/openapi-spec';

import React, { useEffect } from 'react';
import { ApiHeader } from './openapi/ApiHeader.js';
import { TagGroup } from './openapi/TagGroup.js';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export default function OpenAPIPage() {
  const spec = openapiSpec as Record<string, any> | null;

  // Scroll to hash anchor on mount and hash change
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.slice(1); // remove #
      if (!hash) return;
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  if (!spec) {
    return (
      <div style={{
        border: '1px solid var(--clearify-border)',
        borderRadius: 'var(--clearify-radius)',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--clearify-text-secondary)',
        fontSize: '0.875rem',
      }}>
        No OpenAPI spec provided. Set <code style={{ fontFamily: 'var(--font-mono)' }}>openapi.spec</code> in your Clearify config.
      </div>
    );
  }

  // Determine base URL from spec or config
  const baseUrl = spec.servers?.[0]?.url ?? 'http://localhost:3000';

  // Group operations by tag
  const paths = spec.paths ?? {};
  const tagMap = new Map<string, { tag: string; description?: string; operations: Array<{ method: string; path: string; operation: Record<string, any> }> }>();
  const tagDescriptions = new Map<string, string>();

  if (Array.isArray(spec.tags)) {
    for (const t of spec.tags) {
      if (t.name && t.description) tagDescriptions.set(t.name, t.description);
    }
  }

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, any>)[method];
      if (!operation || typeof operation !== 'object') continue;

      const tags: string[] = Array.isArray(operation.tags) && operation.tags.length > 0
        ? [operation.tags[0]]
        : ['Default'];

      for (const tag of tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { tag, description: tagDescriptions.get(tag), operations: [] });
        }
        tagMap.get(tag)!.operations.push({ method: method.toUpperCase(), path: pathStr, operation });
      }
    }
  }

  // Sort: "Default" last, others alphabetical
  const tagGroups = [...tagMap.values()].sort((a, b) => {
    if (a.tag === 'Default') return 1;
    if (b.tag === 'Default') return -1;
    return a.tag.localeCompare(b.tag);
  });

  return (
    <div className="clearify-openapi-page" style={{ maxWidth: 'none' }}>
      <ApiHeader spec={spec} />
      {tagGroups.map((group) => (
        <TagGroup
          key={group.tag}
          tag={group.tag}
          description={group.description}
          operations={group.operations}
          baseUrl={baseUrl}
        />
      ))}
    </div>
  );
}

export const frontmatter = { title: 'API Reference', description: 'API documentation' };
```

**Step 3: Simplify OpenAPI.tsx for MDX use**

The `<OpenAPI>` component is still available as an MDX component for embedding in docs pages. Replace `src/theme/components/OpenAPI.tsx` entirely:

```tsx
import React from 'react';
import { ApiHeader } from './openapi/ApiHeader.js';
import { TagGroup } from './openapi/TagGroup.js';

interface OpenAPIProps {
  spec?: Record<string, any>;
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export function OpenAPI({ spec }: OpenAPIProps) {
  if (!spec || typeof spec !== 'object') {
    return (
      <div
        style={{
          border: '1px solid var(--clearify-border)',
          borderRadius: 'var(--clearify-radius)',
          padding: '1.5rem',
          color: 'var(--clearify-text-secondary)',
          fontSize: '0.875rem',
        }}
      >
        <strong>OpenAPI:</strong> No spec provided. Pass a <code>spec</code> prop or set{' '}
        <code>openapi.spec</code> in your Clearify config.
      </div>
    );
  }

  const baseUrl = spec.servers?.[0]?.url ?? 'http://localhost:3000';
  const paths = spec.paths ?? {};
  const tagMap = new Map<string, { tag: string; description?: string; operations: Array<{ method: string; path: string; operation: Record<string, any> }> }>();
  const tagDescriptions = new Map<string, string>();

  if (Array.isArray(spec.tags)) {
    for (const t of spec.tags) {
      if (t.name && t.description) tagDescriptions.set(t.name, t.description);
    }
  }

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, any>)[method];
      if (!operation || typeof operation !== 'object') continue;
      const tags: string[] = Array.isArray(operation.tags) && operation.tags.length > 0 ? [operation.tags[0]] : ['Default'];
      for (const tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, { tag, description: tagDescriptions.get(tag), operations: [] });
        tagMap.get(tag)!.operations.push({ method: method.toUpperCase(), path: pathStr, operation });
      }
    }
  }

  const tagGroups = [...tagMap.values()].sort((a, b) => {
    if (a.tag === 'Default') return 1;
    if (b.tag === 'Default') return -1;
    return a.tag.localeCompare(b.tag);
  });

  return (
    <div className="clearify-openapi-page" style={{ maxWidth: 'none' }}>
      <ApiHeader spec={spec} />
      {tagGroups.map((group) => (
        <TagGroup key={group.tag} tag={group.tag} description={group.description} operations={group.operations} baseUrl={baseUrl} />
      ))}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/theme/components/openapi/index.ts src/theme/components/OpenAPIPage.tsx src/theme/components/OpenAPI.tsx
git commit -m "feat: rewrite OpenAPIPage and OpenAPI to use custom renderer"
```

---

### Task 11: Clean Up CSS and Remove Scalar Artifacts

**Files:**
- Modify: `src/theme/styles/globals.css:365-491` (remove Scalar isolation CSS)
- Modify: `src/theme/components/index.ts` (no change needed — already exports `OpenAPI`)
- Modify: `src/theme/MDXComponents.tsx` (no change needed — already registers `OpenAPI`)

**Step 1: Remove Scalar CSS resets from globals.css**

Delete lines 365-491 of `src/theme/styles/globals.css` — the entire `/* ─── OpenAPI container isolation ─── */` section, including:
- `.clearify-prose:has(.clearify-openapi-page)` override
- All `.clearify-openapi-container` element resets

**Keep** the `.clearify-prose:has(.clearify-openapi-page)` override (lines 367-371) since the API page still needs to break out of the prose max-width. Replace it with a simpler version:

```css
/* ─── OpenAPI page layout ─── */
.clearify-openapi-page {
  max-width: none;
}
```

So the final edit: delete lines 365-491 and replace with just the 3 lines above.

**Step 2: Verify no remaining Scalar references**

Search the `src/` directory for any remaining references to `scalar`, `@scalar`, or `clearify-openapi-container`:

Run: `grep -r "scalar\|clearify-openapi-container" src/`

Expected: No matches.

**Step 3: Commit**

```bash
git add src/theme/styles/globals.css
git commit -m "cleanup: remove Scalar CSS resets and container isolation"
```

---

### Task 12: Build and Verify

**Step 1: Build Clearify**

Run: `pnpm build`

Expected: Clean build with no TypeScript errors. The tsup build only compiles Node.js code (`src/cli/`, `src/core/`, `src/vite-plugin/`), but TypeScript should still catch any import errors.

**Step 2: Link to lola-stories and test**

In the lola-stories project (`/Users/marlinjai/software dev/lola-stories`):

```bash
cd "/Users/marlinjai/software dev/lola-stories"
pnpm docs:dev
```

Open `http://localhost:4747/api/` in the browser.

Expected:
- API Reference page loads with the custom renderer
- ApiHeader shows "Lola Stories API" with version badge "v0.1.0"
- Tag groups (Auth, Children, Families, Health, Stories, etc.) are visible and collapsible
- Each operation card shows method badge, path, summary
- Two-column layout: docs left, code examples right
- Code examples have tabs (curl, JavaScript, Python)
- Dark mode toggle works (colors adapt via CSS variables)

**Step 3: Fix any issues found during testing**

Common things to watch for:
- Import path issues (`.js` extensions required for ESM)
- CSS variable names not matching (check `globals.css` for exact names)
- Anchor IDs not matching sidebar links (compare with `opAnchor()` in vite-plugin)

**Step 4: Version bump and commit**

```bash
# In clearify project
npm version minor -m "feat: replace Scalar with custom OpenAPI renderer (v%s)"
```

This bumps to `1.6.0`.

**Step 5: Publish**

```bash
pnpm build && npm publish
```

**Step 6: Update lola-stories**

In `/Users/marlinjai/software dev/lola-stories`:

```bash
pnpm update @marlinjai/clearify
```

Run `pnpm docs:dev` again to verify the published version works.

---

## Summary

| Task | Component | Key Files |
|------|-----------|-----------|
| 1 | Dependencies | `package.json` |
| 2 | $ref dereferencing | `src/vite-plugin/index.ts` |
| 3 | MethodBadge | `src/theme/components/openapi/MethodBadge.tsx` |
| 4 | SchemaViewer | `src/theme/components/openapi/SchemaViewer.tsx` |
| 5 | ParameterTable | `src/theme/components/openapi/ParameterTable.tsx` |
| 6 | CodeExamples + snippets | `src/theme/components/openapi/CodeExamples.tsx`, `generate-snippets.ts` |
| 7 | ResponseList | `src/theme/components/openapi/ResponseList.tsx` |
| 8 | OperationCard | `src/theme/components/openapi/OperationCard.tsx` |
| 9 | TagGroup + ApiHeader | `src/theme/components/openapi/TagGroup.tsx`, `ApiHeader.tsx` |
| 10 | Barrel export + OpenAPIPage rewrite | `openapi/index.ts`, `OpenAPIPage.tsx`, `OpenAPI.tsx` |
| 11 | CSS cleanup | `src/theme/styles/globals.css` |
| 12 | Build, test, publish | Build + visual verification |
