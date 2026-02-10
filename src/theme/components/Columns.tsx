import React from 'react';

interface ColumnsProps {
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
}

export function Columns({ cols = 2, children }: ColumnsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}
      className="clearify-columns"
    >
      {children}

      <style>{`
        @media (max-width: 768px) {
          .clearify-columns {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

interface ColumnProps {
  children: React.ReactNode;
}

export function Column({ children }: ColumnProps) {
  return (
    <div style={{ minWidth: 0 }}>
      {children}
    </div>
  );
}
