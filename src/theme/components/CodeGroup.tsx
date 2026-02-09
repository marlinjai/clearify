import React, { useState, Children, isValidElement } from 'react';

interface CodeGroupProps {
  children: React.ReactNode;
}

export function CodeGroup({ children }: CodeGroupProps) {
  const [active, setActive] = useState(0);
  const blocks = Children.toArray(children).filter(isValidElement);

  const labels = blocks.map((block, i) => {
    if (isValidElement(block)) {
      const pre = block as React.ReactElement<any>;
      const lang = pre.props?.['data-language'] ??
        pre.props?.className?.match(/language-(\w+)/)?.[1] ??
        `Tab ${i + 1}`;
      return lang;
    }
    return `Tab ${i + 1}`;
  });

  return (
    <div
      style={{
        marginBottom: '1.25rem',
        border: '1px solid var(--clearify-border)',
        borderRadius: 'var(--clearify-radius)',
        overflow: 'hidden',
        background: 'var(--clearify-bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--clearify-border)',
          backgroundColor: 'var(--clearify-bg-secondary)',
          padding: '0 0.25rem',
          gap: '0.125rem',
        }}
      >
        {labels.map((label, i) => {
          const isActive = active === i;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                padding: '0.5rem 0.875rem',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--clearify-primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--clearify-primary)' : 'var(--clearify-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                transition: 'color 0.15s, border-color 0.15s',
                fontFamily: 'var(--font-mono)',
              }}
              className="clearify-codegroup-btn"
            >
              {label}
            </button>
          );
        })}
      </div>
      <div>
        {blocks[active]}
      </div>

      <style>{`
        .clearify-codegroup-btn:hover {
          color: var(--clearify-text) !important;
        }
      `}</style>
    </div>
  );
}
