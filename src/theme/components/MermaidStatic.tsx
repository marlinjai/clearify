import React from 'react';
import mermaidSvgs from 'virtual:clearify/mermaid-svgs';

interface MermaidStaticProps {
  diagramHash: string;
}

export function MermaidStatic({ diagramHash }: MermaidStaticProps) {
  const data = mermaidSvgs[diagramHash];

  if (!data) {
    return (
      <div style={{
        border: '1px solid var(--clearify-border)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1rem',
        color: '#ef4444',
        fontSize: '0.875rem',
      }}>
        Missing pre-rendered diagram: {diagramHash}
      </div>
    );
  }

  return (
    <div className="clearify-mermaid-container" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="clearify-mermaid-light" dangerouslySetInnerHTML={{ __html: data.lightSvg }} />
      <div className="clearify-mermaid-dark" dangerouslySetInnerHTML={{ __html: data.darkSvg }} />
    </div>
  );
}
