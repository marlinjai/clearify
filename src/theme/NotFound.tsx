import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '6rem 1.5rem',
        animation: 'clearify-fade-in 0.4s ease-out',
      }}
    >
      <div
        style={{
          fontSize: '6rem',
          fontWeight: 800,
          letterSpacing: '-0.05em',
          lineHeight: 1,
          marginBottom: '0.75rem',
          background: 'var(--clearify-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        404
      </div>
      <p
        style={{
          fontSize: '1.125rem',
          color: 'var(--clearify-text-secondary)',
          marginBottom: '2.5rem',
          fontWeight: 400,
        }}
      >
        This page could not be found.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.5rem',
          borderRadius: 'var(--clearify-radius)',
          background: 'var(--clearify-gradient)',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
        className="clearify-404-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to home

        <style>{`
          .clearify-404-btn:hover {
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3) !important;
            transform: translateY(-1px);
          }
        `}</style>
      </Link>
    </div>
  );
}
