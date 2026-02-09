import React from 'react';

const variants = {
  info: {
    bg: 'rgba(99, 102, 241, 0.06)',
    bgDark: 'rgba(99, 102, 241, 0.1)',
    border: '#6366f1',
    iconColor: '#6366f1',
    iconColorDark: '#818cf8',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.06)',
    bgDark: 'rgba(245, 158, 11, 0.1)',
    border: '#f59e0b',
    iconColor: '#d97706',
    iconColorDark: '#fbbf24',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.06)',
    bgDark: 'rgba(239, 68, 68, 0.1)',
    border: '#ef4444',
    iconColor: '#dc2626',
    iconColorDark: '#f87171',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  tip: {
    bg: 'rgba(34, 197, 94, 0.06)',
    bgDark: 'rgba(34, 197, 94, 0.1)',
    border: '#22c55e',
    iconColor: '#16a34a',
    iconColorDark: '#4ade80',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
      </svg>
    ),
  },
};

interface CalloutProps {
  type?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const v = variants[type];
  const calloutId = `clearify-callout-${type}`;

  return (
    <div
      style={{
        borderLeft: `3px solid ${v.border}`,
        borderRadius: `0 var(--clearify-radius) var(--clearify-radius) 0`,
        padding: '0.875rem 1.25rem',
        marginBottom: '1.25rem',
        backgroundColor: v.bg,
        fontSize: '0.9375rem',
      }}
      className={calloutId}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: children ? '0.375rem' : 0,
          fontWeight: 600,
          fontSize: '0.875rem',
          color: v.iconColor,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{v.icon}</span>
        {title && <span>{title}</span>}
        {!title && <span style={{ textTransform: 'capitalize' }}>{type}</span>}
      </div>
      {children && (
        <div style={{ fontSize: '0.875rem', color: 'var(--clearify-text-secondary)', lineHeight: 1.6 }}>
          {children}
        </div>
      )}

      <style>{`
        .dark .${calloutId} {
          background-color: ${v.bgDark} !important;
        }
        .dark .${calloutId} > div:first-child {
          color: ${v.iconColorDark} !important;
        }
      `}</style>
    </div>
  );
}
