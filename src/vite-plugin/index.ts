import type { Plugin, ViteDevServer } from 'vite';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import matter from 'gray-matter';
import { loadUserConfig, resolveConfig } from '../core/config.js';
import { scanDocs, buildNavigation, buildRoutes, type DocFile } from '../core/navigation.js';
import { buildSearchIndex, type SearchEntry } from '../core/search.js';
import type { ClearifyConfig, RouteEntry, NavigationItem } from '../types/index.js';

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
  let docs: DocFile[];
  let routes: RouteEntry[];
  let navigation: NavigationItem[];
  let searchIndex: SearchEntry[];
  let docsDir: string;
  let userRoot: string;

  function refreshDocs() {
    docs = scanDocs(docsDir, config.exclude);

    // Auto-detect CHANGELOG.md at project root
    const changelogPath = resolve(userRoot, 'CHANGELOG.md');
    if (existsSync(changelogPath)) {
      const content = readFileSync(changelogPath, 'utf-8');
      const { data } = matter(content);
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

    routes = buildRoutes(docs);
    navigation = config.navigation ?? buildNavigation(docs);
    searchIndex = buildSearchIndex(docs);
  }

  function generateRoutesCode(): string {
    const imports: string[] = [];
    const routeEntries: string[] = [];

    routes.forEach((route, i) => {
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

    async configResolved() {
      userRoot = options.root ?? process.cwd();
      const userConfig = await loadUserConfig(userRoot);
      config = resolveConfig(userConfig, userRoot);
      docsDir = resolve(userRoot, config.docsDir);
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
        return `export default ${JSON.stringify(navigation)};`;
      }
      if (id === RESOLVED_VIRTUAL_SEARCH_INDEX) {
        return `export default ${JSON.stringify(searchIndex)};`;
      }
      return null;
    },

    configureServer(server: ViteDevServer) {
      server.watcher.add(docsDir);

      // Also watch CHANGELOG.md at project root
      const changelogPath = resolve(userRoot, 'CHANGELOG.md');
      if (existsSync(changelogPath)) {
        server.watcher.add(changelogPath);
      }

      server.watcher.on('all', (event, path) => {
        const isChangelog = path === changelogPath;
        if (!isChangelog && !path.startsWith(docsDir)) return;
        if (!path.endsWith('.md') && !path.endsWith('.mdx')) return;

        if (event === 'add' || event === 'unlink' || event === 'change') {
          refreshDocs();
          const routesMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES);
          const navMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_NAVIGATION);
          const searchMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_SEARCH_INDEX);
          if (routesMod) server.moduleGraph.invalidateModule(routesMod);
          if (navMod) server.moduleGraph.invalidateModule(navMod);
          if (searchMod) server.moduleGraph.invalidateModule(searchMod);

          if (event === 'add' || event === 'unlink') {
            server.ws.send({ type: 'full-reload' });
          }
        }
      });
    },
  };

  return [mainPlugin];
}
