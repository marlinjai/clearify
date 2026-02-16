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
