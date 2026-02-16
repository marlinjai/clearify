// @ts-expect-error virtual module
import config from 'virtual:clearify/config';
// @ts-expect-error virtual module
import openapiSpec from 'virtual:clearify/openapi-spec';

import React, { useEffect } from 'react';
import { ApiHeader } from './openapi/ApiHeader.js';
import { TagGroup } from './openapi/TagGroup.js';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export default function OpenAPIPage() {
  const spec = openapiSpec as Record<string, any> | null;

  // Scroll to hash anchor on mount and hash change
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.slice(1); // remove #
      if (!hash) return;
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  if (!spec) {
    return (
      <div style={{
        border: '1px solid var(--clearify-border)',
        borderRadius: 'var(--clearify-radius)',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--clearify-text-secondary)',
        fontSize: '0.875rem',
      }}>
        No OpenAPI spec provided. Set <code style={{ fontFamily: 'var(--font-mono)' }}>openapi.spec</code> in your Clearify config.
      </div>
    );
  }

  // Determine base URL from spec or config
  const baseUrl = spec.servers?.[0]?.url ?? 'http://localhost:3000';

  // Group operations by tag
  const paths = spec.paths ?? {};
  const tagMap = new Map<string, { tag: string; description?: string; operations: Array<{ method: string; path: string; operation: Record<string, any> }> }>();
  const tagDescriptions = new Map<string, string>();

  if (Array.isArray(spec.tags)) {
    for (const t of spec.tags) {
      if (t.name && t.description) tagDescriptions.set(t.name, t.description);
    }
  }

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, any>)[method];
      if (!operation || typeof operation !== 'object') continue;

      const tags: string[] = Array.isArray(operation.tags) && operation.tags.length > 0
        ? [operation.tags[0]]
        : ['Default'];

      for (const tag of tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { tag, description: tagDescriptions.get(tag), operations: [] });
        }
        tagMap.get(tag)!.operations.push({ method: method.toUpperCase(), path: pathStr, operation });
      }
    }
  }

  // Sort: "Default" last, others alphabetical
  const tagGroups = [...tagMap.values()].sort((a, b) => {
    if (a.tag === 'Default') return 1;
    if (b.tag === 'Default') return -1;
    return a.tag.localeCompare(b.tag);
  });

  return (
    <div className="clearify-openapi-page" style={{ maxWidth: 'none' }}>
      <ApiHeader spec={spec} />
      {tagGroups.map((group) => (
        <TagGroup
          key={group.tag}
          tag={group.tag}
          description={group.description}
          operations={group.operations}
          baseUrl={baseUrl}
        />
      ))}
    </div>
  );
}

export const frontmatter = { title: 'API Reference', description: 'API documentation' };
