import { readFileSync } from 'fs';
import matter from 'gray-matter';
import type { DocFile } from './navigation.js';

export interface SearchEntry {
  id: number;
  path: string;
  title: string;
  description: string;
  content: string;
  sectionId?: string;
  sectionLabel?: string;
}

function stripMarkdown(md: string): string {
  return md
    // Remove frontmatter
    .replace(/^---[\s\S]*?---\n*/m, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove headings markers
    .replace(/#{1,6}\s/g, '')
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove emphasis
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchIndex(docs: DocFile[], sectionId?: string, sectionLabel?: string): SearchEntry[] {
  return docs.map((doc, i) => {
    const raw = readFileSync(doc.filePath, 'utf-8');
    const { content } = matter(raw);

    return {
      id: i,
      path: doc.routePath,
      title: doc.frontmatter.title ?? '',
      description: doc.frontmatter.description ?? '',
      content: stripMarkdown(content),
      ...(sectionId ? { sectionId } : {}),
      ...(sectionLabel ? { sectionLabel } : {}),
    };
  });
}
