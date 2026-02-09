import React from 'react';

interface FooterProps {
  name: string;
  links?: { github?: string; [key: string]: string | undefined };
}

export function Footer({ name, links }: FooterProps) {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--clearify-border)',
        padding: '2rem 2.5rem',
        fontSize: '0.8125rem',
        color: 'var(--clearify-text-tertiary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div style={{ letterSpacing: '-0.01em' }}>
        &copy; {new Date().getFullYear()} {name}.{' '}
        <span style={{ opacity: 0.6 }}>Built with Clearify.</span>
      </div>
      {links && (
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          {Object.entries(links).map(([key, url]) =>
            url ? (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--clearify-text-tertiary)',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                  fontSize: '0.8125rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--clearify-text-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--clearify-text-tertiary)')}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </a>
            ) : null
          )}
        </div>
      )}
    </footer>
  );
}
