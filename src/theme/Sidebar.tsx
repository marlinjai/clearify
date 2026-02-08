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
  // Longest matching basePath wins
  let bestMatch = sections[0]?.id ?? '';
  let bestLen = 0;

  for (const section of sections) {
    const bp = section.basePath;
    if (bp === '/' && pathname === '/') {
      // Exact root match — only wins if no deeper match
      if (bestLen === 0) {
        bestMatch = section.id;
        bestLen = 1;
      }
    } else if (bp !== '/' && pathname.startsWith(bp)) {
      // Ensure it's a proper prefix (matches /internal but not /internalfoo)
      const rest = pathname.slice(bp.length);
      if (rest === '' || rest.startsWith('/')) {
        if (bp.length > bestLen) {
          bestMatch = section.id;
          bestLen = bp.length;
        }
      }
    }
  }

  // If nothing matched beyond root, default to first section
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
        padding: '0.5rem 1rem',
        marginBottom: '0.5rem',
        borderBottom: '1px solid var(--clearify-border)',
      }}
    >
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor:
              activeId === section.id ? 'var(--clearify-primary)' : 'var(--clearify-bg-secondary)',
            color: activeId === section.id ? '#fff' : 'var(--clearify-text-secondary)',
            transition: 'background-color 0.15s, color 0.15s',
          }}
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}

export function Sidebar({ sections, open, onClose }: SidebarProps) {
  const location = useLocation();

  // Detect valid SectionNavigation[] shape (has id + basePath + navigation array)
  const isSectionData = sections.length > 0 && sections[0]?.id != null && Array.isArray(sections[0]?.navigation);

  // If sections data is actually legacy NavigationItem[], render it directly
  const legacyNavigation = !isSectionData ? (sections as unknown as NavigationItem[]) : null;

  const [selectedSectionId, setSelectedSectionId] = useState(() =>
    isSectionData ? findActiveSection(location.pathname, sections) : ''
  );

  // Sync selected section when URL changes (e.g., clicking a search result in another section)
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
        {showSwitcher && (
          <SectionSwitcher
            sections={sections}
            activeId={selectedSectionId}
            onSelect={setSelectedSectionId}
          />
        )}
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
