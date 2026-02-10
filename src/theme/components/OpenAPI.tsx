import React, { useMemo } from 'react';
import { useTheme } from '../ThemeProvider.js';
import openapiSpec from 'virtual:clearify/openapi-spec';

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
}: OpenAPIProps) {
  const { theme } = useTheme();

  // Resolve the spec source: explicit prop > config-based virtual module
  const resolvedSpec = spec ?? openapiSpec;

  const configuration = useMemo(() => {
    const config: Record<string, unknown> = {
      // Use 'none' theme so Clearify's CSS variable bridge takes full control
      theme: 'none',
      forceDarkModeState: theme === 'dark' ? 'dark' : 'light',
      hideDarkModeToggle,
      showSidebar: !hideSidebar,
      hideSearch,
      layout,
      withDefaultFonts: false,
      customCss: SCALAR_CUSTOM_CSS,
    };

    if (url) {
      config.url = url;
    } else if (typeof resolvedSpec === 'string') {
      config.content = resolvedSpec;
    } else if (resolvedSpec && typeof resolvedSpec === 'object') {
      config.content = resolvedSpec;
    }

    return config;
  }, [resolvedSpec, url, theme, hideSidebar, hideDarkModeToggle, hideSearch, layout]);

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
  .scalar-app {
    --scalar-font: var(--font-sans);
    --scalar-font-code: var(--font-mono);

    --scalar-color-1: var(--clearify-text);
    --scalar-color-2: var(--clearify-text-secondary);
    --scalar-color-3: var(--clearify-text-tertiary);

    --scalar-color-accent: var(--clearify-primary);

    --scalar-background-1: var(--clearify-bg);
    --scalar-background-2: var(--clearify-bg-secondary);
    --scalar-background-3: var(--clearify-bg-tertiary);

    --scalar-border-color: var(--clearify-border-strong);

    --scalar-radius: var(--clearify-radius-sm);
    --scalar-radius-lg: var(--clearify-radius);

    --scalar-shadow-1: var(--clearify-shadow-sm);
    --scalar-shadow-2: var(--clearify-shadow);
  }

  .scalar-app .section {
    padding-left: 0;
    padding-right: 0;
  }
`;
