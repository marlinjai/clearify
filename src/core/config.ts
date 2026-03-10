import { z } from 'zod';
import { resolve, basename, dirname } from 'path';
import { pathToFileURL } from 'url';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync, symlinkSync, readdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { ClearifyConfig, ClearifyDataConfig, HubProject, ResolvedSection, SectionConfig } from '../types/index.js';
import { resolveRemoteSections } from './remote.js';

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

const RemoteGitSourceSchema = z.object({
  repo: z.string(),
  ref: z.string().optional(),
  path: z.string().optional(),
  sparse: z.boolean().optional(),
});

const SectionConfigSchema = z.object({
  label: z.string(),
  docsDir: z.string(),
  basePath: z.string().optional(),
  draft: z.boolean().optional(),
  sitemap: z.boolean().optional(),
  exclude: z.array(z.string()).optional(),
  git: RemoteGitSourceSchema.optional(),
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
  group: z.string().optional(),
  mode: z.enum(['link', 'embed', 'inject']).optional(),
  git: RemoteGitSourceSchema.optional(),
  embedSections: z.union([
    z.literal('all'),
    z.literal('public'),
    z.array(z.string()),
  ]).optional(),
  injectInto: z.string().optional(),
  docsPath: z.string().optional(),
});

const HubProjectPartialSchema = z.object({
  description: z.string(),
  href: z.string().optional(),
  repo: z.string().optional(),
  status: z.enum(['active', 'beta', 'planned', 'deprecated']).default('active'),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
  group: z.string().optional(),
  hubUrl: z.string().optional(),
  hubName: z.string().optional(),
}).optional();

const HubConfigSchema = z.object({
  projects: z.array(HubProjectSchema).default([]),
  scan: z.string().optional(),
  cacheDir: z.string().optional(),
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

/** Zod schema for clearify.data.json — Tier 1+2 visual-config fields, all optional. */
export const ClearifyDataSchema = z.object({
  name: z.string().optional(),
  siteUrl: z.string().optional(),
  theme: z
    .object({
      primaryColor: z.string().optional(),
      mode: z.enum(['light', 'dark', 'auto']).optional(),
    })
    .optional(),
  logo: z
    .object({
      light: z.string().optional(),
      dark: z.string().optional(),
    })
    .optional(),
  links: z.record(z.string(), z.string()).optional(),
  sections: z.array(SectionConfigSchema).optional(),
  hub: HubConfigSchema,
});

/**
 * Deep-merge utility where JSON (overlay) values win over base values.
 * Plain objects merge recursively. Arrays are replaced entirely.
 * Undefined values in the overlay are skipped.
 */
export function deepMergeJsonWins<T extends Record<string, any>>(
  base: T,
  json: Partial<T>,
): T {
  const result = { ...base };
  for (const key of Object.keys(json) as (keyof T)[]) {
    const jsonVal = json[key];
    if (jsonVal === undefined) continue;

    const baseVal = base[key];
    if (
      baseVal !== null &&
      jsonVal !== null &&
      typeof baseVal === 'object' &&
      typeof jsonVal === 'object' &&
      !Array.isArray(baseVal) &&
      !Array.isArray(jsonVal)
    ) {
      result[key] = deepMergeJsonWins(baseVal, jsonVal as any);
    } else {
      result[key] = jsonVal as T[keyof T];
    }
  }
  return result;
}

/** Load and validate clearify.data.json from a project root. Returns `{}` on missing/invalid file. */
export function loadDataConfig(root: string): ClearifyDataConfig {
  const dataPath = resolve(root, 'clearify.data.json');
  if (!existsSync(dataPath)) return {};
  try {
    const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));
    return ClearifyDataSchema.parse(raw);
  } catch {
    return {};
  }
}

/** Validate and atomically write clearify.data.json. */
export function writeDataConfig(root: string, data: unknown): void {
  const validated = ClearifyDataSchema.parse(data);
  const dataPath = resolve(root, 'clearify.data.json');
  const tmpPath = dataPath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');
  renameSync(tmpPath, dataPath);
}

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

  let tsConfig: Partial<ClearifyConfig> = {};

  for (const file of configFiles) {
    const configPath = resolve(root, file);
    if (existsSync(configPath)) {
      try {
        if (file.endsWith('.ts')) {
          tsConfig = await loadTsConfig(configPath);
        } else {
          const mod = await import(pathToFileURL(configPath).href);
          tsConfig = mod.default ?? mod;
        }
        break;
      } catch {
        // Config file exists but failed to load — will use defaults
      }
    }
  }

  // Merge clearify.data.json on top (JSON wins)
  const jsonData = loadDataConfig(root);
  return deepMergeJsonWins(tsConfig, jsonData as Partial<ClearifyConfig>);
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

