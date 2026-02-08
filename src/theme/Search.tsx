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
          padding: '0.375rem 0.75rem',
          border: '1px solid var(--clearify-border)',
          borderRadius: '0.5rem',
          background: 'var(--clearify-bg-secondary)',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          color: 'var(--clearify-text-secondary)',
          minWidth: 200,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        Search docs...
        <kbd
          style={{
            marginLeft: 'auto',
            padding: '0.125rem 0.375rem',
            borderRadius: '0.25rem',
            border: '1px solid var(--clearify-border)',
            fontSize: '0.6875rem',
            fontFamily: 'system-ui',
          }}
        >
          {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl+'}K
        </kbd>
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
            paddingTop: '15vh',
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              margin: '0 1rem',
              backgroundColor: 'var(--clearify-bg)',
              border: '1px solid var(--clearify-border)',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--clearify-border)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--clearify-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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
                }}
              />
              <kbd
                style={{
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--clearify-border)',
                  fontSize: '0.6875rem',
                  color: 'var(--clearify-text-secondary)',
                }}
              >
                Esc
              </kbd>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto', padding: results.length > 0 ? '0.5rem' : '0' }}>
              {query && results.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--clearify-text-secondary)', fontSize: '0.875rem' }}>
                  No results found for "{query}"
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
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: selected === i ? 'var(--clearify-bg-secondary)' : 'transparent',
                    color: 'var(--clearify-text)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {result.title}
                    {result.sectionLabel && (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          padding: '0.125rem 0.375rem',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--clearify-bg-secondary)',
                          color: 'var(--clearify-text-secondary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {result.sectionLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--clearify-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
