import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;

  // Don't show breadcrumbs on the root page
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = toTitleCase(segment);
    const isLast = i === segments.length - 1;
    return { label, path, isLast };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.8125rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <Link
        to="/"
        style={{
          color: 'var(--clearify-text-secondary)',
          textDecoration: 'none',
          transition: 'color 0.15s',
        }}
        className="clearify-breadcrumb-link"
      >
        Home
      </Link>
      {crumbs.map((crumb) => (
        <React.Fragment key={crumb.path}>
          <span
            style={{
              color: 'var(--clearify-text-tertiary)',
              userSelect: 'none',
              fontSize: '0.75rem',
            }}
          >
            /
          </span>
          {crumb.isLast ? (
            <span style={{ color: 'var(--clearify-text)', fontWeight: 500 }}>
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              style={{
                color: 'var(--clearify-text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              className="clearify-breadcrumb-link"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}

      <style>{`
        .clearify-breadcrumb-link:hover {
          color: var(--clearify-primary) !important;
        }
      `}</style>
    </nav>
  );
}
