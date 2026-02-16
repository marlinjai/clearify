import React from 'react';
import { MethodBadge } from './MethodBadge.js';
import { ParameterTable } from './ParameterTable.js';
import { SchemaViewer } from './SchemaViewer.js';
import { ResponseList } from './ResponseList.js';
import { CodeExamples } from './CodeExamples.js';

interface OperationCardProps {
  method: string;
  path: string;
  operation: Record<string, any>;
  baseUrl: string;
  anchorId: string;
}

export function OperationCard({ method, path, operation, baseUrl, anchorId }: OperationCardProps) {
  const summary = operation.summary ?? operation.description ?? `${method.toUpperCase()} ${path}`;
  const description = operation.description && operation.description !== summary ? operation.description : null;
  const parameters = operation.parameters ?? [];
  const requestBody = operation.requestBody;
  const responses = operation.responses ?? {};
  const security = operation.security;
  const deprecated = !!operation.deprecated;

  const bodySchema = requestBody?.content?.['application/json']?.schema;

  return (
    <div
      id={anchorId}
      style={{
        border: '1px solid var(--clearify-border)',
        borderRadius: 'var(--clearify-radius)',
        overflow: 'hidden',
        marginBottom: '1rem',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      className="clearify-operation-card"
    >
      {/* Two-column layout */}
      <div className="clearify-operation-layout" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
      }}>
        {/* Left column — documentation */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRight: '1px solid var(--clearify-border)',
        }}>
          {/* Method + Path header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <MethodBadge method={method} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: deprecated ? 'var(--clearify-text-tertiary)' : 'var(--clearify-text)',
              textDecoration: deprecated ? 'line-through' : undefined,
              letterSpacing: '-0.01em',
            }}>
              {path}
            </span>
            {deprecated && (
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                color: '#d97706',
                background: 'rgba(217, 119, 6, 0.1)',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
              }}>
                Deprecated
              </span>
            )}
            {security && security.length > 0 && (
              <span style={{
                fontSize: '0.6875rem',
                color: 'var(--clearify-text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Auth
              </span>
            )}
          </div>

          {/* Summary */}
          <div style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--clearify-text)',
            marginTop: '0.625rem',
            letterSpacing: '-0.01em',
          }}>
            {summary}
          </div>

          {/* Description */}
          {description && (
            <div style={{
              fontSize: '0.8125rem',
              color: 'var(--clearify-text-secondary)',
              marginTop: '0.375rem',
              lineHeight: 1.6,
            }}>
              {description}
            </div>
          )}

          {/* Parameters */}
          {parameters.length > 0 && <ParameterTable parameters={parameters} />}

          {/* Request Body */}
          {bodySchema && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                color: 'var(--clearify-text-tertiary)',
                marginBottom: '0.375rem',
              }}>
                Request Body
                {requestBody?.required && (
                  <span className="clearify-required-badge" style={{
                    marginLeft: '0.5rem',
                    color: '#d97706',
                  }}>
                    required
                  </span>
                )}
              </div>
              <div style={{
                border: '1px solid var(--clearify-border)',
                borderRadius: 'var(--clearify-radius)',
                padding: '0.625rem 0.875rem',
              }}>
                <SchemaViewer schema={bodySchema} />
              </div>
            </div>
          )}

          {/* Responses */}
          <ResponseList responses={responses} />
        </div>

        {/* Right column — code examples */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--clearify-bg-secondary)',
        }}>
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: 'var(--clearify-text-tertiary)',
            marginBottom: '0.625rem',
          }}>
            Examples
          </div>
          <CodeExamples
            method={method}
            path={path}
            baseUrl={baseUrl}
            parameters={parameters}
            requestBody={requestBody}
            security={security}
          />
        </div>
      </div>

      <style>{`
        .clearify-operation-card:hover {
          border-color: var(--clearify-border-strong) !important;
          box-shadow: var(--clearify-shadow-sm);
        }
        @media (max-width: 900px) {
          .clearify-operation-layout {
            grid-template-columns: 1fr !important;
          }
          .clearify-operation-layout > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid var(--clearify-border) !important;
          }
        }
        .dark .clearify-required-badge { color: #fbbf24 !important; }
      `}</style>
    </div>
  );
}
