import React, { useState, Children, isValidElement } from 'react';

interface CodeGroupProps {
  children: React.ReactNode;
}

export function CodeGroup({ children }: CodeGroupProps) {
  const [active, setActive] = useState(0);
  const blocks = Children.toArray(children).filter(isValidElement);

  // Try to extract language labels from pre > code className
  const labels = blocks.map((block, i) => {
    if (isValidElement(block)) {
      const pre = block as React.ReactElement<any>;
      // The child might be a <pre> element with a data-language or className
      const lang = pre.props?.['data-language'] ??
        pre.props?.className?.match(/language-(\w+)/)?.[1] ??
        `Tab ${i + 1}`;
      return lang;
    }
    return `Tab ${i + 1}`;
  });

  return (
    <div style={{ marginBottom: '1rem', border: '1px solid var(--clearify-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--clearify-border)', backgroundColor: 'var(--clearify-bg-secondary)' }}>
        {labels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '0.5rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: active === i ? '2px solid var(--clearify-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: active === i ? 600 : 400,
              color: active === i ? 'var(--clearify-primary)' : 'var(--clearify-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.025em',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div>
        {blocks[active]}
      </div>
    </div>
  );
}
