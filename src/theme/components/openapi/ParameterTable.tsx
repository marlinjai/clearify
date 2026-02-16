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
