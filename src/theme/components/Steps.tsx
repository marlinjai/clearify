import React, { Children, isValidElement } from 'react';

interface StepProps {
  title?: string;
  children: React.ReactNode;
}

export function Step({ title, children }: StepProps) {
  return (
    <div>
      {title && <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>}
      <div>{children}</div>
    </div>
  );
}

interface StepsProps {
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  const steps = Children.toArray(children).filter(isValidElement);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
          {/* Vertical line */}
          {i < steps.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: 15,
                top: 32,
                bottom: 0,
                width: 2,
                backgroundColor: 'var(--clearify-border)',
              }}
            />
          )}
          {/* Step number */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--clearify-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {i + 1}
          </div>
          {/* Step content */}
          <div style={{ flex: 1, paddingBottom: '1.5rem' }}>
            {step}
          </div>
        </div>
      ))}
    </div>
  );
}
