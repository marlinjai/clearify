import { createServer as createViteServer, type InlineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeShiki from '@shikijs/rehype';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import { clearifyPlugin } from '../vite-plugin/index.js';
import { loadUserConfig, resolveConfig } from '../core/config.js';
import { remarkMermaidToComponent } from '../core/remark-mermaid.js';

import { existsSync } from 'fs';

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

function createDevConfig(overrides: { userRoot?: string; mermaidStrategy?: 'client' | 'build' } & Partial<InlineConfig> = {}): InlineConfig {
  const root = resolveClientPath();
  const { userRoot, mermaidStrategy, ...viteOverrides } = overrides;

  return {
    root,
    plugins: [
      tailwindcss(),
      ...clearifyPlugin({
        root: userRoot ?? process.cwd(),
        mermaidStrategy,
      }),
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
    server: {
      port: 4747,
      ...viteOverrides.server,
    },
    resolve: {
      alias: {
        '@clearify': resolve(root, '..'),
      },
    },
    ...viteOverrides,
  };
}

export async function createServer(options: { port?: number; host?: boolean } = {}) {
  const userRoot = process.cwd();
  const userConfig = await loadUserConfig(userRoot);
  const siteConfig = resolveConfig(userConfig, userRoot);

  const mermaidStrategy = siteConfig.mermaid?.strategy ?? 'client';

  const config = createDevConfig({
    userRoot,
    mermaidStrategy,
    server: {
      port: options.port ?? siteConfig.port,
      host: options.host,
    },
  });

  const server = await createViteServer(config);
  return server;
}

export { buildSite as build } from './build.js';
export { init } from './init.js';
export { checkLinks } from './check.js';
