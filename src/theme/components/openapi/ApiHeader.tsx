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
