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
    <div style={{ marginBottom: '1rem', border: '1px solid var(--clearify-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--clearify-border)', backgroundColor: 'var(--clearify-bg-secondary)' }}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '0.625rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: active === i ? '2px solid var(--clearify-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: active === i ? 600 : 400,
              color: active === i ? 'var(--clearify-primary)' : 'var(--clearify-text-secondary)',
              transition: 'color 0.15s',
            }}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '1rem' }}>
        {tabs[active]}
      </div>
    </div>
  );
}
