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
