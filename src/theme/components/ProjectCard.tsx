import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge.js';

interface ProjectCardProps {
  name: string;
  description: string;
  href?: string;
  repo?: string;
  status?: 'active' | 'beta' | 'planned' | 'deprecated';
  icon?: string;
  tags?: string[];
  children?: React.ReactNode;
}

export function ProjectCard({ name, description, href, repo, status, icon, tags, children }: ProjectCardProps) {
  const content = (
    <div
      style={{
        border: '1px solid var(--clearify-border)',
        borderRadius: 'var(--clearify-radius-lg)',
        padding: '1.375rem',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: href ? 'pointer' : 'default',
        height: '100%',
        background: 'var(--clearify-bg)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
      }}
      className="clearify-project-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
        {icon && (
          <div
            style={{
              fontSize: '1.25rem',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--clearify-radius-sm)',
              background: 'var(--clearify-gradient-subtle)',
              border: '1px solid var(--clearify-border)',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {status && <StatusBadge status={status} />}
          {repo && (
            <a
              href={repo}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                color: 'var(--clearify-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color 0.15s',
              }}
              className="clearify-project-card-repo"
              title="View repository"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          )}
        </div>
      </div>

      <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
        {name}
      </div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--clearify-text-secondary)', lineHeight: 1.55, flex: 1 }}>
        {description}
      </div>

      {children && <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem' }}>{children}</div>}

      {tags && tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem', marginTop: '0.75rem' }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                padding: '0.0625rem 0.4375rem',
                borderRadius: '9999px',
                fontSize: '0.6875rem',
                fontWeight: 500,
                background: 'rgba(107, 114, 128, 0.08)',
                color: 'var(--clearify-text-secondary)',
                fontFamily: 'var(--font-sans)',
              }}
              className="clearify-project-card-tag"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <style>{`
        .clearify-project-card:hover {
          border-color: var(--clearify-border-strong) !important;
          box-shadow: var(--clearify-shadow) !important;
          transform: translateY(-1px);
        }
        .clearify-project-card-repo:hover {
          color: var(--clearify-text) !important;
        }
        .dark .clearify-project-card-tag {
          background: rgba(107, 114, 128, 0.15) !important;
        }
      `}</style>
    </div>
  );

  if (href) {
    if (href.startsWith('/')) {
      return <Link to={href} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{content}</a>;
  }

  return content;
}
