import React from 'react';

const METHOD_STYLES: Record<string, { bg: string; color: string; darkColor: string }> = {
  GET:    { bg: 'rgba(5, 150, 105, 0.12)',  color: '#059669', darkColor: '#34d399' },
  POST:   { bg: 'rgba(37, 99, 235, 0.12)',  color: '#2563eb', darkColor: '#60a5fa' },
  PUT:    { bg: 'rgba(217, 119, 6, 0.12)',   color: '#d97706', darkColor: '#fbbf24' },
  DELETE: { bg: 'rgba(220, 38, 38, 0.12)',   color: '#dc2626', darkColor: '#f87171' },
  PATCH:  { bg: 'rgba(124, 58, 237, 0.12)',  color: '#7c3aed', darkColor: '#a78bfa' },
};

interface MethodBadgeProps {
  method: string;
}

export function MethodBadge({ method }: MethodBadgeProps) {
  const upper = method.toUpperCase();
  const style = METHOD_STYLES[upper] ?? { bg: 'rgba(0,0,0,0.06)', color: 'inherit', darkColor: 'inherit' };

  return (
    <>
      <span
        className={`clearify-method-badge clearify-method-${upper.toLowerCase()}`}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          lineHeight: 1.5,
          display: 'inline-block',
          background: style.bg,
          color: style.color,
        }}
      >
        {upper}
      </span>
      <style>{`
        .dark .clearify-method-get { color: ${METHOD_STYLES.GET.darkColor} !important; }
        .dark .clearify-method-post { color: ${METHOD_STYLES.POST.darkColor} !important; }
        .dark .clearify-method-put { color: ${METHOD_STYLES.PUT.darkColor} !important; }
        .dark .clearify-method-delete { color: ${METHOD_STYLES.DELETE.darkColor} !important; }
        .dark .clearify-method-patch { color: ${METHOD_STYLES.PATCH.darkColor} !important; }
      `}</style>
    </>
  );
}
