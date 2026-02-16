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
