import React, { useState, Children, isValidElement } from 'react';

interface TabProps {
  label: string;
  children: React.ReactNode;
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

interface TabsProps {
  children: React.ReactNode;
}

export function Tabs({ children }: TabsProps) {
  const [active, setActive] = useState(0);
  const tabs = Children.toArray(children).filter(isValidElement) as React.ReactElement<TabProps>[];

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
        {tabs.map((tab, i) => {
          const isActive = active === i;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                padding: '0.625rem 1rem',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--clearify-primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--clearify-primary)' : 'var(--clearify-text-secondary)',
                transition: 'color 0.15s, border-color 0.15s',
                fontFamily: 'var(--font-sans)',
              }}
              className="clearify-tab-btn"
            >
              {tab.props.label}
            </button>
          );
        })}
      </div>
      <div style={{ padding: '1.125rem' }}>
        {tabs[active]}
      </div>

      <style>{`
        .clearify-tab-btn:hover {
          color: var(--clearify-text) !important;
        }
      `}</style>
    </div>
  );
}
