---
title: "v3.0 Plugin System Design"
category: plan
status: draft
date: 2026-03-08
tags: [plugins, extensibility, v3.0]
---

# v3.0 Plugin System Design

## Overview

The plugin system lets the community extend Clearify's build pipeline, theme, and runtime behavior without forking. Plugins hook into well-defined lifecycle points — from markdown transformation to search indexing — keeping the core lean while enabling arbitrary extensions.

## Plugin API Surface

### Build Hooks

- **`beforeBuild(ctx)`** — runs once before any content is processed. Receives build context (config, root path, sections).
- **`afterBuild(ctx)`** — runs after all output is written. Useful for post-processing, generating sitemaps, etc.
- **`transformMarkdown(content, file)`** — modify raw markdown before MDX compilation. Return transformed string.
- **`transformHtml(html, route)`** — modify final HTML output per page before writing to disk.
- **`onRoute(route)`** — called for each resolved route. Can modify route metadata or return `null` to exclude.

### Theme Hooks

- **`wrapLayout(Layout)`** — wrap the root layout component (e.g., inject providers, global UI).
- **`addComponents()`** — return a `Record<string, Component>` to register custom MDX components globally.
- **`addStyles()`** — return CSS strings or file paths injected into the document head.

### Navigation Hooks

- **`transformNav(nav, section)`** — receive the resolved sidebar/nav tree per section. Return a modified tree to reorder, inject, or remove items.

### Search Hooks

- **`indexDocument(entry, file)`** — customize what gets indexed. Return modified entry or `null` to skip.
- **`transformResults(results, query)`** — post-process search results before display (re-rank, filter, annotate).

### Dev Server Hooks

- **`configureServer(server)`** — receives the Vite `ViteDevServer` instance. Add middleware, custom routes, or WebSocket handlers.

## Plugin Structure

A plugin is an npm package exporting a factory function:

```ts
// clearify-plugin-example/index.ts
import type { ClearifyPlugin } from 'clearify';

export default function examplePlugin(options?: ExampleOptions): ClearifyPlugin {
  return {
    name: 'clearify-plugin-example',
    transformMarkdown(content, file) {
      // modify content
      return content;
    },
    afterBuild(ctx) {
      // post-build work
    },
  };
}
```

Naming convention: packages must be named `clearify-plugin-*` or scoped as `@scope/clearify-plugin-*`.

## Configuration

Plugins are added to the `plugins` array in `clearify.config.ts`:

```ts
import { defineConfig } from 'clearify';
import analytics from 'clearify-plugin-analytics';
import i18n from 'clearify-plugin-i18n';

export default defineConfig({
  plugins: [
    analytics({ trackingId: 'UA-XXXXX' }),
    i18n({ defaultLocale: 'en', locales: ['en', 'de'] }),
  ],
});
```

Plugin options are passed as the first argument to the factory function. The returned object contains hook implementations.

## Plugin Resolution

1. **Explicit config** — plugins listed in the `plugins` array are loaded in order.
2. **Local file plugins** — relative paths resolve against the project root (e.g., `'./plugins/my-plugin'`).
3. **Auto-discover** (opt-in via `plugins.autoDiscover: true`) — scan `node_modules` for packages matching `clearify-plugin-*`.
4. **Execution order** — first registered = first called. Each hook runs plugins sequentially; the output of one feeds into the next (`transformMarkdown`, `transformNav`, etc. form a pipeline).

## Built-in Plugins

Refactor existing features as internal plugins using the same hook API. This validates the plugin surface and keeps the core minimal:

| Feature | Internal Plugin | Primary Hooks |
|---------|----------------|---------------|
| Mermaid diagrams | `@clearify/plugin-mermaid` | `transformMarkdown`, `afterBuild` |
| Full-text search | `@clearify/plugin-search` | `indexDocument`, `transformResults` |
| OpenAPI renderer | `@clearify/plugin-openapi` | `onRoute`, `addComponents`, `transformNav` |
| Changelog page | `@clearify/plugin-changelog` | `onRoute`, `transformNav` |

Internal plugins are always loaded before user plugins and cannot be removed, only configured.

## Sandboxing

Plugins **cannot**:

- Override core routing logic (the router is not exposed; `onRoute` can only annotate or exclude).
- Break SSG output — `transformHtml` runs in a sandbox that rejects malformed HTML.
- Access other plugins' internal state — each plugin receives an isolated context.
- Modify the Clearify config object after initialization.
- Register new CLI commands (reserved for future consideration).

Plugins that throw during a hook are caught and logged; the build continues with a warning unless `strictPlugins: true` is set.

## Example Plugins

### clearify-plugin-analytics

Injects a tracking script into every page via `transformHtml`. Supports Plausible, Umami, and Google Analytics. Configurable with `provider` and `trackingId` options.

### clearify-plugin-i18n

Adds multi-language support. Uses `transformNav` to build per-locale navigation, `transformMarkdown` to resolve locale-specific content files, and `addComponents` to register a `<LanguageSwitcher>` component.

### clearify-plugin-comments

Adds discussion threads to doc pages. Uses `wrapLayout` to inject a comments panel, `configureServer` to proxy comment API calls during dev, and `addStyles` for comment thread styling.

## Testing

A test harness package (`@clearify/plugin-test-utils`) provides:

- **`createMockContext(overrides?)`** — builds a mock `ClearifyPluginContext` with sensible defaults.
- **`runHook(plugin, hookName, ...args)`** — executes a single hook with provided arguments and returns the result.
- **`buildWithPlugins(plugins, fixtures)`** — runs a full build against a fixture docs directory and returns the output for assertions.

```ts
import { createMockContext, runHook } from '@clearify/plugin-test-utils';
import myPlugin from 'clearify-plugin-example';

test('transformMarkdown adds banner', async () => {
  const plugin = myPlugin({ banner: '> Draft' });
  const result = await runHook(plugin, 'transformMarkdown', '# Hello', 'docs/index.md');
  expect(result).toContain('> Draft');
});
```

## Distribution

- **npm** — publish as a standard npm package following the `clearify-plugin-*` naming convention.
- **Plugin registry** (future) — a searchable directory at `clearify.dev/plugins` listing community plugins with metadata, compatibility info, and download stats. Registry inclusion requires passing automated compatibility tests against the latest Clearify version.
