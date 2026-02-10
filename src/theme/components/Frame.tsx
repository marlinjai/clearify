import React from 'react';

interface FrameProps {
  children: React.ReactNode;
  caption?: string;
}

export function Frame({ children, caption }: FrameProps) {
  return (
    <figure
      style={{
        margin: '0 0 1.5rem 0',
        padding: 0,
      }}
    >
      <div
        style={{
          border: '1px solid var(--clearify-border)',
          borderRadius: 'var(--clearify-radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--clearify-shadow)',
          background: 'var(--clearify-bg)',
        }}
        className="clearify-frame"
      >
        {children}
      </div>
      {caption && (
        <figcaption
          style={{
            marginTop: '0.5rem',
            fontSize: '0.8125rem',
            color: 'var(--clearify-text-secondary)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {caption}
        </figcaption>
      )}

      <style>{`
        .clearify-frame .clearify-prose img,
        .clearify-frame img {
          border: none !important;
          border-radius: 0 !important;
          margin: 0 !important;
          box-shadow: none !important;
          display: block;
          width: 100%;
        }
      `}</style>
    </figure>
  );
}
