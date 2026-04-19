import { readFileSync } from 'fs';
import matter from 'gray-matter';
import type { ClearifyConfig } from '../types/index.js';

/**
 * A doc entry as consumed by the llms.txt generators. Produced from the
 * scanned section data by callers (e.g. the build pipeline) so these
 * functions stay pure string builders.
 */
export interface LlmsDocEntry {
  /** Page title (from frontmatter or derived). */
  title: string;
  /** Route path on the site, e.g. `/getting-started`. */
  routePath: string;
  /** Section label the page belongs to, e.g. `Documentation`. */
  sectionLabel: string;
  /** Raw markdown source (frontmatter optional, handled by the generator). */
  markdown: string;
  /**
   * Optional flag. When true the page goes under the `## Optional` bucket at
   * the end of llms.txt rather than the main section list. Use for auxiliary
   * content like a changelog or roadmap.
   */
  optional?: boolean;
}

/** Trim a trailing slash from a site URL. Returns '' when input is undefined. */
function normalizeBase(siteUrl: string | undefined): string {
  if (!siteUrl) return '';
  return siteUrl.replace(/\/$/, '');
}

/**
 * Compose an absolute URL for a doc entry. `routePath` is expected to start
 * with a `/`. `base` may be empty, in which case the function returns the
 * route path unchanged (callers should validate that a base is set when
 * absolute URLs are required).
 */
function toAbsoluteUrl(base: string, routePath: string): string {
  if (!base) return routePath;
  if (!routePath.startsWith('/')) return `${base}/${routePath}`;
  return `${base}${routePath}`;
}

/**
 * Strip a leading YAML frontmatter block, the first H1 heading, and any
 * following blank lines so we can use the remaining markdown as the entry
 * body or pull the first paragraph as a summary.
 */
function stripFrontmatterAndH1(markdown: string): string {
  const { content } = matter(markdown);
  // Remove the first H1 line if it's at the very top (possibly after blank
  // lines) so we don't repeat the title we already emit as an H2 header.
  return content.replace(/^\s*#\s+[^\n]*\n+/, '').trimStart();
}

/**
 * Pull the first paragraph of a page. Used as the "- [Title](url): summary"
 * line in llms.txt. Strips headings, code fences, and collapses whitespace.
 * Falls back to the frontmatter `summary` or `description` when the body has
 * no prose.
 */
function firstParagraphSummary(markdown: string): string {
  const parsed = matter(markdown);
  const fromFrontmatter =
    (typeof parsed.data.summary === 'string' && parsed.data.summary.trim()) ||
    (typeof parsed.data.description === 'string' && parsed.data.description.trim()) ||
    '';

  // Walk the body line by line, skip headings, blank lines, code fences,
  // HTML comments, and list markers until we find a prose paragraph.
  const body = parsed.content;
  const lines = body.split(/\r?\n/);
  let inFence = false;
  const paragraph: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^```/.test(line)) {
      inFence = !inFence;
      if (paragraph.length > 0) break;
      continue;
    }
    if (inFence) continue;

    if (!line.trim()) {
      if (paragraph.length > 0) break;
      continue;
    }

    // Skip headings, blockquotes, lists, tables, and HTML until we find prose.
    if (/^(#{1,6}\s|>\s|[-*+]\s|\d+\.\s|\|.*\|\s*$|<)/.test(line)) {
      if (paragraph.length > 0) break;
      continue;
    }

    paragraph.push(line.trim());
  }

  const text = paragraph
    .join(' ')
    // Strip markdown links but keep the link text.
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip inline code backticks.
    .replace(/`([^`]+)`/g, '$1')
    // Strip bold/italic emphasis markers.
    .replace(/([*_]{1,3})([^*_]+)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();

  return text || fromFrontmatter;
}

/** Deduplicate and preserve first-seen order. */
function uniqueOrdered<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Build the `# Name\n\n> description\n\n` header shared by both files. */
function buildHeader(config: ClearifyConfig): string {
  const name = config.name.trim();
  // Description preference: links.description is unusual; prefer a dedicated
  // field on the hub project partial (self-description) if present, then fall
  // back to a generic placeholder the user can edit their config to replace.
  const tagline =
    (config.hubProject?.description && config.hubProject.description.trim()) ||
    `Documentation for ${name}.`;
  return `# ${name}\n\n> ${tagline}\n\n`;
}

/**
 * Generate the `llms.txt` index file content.
 *
 * Format:
 *   # {name}
 *
 *   > {tagline}
 *
 *   ## {Section label}
 *
 *   - [Title](https://site/path): first-paragraph summary
 *   ...
 *
 *   ## Optional
 *   - [Title](https://site/path): summary
 */
export function generateLlmsTxt(config: ClearifyConfig, docs: LlmsDocEntry[]): string {
  const base = normalizeBase(config.siteUrl);
  let out = buildHeader(config);

  // Preserve section order as docs are supplied. Main (non-optional) docs first.
  const mainDocs = docs.filter((d) => !d.optional);
  const optionalDocs = docs.filter((d) => d.optional);

  const sectionLabels = uniqueOrdered(mainDocs.map((d) => d.sectionLabel));

  for (const label of sectionLabels) {
    const sectionDocs = mainDocs.filter((d) => d.sectionLabel === label);
    if (sectionDocs.length === 0) continue;

    out += `## ${label}\n\n`;
    for (const doc of sectionDocs) {
      const url = toAbsoluteUrl(base, doc.routePath);
      const summary = firstParagraphSummary(doc.markdown);
      if (summary) {
        out += `- [${doc.title}](${url}): ${summary}\n`;
      } else {
        out += `- [${doc.title}](${url})\n`;
      }
    }
    out += '\n';
  }

  if (optionalDocs.length > 0) {
    out += `## Optional\n\n`;
    for (const doc of optionalDocs) {
      const url = toAbsoluteUrl(base, doc.routePath);
      const summary = firstParagraphSummary(doc.markdown);
      if (summary) {
        out += `- [${doc.title}](${url}): ${summary}\n`;
      } else {
        out += `- [${doc.title}](${url})\n`;
      }
    }
    out += '\n';
  }

  return out.trimEnd() + '\n';
}

/**
 * Generate the `llms-full.txt` bundle file content. Concatenates the entire
 * markdown body of every doc under an H2 with a `Source:` line, so an LLM
 * with no browsing can ingest the whole site from one file.
 */
export function generateLlmsFullTxt(config: ClearifyConfig, docs: LlmsDocEntry[]): string {
  const base = normalizeBase(config.siteUrl);
  let out = buildHeader(config);

  for (const doc of docs) {
    const url = toAbsoluteUrl(base, doc.routePath);
    const body = stripFrontmatterAndH1(doc.markdown);
    out += `## ${doc.title}\n\n`;
    out += `Source: ${url}\n\n`;
    if (body) {
      out += body.trimEnd() + '\n\n';
    }
  }

  return out.trimEnd() + '\n';
}

/**
 * Read a markdown file from disk. Returned as-is, including frontmatter.
 * Exists here so callers in the build pipeline stay thin and the unit tests
 * can stub in-memory markdown without touching the filesystem.
 */
export function readMarkdownFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}
