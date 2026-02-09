import React from 'react';
import { Link } from 'react-router-dom';

interface CardProps {
  title: string;
  description?: string;
  icon?: string;
  href?: string;
  children?: React.ReactNode;
}

export function Card({ title, description, icon, href, children }: CardProps) {
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
      }}
      className="clearify-card"
    >
      {icon && (
        <div
          style={{
            fontSize: '1.25rem',
            marginBottom: '0.625rem',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--clearify-radius-sm)',
            background: 'var(--clearify-gradient-subtle)',
            border: '1px solid var(--clearify-border)',
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--clearify-text-secondary)', lineHeight: 1.55 }}>
          {description}
        </div>
      )}
      {children && <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem' }}>{children}</div>}

      <style>{`
        .clearify-card:hover {
          border-color: var(--clearify-border-strong) !important;
          box-shadow: var(--clearify-shadow) !important;
          transform: translateY(-1px);
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

interface CardGroupProps {
  cols?: number;
  children: React.ReactNode;
}

export function CardGroup({ cols = 2, children }: CardGroupProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '0.875rem',
        marginBottom: '1.5rem',
      }}
      className="clearify-card-group"
    >
      {children}

      <style>{`
        @media (max-width: 640px) {
          .clearify-card-group {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
