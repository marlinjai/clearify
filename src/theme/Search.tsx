import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-expect-error virtual module
import searchEntries from 'virtual:clearify/search-index';

interface SearchEntry {
  id: number;
  path: string;
  title: string;
  description: string;
  content: string;
  sectionId?: string;
  sectionLabel?: string;
}

function search(query: string, entries: SearchEntry[]): SearchEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const terms = q.split(/\s+/);

  return entries
    .map((entry) => {
      const text = `${entry.title} ${entry.description} ${entry.content}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (entry.title.toLowerCase().includes(term)) score += 10;
        if (entry.description.toLowerCase().includes(term)) score += 5;
        if (text.includes(term)) score += 1;
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((r) => r.entry);
}

function getExcerpt(content: string, query: string): string {
  const q = query.toLowerCase();
  const idx = content.toLowerCase().indexOf(q);
  if (idx === -1) return content.slice(0, 120) + '...';
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 80);
  let excerpt = content.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  return excerpt;
}

export function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = useMemo(() => search(query, searchEntries as SearchEntry[]), [query]);

  useEffect(() => {
    setSelected(0);
  }, [results]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  const handleSelect = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      handleSelect(results[selected].path);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          border: '1px solid var(--clearify-border)',
          borderRadius: 'var(--clearify-radius)',
          background: 'var(--clearify-bg-secondary)',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          color: 'var(--clearify-text-tertiary)',
          minWidth: 200,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          height: 36,
        }}
        className="clearify-search-btn"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        Search docs...
        <kbd
          style={{
            marginLeft: 'auto',
            padding: '0.1rem 0.375rem',
            borderRadius: 'var(--clearify-radius-sm)',
            border: '1px solid var(--clearify-border)',
            fontSize: '0.625rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--clearify-text-tertiary)',
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          {navigator.platform?.includes('Mac') ? '\u2318K' : 'Ctrl+K'}
        </kbd>

        <style>{`
          .clearify-search-btn:hover {
            border-color: var(--clearify-border-strong) !important;
            box-shadow: var(--clearify-shadow-sm);
          }
        `}</style>
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'clearify-fade-in 0.15s ease-out',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              margin: '0 1rem',
              backgroundColor: 'var(--clearify-surface-elevated)',
              border: '1px solid var(--clearify-border-strong)',
              borderRadius: 'var(--clearify-radius-xl)',
              boxShadow: 'var(--clearify-shadow-lg)',
              overflow: 'hidden',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              animation: 'clearify-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid var(--clearify-border)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--clearify-text-tertiary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search documentation..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'none',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.9375rem',
                  color: 'var(--clearify-text)',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <kbd
                style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--clearify-radius-sm)',
                  border: '1px solid var(--clearify-border)',
                  fontSize: '0.6875rem',
                  color: 'var(--clearify-text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                }}
              >
                Esc
              </kbd>
            </div>

            <div
              style={{
                maxHeight: 420,
                overflowY: 'auto',
                padding: results.length > 0 ? '0.375rem' : '0',
              }}
            >
              {query && results.length === 0 && (
                <div
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    color: 'var(--clearify-text-tertiary)',
                    fontSize: '0.875rem',
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ margin: '0 auto 0.75rem', opacity: 0.4 }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                    <line x1="8" y1="8" x2="14" y2="14" />
                    <line x1="14" y1="8" x2="8" y2="14" />
                  </svg>
                  No results for "{query}"
                </div>
              )}
              {results.map((result, i) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.path)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--clearify-radius)',
                    cursor: 'pointer',
                    backgroundColor: selected === i ? 'var(--clearify-primary-soft)' : 'transparent',
                    color: 'var(--clearify-text)',
                    transition: 'background-color 0.1s',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      marginBottom: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={selected === i ? 'var(--clearify-primary)' : 'var(--clearify-text-tertiary)'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, transition: 'stroke 0.15s' }}
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {result.title}
                    {result.sectionLabel && (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '9999px',
                          background: 'var(--clearify-gradient-subtle)',
                          border: '1px solid var(--clearify-border)',
                          color: 'var(--clearify-text-secondary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {result.sectionLabel}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--clearify-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingLeft: '1.625rem',
                    }}
                  >
                    {getExcerpt(result.content, query)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
