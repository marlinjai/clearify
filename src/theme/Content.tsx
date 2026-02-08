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
        padding: '2rem',
        maxWidth: '48rem',
      }}
    >
      {children}
    </div>
  );
}
