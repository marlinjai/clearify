import { z } from 'zod';
import { resolve, basename } from 'path';
import { pathToFileURL } from 'url';
import { existsSync, readFileSync } from 'fs';
import type { ClearifyConfig } from '../types/index.js';

const NavigationItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    label: z.string(),
    path: z.string().optional(),
    children: z.array(NavigationItemSchema).optional(),
  })
);

const ClearifyConfigSchema = z.object({
  name: z.string().default('Documentation'),
  docsDir: z.string().default('./docs'),
  outDir: z.string().default('./docs-dist'),
  port: z.number().default(4747),
  siteUrl: z.string().optional(),
  theme: z
    .object({
      primaryColor: z.string().default('#3B82F6'),
      mode: z.enum(['light', 'dark', 'auto']).default('auto'),
    })
    .default({ primaryColor: '#3B82F6', mode: 'auto' }),
  logo: z
    .object({
      light: z.string().optional(),
      dark: z.string().optional(),
    })
    .optional(),
  navigation: z.array(NavigationItemSchema).nullable().default(null),
  exclude: z.array(z.string()).default([]),
  links: z.record(z.string(), z.string()).optional(),
});

export const defaultConfig: ClearifyConfig = {
  name: 'Documentation',
  docsDir: './docs',
  outDir: './docs-dist',
  port: 4747,
  theme: {
    primaryColor: '#3B82F6',
    mode: 'auto',
  },
  navigation: null,
};

function detectProjectName(root: string): string {
  // Try reading the project's package.json name
  const pkgPath = resolve(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) {
        // Strip npm scope (e.g., "@marlinjai/data-table" → "Data Table")
        const raw = pkg.name.replace(/^@[^/]+\//, '');
        return raw
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
    } catch {
      // Ignore malformed package.json
    }
  }

  // Fall back to directory name, title-cased
  const dirName = basename(root);
  return dirName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export async function loadUserConfig(root: string): Promise<Partial<ClearifyConfig>> {
  const configFiles = [
    'clearify.config.ts',
    'clearify.config.js',
    'clearify.config.mjs',
  ];

  for (const file of configFiles) {
    const configPath = resolve(root, file);
    if (existsSync(configPath)) {
      try {
        const mod = await import(pathToFileURL(configPath).href);
        return mod.default ?? mod;
      } catch {
        // Config file exists but failed to load — will use defaults
      }
    }
  }

  return {};
}

export function resolveConfig(userConfig: Partial<ClearifyConfig> = {}, root?: string): ClearifyConfig {
  const parsed = ClearifyConfigSchema.parse(userConfig);
  // If name is still the default and we have a root, auto-detect from project
  if (!userConfig.name && root) {
    parsed.name = detectProjectName(root);
  }
  return parsed as ClearifyConfig;
}

export { defineConfig } from '../types/index.js';
