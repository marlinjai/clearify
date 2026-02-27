import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from './ThemeProvider.js';
import { Search } from './Search.js';

interface HeaderProps {
  name: string;
  links?: { github?: string; [key: string]: string | undefined };
  logo?: { light?: string; dark?: string };
  onMenuToggle: () => void;
}

export function Header({ name, links, logo, onMenuToggle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        height: 'var(--clearify-header-height)',
        borderBottom: '1px solid var(--clearify-border)',
        backgroundColor: 'var(--clearify-surface)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      <button
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          color: 'var(--clearify-text)',
          borderRadius: 'var(--clearify-radius-sm)',
          transition: 'background-color 0.15s',
        }}
        className="clearify-menu-btn"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--clearify-bg-secondary)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <Link
        to="/"
        style={{
          fontWeight: 700,
          fontSize: '1rem',
          color: 'var(--clearify-text)',
          textDecoration: 'none',
          marginRight: 'auto',
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {logo && (logo.light || logo.dark) ? (
          <img
            src={theme === 'dark' && logo.dark ? logo.dark : logo.light || logo.dark}
            alt={name}
            style={{ maxHeight: 28, width: 'auto', display: 'block' }}
          />
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 'var(--clearify-radius-sm)',
              background: 'var(--clearify-gradient)',
              color: '#fff',
              fontSize: '0.6875rem',
              fontWeight: 800,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        {name}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <Search />

        {links?.app && (
          <a
            href={links.app}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              borderRadius: 'var(--clearify-radius-sm)',
              background: 'var(--clearify-gradient)',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open App
          </a>
        )}

        {links?.github && (
          <a
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 'var(--clearify-radius-sm)',
              color: 'var(--clearify-text-secondary)',
              transition: 'color 0.15s, background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--clearify-text)';
              e.currentTarget.style.backgroundColor = 'var(--clearify-bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--clearify-text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        )}

        <button
          onClick={toggleTheme}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--clearify-radius-sm)',
            color: 'var(--clearify-text-secondary)',
            transition: 'color 0.15s, background-color 0.15s',
          }}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--clearify-text)';
            e.currentTarget.style.backgroundColor = 'var(--clearify-bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--clearify-text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
