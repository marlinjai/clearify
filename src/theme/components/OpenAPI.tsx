import React, { useMemo } from 'react';
import { useTheme } from '../ThemeProvider.js';

interface OpenAPIProps {
  /** Inline spec as a parsed object or raw string (JSON/YAML). Falls back to config-based spec. */
  spec?: string | Record<string, unknown>;
  /** URL to fetch the OpenAPI spec from at runtime */
  url?: string;
  /** Hide the built-in Scalar sidebar (default: true, since Clearify has its own sidebar) */
  hideSidebar?: boolean;
  /** Hide the dark mode toggle (default: true, Clearify controls dark mode) */
  hideDarkModeToggle?: boolean;
  /** Hide the search (default: true, Clearify has its own search) */
  hideSearch?: boolean;
  /** Layout style: 'modern' or 'classic' */
  layout?: 'modern' | 'classic';
  /** Enable Scalar's path-based routing. Pass { basePath: '/api' } or true for default '/api'. */
  pathRouting?: { basePath: string } | boolean;
}

// SSR guard: Scalar requires DOM
const LazyApiReference = typeof window !== 'undefined'
  ? React.lazy(() =>
      import('@scalar/api-reference-react').then((mod) => ({
        default: mod.ApiReferenceReact,
      }))
    )
  : null;

export function OpenAPI({
  spec,
  url,
  hideSidebar = true,
  hideDarkModeToggle = true,
  hideSearch = true,
  layout = 'modern',
  pathRouting,
}: OpenAPIProps) {
  const { theme } = useTheme();

  const resolvedSpec = spec ?? null;

  const configuration = useMemo(() => {
    const config: Record<string, unknown> = {
      theme: 'default',
      forceDarkModeState: theme === 'dark' ? 'dark' : 'light',
      hideDarkModeToggle,
      showSidebar: !hideSidebar,
      hideSearch,
      layout,
      withDefaultFonts: false,
      customCss: SCALAR_CUSTOM_CSS,
    };

    if (pathRouting) {
      config.pathRouting = pathRouting === true
        ? { basePath: '/api' }
        : pathRouting;
    }

    if (url) {
      config.url = url;
    } else if (typeof resolvedSpec === 'string') {
      config.content = resolvedSpec;
    } else if (resolvedSpec && typeof resolvedSpec === 'object') {
      config.content = resolvedSpec;
    }

    return config;
  }, [resolvedSpec, url, theme, hideSidebar, hideDarkModeToggle, hideSearch, layout, pathRouting]);

  // No spec provided via props, config, or URL
  if (!url && !resolvedSpec) {
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
        <strong>OpenAPI:</strong> No spec provided. Pass a <code>spec</code> or <code>url</code> prop,
        or set <code>openapi.spec</code> in your Clearify config.
      </div>
    );
  }

  // SSR fallback
  if (typeof window === 'undefined' || !LazyApiReference) {
    return (
      <div
        style={{
          border: '1px solid var(--clearify-border)',
          borderRadius: 'var(--clearify-radius)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--clearify-text-secondary)',
        }}
      >
        Loading API Reference...
      </div>
    );
  }

  return (
    <div className="clearify-openapi-container">
      <React.Suspense
        fallback={
          <div
            style={{
              border: '1px solid var(--clearify-border)',
              borderRadius: 'var(--clearify-radius)',
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--clearify-text-secondary)',
            }}
          >
            Loading API Reference...
          </div>
        }
      >
        <LazyApiReference configuration={configuration} />
      </React.Suspense>
    </div>
  );
}

