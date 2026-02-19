import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { loadUserConfig, resolveConfig, resolveSections } from '../core/config.js';
import { buildSectionData, type SectionData } from '../core/navigation.js';
import type { ClearifyConfig, ResolvedSection, RouteEntry, SectionNavigation, NavigationItem } from '../types/index.js';
import type { SearchEntry } from '../core/search.js';
import { parseOpenAPISpec } from '../core/openapi-parser.js';
import { dereference } from '@scalar/openapi-parser';

const VIRTUAL_CONFIG = 'virtual:clearify/config';
const RESOLVED_VIRTUAL_CONFIG = '\0' + VIRTUAL_CONFIG;

const VIRTUAL_ROUTES = 'virtual:clearify/routes';
const RESOLVED_VIRTUAL_ROUTES = '\0' + VIRTUAL_ROUTES;

const VIRTUAL_NAVIGATION = 'virtual:clearify/navigation';
const RESOLVED_VIRTUAL_NAVIGATION = '\0' + VIRTUAL_NAVIGATION;

const VIRTUAL_SEARCH_INDEX = 'virtual:clearify/search-index';
const RESOLVED_VIRTUAL_SEARCH_INDEX = '\0' + VIRTUAL_SEARCH_INDEX;

const VIRTUAL_MERMAID_SVGS = 'virtual:clearify/mermaid-svgs';
const RESOLVED_VIRTUAL_MERMAID_SVGS = '\0' + VIRTUAL_MERMAID_SVGS;

const VIRTUAL_OPENAPI_SPEC = 'virtual:clearify/openapi-spec';
const RESOLVED_VIRTUAL_OPENAPI_SPEC = '\0' + VIRTUAL_OPENAPI_SPEC;

/** Walk navigation depth-first, returning the first leaf path. */
function findFirstNavPath(items: NavigationItem[]): string | undefined {
  for (const item of items) {
    if (item.path) return item.path;
    if (item.children) {
      const found = findFirstNavPath(item.children);
      if (found) return found;
    }
  }
  return undefined;
}

interface ClearifyPluginOptions {
  root?: string;
  mermaidSvgs?: Record<string, { lightSvg: string; darkSvg: string }>;
  mermaidStrategy?: 'client' | 'build';
}

