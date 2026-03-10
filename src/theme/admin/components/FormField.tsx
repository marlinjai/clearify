import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({ label, error, children, htmlFor }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: 'var(--clearify-text-secondary)',
          marginBottom: '0.375rem',
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#dc2626',
            marginTop: '0.25rem',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
