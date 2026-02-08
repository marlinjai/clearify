import { resolve, relative, basename, dirname, extname } from 'path';
import { readFileSync } from 'fs';
import matter from 'gray-matter';
import { globbySync } from 'globby';
import type { NavigationItem, PageFrontmatter, RouteEntry } from '../types/index.js';

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fileToRoutePath(filePath: string, docsDir: string): string {
  const rel = relative(docsDir, filePath);
  const ext = extname(rel);
  const withoutExt = rel.slice(0, -ext.length);

  if (withoutExt === 'index') return '/';
  if (withoutExt.endsWith('/index')) return '/' + withoutExt.slice(0, -'/index'.length);
  return '/' + withoutExt;
}

export interface DocFile {
  filePath: string;
  routePath: string;
  frontmatter: PageFrontmatter;
}

export function scanDocs(docsDir: string, exclude: string[] = []): DocFile[] {
  const absDocsDir = resolve(docsDir);
  const files = globbySync('**/*.{md,mdx}', {
    cwd: absDocsDir,
    ignore: ['**/node_modules/**', '**/_*', '**/_*/**', ...exclude],
    absolute: true,
  });

  return files.map((filePath) => {
    const content = readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    const routePath = fileToRoutePath(filePath, absDocsDir);

    return {
      filePath,
      routePath,
      frontmatter: {
        title: data.title ?? toTitleCase(basename(filePath, extname(filePath))),
        description: data.description,
        icon: data.icon,
        order: data.order,
      },
    };
  });
}

export function buildNavigation(docs: DocFile[]): NavigationItem[] {
  // Group files by directory
  const groups = new Map<string, DocFile[]>();

  for (const doc of docs) {
    const dir = dirname(doc.routePath);
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(doc);
  }

  // Sort within each group
  for (const files of groups.values()) {
    files.sort((a, b) => {
      const orderA = a.frontmatter.order ?? 999;
      const orderB = b.frontmatter.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.routePath.localeCompare(b.routePath);
    });
  }

  const nav: NavigationItem[] = [];

  // Root-level pages
  const rootFiles = groups.get('/') ?? [];
  for (const doc of rootFiles) {
    if (doc.routePath === '/') continue; // index added separately
    nav.push({ label: doc.frontmatter.title!, path: doc.routePath });
  }

  // Subdirectory groups
  const dirs = [...groups.keys()].filter((d) => d !== '/').sort();
  for (const dir of dirs) {
    const files = groups.get(dir)!;
    const label = toTitleCase(basename(dir));
    const children: NavigationItem[] = files.map((doc) => ({
      label: doc.frontmatter.title!,
      path: doc.routePath,
    }));

    nav.push({ label, children });
  }

  return nav;
}

export function buildRoutes(docs: DocFile[]): RouteEntry[] {
  return docs.map((doc) => ({
    path: doc.routePath,
    filePath: doc.filePath,
    frontmatter: doc.frontmatter,
  }));
}
