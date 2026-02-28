import React from 'react';

const statusStyles = {
  active: {
    bg: 'rgba(34, 197, 94, 0.08)',
    bgDark: 'rgba(34, 197, 94, 0.15)',
    color: '#16a34a',
    colorDark: '#4ade80',
    label: 'Active',
  },
  beta: {
    bg: 'rgba(99, 102, 241, 0.08)',
    bgDark: 'rgba(99, 102, 241, 0.15)',
    color: '#6366f1',
    colorDark: '#818cf8',
    label: 'Beta',
  },
  planned: {
    bg: 'rgba(245, 158, 11, 0.08)',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    color: '#d97706',
    colorDark: '#fbbf24',
    label: 'Planned',
  },
  deprecated: {
    bg: 'rgba(239, 68, 68, 0.08)',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    color: '#dc2626',
    colorDark: '#f87171',
    label: 'Deprecated',
  },
};

interface StatusBadgeProps {
  status: 'active' | 'beta' | 'planned' | 'deprecated';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = statusStyles[status];
  const badgeClass = `clearify-status-badge-${status}`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.125rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '0.6875rem',
        fontWeight: 500,
        lineHeight: 1.5,
        backgroundColor: s.bg,
        color: s.color,
        fontFamily: 'var(--font-sans)',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
      className={badgeClass}
    >
      {s.label}

      <style>{`
        .dark .${badgeClass} {
          background-color: ${s.bgDark} !important;
          color: ${s.colorDark} !important;
        }
      `}</style>
    </span>
  );
}
