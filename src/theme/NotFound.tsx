import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import routes from 'virtual:clearify/routes';

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function findSimilarRoutes(currentPath: string, maxResults = 5) {
  const normalizedCurrent = currentPath.toLowerCase().replace(/\/+$/, '') || '/';

  const scored = routes
    .filter((r) => r.path !== normalizedCurrent)
    .map((r) => {
      const normalizedRoute = r.path.toLowerCase().replace(/\/+$/, '') || '/';
      const distance = levenshtein(normalizedCurrent, normalizedRoute);
      // Also check segment overlap for better relevance
      const currentSegments = normalizedCurrent.split('/').filter(Boolean);
      const routeSegments = normalizedRoute.split('/').filter(Boolean);
      const commonSegments = currentSegments.filter((s) => routeSegments.includes(s)).length;
      // Lower score = better match. Weight segment overlap heavily.
      const score = distance - commonSegments * 3;
      return { route: r, score, distance };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, maxResults);

  return scored;
}

function formatTitle(route: { path: string; frontmatter: { title?: string } }): string {
  if (route.frontmatter.title) return route.frontmatter.title;
  // Derive a title from the path
  const segments = route.path.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  const last = segments[segments.length - 1];
  return last
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function NotFound() {
  const location = useLocation();
  const suggestions = useMemo(() => findSimilarRoutes(location.pathname), [location.pathname]);

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '6rem 1.5rem',
        animation: 'clearify-fade-in 0.4s ease-out',
      }}
    >
      <div
        style={{
          fontSize: '6rem',
          fontWeight: 800,
          letterSpacing: '-0.05em',
          lineHeight: 1,
          marginBottom: '0.75rem',
          background: 'var(--clearify-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        404
      </div>
      <p
        style={{
          fontSize: '1.125rem',
          color: 'var(--clearify-text-secondary)',
          marginBottom: '1rem',
          fontWeight: 400,
        }}
      >
        This page could not be found.
      </p>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--clearify-text-tertiary, var(--clearify-text-secondary))',
          marginBottom: '2rem',
          fontFamily: 'var(--font-mono)',
          opacity: 0.7,
        }}
      >
        {location.pathname}
      </p>

      {suggestions.length > 0 && (
        <div
          style={{
            maxWidth: '28rem',
            margin: '0 auto 2.5rem',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--clearify-text-secondary)',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Did you mean?
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
            }}
          >
            {suggestions.map(({ route }) => (
              <Link
                key={route.path}
                to={route.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--clearify-radius)',
                  border: '1px solid var(--clearify-border)',
                  background: 'var(--clearify-bg-secondary)',
                  color: 'var(--clearify-text)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                className="clearify-404-suggestion"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--clearify-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>{formatTitle(route)}</span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: 'var(--clearify-text-secondary)',
                      marginTop: '0.125rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {route.path}
                  </span>
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.4, flexShrink: 0 }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p
        style={{
          fontSize: '0.8125rem',
          color: 'var(--clearify-text-secondary)',
          marginBottom: '1.5rem',
        }}
      >
        Try using the search to find what you are looking for.
      </p>

      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.5rem',
          borderRadius: 'var(--clearify-radius)',
          background: 'var(--clearify-gradient)',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
        className="clearify-404-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to home

        <style>{`
          .clearify-404-btn:hover {
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3) !important;
            transform: translateY(-1px);
          }
          .clearify-404-suggestion:hover {
            border-color: var(--clearify-primary) !important;
            background: var(--clearify-bg-tertiary) !important;
          }
        `}</style>
      </Link>
    </div>
  );
}
