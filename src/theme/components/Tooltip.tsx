import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionStyles: Record<string, React.CSSProperties> = {
  top: {
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '6px',
  },
  bottom: {
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '6px',
  },
  left: {
    right: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginRight: '6px',
  },
  right: {
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: '6px',
  },
};

const arrowStyles: Record<string, React.CSSProperties> = {
  top: {
    bottom: '-4px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  bottom: {
    top: '-4px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  left: {
    right: '-4px',
    top: '50%',
    transform: 'translateY(-50%) rotate(45deg)',
  },
  right: {
    left: '-4px',
    top: '50%',
    transform: 'translateY(-50%) rotate(45deg)',
  },
};

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      className="clearify-tooltip-wrapper"
    >
      {children}
      <span
        className="clearify-tooltip"
        style={{
          position: 'absolute',
          ...positionStyles[position],
          padding: '0.375rem 0.625rem',
          borderRadius: 'var(--clearify-radius-sm)',
          fontSize: '0.75rem',
          fontWeight: 500,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          backgroundColor: 'var(--clearify-text)',
          color: 'var(--clearify-bg)',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 50,
        }}
      >
        {content}
        <span
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--clearify-text)',
            ...arrowStyles[position],
          }}
        />
      </span>

      <style>{`
        .clearify-tooltip-wrapper:hover .clearify-tooltip {
          opacity: 1 !important;
        }
      `}</style>
    </span>
  );
}
