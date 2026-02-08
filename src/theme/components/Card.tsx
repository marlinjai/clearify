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
        borderRadius: '0.75rem',
        padding: '1.25rem',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: href ? 'pointer' : 'default',
        height: '100%',
      }}
      className="clearify-card"
    >
      {icon && <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>}
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>
      {description && (
        <div style={{ fontSize: '0.875rem', color: 'var(--clearify-text-secondary)' }}>
          {description}
        </div>
      )}
      {children && <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>{children}</div>}

      <style>{`
        .clearify-card:hover {
          border-color: var(--clearify-primary) !important;
          box-shadow: 0 0 0 1px var(--clearify-primary);
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
        gap: '1rem',
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
