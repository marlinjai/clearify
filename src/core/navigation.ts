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

  // Build a map of index pages for directory label/icon lookup
  const indexPages = new Map<string, DocFile>();
  const nonIndexDocs: DocFile[] = [];

  for (const doc of docs) {
    // Skip the section root index page — it's the landing page, not a nav item
    if (doc.routePath === rootDir || doc.routePath === '/') continue;

    // Check if this is a directory index page (e.g., /projects/lumitra-infra)
    // These become the group's landing page and provide the group label/icon
    const parentDir = dirname(doc.routePath);
    const fileName = basename(doc.filePath, extname(doc.filePath));
    if (fileName === 'index') {
      indexPages.set(doc.routePath, doc);
    } else {
      nonIndexDocs.push(doc);
    }
  }

  // Group non-index files by their immediate parent directory
  const groups = new Map<string, DocFile[]>();
  for (const doc of nonIndexDocs) {
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

  // Build a tree structure recursively
  function buildGroupChildren(parentDir: string): NavigationItem[] {
    const items: NavigationItem[] = [];

    // Add direct pages in this directory
    const directFiles = groups.get(parentDir) ?? [];
    for (const doc of directFiles) {
      const item: NavigationItem = { label: doc.frontmatter.title!, path: doc.routePath };
      if (doc.frontmatter.icon) item.icon = doc.frontmatter.icon;
      items.push(item);
    }

    // Find subdirectories that are direct children of this directory
    const childDirs = new Set<string>();
    for (const dir of groups.keys()) {
      if (dir !== parentDir && dirname(dir) === parentDir) {
        childDirs.add(dir);
      }
    }
    // Also check index pages for subdirectories that only have an index
    for (const indexPath of indexPages.keys()) {
      const dir = indexPath; // index route IS the directory path
      if (dirname(dir) === parentDir && !childDirs.has(dir)) {
        childDirs.add(dir);
      }
    }

    // Sort child directories, using index page order if available
    const sortedChildDirs = [...childDirs].sort((a, b) => {
      const indexA = indexPages.get(a);
      const indexB = indexPages.get(b);
      const orderA = indexA?.frontmatter.order ?? 999;
      const orderB = indexB?.frontmatter.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    for (const childDir of sortedChildDirs) {
      // Use index page title/icon if available, otherwise title-case the folder name
      const indexPage = indexPages.get(childDir);
      const label = indexPage?.frontmatter.title ?? toTitleCase(basename(childDir));
      const children = buildGroupChildren(childDir);

      if (children.length > 0) {
        // Directory with child pages → collapsible group
        const group: NavigationItem = { label, children };
        if (indexPage?.frontmatter.icon) group.icon = indexPage.frontmatter.icon;
        items.push(group);
      } else if (indexPage) {
        // Directory with only an index page → render as a leaf link
        const item: NavigationItem = { label, path: indexPage.routePath };
        if (indexPage.frontmatter.icon) item.icon = indexPage.frontmatter.icon;
        items.push(item);
      }
    }

    return items;
  }

  return buildGroupChildren(rootDir);
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
