import React, { useState, useRef } from 'react';

export function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

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
    <div style={{ position: 'relative', marginBottom: '1.25rem' }} className="clearify-codeblock">
      {lang && (
        <div
          style={{
            position: 'absolute',
            top: '0.625rem',
            right: '3.5rem',
            fontSize: '0.6875rem',
            color: 'var(--clearify-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            userSelect: 'none',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
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
          background: 'var(--clearify-bg)',
          border: '1px solid var(--clearify-border)',
          borderRadius: 'var(--clearify-radius-sm)',
          padding: '0.25rem 0.625rem',
          cursor: 'pointer',
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: copied ? 'var(--clearify-primary)' : 'var(--clearify-text-tertiary)',
          transition: 'all 0.15s ease',
          fontFamily: 'var(--font-sans)',
        }}
        className="clearify-copy-btn"
        aria-label="Copy code"
      >
        {copied ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </span>
        )}
      </button>
      <pre
        ref={preRef}
        className={className}
        style={{
          backgroundColor: 'var(--clearify-bg-secondary)',
          border: '1px solid var(--clearify-border)',
          borderRadius: 'var(--clearify-radius)',
          padding: '1rem 1.25rem',
          overflow: 'auto',
          fontSize: '0.8125rem',
          lineHeight: 1.75,
          fontFamily: 'var(--font-mono)',
        }}
        {...props}
      >
        {children}
      </pre>

      <style>{`
        .clearify-copy-btn:hover {
          border-color: var(--clearify-border-strong) !important;
          color: var(--clearify-text) !important;
          background: var(--clearify-bg-secondary) !important;
        }
      `}</style>
    </div>
  );
}