/** Custom CSS to integrate Scalar with Clearify's design tokens */
const SCALAR_CUSTOM_CSS = `
  /* ── Design Token Bridge ── */
  .scalar-app {
    --scalar-font: var(--font-sans);
    --scalar-font-code: var(--font-mono);

    --scalar-color-1: var(--clearify-text);
    --scalar-color-2: var(--clearify-text-secondary);
    --scalar-color-3: var(--clearify-text-tertiary);

    --scalar-color-accent: var(--clearify-primary);
    --scalar-background-accent: rgba(99, 102, 241, 0.08);

    --scalar-background-1: var(--clearify-bg);
    --scalar-background-2: var(--clearify-bg-secondary);
    --scalar-background-3: var(--clearify-bg-tertiary);
    --scalar-background-4: var(--clearify-bg-tertiary);

    --scalar-border-color: var(--clearify-border-strong);
    --scalar-border-width: 1px;

    --scalar-radius: var(--clearify-radius-sm);
    --scalar-radius-lg: var(--clearify-radius);
    --scalar-radius-xl: var(--clearify-radius-lg);

    --scalar-shadow-1: var(--clearify-shadow-sm);
    --scalar-shadow-2: var(--clearify-shadow);

    --scalar-link-color: var(--clearify-primary);
    --scalar-link-color-hover: var(--clearify-primary-hover);
    --scalar-text-decoration: none;
    --scalar-text-decoration-hover: underline;

    --scalar-scrollbar-color: var(--clearify-border-strong);
    --scalar-scrollbar-color-active: var(--clearify-text-tertiary);

    --scalar-color-green: #059669;
    --scalar-color-blue: #2563eb;
    --scalar-color-orange: #d97706;
    --scalar-color-red: #dc2626;
    --scalar-color-purple: #7c3aed;
    --scalar-color-yellow: #ca8a04;
  }

  .dark-mode .scalar-app,
  .dark .scalar-app {
    --scalar-background-accent: rgba(129, 140, 248, 0.1);
    --scalar-color-green: #34d399;
    --scalar-color-blue: #60a5fa;
    --scalar-color-orange: #fbbf24;
    --scalar-color-red: #f87171;
    --scalar-color-purple: #a78bfa;
    --scalar-color-yellow: #facc15;
  }

  /* ── Layout ── */
  .scalar-app .section {
    padding-left: 0;
    padding-right: 0;
  }

  .scalar-app .references-layout {
    --refs-content-max-width: 100%;
  }

  /* ── Introduction Card ── */
  .scalar-app .introduction-card {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
    background: var(--clearify-bg-secondary);
    overflow: hidden;
  }

  /* ── Section Headers ── */
  .scalar-app .section-header {
    font-family: var(--font-sans);
    letter-spacing: -0.01em;
  }

  /* ── Endpoint Cards ── */
  .scalar-app .section-accordion {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .scalar-app .section-accordion:hover {
    border-color: var(--clearify-border-strong);
    box-shadow: var(--clearify-shadow-sm);
  }

  .scalar-app .section-accordion-content-card {
    border-radius: var(--clearify-radius);
  }

  /* ── Method Badges ── */
  .scalar-app .endpoint-method {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    line-height: 1.5;
  }

  .scalar-app .endpoint-method.get {
    background: rgba(5, 150, 105, 0.12);
    color: var(--scalar-color-green);
  }
  .scalar-app .endpoint-method.post {
    background: rgba(37, 99, 235, 0.12);
    color: var(--scalar-color-blue);
  }
  .scalar-app .endpoint-method.put {
    background: rgba(217, 119, 6, 0.12);
    color: var(--scalar-color-orange);
  }
  .scalar-app .endpoint-method.delete {
    background: rgba(220, 38, 38, 0.12);
    color: var(--scalar-color-red);
  }
  .scalar-app .endpoint-method.patch {
    background: rgba(124, 58, 237, 0.12);
    color: var(--scalar-color-purple);
  }

  /* ── Endpoint Paths ── */
  .scalar-app .endpoint-path,
  .scalar-app .endpoint-label-path {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    letter-spacing: -0.01em;
  }

  /* ── Request / Response Cards ── */
  .scalar-app .scalar-card {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
    overflow: hidden;
  }

  .scalar-app .scalar-card-header {
    background: var(--clearify-bg-secondary);
    border-bottom: 1px solid var(--clearify-border);
  }

  .scalar-app .scalar-card-header-tabs button {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    transition: color 0.15s ease, background-color 0.15s ease;
    border-radius: var(--clearify-radius-sm);
  }

  /* ── Code Blocks ── */
  .scalar-app .scalar-codeblock-pre,
  .scalar-app .cm-editor {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    line-height: 1.7;
    border-radius: var(--clearify-radius);
  }

  .scalar-app .scalar-code-block {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
    overflow: hidden;
  }

  .scalar-app .scalar-code-copy {
    border-radius: var(--clearify-radius-sm);
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .scalar-app .scalar-code-block:hover .scalar-code-copy {
    opacity: 1;
  }

  /* ── Parameters ── */
  .scalar-app .parameter-item {
    border-bottom: 1px solid var(--clearify-border);
    transition: background-color 0.15s ease;
  }

  .scalar-app .parameter-item:last-child {
    border-bottom: none;
  }

  .scalar-app .parameter-item:hover {
    background-color: var(--clearify-bg-secondary);
  }

  .scalar-app .parameter-item-name {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .scalar-app .parameter-item--required .parameter-item-required-optional {
    color: var(--scalar-color-orange);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ── Schema / Properties ── */
  .scalar-app .schema-card {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
    overflow: hidden;
  }

  .scalar-app .property-name {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .scalar-app .property-required {
    color: var(--scalar-color-orange);
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .scalar-app .property-read-only {
    color: var(--scalar-color-blue);
    font-size: 0.6875rem;
  }

  .scalar-app .property-write-only {
    color: var(--scalar-color-green);
    font-size: 0.6875rem;
  }

  .scalar-app .schema-type {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--clearify-text-tertiary);
  }

  .scalar-app .property-enum-value {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    background: var(--clearify-bg-secondary);
    border: 1px solid var(--clearify-border);
    border-radius: 4px;
    padding: 0.1rem 0.4rem;
  }

  /* ── Client Libraries ── */
  .scalar-app .client-libraries-icon {
    max-width: 48px;
    max-height: 48px;
  }

  .scalar-app .client-libraries {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
  }

  /* ── Buttons ── */
  .scalar-app .scalar-button {
    border-radius: var(--clearify-radius-sm);
    font-weight: 500;
    font-size: 0.8125rem;
    transition: all 0.15s ease;
  }

  /* ── Tooltips ── */
  .scalar-app .scalar-tooltip {
    font-size: 0.75rem;
    border-radius: var(--clearify-radius-sm);
  }

  /* ── Auth Section ── */
  .scalar-app .security-scheme-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    border-radius: 4px;
  }

  /* ── Smooth Transitions ── */
  .scalar-app .section-accordion-content {
    animation: clearify-fade-in 0.2s ease-out;
  }

  .scalar-app .section-accordion-chevron {
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Server & Auth Intro Cards ── */
  .scalar-app .introduction-card-item {
    border-bottom: 1px solid var(--clearify-border);
  }

  .scalar-app .introduction-card-item:last-child {
    border-bottom: none;
  }

  /* ── Operation Details ── */
  .scalar-app .operation-details-card {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
    overflow: hidden;
  }

  /* ── Try It / Request Editor ── */
  .scalar-app .request-card {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
    overflow: hidden;
  }

  .scalar-app .response-card {
    border: 1px solid var(--clearify-border);
    border-radius: var(--clearify-radius);
    overflow: hidden;
  }

  /* ── Sidebar (when visible) ── */
  .scalar-app {
    --scalar-sidebar-background-1: var(--clearify-bg);
    --scalar-sidebar-color-1: var(--clearify-text);
    --scalar-sidebar-color-2: var(--clearify-text-secondary);
    --scalar-sidebar-color-active: var(--clearify-primary);
    --scalar-sidebar-border-color: var(--clearify-border);
    --scalar-sidebar-item-hover-background: var(--clearify-bg-secondary);
    --scalar-sidebar-item-active-background: var(--clearify-primary-soft);
  }

  /* ── Syntax Highlighting ── */
  .scalar-app .hljs-keyword { color: var(--clearify-primary); }
  .scalar-app .hljs-string { color: var(--scalar-color-green); }
  .scalar-app .hljs-number { color: var(--scalar-color-orange); }
  .scalar-app .hljs-attr { color: var(--scalar-color-blue); }
  .scalar-app .hljs-comment { color: var(--clearify-text-tertiary); font-style: italic; }
`;
