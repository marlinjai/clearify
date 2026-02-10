import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { loadUserConfig, resolveConfig, resolveSections } from '../core/config.js';
import { scanDocs } from '../core/navigation.js';

interface BrokenLink {
  file: string;
  line: number;
  link: string;
  suggestion?: string;
}

export async function checkLinks(): Promise<void> {
  const userRoot = process.cwd();
  const userConfig = await loadUserConfig(userRoot);
  const config = resolveConfig(userConfig, userRoot);
  const sections = resolveSections(config, userRoot);

  // Build the set of all valid routes
  const validRoutes = new Set<string>();
  const allDocs: { filePath: string; routePath: string }[] = [];

  for (const section of sections) {
    const docs = scanDocs(section.docsDir, section.exclude, section.basePath);
    for (const doc of docs) {
      validRoutes.add(doc.routePath);
      allDocs.push(doc);
    }
  }

  // Always add root and changelog
  validRoutes.add('/');
  const changelogPath = resolve(userRoot, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    validRoutes.add('/changelog');
  }

  // Also add routes without trailing slash and with trailing slash
  const expandedRoutes = new Set(validRoutes);
  for (const route of validRoutes) {
    expandedRoutes.add(route.replace(/\/$/, ''));
    if (route !== '/') expandedRoutes.add(route + '/');
  }

  // Regex patterns for links in markdown/MDX
  // Markdown links: [text](path) or [text](path "title")
  const mdLinkRegex = /\[(?:[^\]]*)\]\(([^)]+)\)/g;
  // HTML href: href="path" or href='path'
  const hrefRegex = /href=["']([^"']+)["']/g;

  const brokenLinks: BrokenLink[] = [];

  for (const doc of allDocs) {
    if (!existsSync(doc.filePath)) continue;
    const content = readFileSync(doc.filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip code blocks
      if (line.trimStart().startsWith('```')) continue;

      for (const regex of [mdLinkRegex, hrefRegex]) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(line)) !== null) {
          const rawLink = match[1].split(/[\s"'#]/)[0]; // Strip title, hash, quotes

          // Skip external links, anchors, mailto, tel, protocol links
          if (!rawLink || rawLink.startsWith('http://') || rawLink.startsWith('https://') ||
              rawLink.startsWith('#') || rawLink.startsWith('mailto:') ||
              rawLink.startsWith('tel:') || rawLink.startsWith('//') ||
              rawLink.startsWith('{') || rawLink.startsWith('data:')) {
            continue;
          }

          // Skip relative file links to assets (images, etc.)
          if (/\.(png|jpe?g|gif|svg|webp|ico|pdf|zip|tar|gz)$/i.test(rawLink)) {
            continue;
          }

          // Normalize the link path
          let normalized = rawLink;
          // Remove .md/.mdx extension if present
          normalized = normalized.replace(/\.(mdx?|html?)$/, '');
          // Ensure leading slash
          if (!normalized.startsWith('/')) {
            // Resolve relative to current doc's directory
            const docDir = doc.routePath.substring(0, doc.routePath.lastIndexOf('/')) || '/';
            normalized = docDir === '/' ? '/' + normalized : docDir + '/' + normalized;
          }
          // Remove trailing slash for comparison (except root)
          const check = normalized === '/' ? '/' : normalized.replace(/\/$/, '');

          // Remove /index suffix
          const checkNoIndex = check.replace(/\/index$/, '') || '/';

          if (!expandedRoutes.has(check) && !expandedRoutes.has(checkNoIndex)) {
            // Find closest match for suggestion
            const suggestion = findClosest(check, validRoutes);
            brokenLinks.push({
              file: doc.filePath,
              line: lineNum,
              link: rawLink,
              ...(suggestion ? { suggestion } : {}),
            });
          }
        }
      }
    }
  }

  // Report results
  if (brokenLinks.length === 0) {
    console.log('\n  No broken links found.\n');
    return;
  }

  console.log(`\n  Found ${brokenLinks.length} broken link${brokenLinks.length === 1 ? '' : 's'}:\n`);

  // Group by file
  const byFile = new Map<string, BrokenLink[]>();
  for (const bl of brokenLinks) {
    const relative = bl.file.replace(userRoot + '/', '');
    if (!byFile.has(relative)) byFile.set(relative, []);
    byFile.get(relative)!.push(bl);
  }

  for (const [file, links] of byFile) {
    console.log(`  ${file}`);
    for (const link of links) {
      const suggestion = link.suggestion ? ` (did you mean ${link.suggestion}?)` : '';
      console.log(`    line ${link.line}: ${link.link}${suggestion}`);
    }
    console.log();
  }

  process.exitCode = 1;
}

function findClosest(target: string, routes: Set<string>): string | undefined {
  let best: string | undefined;
  let bestScore = Infinity;

  const targetSegments = target.split('/').filter(Boolean);

  for (const route of routes) {
    const routeSegments = route.split('/').filter(Boolean);

    // Simple scoring: Levenshtein on the full path string
    const dist = levenshtein(target, route);
    // Bonus for shared segments
    const common = targetSegments.filter((s) => routeSegments.includes(s)).length;
    const score = dist - common * 2;

    if (score < bestScore) {
      bestScore = score;
      best = route;
    }
  }

  // Only suggest if reasonably close
  if (best && bestScore < target.length * 0.6) return best;
  return undefined;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
