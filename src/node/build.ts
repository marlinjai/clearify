import { build as viteBuild, type InlineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeShiki from '@shikijs/rehype';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { clearifyPlugin } from '../vite-plugin/index.js';
import { loadUserConfig, resolveConfig, resolveSections } from '../core/config.js';
import { buildSectionData, type SectionData } from '../core/navigation.js';
import { remarkMermaidToComponent, setPreRenderedMermaidSvgs, clearPreRenderedMermaidSvgs } from '../core/remark-mermaid.js';
import { mermaidContentHash } from '../core/mermaid-utils.js';
import type { RouteEntry } from '../types/index.js';

function findPackageRoot(): string {
  let dir = fileURLToPath(new URL('.', import.meta.url));
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'package.json'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function resolveClientPath(...segments: string[]) {
  const packageRoot = findPackageRoot();
  return resolve(packageRoot, 'src', 'client', ...segments);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateSitemap(routes: { path: string }[], siteUrl?: string): string {
  const base = siteUrl?.replace(/\/$/, '') ?? '';
  const urls = routes.map((r) => {
    const loc = base
      ? `${base}${r.path === '/' ? '/' : r.path + '/'}`
      : r.path === '/' ? '/' : r.path + '/';
    return `  <url><loc>${loc}</loc></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

function generateRobotsTxt(siteUrl?: string): string {
  const lines = ['User-agent: *', 'Allow: /'];
  if (siteUrl) {
    const base = siteUrl.replace(/\/$/, '');
    lines.push(`Sitemap: ${base}/sitemap.xml`);
  }
  return lines.join('\n') + '\n';
}

function injectSSR(template: string, opts: {
  html: string;
  title: string;
  description: string;
  url: string;
  siteName: string;
  siteUrl?: string;
}): string {
  const siteBase = opts.siteUrl?.replace(/\/$/, '') ?? '';
  const canonical = siteBase ? `${siteBase}${opts.url}` : opts.url;
  const escapedTitle = escapeHtml(opts.title);
  const escapedDesc = escapeHtml(opts.description);
  const escapedSiteName = escapeHtml(opts.siteName);

  const headTags = [
    `<title>${escapedTitle}</title>`,
    `<meta name="description" content="${escapedDesc}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${escapedTitle}" />`,
    `<meta property="og:description" content="${escapedDesc}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${escapedSiteName}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapedTitle}" />`,
    `<meta name="twitter:description" content="${escapedDesc}" />`,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: opts.title,
      description: opts.description,
      url: canonical,
    })}</script>`,
  ].join('\n    ');

  return template
    .replace('<title>Documentation</title>', '')
    .replace('<!--clearify-head-->', headTags)
    .replace('<!--clearify-outlet-->', opts.html)
    .replace('<div id="root">', '<div id="root" data-clearify-ssr="true">');
}

function getSharedPlugins(userRoot: string, options?: {
  mermaidSvgs?: Record<string, { lightSvg: string; darkSvg: string }>;
  mermaidStrategy?: 'client' | 'build';
}) {
  return [
    tailwindcss(),
    ...clearifyPlugin({
      root: userRoot,
      mermaidSvgs: options?.mermaidSvgs,
      mermaidStrategy: options?.mermaidStrategy,
    }),
    { enforce: 'pre' as const, ...mdx({
      providerImportSource: '@mdx-js/react',
      remarkPlugins: [remarkMermaidToComponent, remarkGfm, remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]],
      rehypePlugins: [
        [rehypeShiki, {
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        }],
      ],
    }) },
    react({ include: /\.(jsx|tsx|md|mdx)$/ }),
  ];
}

export async function buildSite() {
  const userRoot = process.cwd();
  const root = resolveClientPath();
  const userConfig = await loadUserConfig(userRoot);
  const config = resolveConfig(userConfig);
  const outDir = resolve(userRoot, config.outDir);
  const ssrOutDir = resolve(outDir, '.ssr');

  // Resolve sections, filter out drafts for production
  const allSections = resolveSections(config, userRoot);
  const productionSections = allSections.filter((s) => !s.draft);

  const changelogPath = resolve(userRoot, 'CHANGELOG.md');

  // Build SectionData[] for production sections
  const sectionDataList: SectionData[] = productionSections.map((section) =>
    buildSectionData(section, changelogPath, config.navigation)
  );

  // Merge all routes for pre-rendering
  const allRoutes: RouteEntry[] = sectionDataList.flatMap((sd) => sd.routes);

  const mermaidStrategy = config.mermaid?.strategy ?? 'client';
  let mermaidSvgs: Record<string, { lightSvg: string; darkSvg: string }> | undefined;

  // --- Mermaid pre-rendering step (strategy: 'build') ---
  if (mermaidStrategy === 'build') {
    console.log('Building documentation site...\n');
    console.log('  Step 0: Pre-rendering Mermaid diagrams...');

    const { MermaidRenderer } = await import('../core/mermaid-renderer.js');
    const cacheDir = resolve(userRoot, 'node_modules/.cache/clearify-mermaid');
    const renderer = new MermaidRenderer({ cacheDir });

    try {
      await renderer.launch();

      // Scan all route files for mermaid code blocks
      const definitions = new Map<string, string>();
      const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;

      for (const route of allRoutes) {
        if (!route.filePath.endsWith('.md') && !route.filePath.endsWith('.mdx')) continue;
        if (!existsSync(route.filePath)) continue;
        const content = readFileSync(route.filePath, 'utf-8');
        let match;
        while ((match = mermaidRegex.exec(content)) !== null) {
          const def = match[1].trim();
          const hash = mermaidContentHash(def);
          definitions.set(hash, def);
        }
      }

      if (definitions.size > 0) {
        const rendered = await renderer.renderBatch(definitions);

        // Build SVG data for virtual module and remark plugin
        mermaidSvgs = {};
        const svgMap = new Map<string, { lightSvg: string; darkSvg: string }>();
        for (const [hash, data] of rendered) {
          mermaidSvgs[hash] = data;
          svgMap.set(hash, data);
        }

        // Populate remark plugin cache
        setPreRenderedMermaidSvgs(svgMap);

        console.log(`  Pre-rendered ${rendered.size} Mermaid diagrams`);
      } else {
        console.log('  No Mermaid diagrams found.');
      }
    } finally {
      await renderer.close();
    }
  } else {
    console.log('Building documentation site...\n');
  }

  // --- Step 1: Client Build ---
  console.log('  Step 1: Client build...');

  const sharedPluginOptions = {
    mermaidSvgs,
    mermaidStrategy: mermaidStrategy as 'client' | 'build',
  };

  const clientConfig: InlineConfig = {
    root,
    plugins: getSharedPlugins(userRoot, sharedPluginOptions),
    resolve: {
      alias: { '@clearify': resolve(root, '..') },
    },
    build: {
      outDir,
      emptyOutDir: true,
    },
  };

  await viteBuild(clientConfig);
  console.log('  Client build complete.');

  // --- Step 2: SSR Build ---
  console.log('  Step 2: SSR build...');

  const ssrConfig: InlineConfig = {
    root,
    plugins: getSharedPlugins(userRoot, sharedPluginOptions),
    resolve: {
      alias: { '@clearify': resolve(root, '..') },
    },
    build: {
      outDir: ssrOutDir,
      ssr: resolveClientPath('entry-server.tsx'),
      emptyOutDir: true,
    },
  };

  await viteBuild(ssrConfig);
  console.log('  SSR build complete.');

  // --- Step 3: Pre-render ---
  console.log('  Step 3: Pre-rendering pages...');

  const template = readFileSync(resolve(outDir, 'index.html'), 'utf-8');
  const ssrModule = await import(resolve(ssrOutDir, 'entry-server.js'));
  const { render } = ssrModule;

  for (const route of allRoutes) {
    try {
      const { html, head } = await render(route.path);
      const page = injectSSR(template, {
        html,
        title: head.title,
        description: head.description,
        url: route.path,
        siteName: head.siteName,
        siteUrl: config.siteUrl,
      });

      if (route.path === '/') {
        writeFileSync(resolve(outDir, 'index.html'), page);
      } else {
        const dir = resolve(outDir, route.path.replace(/^\//, ''));
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, 'index.html'), page);
      }

      console.log(`    Pre-rendered: ${route.path}`);
    } catch (err) {
      console.warn(`    Failed to pre-render ${route.path}:`, err instanceof Error ? err.message : err);
    }
  }

  // --- Step 4: Generate robots.txt ---
  writeFileSync(resolve(outDir, 'robots.txt'), generateRobotsTxt(config.siteUrl));
  console.log('  Generated robots.txt');

  // --- Step 5: Generate sitemap.xml ---
  // Only include routes from sections where sitemap is true
  const sitemapSections = new Set(
    productionSections.filter((s) => s.sitemap).map((s) => s.id)
  );
  const sitemapRoutes = allRoutes.filter(
    (r) => !r.sectionId || sitemapSections.has(r.sectionId)
  );
  const sitemap = generateSitemap(sitemapRoutes, config.siteUrl);
  writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap);
  console.log('  Generated sitemap.xml');

  // --- Step 6: Cleanup SSR build ---
  rmSync(ssrOutDir, { recursive: true, force: true });
  console.log('  Cleaned up SSR build artifacts.');

  // Cleanup mermaid remark cache
  if (mermaidStrategy === 'build') {
    clearPreRenderedMermaidSvgs();
  }

  console.log(`\nBuild complete! Output in ${config.outDir}/\n`);
}
