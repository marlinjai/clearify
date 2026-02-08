import React from 'react';

const variants = {
  info: {
    bg: '#eff6ff',
    bgDark: '#1e3a5f',
    border: '#3b82f6',
    icon: 'ℹ️',
  },
  warning: {
    bg: '#fffbeb',
    bgDark: '#422006',
    border: '#f59e0b',
    icon: '⚠️',
  },
  error: {
    bg: '#fef2f2',
    bgDark: '#450a0a',
    border: '#ef4444',
    icon: '❌',
  },
  tip: {
    bg: '#f0fdf4',
    bgDark: '#052e16',
    border: '#22c55e',
    icon: '💡',
  },
};

interface CalloutProps {
  type?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const v = variants[type];

  return (
    <div
      style={{
        borderLeft: `3px solid ${v.border}`,
        borderRadius: '0.5rem',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
        backgroundColor: v.bg,
        fontSize: '0.9375rem',
      }}
      className="clearify-callout"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: children ? '0.5rem' : 0, fontWeight: 600 }}>
        <span>{v.icon}</span>
        {title && <span>{title}</span>}
        {!title && <span style={{ textTransform: 'capitalize' }}>{type}</span>}
      </div>
      {children && <div>{children}</div>}

      <style>{`
        .dark .clearify-callout {
          background-color: ${v.bgDark} !important;
        }
      `}</style>
    </div>
  );
}
