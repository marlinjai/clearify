import { z } from 'zod';
import { resolve, basename, dirname } from 'path';
import { pathToFileURL } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { ClearifyConfig, ResolvedSection } from '../types/index.js';

const NavigationItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    label: z.string(),
    path: z.string().optional(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    badgeColor: z.string().optional(),
    children: z.array(NavigationItemSchema).optional(),
  })
);

const SectionConfigSchema = z.object({
  label: z.string(),
  docsDir: z.string(),
  basePath: z.string().optional(),
  draft: z.boolean().optional(),
  sitemap: z.boolean().optional(),
  exclude: z.array(z.string()).optional(),
});

const MermaidConfigSchema = z.object({
  strategy: z.enum(['client', 'build']).default('client'),
}).default({ strategy: 'client' });

const OpenAPIConfigSchema = z.object({
  spec: z.string(),
  basePath: z.string().default('/api'),
  generatePages: z.boolean().default(true),
}).optional();

const HubProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  href: z.string().optional(),
  repo: z.string().optional(),
  status: z.enum(['active', 'beta', 'planned', 'deprecated']).default('active'),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const HubProjectPartialSchema = z.object({
  description: z.string(),
  href: z.string().optional(),
  repo: z.string().optional(),
  status: z.enum(['active', 'beta', 'planned', 'deprecated']).default('active'),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).optional();

const HubConfigSchema = z.object({
  projects: z.array(HubProjectSchema).default([]),
  scan: z.string().optional(),
}).optional();

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
  sections: z.array(SectionConfigSchema).optional(),
  navigation: z.array(NavigationItemSchema).nullable().default(null),
  exclude: z.array(z.string()).default([]),
  mermaid: MermaidConfigSchema,
  openapi: OpenAPIConfigSchema,
  links: z.record(z.string(), z.string()).optional(),
  hub: HubConfigSchema,
  hubProject: HubProjectPartialSchema,
  customCss: z.string().optional(),
  headTags: z.array(z.string()).optional(),
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

async function loadTsConfig(configPath: string): Promise<Partial<ClearifyConfig>> {
  const { build } = await import('esbuild');
  const tmpId = randomBytes(4).toString('hex');
  const outFile = resolve(tmpdir(), `clearify-config-${tmpId}.mjs`);

  try {
    await build({
      entryPoints: [configPath],
      outfile: outFile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      write: true,
      // Bundle the clearify import (defineConfig is a trivial identity fn),
      // but keep everything else external so we don't pull in user deps.
      plugins: [{
        name: 'externalize-except-clearify',
        setup(build) {
          // Resolve bare 'clearify' / '@marlinjai/clearify' to a stub that
          // exports defineConfig as an identity function — avoids needing to
          // locate the actual package at esbuild time.
          build.onResolve({ filter: /^(clearify|@marlinjai\/clearify)$/ }, () => {
            return { path: 'clearify-stub', namespace: 'clearify-stub' };
          });
          build.onLoad({ filter: /.*/, namespace: 'clearify-stub' }, () => {
            return {
              contents: 'export function defineConfig(config) { return config; }',
              loader: 'js',
            };
          });
          build.onResolve({ filter: /.*/ }, (args) => {
            // Let relative/absolute imports be bundled
            if (args.path.startsWith('.') || args.path.startsWith('/')) {
              return undefined;
            }
            return { path: args.path, external: true };
          });
        },
      }],
    });
    const mod = await import(pathToFileURL(outFile).href);
    return mod.default ?? mod;
  } finally {
    try { rmSync(outFile, { force: true }); } catch {}
  }
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
        if (file.endsWith('.ts')) {
          return await loadTsConfig(configPath);
        }
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

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveSections(config: ClearifyConfig, root: string): ResolvedSection[] {
  if (config.sections && config.sections.length > 0) {
    const sections: ResolvedSection[] = config.sections.map((s, i) => {
      const id = slugify(s.label);
      const draft = s.draft ?? false;
      const basePath = s.basePath ?? (i === 0 ? '/' : '/' + id);
      const sitemap = s.sitemap ?? !draft;
      const exclude = [...(config.exclude ?? []), ...(s.exclude ?? [])];
      return {
        id,
        label: s.label,
        docsDir: resolve(root, s.docsDir),
        basePath,
        draft,
        sitemap,
        exclude,
      };
    });

    // Validate no duplicate basePaths
    const seen = new Set<string>();
    for (const s of sections) {
      if (seen.has(s.basePath)) {
        throw new Error(`Duplicate section basePath: "${s.basePath}"`);
      }
      seen.add(s.basePath);
    }

    return sections;
  }

  // Synthesize single default section from docsDir
  return [
    {
      id: 'default',
      label: config.name,
      docsDir: resolve(root, config.docsDir),
      basePath: '/',
      draft: false,
      sitemap: true,
      exclude: config.exclude ?? [],
    },
  ];
}

export async function scanHubProjects(config: ClearifyConfig, root: string): Promise<ClearifyConfig> {
  if (!config.hub?.scan) return config;

  const { globbySync } = await import('globby');
  const pattern = config.hub.scan;
  const configPaths = globbySync(pattern, { cwd: root, absolute: true });

  const scannedProjects: Array<{ name: string; description: string; href?: string; repo?: string; status?: 'active' | 'beta' | 'planned' | 'deprecated'; icon?: string; tags?: string[] }> = [];

  for (const configPath of configPaths) {
    try {
      const childConfig = await loadUserConfig(dirname(configPath));
      if (!childConfig.hubProject) continue;

      const name = childConfig.name ?? basename(dirname(configPath));
      const hp = childConfig.hubProject;
      scannedProjects.push({
        name,
        description: hp.description,
        href: hp.href ?? childConfig.siteUrl,
        repo: hp.repo,
        status: hp.status,
        icon: hp.icon,
        tags: hp.tags,
      });
    } catch {
      // Skip configs that fail to load
    }
  }

  // Manual projects override scanned ones by name
  const manualNames = new Set((config.hub.projects ?? []).map((p) => p.name));
  const merged = [
    ...scannedProjects.filter((p) => !manualNames.has(p.name)),
    ...(config.hub.projects ?? []),
  ];

  return {
    ...config,
    hub: {
      ...config.hub,
      projects: merged,
    },
  };
}

export { defineConfig } from '../types/index.js';
