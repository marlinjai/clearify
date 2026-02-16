import React from 'react';
import { ApiHeader } from './openapi/ApiHeader.js';
import { TagGroup } from './openapi/TagGroup.js';

interface OpenAPIProps {
  spec?: Record<string, any>;
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export function OpenAPI({ spec }: OpenAPIProps) {
  if (!spec || typeof spec !== 'object') {
    return (
      <div
        style={{
          border: '1px solid var(--clearify-border)',
          borderRadius: 'var(--clearify-radius)',
          padding: '1.5rem',
          color: 'var(--clearify-text-secondary)',
          fontSize: '0.875rem',
        }}
      >
        <strong>OpenAPI:</strong> No spec provided. Pass a <code>spec</code> prop or set{' '}
        <code>openapi.spec</code> in your Clearify config.
      </div>
    );
  }

  const baseUrl = spec.servers?.[0]?.url ?? 'http://localhost:3000';
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
      const tags: string[] = Array.isArray(operation.tags) && operation.tags.length > 0 ? [operation.tags[0]] : ['Default'];
      for (const tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, { tag, description: tagDescriptions.get(tag), operations: [] });
        tagMap.get(tag)!.operations.push({ method: method.toUpperCase(), path: pathStr, operation });
      }
    }
  }

  const tagGroups = [...tagMap.values()].sort((a, b) => {
    if (a.tag === 'Default') return 1;
    if (b.tag === 'Default') return -1;
    return a.tag.localeCompare(b.tag);
  });

  return (
    <div className="clearify-openapi-page" style={{ maxWidth: 'none' }}>
      <ApiHeader spec={spec} />
      {tagGroups.map((group) => (
        <TagGroup key={group.tag} tag={group.tag} description={group.description} operations={group.operations} baseUrl={baseUrl} />
      ))}
    </div>
  );
}
