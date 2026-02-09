import React from 'react';

interface ContentProps {
  children: React.ReactNode;
}

export function Content({ children }: ContentProps) {
  return (
    <div
      className="clearify-prose"
      style={{
        flex: 1,
        minWidth: 0,
        padding: '2.5rem 3rem',
        maxWidth: 'var(--clearify-content-max)',
        animation: 'clearify-fade-in 0.3s ease-out',
      }}
    >
      {children}

      <style>{`
        @media (max-width: 768px) {
          .clearify-prose {
            padding: 1.5rem 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
