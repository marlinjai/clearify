import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { resolve } from 'path';
import { existsSync } from 'fs';
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

export function clearifyPlugin(options: { root?: string } = {}): Plugin[] {
  let config: ClearifyConfig;
  let userRoot: string;
  let resolvedViteConfig: ResolvedConfig;
  let visibleSections: ResolvedSection[];
  let sectionDataList: SectionData[];
  let allRoutes: RouteEntry[];
  let allSectionNavigations: SectionNavigation[];
  let allSearchEntries: SearchEntry[];

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

  return [mainPlugin];
}
