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
        padding: '2rem 1.5rem',
        fontSize: '0.8125rem',
        color: 'var(--clearify-text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div>&copy; {new Date().getFullYear()} {name}. Built with Clearify.</div>
      {links && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          {Object.entries(links).map(([key, url]) =>
            url ? (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--clearify-text-secondary)', textDecoration: 'none' }}
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
