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
        padding: '2rem 1rem',
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
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--clearify-text-secondary)',
          marginBottom: '0.75rem',
        }}
      >
        On this page
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                setActiveId(heading.id);
              }}
              style={{
                display: 'block',
                padding: '0.25rem 0',
                paddingLeft: heading.level === 3 ? '0.75rem' : 0,
                color: activeId === heading.id ? 'var(--clearify-primary)' : 'var(--clearify-text-secondary)',
                textDecoration: 'none',
                borderLeft: activeId === heading.id ? '2px solid var(--clearify-primary)' : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>

      <style>{`
        @media (max-width: 1024px) {
          .clearify-toc {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
