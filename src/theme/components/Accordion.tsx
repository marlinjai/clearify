import React, { useState, Children, isValidElement } from 'react';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  icon?: string;
  children: React.ReactNode;
}

export function Accordion({ title, defaultOpen = false, icon, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: '1px solid var(--clearify-border)',
        borderRadius: 'var(--clearify-radius)',
        marginBottom: '0.5rem',
        overflow: 'hidden',
        background: 'var(--clearify-bg)',
      }}
      className="clearify-accordion"
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--clearify-text)',
          fontFamily: 'var(--font-sans)',
          textAlign: 'left',
          letterSpacing: '-0.01em',
        }}
        className="clearify-accordion-trigger"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            color: 'var(--clearify-text-secondary)',
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
        <span style={{ flex: 1 }}>{title}</span>
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '0 1rem 1rem 2.5rem',
              fontSize: '0.875rem',
              color: 'var(--clearify-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            {children}
          </div>
        </div>
      </div>

      <style>{`
        .clearify-accordion-trigger:hover {
          background-color: var(--clearify-bg-secondary) !important;
        }
      `}</style>
    </div>
  );
}

interface AccordionGroupProps {
  children: React.ReactNode;
}

export function AccordionGroup({ children }: AccordionGroupProps) {
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {items.map((child, i) => (
        <React.Fragment key={i}>{child}</React.Fragment>
      ))}
    </div>
  );
}
