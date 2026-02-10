import { resolve, relative, basename, dirname, extname } from 'path';
import { readFileSync, existsSync } from 'fs';
import matter from 'gray-matter';
import { globbySync } from 'globby';
import type { NavigationItem, PageFrontmatter, RouteEntry, ResolvedSection, SectionNavigation } from '../types/index.js';
import { buildSearchIndex, type SearchEntry } from './search.js';

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fileToRoutePath(filePath: string, docsDir: string, basePath: string = '/'): string {
  const rel = relative(docsDir, filePath);
  const ext = extname(rel);
  const withoutExt = rel.slice(0, -ext.length);

  let routePath: string;
  if (withoutExt === 'index') routePath = '/';
  else if (withoutExt.endsWith('/index')) routePath = '/' + withoutExt.slice(0, -'/index'.length);
  else routePath = '/' + withoutExt;

  if (basePath === '/') return routePath;

  // Prefix with basePath
  const prefix = basePath.replace(/\/$/, '');
  return routePath === '/' ? prefix : prefix + routePath;
}

export interface DocFile {
  filePath: string;
  routePath: string;
  frontmatter: PageFrontmatter;
}

export function scanDocs(docsDir: string, exclude: string[] = [], basePath: string = '/'): DocFile[] {
  const absDocsDir = resolve(docsDir);
  const files = globbySync('**/*.{md,mdx}', {
    cwd: absDocsDir,
    ignore: ['**/node_modules/**', '**/_*', '**/_*/**', ...exclude],
    absolute: true,
  });

  return files.map((filePath) => {
    const content = readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    const routePath = fileToRoutePath(filePath, absDocsDir, basePath);

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

export function buildNavigation(docs: DocFile[], basePath: string = '/'): NavigationItem[] {
  // Normalize basePath for grouping: the "root dir" for this section
  const rootDir = basePath === '/' ? '/' : basePath.replace(/\/$/, '');

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

  // Root-level pages (pages directly in the section's root directory)
  const rootFiles = groups.get(rootDir) ?? [];
  for (const doc of rootFiles) {
    // Skip the section index page
    if (doc.routePath === rootDir || doc.routePath === '/') continue;
    const item: NavigationItem = { label: doc.frontmatter.title!, path: doc.routePath };
    if (doc.frontmatter.icon) item.icon = doc.frontmatter.icon;
    nav.push(item);
  }

  // Subdirectory groups (all directories that aren't the section root)
  const dirs = [...groups.keys()].filter((d) => d !== rootDir).sort();
  for (const dir of dirs) {
    const files = groups.get(dir)!;
    const label = toTitleCase(basename(dir));
    const children: NavigationItem[] = files.map((doc) => {
      const child: NavigationItem = { label: doc.frontmatter.title!, path: doc.routePath };
      if (doc.frontmatter.icon) child.icon = doc.frontmatter.icon;
      return child;
    });

    nav.push({ label, children });
  }

  return nav;
}

export function buildRoutes(docs: DocFile[], sectionId?: string): RouteEntry[] {
  return docs.map((doc) => ({
    path: doc.routePath,
    filePath: doc.filePath,
    frontmatter: doc.frontmatter,
    ...(sectionId ? { sectionId } : {}),
  }));
}

export interface SectionData {
  section: ResolvedSection;
  docs: DocFile[];
  navigation: SectionNavigation;
  routes: RouteEntry[];
  searchEntries: SearchEntry[];
}

export function buildSectionData(
  section: ResolvedSection,
  changelogPath?: string,
  customNavigation?: NavigationItem[] | null,
): SectionData {
  const docs = scanDocs(section.docsDir, section.exclude, section.basePath);

  // Attach CHANGELOG only to primary section (basePath = "/")
  if (section.basePath === '/' && changelogPath && existsSync(changelogPath)) {
    const content = readFileSync(changelogPath, 'utf-8');
    const { data } = matter(content);
    docs.push({
      filePath: changelogPath,
      routePath: '/changelog',
      frontmatter: {
        title: data.title ?? 'Changelog',
        description: data.description ?? 'Release history',
        order: 9999,
      },
    });
  }

  const nav = (section.basePath === '/' && customNavigation) ? customNavigation : buildNavigation(docs, section.basePath);

  const navigation: SectionNavigation = {
    id: section.id,
    label: section.label,
    basePath: section.basePath,
    navigation: nav,
  };

  const routes = buildRoutes(docs, section.id);
  const searchEntries = buildSearchIndex(docs, section.id, section.label);

  return { section, docs, navigation, routes, searchEntries };
}