export async function resolveSections(config: ClearifyConfig, root: string): Promise<ResolvedSection[]> {
  if (config.sections && config.sections.length > 0) {
    // Resolve remote sections first (clone/update git repos, rewrite docsDir)
    const hasRemote = config.sections.some((s) => s.git);
    let resolvedInputs: SectionConfig[] = config.sections;

    if (hasRemote) {
      const cacheDir = resolve(root, 'node_modules/.cache/clearify-remote');
      resolvedInputs = await resolveRemoteSections(config.sections, cacheDir);
    }

    const sections: ResolvedSection[] = resolvedInputs.map((s, i) => {
      const id = slugify(s.label);
      const draft = s.draft ?? false;
      const basePath = s.basePath ?? (i === 0 ? '/' : '/' + id);
      const sitemap = s.sitemap ?? !draft;
      const exclude = [...(config.exclude ?? []), ...(s.exclude ?? [])];
      // If docsDir is already absolute (resolved by remote), use as-is
      const docsDir = s.docsDir.startsWith('/') ? s.docsDir : resolve(root, s.docsDir);
      return {
        id,
        label: s.label,
        docsDir,
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

/**
 * Build a staging directory that merges an original docsDir with injected project
 * docs via symlinks. Directories that are ancestors of injection targets become
 * real dirs with their children symlinked individually; everything else is symlinked
 * as a whole.
 */
function buildStagingOverlay(
  stagingDir: string,
  originalDir: string,
  injections: Map<string, string>,
): void {
  // Clean and recreate
  if (existsSync(stagingDir)) {
    rmSync(stagingDir, { recursive: true, force: true });
  }
  mkdirSync(stagingDir, { recursive: true });

  // Compute which relative directory paths need to be "real dirs" because
  // they are ancestors of (or equal to) injection target directories.
  const ancestorDirs = new Set<string>();
  for (const targetRelPath of injections.keys()) {
    const parts = targetRelPath.split('/');
    // Each prefix is an ancestor dir that must be real
    for (let i = 1; i <= parts.length; i++) {
      ancestorDirs.add(parts.slice(0, i).join('/'));
    }
  }

  // Recursively mirror the original dir, creating real dirs where needed
  // and symlinking everything else.
  function mirrorDir(srcDir: string, destDir: string, relPrefix: string): void {
    if (!existsSync(srcDir)) return;
    const entries = readdirSync(srcDir);
    for (const entry of entries) {
      const srcPath = resolve(srcDir, entry);
      const destPath = resolve(destDir, entry);
      const relPath = relPrefix ? `${relPrefix}/${entry}` : entry;

      if (ancestorDirs.has(relPath) && statSync(srcPath).isDirectory()) {
        // This directory is an ancestor of an injection target — create a real dir
        mkdirSync(destPath, { recursive: true });
        mirrorDir(srcPath, destPath, relPath);
      } else {
        // Symlink the entry as-is (file or entire directory)
        symlinkSync(srcPath, destPath);
      }
    }
  }

  mirrorDir(originalDir, stagingDir, '');

  // Create injection symlinks
  for (const [relPath, sourcePath] of injections) {
    const destPath = resolve(stagingDir, relPath);
    // Ensure parent dir exists
    const parentDir = dirname(destPath);
    mkdirSync(parentDir, { recursive: true });
    symlinkSync(sourcePath, destPath);
  }
}

export async function scanHubProjects(config: ClearifyConfig, root: string): Promise<ClearifyConfig> {
  if (!config.hub?.scan && !config.hub?.projects?.some((p) => p.mode === 'embed' || p.mode === 'inject')) {
    return config;
  }

  const scannedProjects: HubProject[] = [];

  if (config.hub?.scan) {
    const { globbySync } = await import('globby');
    const pattern = config.hub.scan;
    const configPaths = globbySync(pattern, { cwd: root, absolute: true });

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
          group: hp.group,
        });
      } catch {
        // Skip configs that fail to load
      }
    }
  }

  // Manual projects override scanned ones by name
  const manualNames = new Set((config.hub?.projects ?? []).map((p) => p.name));
  const merged = [
    ...scannedProjects.filter((p) => !manualNames.has(p.name)),
    ...(config.hub?.projects ?? []),
  ];

  // Process embed-mode projects: clone their repos, read their configs,
  // and inject their sections into the host config's sections array.
  const embedSections: SectionConfig[] = [];
  for (const project of merged) {
    if (project.mode !== 'embed' || !project.git) continue;

    const cacheDir = config.hub?.cacheDir
      ? resolve(root, config.hub.cacheDir)
      : resolve(root, 'node_modules/.cache/clearify-remote');

    try {
      const { resolveRemoteSource } = await import('./remote.js');
      const { localPath } = await resolveRemoteSource(project.git, cacheDir);

      // Read the remote project's clearify config to discover its sections
      const remoteConfig = await loadUserConfig(localPath);
      const remoteSections = remoteConfig.sections ?? [
        { label: remoteConfig.name ?? project.name, docsDir: remoteConfig.docsDir ?? './docs' },
      ];

      // Filter sections based on embedSections
      const filter = project.embedSections ?? 'public';
      const filtered = remoteSections.filter((s) => {
        if (filter === 'all') return true;
        if (filter === 'public') return !s.draft;
        if (Array.isArray(filter)) return filter.includes(s.label);
        return true;
      });

      for (const s of filtered) {
        const docsDir = s.docsDir.startsWith('/') ? s.docsDir : resolve(localPath, s.docsDir);
        const label = s.label === 'Documentation' ? project.name : s.label;
        const id = slugify(label);
        embedSections.push({
          label,
          docsDir,
          basePath: s.basePath ?? '/' + id,
          draft: s.draft,
          sitemap: s.sitemap,
          exclude: s.exclude,
        });
      }

      console.log(`  Hub embed "${project.name}": ${filtered.length} sections pulled`);
    } catch (err) {
      console.warn(
        `  ⚠ Hub embed "${project.name}" failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Process inject-mode projects: clone their repos, then overlay their docs
  // into the target section's docsDir via a staging directory.
  // Group injections by target section label.
  const injectionsBySection = new Map<string, Map<string, string>>();

  for (const project of merged) {
    if (project.mode !== 'inject' || !project.git) continue;

    const cacheDir = config.hub?.cacheDir
      ? resolve(root, config.hub.cacheDir)
      : resolve(root, 'node_modules/.cache/clearify-remote');

    try {
      const { resolveRemoteSource } = await import('./remote.js');
      const { localPath, cached } = await resolveRemoteSource(project.git, cacheDir);

      const docsPath = project.docsPath ?? 'docs';
      const absoluteDocsPath = resolve(localPath, docsPath);

      if (!existsSync(absoluteDocsPath)) {
        console.warn(
          `  ⚠ Hub inject "${project.name}": docs path "${docsPath}" not found in cloned repo.`,
        );
        continue;
      }

      const targetLabel = project.injectInto;
      if (!targetLabel) {
        console.warn(`  ⚠ Hub inject "${project.name}": missing injectInto field.`);
        continue;
      }

      if (!injectionsBySection.has(targetLabel)) {
        injectionsBySection.set(targetLabel, new Map());
      }

      const slugifiedName = slugify(project.name);
      const relPath = project.group
        ? `projects/${project.group}/${slugifiedName}`
        : `projects/${slugifiedName}`;

      injectionsBySection.get(targetLabel)!.set(relPath, absoluteDocsPath);

      console.log(
        `  Hub inject "${project.name}": ${cached ? 'cached' : 'cloned'} → ${relPath}`,
      );
    } catch (err) {
      console.warn(
        `  ⚠ Hub inject "${project.name}" failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // For each affected section, build a staging overlay and rewrite its docsDir
  let modifiedSections = config.sections ? [...config.sections] : undefined;

  if (injectionsBySection.size > 0 && modifiedSections) {
    for (const [sectionLabel, injections] of injectionsBySection) {
      const sectionIdx = modifiedSections.findIndex((s) => s.label === sectionLabel);
      if (sectionIdx === -1) {
        console.warn(`  ⚠ Hub inject: target section "${sectionLabel}" not found.`);
        continue;
      }

      const section = modifiedSections[sectionIdx];
      const sectionId = slugify(section.label);
      const originalDocsDir = section.docsDir.startsWith('/')
        ? section.docsDir
        : resolve(root, section.docsDir);
      const stagingDir = resolve(root, `node_modules/.cache/clearify-inject/${sectionId}`);

      buildStagingOverlay(stagingDir, originalDocsDir, injections);

      modifiedSections[sectionIdx] = {
        ...section,
        docsDir: stagingDir,
      };

      console.log(
        `  Hub inject: staging overlay for "${sectionLabel}" → ${stagingDir}`,
      );
    }
  }

  // Merge embed sections into host config
  const finalSections = [...(modifiedSections ?? config.sections ?? []), ...embedSections];
  const sectionsChanged = embedSections.length > 0 || injectionsBySection.size > 0;

  return {
    ...config,
    ...(sectionsChanged ? { sections: finalSections } : {}),
    hub: {
      ...config.hub,
      projects: merged,
    },
  };
}

export { defineConfig } from '../types/index.js';
