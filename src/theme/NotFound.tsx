import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--clearify-text-secondary)' }}>
        404
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--clearify-text-secondary)', marginBottom: '2rem' }}>
        Page not found
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          padding: '0.625rem 1.5rem',
          borderRadius: '0.5rem',
          backgroundColor: 'var(--clearify-primary)',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Go home
      </Link>
    </div>
  );
}
