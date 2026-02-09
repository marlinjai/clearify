import React, { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const elements = document.querySelectorAll('.clearify-prose h2, .clearify-prose h3');
    const items: Heading[] = [];

    elements.forEach((el) => {
      if (!el.id) {
        el.id = el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? '';
      }
      items.push({
        id: el.id,
        text: el.textContent ?? '',
        level: el.tagName === 'H2' ? 2 : 3,
      });
    });

    setHeadings(items);
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav
      style={{
        width: 'var(--clearify-toc-width)',
        flexShrink: 0,
        padding: '2.5rem 1rem 2.5rem 0',
        position: 'sticky',
        top: 'var(--clearify-header-height)',
        height: 'calc(100vh - var(--clearify-header-height))',
        overflowY: 'auto',
        fontSize: '0.8125rem',
      }}
      className="clearify-toc"
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--clearify-text-tertiary)',
          marginBottom: '0.875rem',
          paddingLeft: '0.75rem',
        }}
      >
        On this page
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, position: 'relative' }}>
        {/* Vertical track line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: 'var(--clearify-border)',
            borderRadius: 1,
          }}
        />
        {headings.map((heading) => {
          const isActive = activeId === heading.id;
          return (
            <li key={heading.id} style={{ position: 'relative' }}>
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 4,
                    bottom: 4,
                    width: 2,
                    borderRadius: 1,
                    background: 'var(--clearify-gradient)',
                    transition: 'opacity 0.15s',
                  }}
                />
              )}
              <a
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                  setActiveId(heading.id);
                }}
                style={{
                  display: 'block',
                  padding: '0.25rem 0.75rem',
                  paddingLeft: heading.level === 3 ? '1.25rem' : '0.75rem',
                  color: isActive ? 'var(--clearify-primary)' : 'var(--clearify-text-tertiary)',
                  fontWeight: isActive ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                }}
                className="clearify-toc-link"
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>

      <style>{`
        .clearify-toc-link:hover {
          color: var(--clearify-text) !important;
        }
        @media (max-width: 1024px) {
          .clearify-toc {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
