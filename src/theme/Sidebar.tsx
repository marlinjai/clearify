import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import type { NavigationItem, SectionNavigation } from '../types/index.js';

interface SidebarProps {
  sections: SectionNavigation[];
  open: boolean;
  onClose: () => void;
}

function findActiveSection(pathname: string, sections: SectionNavigation[]): string {
  let bestMatch = sections[0]?.id ?? '';
  let bestLen = 0;

  for (const section of sections) {
    const bp = section.basePath;
    if (bp === '/' && pathname === '/') {
      if (bestLen === 0) {
        bestMatch = section.id;
        bestLen = 1;
      }
    } else if (bp !== '/' && pathname.startsWith(bp)) {
      const rest = pathname.slice(bp.length);
      if (rest === '' || rest.startsWith('/')) {
        if (bp.length > bestLen) {
          bestMatch = section.id;
          bestLen = bp.length;
        }
      }
    }
  }

  if (bestLen === 0 && sections.length > 0) {
    bestMatch = sections[0].id;
  }

  return bestMatch;
}

function SectionSwitcher({
  sections,
  activeId,
  onSelect,
}: {
  sections: SectionNavigation[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.25rem',
        padding: '0.625rem 1.25rem',
        marginBottom: '0.25rem',
      }}
    >
      {sections.map((section) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: isActive ? 'var(--clearify-gradient)' : 'var(--clearify-bg-secondary)',
              color: isActive ? '#fff' : 'var(--clearify-text-secondary)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? 'var(--clearify-shadow-sm)' : 'none',
            }}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar({ sections, open, onClose }: SidebarProps) {
  const location = useLocation();

  const isSectionData = sections.length > 0 && sections[0]?.id != null && Array.isArray(sections[0]?.navigation);
  const legacyNavigation = !isSectionData ? (sections as unknown as NavigationItem[]) : null;

  const [selectedSectionId, setSelectedSectionId] = useState(() =>
    isSectionData ? findActiveSection(location.pathname, sections) : ''
  );

  useEffect(() => {
    if (isSectionData) {
      const active = findActiveSection(location.pathname, sections);
      setSelectedSectionId(active);
    }
  }, [location.pathname, sections, isSectionData]);

  const activeSection = isSectionData
    ? (sections.find((s) => s.id === selectedSectionId) ?? sections[0])
    : null;
  const navigation = legacyNavigation ?? activeSection?.navigation ?? [];
  const showSwitcher = isSectionData && sections.length > 1;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 40,
            animation: 'clearify-fade-in 0.15s ease-out',
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
          padding: '0.75rem 0',
          height: 'calc(100vh - var(--clearify-header-height))',
          position: 'sticky',
          top: 'var(--clearify-header-height)',
          backgroundColor: 'var(--clearify-bg)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={clsx('clearify-sidebar', open && 'clearify-sidebar-open')}
      >
        {showSwitcher && (
          <SectionSwitcher
            sections={sections}
            activeId={selectedSectionId}
            onSelect={setSelectedSectionId}
          />
        )}
        <nav style={{ padding: '0 0.5rem' }}>
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
            box-shadow: var(--clearify-shadow-lg);
          }
          .clearify-sidebar-open {
            transform: translateX(0) !important;
          }
          .clearify-menu-btn {
            display: flex !important;
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
      <div style={{ marginBottom: '0.125rem' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.4rem 0.75rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--clearify-text-tertiary)',
            marginTop: depth === 0 ? '1.25rem' : 0,
            borderRadius: 'var(--clearify-radius-sm)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--clearify-text-secondary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--clearify-text-tertiary)')}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              marginRight: '0.375rem',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {item.label}
        </button>
        {expanded && (
          <div style={{ animation: 'clearify-fade-in 0.15s ease-out' }}>
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
        padding: '0.4rem 0.75rem',
        paddingLeft: `${0.75 + depth * 0.75}rem`,
        fontSize: '0.8125rem',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? 'var(--clearify-primary)' : 'var(--clearify-text-secondary)',
        backgroundColor: isActive ? 'var(--clearify-primary-soft)' : 'transparent',
        borderRadius: 'var(--clearify-radius-sm)',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="clearify-nav-link"
    >
      {isActive && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '15%',
            bottom: '15%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: 'var(--clearify-gradient)',
          }}
        />
      )}
      {item.label}

      <style>{`
        .clearify-nav-link:hover {
          color: var(--clearify-text) !important;
          background-color: var(--clearify-bg-secondary) !important;
        }
      `}</style>
    </Link>
  );
}
