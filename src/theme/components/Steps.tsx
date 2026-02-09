import React, { Children, isValidElement } from 'react';

interface StepProps {
  title?: string;
  children: React.ReactNode;
}

export function Step({ title, children }: StepProps) {
  return (
    <div>
      {title && (
        <div style={{ fontWeight: 600, marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
          {title}
        </div>
      )}
      <div style={{ color: 'var(--clearify-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

interface StepsProps {
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  const steps = Children.toArray(children).filter(isValidElement);

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
          {/* Vertical connector line */}
          {i < steps.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: 15,
                top: 36,
                bottom: 0,
                width: 1,
                background: 'var(--clearify-border-strong)',
              }}
            />
          )}
          {/* Step number with gradient */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--clearify-gradient)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8125rem',
              fontWeight: 700,
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
            }}
          >
            {i + 1}
          </div>
          {/* Step content */}
          <div style={{ flex: 1, paddingBottom: '1.75rem', paddingTop: '0.25rem' }}>
            {step}
          </div>
        </div>
      ))}
    </div>
  );
}
