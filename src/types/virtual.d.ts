declare module 'virtual:clearify/config' {
  import type { ClearifyConfig } from './index.js';
  const config: ClearifyConfig;
  export default config;
}

declare module 'virtual:clearify/routes' {
  import type { PageFrontmatter } from './index.js';
  interface Route {
    path: string;
    component: () => Promise<any>;
    frontmatter: PageFrontmatter;
  }
  const routes: Route[];
  export default routes;
}

declare module 'virtual:clearify/navigation' {
  import type { SectionNavigation } from './index.js';
  const navigation: SectionNavigation[];
  export default navigation;
}

declare module 'virtual:clearify/search-index' {
  interface SearchEntry {
    id: number;
    title: string;
    path: string;
    content: string;
  }
  const entries: SearchEntry[];
  export default entries;
}

declare module 'virtual:clearify/mermaid-svgs' {
  const svgs: Record<string, { lightSvg: string; darkSvg: string }>;
  export default svgs;
}
