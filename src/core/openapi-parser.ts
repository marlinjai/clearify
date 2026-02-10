export interface OpenAPIOperation {
  method: string;
  path: string;
  summary: string;
  operationId?: string;
}

export interface OpenAPITagGroup {
  tag: string;
  description?: string;
  operations: OpenAPIOperation[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export function parseOpenAPISpec(spec: Record<string, any>): OpenAPITagGroup[] {
  const tagMap = new Map<string, OpenAPIOperation[]>();
  const tagDescriptions = new Map<string, string>();

  // Collect tag descriptions from top-level tags array
  if (Array.isArray(spec.tags)) {
    for (const t of spec.tags) {
      if (t.name && t.description) {
        tagDescriptions.set(t.name, t.description);
      }
    }
  }

  const paths = spec.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, any>)[method];
      if (!operation || typeof operation !== 'object') continue;

      const tags: string[] = Array.isArray(operation.tags) && operation.tags.length > 0
        ? [operation.tags[0]]
        : ['Default'];

      const op: OpenAPIOperation = {
        method: method.toUpperCase(),
        path,
        summary: operation.summary ?? operation.description ?? `${method.toUpperCase()} ${path}`,
        operationId: operation.operationId,
      };

      for (const tag of tags) {
        const existing = tagMap.get(tag);
        if (existing) {
          existing.push(op);
        } else {
          tagMap.set(tag, [op]);
        }
      }
    }
  }

  // Build sorted tag groups
  const groups: OpenAPITagGroup[] = [];
  for (const [tag, operations] of tagMap) {
    operations.sort((a, b) => a.path.localeCompare(b.path));
    groups.push({
      tag,
      description: tagDescriptions.get(tag),
      operations,
    });
  }

  groups.sort((a, b) => {
    // "Default" always last
    if (a.tag === 'Default') return 1;
    if (b.tag === 'Default') return -1;
    return a.tag.localeCompare(b.tag);
  });

  return groups;
}
