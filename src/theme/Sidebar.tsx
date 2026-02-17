import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

function collectGroupKeys(items: NavigationItem[], prefix = ''): string[] {
  return items.flatMap((item) => {
    if (!item.children) return [];
    const key = prefix ? `${prefix}/${item.label}` : item.label;
    return [key, ...collectGroupKeys(item.children, key)];
  });
}

/** Walk the navigation tree depth-first and return the first leaf path. */
function findFirstPath(items: NavigationItem[]): string | undefined {
  for (const item of items) {
    if (item.path) return item.path;
    if (item.children) {
      const found = findFirstPath(item.children);
      if (found) return found;
    }
  }
  return undefined;
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
  const navigate = useNavigate();

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

  const sidebarRef = useRef<HTMLElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Restore saved sidebar width on mount
  useEffect(() => {
    const saved = localStorage.getItem('clearify-sidebar-width');
    if (saved) {
      document.documentElement.style.setProperty('--clearify-sidebar-width', saved);
    }
  }, []);

  // Resize drag logic
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(500, e.clientX));
      document.documentElement.style.setProperty('--clearify-sidebar-width', `${newWidth}px`);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const width = getComputedStyle(document.documentElement).getPropertyValue('--clearify-sidebar-width').trim();
      localStorage.setItem('clearify-sidebar-width', width);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    // Small delay to allow render to complete
    const timer = setTimeout(() => {
      const activeEl = sidebar.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const activeSection = isSectionData
    ? (sections.find((s) => s.id === selectedSectionId) ?? sections[0])
    : null;
  const navigation = legacyNavigation ?? activeSection?.navigation ?? [];
  const showSwitcher = isSectionData && sections.length > 1;

  // Centralized expansion state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(collectGroupKeys(navigation)));

  // Re-expand all when section changes
  useEffect(() => {
    setExpandedGroups(new Set(collectGroupKeys(navigation)));
  }, [selectedSectionId]);

  const allGroupKeys = collectGroupKeys(navigation);
  const hasCollapsibleGroups = allGroupKeys.length >= 2;

  const handleToggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedGroups(new Set(allGroupKeys));
    window.dispatchEvent(new CustomEvent('clearify:expand-all'));
  };
  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
    window.dispatchEvent(new CustomEvent('clearify:collapse-all'));
  };

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
        ref={sidebarRef}
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
            onSelect={(id) => {
              setSelectedSectionId(id);
              const section = sections.find((s) => s.id === id);
              if (section) {
                const firstPath = findFirstPath(section.navigation) ?? section.basePath;
                if (firstPath && firstPath !== location.pathname) {
                  navigate(firstPath);
                }
              }
            }}
          />
        )}
        {hasCollapsibleGroups && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.25rem',
            padding: '0.25rem 0.75rem',
          }}>
            <button
              onClick={handleExpandAll}
              title="Expand all groups"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--clearify-text-tertiary)',
                borderRadius: 'var(--clearify-radius-sm)',
                transition: 'color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--clearify-text-secondary)';
                e.currentTarget.style.backgroundColor = 'var(--clearify-bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--clearify-text-tertiary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 8 12 3 17 8" />
                <polyline points="7 16 12 21 17 16" />
              </svg>
            </button>
            <button
              onClick={handleCollapseAll}
              title="Collapse all groups"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--clearify-text-tertiary)',
                borderRadius: 'var(--clearify-radius-sm)',
                transition: 'color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--clearify-text-secondary)';
                e.currentTarget.style.backgroundColor = 'var(--clearify-bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--clearify-text-tertiary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 3 12 8 17 3" />
                <polyline points="7 21 12 16 17 21" />
              </svg>
            </button>
          </div>
        )}
        <nav style={{ padding: '0 0.5rem' }}>
          {navigation.map((item, i) => (
            <NavItem
              key={i}
              item={item}
              depth={0}
              onNavigate={onClose}
              expandedGroups={expandedGroups}
              onToggleGroup={handleToggleGroup}
              groupKeyPrefix=""
            />
          ))}
        </nav>

        {/* Resize handle */}
        <div
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
          className="clearify-sidebar-resize"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '5px',
            cursor: 'col-resize',
            background: isResizing ? 'var(--clearify-primary)' : 'transparent',
            transition: isResizing ? 'none' : 'background 0.15s ease',
            zIndex: 10,
          }}
        />
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
          .clearify-sidebar-resize {
            display: none !important;
          }
        }
        .clearify-sidebar-resize:hover {
          background: var(--clearify-border-strong) !important;
        }
      `}</style>
    </>
  );
}

interface NavItemProps {
  item: NavigationItem;
  depth: number;
  onNavigate: () => void;
  expandedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  groupKeyPrefix: string;
}

function NavItem({ item, depth, onNavigate, expandedGroups, onToggleGroup, groupKeyPrefix }: NavItemProps) {
  const location = useLocation();
  const isActive = item.path === location.pathname;

  if (item.children) {
    const groupKey = groupKeyPrefix ? `${groupKeyPrefix}/${item.label}` : item.label;
    const expanded = expandedGroups.has(groupKey);

    return (
      <div style={{ marginBottom: '0.125rem' }}>
        <button
          onClick={() => onToggleGroup(groupKey)}
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
              <NavItem
                key={i}
                item={child}
                depth={depth + 1}
                onNavigate={onNavigate}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
                groupKeyPrefix={groupKey}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.path!}
      data-active={isActive ? 'true' : undefined}
      onClick={() => {
        onNavigate();
        window.scrollTo(0, 0);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
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
      {item.icon && <span style={{ flexShrink: 0, fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
      {item.badge && (
        <span style={{
          fontSize: '0.5625rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          padding: '0.0625rem 0.3rem',
          borderRadius: '3px',
          backgroundColor: item.badgeColor ?? 'var(--clearify-primary)',
          color: '#fff',
          marginLeft: 'auto',
          flexShrink: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          lineHeight: '1.4',
        }}>
          {item.badge}
        </span>
      )}

      <style>{`
        .clearify-nav-link:hover {
          color: var(--clearify-text) !important;
          background-color: var(--clearify-bg-secondary) !important;
        }
      `}</style>
    </Link>
  );
}
