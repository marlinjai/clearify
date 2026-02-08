import React, { useState, useRef } from 'react';

export function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  // Extract language from className (e.g., "language-typescript" or shiki class)
  const lang = className
    ?.split(' ')
    .find((c) => c.startsWith('language-'))
    ?.replace('language-', '') ?? '';

  const handleCopy = async () => {
    const text = preRef.current?.textContent ?? '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '1rem' }}>
      {lang && (
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '3rem',
            fontSize: '0.75rem',
            color: 'var(--clearify-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            userSelect: 'none',
          }}
        >
          {lang}
        </div>
      )}
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          background: 'var(--clearify-bg-secondary)',
          border: '1px solid var(--clearify-border)',
          borderRadius: '0.25rem',
          padding: '0.25rem 0.5rem',
          cursor: 'pointer',
          fontSize: '0.75rem',
          color: 'var(--clearify-text-secondary)',
          transition: 'background 0.15s',
        }}
        aria-label="Copy code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre
        ref={preRef}
        className={className}
        style={{
          backgroundColor: 'var(--clearify-bg-secondary)',
          border: '1px solid var(--clearify-border)',
          borderRadius: '0.5rem',
          padding: '1rem',
          overflow: 'auto',
          fontSize: '0.875rem',
          lineHeight: 1.7,
        }}
        {...props}
      >
        {children}
      </pre>
    </div>
  );
}