export function clearifyPlugin(options: ClearifyPluginOptions = {}): Plugin[] {
  let config: ClearifyConfig;
  let userRoot: string;
  let resolvedViteConfig: ResolvedConfig;
  let visibleSections: ResolvedSection[];
  let sectionDataList: SectionData[];
  let allRoutes: RouteEntry[];
  let allSectionNavigations: SectionNavigation[];
  let allSearchEntries: SearchEntry[];

  // Mutable SVG data — starts with provided data or empty, updated in dev warm-up
  let mermaidSvgData: Record<string, { lightSvg: string; darkSvg: string }> =
    options.mermaidSvgs ?? {};

  async function refreshDocs() {
    const changelogPath = resolve(userRoot, 'CHANGELOG.md');

    sectionDataList = visibleSections.map((section) =>
      buildSectionData(section, changelogPath, config.navigation)
    );

    // Flatten all sections' data
    allRoutes = sectionDataList.flatMap((sd) => sd.routes);
    allSectionNavigations = sectionDataList.map((sd) => sd.navigation);

    // Merge search entries with re-indexed IDs
    let idCounter = 0;
    allSearchEntries = sectionDataList.flatMap((sd) =>
      sd.searchEntries.map((entry) => ({ ...entry, id: idCounter++ }))
    );

    // Generate OpenAPI routes + navigation if configured
    if (config.openapi?.spec && config.openapi.generatePages !== false) {
      const basePath = config.openapi.basePath ?? '/api';
      const specData = await loadOpenAPISpecData();

      if (specData) {
        const tagGroups = parseOpenAPISpec(specData);

        const METHOD_COLORS: Record<string, string> = {
          GET: '#22c55e',
          POST: '#3b82f6',
          PUT: '#f59e0b',
          DELETE: '#ef4444',
          PATCH: '#8b5cf6',
        };

        // Helper to build a Scalar-compatible hash fragment for an operation
        function opAnchor(tag: string, method: string, opPath: string): string {
          // Scalar's pathRouting uses: /basePath#tag/{tag}/{method}{path}
          const slug = `${method.toLowerCase()}${opPath.replace(/[{}]/g, '')}`;
          return `${basePath}#tag/${encodeURIComponent(tag)}/${slug}`;
        }

        // Build navigation items from tag groups
        const navItems: NavigationItem[] = tagGroups.map((group) => ({
          label: group.tag,
          children: group.operations.map((op) => ({
            label: `${op.summary}`,
            path: opAnchor(group.tag, op.method, op.path),
            badge: op.method,
            badgeColor: METHOD_COLORS[op.method] ?? 'var(--clearify-primary)',
          })),
        }));

        // Add API section navigation
        const apiNavSection: SectionNavigation = {
          id: 'api',
          label: 'API Reference',
          basePath,
          navigation: navItems,
        };
        allSectionNavigations.push(apiNavSection);

        // Add catch-all route with componentPath
        allRoutes.push({
          path: `${basePath}/*`,
          filePath: '',
          componentPath: '@clearify/theme/components/OpenAPIPage',
          frontmatter: { title: 'API Reference', description: 'API documentation' },
          sectionId: 'api',
        });

        // Add search entries for operations
        for (const group of tagGroups) {
          for (const op of group.operations) {
            allSearchEntries.push({
              id: idCounter++,
              path: opAnchor(group.tag, op.method, op.path),
              title: `${op.method} ${op.path}`,
              description: op.summary,
              content: `${op.method} ${op.path} - ${op.summary}`,
              sectionId: 'api',
              sectionLabel: 'API Reference',
            });
          }
        }
      }
    }

    // Auto-redirect for sections without a route at their basePath
    for (const sectionNav of allSectionNavigations) {
      const bp = sectionNav.basePath;
      const hasRoute = allRoutes.some(
        (r) => r.path === bp || r.path === `${bp}/*`
      );
      if (!hasRoute) {
        const firstPath = findFirstNavPath(sectionNav.navigation);
        if (firstPath) {
          allRoutes.push({
            path: bp,
            filePath: '',
            frontmatter: { title: sectionNav.label },
            sectionId: sectionNav.id,
            redirectTo: firstPath,
          });
        }
      }
    }
  }

  function generateRoutesCode(): string {
    const imports: string[] = [];
    const routeEntries: string[] = [];

    allRoutes.forEach((route, i) => {
      if (route.redirectTo) {
        routeEntries.push(
          `  { path: ${JSON.stringify(route.path)}, redirectTo: ${JSON.stringify(route.redirectTo)} }`
        );
      } else {
        const varName = `Route${i}`;
        if (route.componentPath) {
          imports.push(`const ${varName} = () => import('${route.componentPath}');`);
        } else {
          imports.push(`const ${varName} = () => import(/* @vite-ignore */ '${route.filePath}');`);
        }
        routeEntries.push(
          `  { path: ${JSON.stringify(route.path)}, component: ${varName}, frontmatter: ${JSON.stringify(route.frontmatter)} }`
        );
      }
    });

    return `${imports.join('\n')}\nexport default [\n${routeEntries.join(',\n')}\n];`;
  }

  /** Collect all .md/.mdx file paths from visible sections */
  function getAllDocFiles(): string[] {
    const files: string[] = [];
    for (const route of allRoutes) {
      if (route.filePath.endsWith('.md') || route.filePath.endsWith('.mdx')) {
        files.push(route.filePath);
      }
    }
    return files;
  }

  let cachedSpecData: Record<string, any> | null = null;
  let specDataInitialized = false;

  async function loadOpenAPISpecData(): Promise<Record<string, any> | null> {
    if (specDataInitialized) return cachedSpecData;
    specDataInitialized = true;

    const specPath = config.openapi?.spec;
    if (!specPath) { cachedSpecData = null; return null; }

    const resolvedPath = resolve(userRoot, specPath);
    if (!existsSync(resolvedPath)) { cachedSpecData = null; return null; }

    try {
      const content = readFileSync(resolvedPath, 'utf-8');
      const isYaml = /\.ya?ml$/i.test(resolvedPath);

      let parsed: Record<string, any>;
      if (isYaml) {
        try {
          parsed = JSON.parse(content);
        } catch {
          console.warn('  YAML OpenAPI specs require js-yaml for page generation. Install it or use a JSON spec.');
          cachedSpecData = null;
          return null;
        }
      } else {
        parsed = JSON.parse(content);
      }

      // Dereference all $ref pointers so components get a flat spec
      const { schema } = await dereference(parsed);
      cachedSpecData = schema as Record<string, any>;
      return cachedSpecData;
    } catch {
      cachedSpecData = null;
      return null;
    }
  }

  async function loadOpenAPISpec(): Promise<string> {
    const specData = await loadOpenAPISpecData();
    if (!specData) {
      return 'export default null;';
    }
    return `export default ${JSON.stringify(specData)};`;
  }

  const mainPlugin: Plugin = {
    name: 'clearify',
    enforce: 'pre',

    async configResolved(viteConfig) {
      resolvedViteConfig = viteConfig;
      userRoot = options.root ?? process.cwd();
      const userConfig = await loadUserConfig(userRoot);
      config = resolveConfig(userConfig, userRoot);

      const allSections = resolveSections(config, userRoot);
      const isDev = resolvedViteConfig.command === 'serve';

      // Draft sections included in dev, excluded in build
      visibleSections = isDev
        ? allSections
        : allSections.filter((s) => !s.draft);

      await refreshDocs();
    },

    resolveId(id) {
      if (id === VIRTUAL_CONFIG) return RESOLVED_VIRTUAL_CONFIG;
      if (id === VIRTUAL_ROUTES) return RESOLVED_VIRTUAL_ROUTES;
      if (id === VIRTUAL_NAVIGATION) return RESOLVED_VIRTUAL_NAVIGATION;
      if (id === VIRTUAL_SEARCH_INDEX) return RESOLVED_VIRTUAL_SEARCH_INDEX;
      if (id === VIRTUAL_MERMAID_SVGS) return RESOLVED_VIRTUAL_MERMAID_SVGS;
      if (id === VIRTUAL_OPENAPI_SPEC) return RESOLVED_VIRTUAL_OPENAPI_SPEC;
      return null;
    },

    async load(id) {
      if (id === RESOLVED_VIRTUAL_CONFIG) {
        return `export default ${JSON.stringify(config)};`;
      }
      if (id === RESOLVED_VIRTUAL_ROUTES) {
        return generateRoutesCode();
      }
      if (id === RESOLVED_VIRTUAL_NAVIGATION) {
        return `export default ${JSON.stringify(allSectionNavigations)};`;
      }
      if (id === RESOLVED_VIRTUAL_SEARCH_INDEX) {
        return `export default ${JSON.stringify(allSearchEntries)};`;
      }
      if (id === RESOLVED_VIRTUAL_MERMAID_SVGS) {
        return `export default ${JSON.stringify(mermaidSvgData)};`;
      }
      if (id === RESOLVED_VIRTUAL_OPENAPI_SPEC) {
        return await loadOpenAPISpec();
      }
      return null;
    },

    configureServer(server: ViteDevServer) {
      // Watch all section directories
      for (const section of visibleSections) {
        server.watcher.add(section.docsDir);
      }

      // Also watch CHANGELOG.md at project root
      const changelogPath = resolve(userRoot, 'CHANGELOG.md');
      if (existsSync(changelogPath)) {
        server.watcher.add(changelogPath);
      }

      // Watch OpenAPI spec file for live reload
      if (config.openapi?.spec) {
        const openapiPath = resolve(userRoot, config.openapi.spec);
        if (existsSync(openapiPath)) {
          server.watcher.add(openapiPath);
        }
        server.watcher.on('change', (changedPath: string) => {
          if (changedPath === openapiPath) {
            // Clear cached spec data so navigation is rebuilt
            specDataInitialized = false;
            cachedSpecData = null;
            refreshDocs().then(() => {
              const specMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_OPENAPI_SPEC);
              if (specMod) server.moduleGraph.invalidateModule(specMod);
              const routesMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES);
              if (routesMod) server.moduleGraph.invalidateModule(routesMod);
              const navMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_NAVIGATION);
              if (navMod) server.moduleGraph.invalidateModule(navMod);
              const searchMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_SEARCH_INDEX);
              if (searchMod) server.moduleGraph.invalidateModule(searchMod);
              server.ws.send({ type: 'full-reload' });
            });
          }
        });
      }

      const mermaidStrategy = options.mermaidStrategy ?? config.mermaid?.strategy ?? 'client';

      // Background mermaid warm-up for build strategy in dev
      if (mermaidStrategy === 'build') {
        let renderer: any = null;

        // Track known mermaid definitions per file for incremental updates
        const fileMermaidHashes = new Map<string, Set<string>>();

        const warmUp = async () => {
          try {
            const { MermaidRenderer } = await import('../core/mermaid-renderer.js');
            const { mermaidContentHash } = await import('../core/mermaid-utils.js');
            const { setPreRenderedMermaidSvgs } = await import('../core/remark-mermaid.js');

            const cacheDir = resolve(userRoot, 'node_modules/.cache/clearify-mermaid');
            renderer = new MermaidRenderer({ cacheDir });
            await renderer.launch();

            // Scan all doc files
            const docFiles = getAllDocFiles();
            const definitions = new Map<string, string>();
            const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;

            for (const filePath of docFiles) {
              if (!existsSync(filePath)) continue;
              const content = readFileSync(filePath, 'utf-8');
              const hashes = new Set<string>();
              let match;
              while ((match = mermaidRegex.exec(content)) !== null) {
                const def = match[1].trim();
                const hash = mermaidContentHash(def);
                definitions.set(hash, def);
                hashes.add(hash);
              }
              fileMermaidHashes.set(filePath, hashes);
            }

            if (definitions.size === 0) {
              console.log('  No mermaid diagrams found.');
              return;
            }

            const rendered = await renderer.renderBatch(definitions);

            // Populate mermaidSvgData
            const svgRecord: Record<string, { lightSvg: string; darkSvg: string }> = {};
            const svgMap = new Map<string, { lightSvg: string; darkSvg: string }>();
            for (const [hash, data] of rendered) {
              svgRecord[hash] = data;
              svgMap.set(hash, data);
            }
            mermaidSvgData = svgRecord;

            // Set remark plugin cache
            setPreRenderedMermaidSvgs(svgMap);

            // Invalidate virtual module and trigger full reload
            const mermaidMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MERMAID_SVGS);
            if (mermaidMod) server.moduleGraph.invalidateModule(mermaidMod);
            server.ws.send({ type: 'full-reload' });

            console.log(`  Mermaid warm-up complete (${rendered.size} diagrams)`);
          } catch (err) {
            console.warn('  Mermaid warm-up failed:', err instanceof Error ? err.message : err);
          }
        };

        // Launch warm-up in background (don't block server startup)
        setTimeout(warmUp, 100);

        // Cleanup on server close
        server.httpServer?.on('close', async () => {
          if (renderer) {
            await renderer.close();
            renderer = null;
          }
        });

        // Incremental re-rendering on file change
        server.watcher.on('change', async (filePath: string) => {
          if (!filePath.endsWith('.md') && !filePath.endsWith('.mdx')) return;
          if (!renderer) return;

          try {
            const { mermaidContentHash } = await import('../core/mermaid-utils.js');
            const { setPreRenderedMermaidSvgs } = await import('../core/remark-mermaid.js');

            const content = readFileSync(filePath, 'utf-8');
            const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;
            const currentHashes = new Set<string>();
            const newDefinitions = new Map<string, string>();
            let match;

            while ((match = mermaidRegex.exec(content)) !== null) {
              const def = match[1].trim();
              const hash = mermaidContentHash(def);
              currentHashes.add(hash);

              // Check if this hash is new or changed
              if (!mermaidSvgData[hash]) {
                newDefinitions.set(hash, def);
              }
            }

            fileMermaidHashes.set(filePath, currentHashes);

            if (newDefinitions.size > 0) {
              const rendered = await renderer.renderBatch(newDefinitions);
              for (const [hash, data] of rendered) {
                mermaidSvgData[hash] = data;
              }

              // Update remark cache with all known SVGs
              const svgMap = new Map(Object.entries(mermaidSvgData));
              setPreRenderedMermaidSvgs(svgMap);

              // Invalidate virtual module
              const mermaidMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MERMAID_SVGS);
              if (mermaidMod) server.moduleGraph.invalidateModule(mermaidMod);
            }
          } catch (err) {
            console.warn('  Mermaid incremental render failed:', err instanceof Error ? err.message : err);
          }
        });
      }

      server.watcher.on('all', (event, path) => {
        const isChangelog = path === changelogPath;
        const isInSection = visibleSections.some((s) => path.startsWith(s.docsDir));
        if (!isChangelog && !isInSection) return;
        if (!path.endsWith('.md') && !path.endsWith('.mdx')) return;

        if (event === 'add' || event === 'unlink' || event === 'change') {
          refreshDocs().then(() => {
            const routesMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES);
            const navMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_NAVIGATION);
            const searchMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_SEARCH_INDEX);
            if (routesMod) server.moduleGraph.invalidateModule(routesMod);
            if (navMod) server.moduleGraph.invalidateModule(navMod);
            if (searchMod) server.moduleGraph.invalidateModule(searchMod);

            server.ws.send({ type: 'full-reload' });
          });
        }
      });

      // Return post-middleware for SPA fallback on all known route prefixes.
      // This runs after Vite's built-in static file handling, ensuring that
      // direct navigation / page refresh on deep links (e.g. /api, /internal/*)
      // serves the SPA index.html so React Router can handle them client-side.
      return () => {
        server.middlewares.use((req, _res, next) => {
          if (req.method !== 'GET' || !req.headers.accept?.includes('text/html')) {
            return next();
          }
          const url = req.url?.split('?')[0] ?? '';

          // Check section basePaths (skip root "/" to avoid catching everything)
          const sectionMatch = visibleSections.some(
            (s) => s.basePath !== '/' && url.startsWith(s.basePath)
          );

          // Check OpenAPI basePath
          const apiBasePath = config.openapi?.basePath ?? '/api';
          const apiMatch = config.openapi?.spec && url.startsWith(apiBasePath);

          if (sectionMatch || apiMatch) {
            req.url = '/index.html';
          }

          next();
        });
      };
    },
  };

  const headInjectionPlugin: Plugin = {
    name: 'clearify-head-injection',
    transformIndexHtml(html) {
      const tags: string[] = [];

      if (config.customCss) {
        const cssPath = resolve(userRoot, config.customCss);
        // In dev, Vite serves files from the FS; use /@fs/ prefix for absolute paths
        const href = `/@fs/${cssPath}`;
        tags.push(`<link rel="stylesheet" href="${href}" />`);
      }

      if (config.headTags && config.headTags.length > 0) {
        tags.push(...config.headTags);
      }

      if (tags.length === 0) return html;

      // Inject before closing </head>
      return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
    },
  };

  return [mainPlugin, headInjectionPlugin];
}
