import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../ThemeProvider.js';

let idCounter = 0;

interface MermaidProps {
  children: string;
}

export function Mermaid({ children }: MermaidProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
        });

        const id = `mermaid-${Date.now()}-${idCounter++}`;
        const { svg: renderedSvg } = await mermaid.render(id, children);

        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvg(null);
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [children, theme]);

  if (error) {
    return (
      <div
        style={{
          border: '1px solid var(--clearify-border)',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: 'var(--clearify-bg-secondary)',
          color: '#ef4444',
          fontSize: '0.875rem',
        }}
      >
        <strong>Mermaid Error:</strong> {error}
        <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', opacity: 0.7 }}>{children}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        style={{
          border: '1px solid var(--clearify-border)',
          borderRadius: '0.5rem',
          padding: '2rem',
          marginBottom: '1rem',
          textAlign: 'center',
          color: 'var(--clearify-text-secondary)',
        }}
      >
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'center',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
