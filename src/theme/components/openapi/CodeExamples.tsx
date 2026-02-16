import React, { useState, useMemo, useRef } from 'react';
import { generateSnippets } from './generate-snippets.js';

interface CodeExamplesProps {
  method: string;
  path: string;
  baseUrl: string;
  parameters?: any[];
  requestBody?: Record<string, any>;
  security?: Array<Record<string, string[]>>;
}

export function CodeExamples({ method, path, baseUrl, parameters, requestBody, security }: CodeExamplesProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const snippets = useMemo(
    () => generateSnippets({ method, path, baseUrl, parameters, requestBody, security }),
    [method, path, baseUrl, parameters, requestBody, security]
  );

  const handleCopy = async () => {
    const text = codeRef.current?.textContent ?? snippets[activeTab]?.code ?? '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      border: '1px solid var(--clearify-border)',
      borderRadius: 'var(--clearify-radius)',
      overflow: 'hidden',
      background: '#1e1e2e',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 0.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.125rem' }}>
          {snippets.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: i === activeTab ? 600 : 400,
                padding: '0.5rem 0.625rem',
                background: 'none',
                border: 'none',
                borderBottom: i === activeTab ? '2px solid #818cf8' : '2px solid transparent',
                color: i === activeTab ? '#e2e8f0' : '#94a3b8',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            fontSize: '0.6875rem',
            color: copied ? '#818cf8' : '#94a3b8',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        ref={codeRef}
        style={{
          padding: '1rem 1.25rem',
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          lineHeight: 1.7,
          color: '#e2e8f0',
          overflow: 'auto',
          maxHeight: '400px',
        }}
      >
        <code>{snippets[activeTab]?.code ?? ''}</code>
      </pre>
    </div>
  );
}
