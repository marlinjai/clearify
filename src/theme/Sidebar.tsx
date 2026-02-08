import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import type { NavigationItem } from '../types/index.js';

interface SidebarProps {
  navigation: NavigationItem[];
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ navigation, open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 40,
          }}
          className="clearify-sidebar-overlay"
        />
      )}

      <aside
        style={{
          width: 'var(--clearify-sidebar-width)',
          flexShrink: 0,
          borderRight: '1px solid var(--clearify-border)',
          overflowY: 'auto',
          padding: '1rem 0',
          height: 'calc(100vh - var(--clearify-header-height))',
          position: 'sticky',
          top: 'var(--clearify-header-height)',
          backgroundColor: 'var(--clearify-bg)',
          transition: 'transform 0.2s ease',
        }}
        className={clsx('clearify-sidebar', open && 'clearify-sidebar-open')}
      >
        <nav>
          {navigation.map((item, i) => (
            <NavItem key={i} item={item} depth={0} onNavigate={onClose} />
          ))}
        </nav>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .clearify-sidebar {
            position: fixed !important;
            top: var(--clearify-header-height) !important;
            left: 0;
            z-index: 41;
            transform: translateX(-100%);
            height: calc(100vh - var(--clearify-header-height)) !important;
          }
          .clearify-sidebar-open {
            transform: translateX(0) !important;
          }
          .clearify-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}

function NavItem({ item, depth, onNavigate }: { item: NavigationItem; depth: number; onNavigate: () => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);
  const isActive = item.path === location.pathname;

  if (item.children) {
    return (
      <div style={{ marginBottom: '0.25rem' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.375rem 1.25rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--clearify-text-secondary)',
            marginTop: depth === 0 ? '1rem' : 0,
          }}
        >
          <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', marginRight: '0.25rem', fontSize: '0.625rem' }}>
            ▶
          </span>
          {item.label}
        </button>
        {expanded && (
          <div>
            {item.children.map((child, i) => (
              <NavItem key={i} item={child} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.path!}
      onClick={() => {
        onNavigate();
        window.scrollTo(0, 0);
      }}
      style={{
        display: 'block',
        padding: '0.375rem 1.25rem',
        paddingLeft: `${1.25 + depth * 0.75}rem`,
        fontSize: '0.875rem',
        color: isActive ? 'var(--clearify-primary)' : 'var(--clearify-text)',
        backgroundColor: isActive ? 'var(--clearify-bg-secondary)' : 'transparent',
        borderRight: isActive ? '2px solid var(--clearify-primary)' : '2px solid transparent',
        textDecoration: 'none',
        transition: 'background-color 0.1s, color 0.1s',
      }}
    >
      {item.label}
    </Link>
  );
}
