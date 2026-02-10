import React from 'react';

const variants = {
  default: {
    bg: 'rgba(107, 114, 128, 0.08)',
    bgDark: 'rgba(107, 114, 128, 0.15)',
    color: '#4b5563',
    colorDark: '#d1d5db',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.08)',
    bgDark: 'rgba(34, 197, 94, 0.15)',
    color: '#16a34a',
    colorDark: '#4ade80',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.08)',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    color: '#d97706',
    colorDark: '#fbbf24',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.08)',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    color: '#dc2626',
    colorDark: '#f87171',
  },
  info: {
    bg: 'rgba(99, 102, 241, 0.08)',
    bgDark: 'rgba(99, 102, 241, 0.15)',
    color: '#6366f1',
    colorDark: '#818cf8',
  },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const v = variants[variant];
  const badgeClass = `clearify-badge-${variant}`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.125rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.5,
        backgroundColor: v.bg,
        color: v.color,
        fontFamily: 'var(--font-sans)',
        whiteSpace: 'nowrap',
      }}
      className={badgeClass}
    >
      {children}

      <style>{`
        .dark .${badgeClass} {
          background-color: ${v.bgDark} !important;
          color: ${v.colorDark} !important;
        }
      `}</style>
    </span>
  );
}
