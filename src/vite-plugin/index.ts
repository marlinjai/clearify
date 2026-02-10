import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { loadUserConfig, resolveConfig, resolveSections } from '../core/config.js';
import { buildSectionData, type SectionData } from '../core/navigation.js';
import type { ClearifyConfig, ResolvedSection, RouteEntry, SectionNavigation } from '../types/index.js';
import type { SearchEntry } from '../core/search.js';

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

  function refreshDocs() {
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
  }

  function generateRoutesCode(): string {
    const imports: string[] = [];
    const routeEntries: string[] = [];

    allRoutes.forEach((route, i) => {
      const varName = `Route${i}`;
      imports.push(`const ${varName} = () => import(/* @vite-ignore */ '${route.filePath}');`);
      routeEntries.push(
        `  { path: ${JSON.stringify(route.path)}, component: ${varName}, frontmatter: ${JSON.stringify(route.frontmatter)} }`
      );
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

  function loadOpenAPISpec(): string {
    const specPath = config.openapi?.spec;
    if (!specPath) {
      return 'export default null;';
    }

    const resolvedPath = resolve(userRoot, specPath);
    if (!existsSync(resolvedPath)) {
      console.warn(`  OpenAPI spec not found: ${resolvedPath}`);
      return 'export default null;';
    }

    try {
      const content = readFileSync(resolvedPath, 'utf-8');
      const isYaml = /\.ya?ml$/i.test(resolvedPath);

      if (isYaml) {
        // For YAML specs, export the raw string — Scalar parses YAML natively
        return `export default ${JSON.stringify(content)};`;
      }

      // For JSON specs, validate and export as a parsed object
      JSON.parse(content);
      return `export default ${content};`;
    } catch (err) {
      console.warn(`  Failed to load OpenAPI spec: ${resolvedPath}`, err instanceof Error ? err.message : err);
      return 'export default null;';
    }
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

      refreshDocs();
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

    load(id) {
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
        return loadOpenAPISpec();
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
            const specMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_OPENAPI_SPEC);
            if (specMod) server.moduleGraph.invalidateModule(specMod);
            server.ws.send({ type: 'full-reload' });
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
          refreshDocs();
          const routesMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES);
          const navMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_NAVIGATION);
          const searchMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_SEARCH_INDEX);
          if (routesMod) server.moduleGraph.invalidateModule(routesMod);
          if (navMod) server.moduleGraph.invalidateModule(navMod);
          if (searchMod) server.moduleGraph.invalidateModule(searchMod);

          server.ws.send({ type: 'full-reload' });
        }
      });
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
