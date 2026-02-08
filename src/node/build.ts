import { build as viteBuild, type InlineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeShiki from '@shikijs/rehype';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { clearifyPlugin } from '../vite-plugin/index.js';
import { loadUserConfig, resolveConfig } from '../core/config.js';
import { scanDocs, buildRoutes } from '../core/navigation.js';
import { remarkMermaidToComponent } from '../core/remark-mermaid.js';

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

function generateSitemap(routes: { path: string }[]): string {
  const urls = routes.map(
    (r) =>
      `  <url><loc>${r.path === '/' ? '/' : r.path + '/'}</loc></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

export async function buildSite() {
  const userRoot = process.cwd();
  const root = resolveClientPath();
  const userConfig = await loadUserConfig(userRoot);
  const config = resolveConfig(userConfig);
  const outDir = resolve(userRoot, config.outDir);
  const docsDir = resolve(userRoot, config.docsDir);

  const viteConfig: InlineConfig = {
    root,
    plugins: [
      tailwindcss(),
      ...clearifyPlugin({ root: userRoot }),
      {enforce: 'pre', ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkMermaidToComponent, remarkGfm, remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]],
        rehypePlugins: [
          [rehypeShiki, {
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
          }],
        ],
      })},
      react({ include: /\.(jsx|tsx|md|mdx)$/ }),
    ],
    resolve: {
      alias: {
        '@clearify': resolve(root, '..'),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
    },
  };

  console.log('Building documentation site...\n');
  await viteBuild(viteConfig);

  // Generate sitemap.xml
  const docs = scanDocs(docsDir, config.exclude);

  // Auto-detect CHANGELOG.md at project root
  const changelogPath = resolve(userRoot, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    const changelogContent = readFileSync(changelogPath, 'utf-8');
    const { data } = matter(changelogContent);
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

  const routes = buildRoutes(docs);
  const sitemap = generateSitemap(routes);
  writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap);
  console.log('  Generated sitemap.xml');

  console.log(`\nBuild complete! Output in ${config.outDir}/\n`);
}
