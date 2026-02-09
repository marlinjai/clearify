import { createHash } from 'crypto';

export function mermaidContentHash(definition: string): string {
  return createHash('sha256').update(definition.trim()).digest('hex').slice(0, 16);
}
