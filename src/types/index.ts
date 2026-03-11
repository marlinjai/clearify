export interface RemoteGitSource {
  repo: string;
  ref?: string;
  path?: string;
  sparse?: boolean;
}

export interface SectionConfig {
  label: string;
  docsDir: string;
  basePath?: string;
  draft?: boolean;
  sitemap?: boolean;
  exclude?: string[];
  git?: RemoteGitSource;
}

export interface ResolvedSection {
  id: string;
  label: string;
  docsDir: string;
  basePath: string;
  draft: boolean;
  sitemap: boolean;
  exclude: string[];
}

export interface SectionNavigation {
  id: string;
  label: string;
  basePath: string;
  navigation: NavigationItem[];
}

export interface ClearifyConfig {
  name: string;
  docsDir: string;
  outDir: string;
  port: number;
  siteUrl?: string;
  sections?: SectionConfig[];
  theme: {
    primaryColor: string;
    mode: 'light' | 'dark' | 'auto';
  };
  logo?: {
    light?: string;
    dark?: string;
  };
  navigation?: NavigationItem[] | null;
  exclude?: string[];
  mermaid?: {
    strategy?: 'client' | 'build';
  };
  openapi?: {
    spec: string;
    basePath?: string;
    generatePages?: boolean;
  };
  links?: {
    github?: string;
    [key: string]: string | undefined;
  };
  hub?: HubConfig;
  hubProject?: Omit<HubProject, 'name'>;
  customCss?: string;
  headTags?: string[];
  includeReadme?: boolean;
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon?: string;
  badge?: string;
  badgeColor?: string;
  children?: NavigationItem[];
}

export type DocCategory = 'documentation' | 'internal' | 'plan' | 'research' | 'decision' | 'roadmap' | 'changelog';

export interface PageFrontmatter {
  title?: string;
  description?: string;
  icon?: string;
  order?: number;
  summary?: string;
  category?: DocCategory;
  tags?: string[];
  projects?: string[];
  status?: 'active' | 'superseded' | 'archived';
  date?: string;
}

export interface RouteEntry {
  path: string;
  filePath: string;
  frontmatter: PageFrontmatter;
  sectionId?: string;
  componentPath?: string;
  redirectTo?: string;
}

export interface HubProject {
  name: string;
  description: string;
  href?: string;
  repo?: string;
  status?: 'active' | 'beta' | 'planned' | 'deprecated';
  icon?: string;
  tags?: string[];
  group?: string;
  hubUrl?: string;
  hubName?: string;
  mode?: 'link' | 'embed' | 'inject';
  git?: RemoteGitSource;
  embedSections?: 'all' | 'public' | string[];
  injectInto?: string;
  docsPath?: string;
}

export interface HubConfig {
  projects: HubProject[];
  scan?: string;
  cacheDir?: string;
}

/** Tier 1+2 fields that can live in clearify.data.json for visual editing. */
export interface ClearifyDataConfig {
  name?: string;
  siteUrl?: string;
  theme?: {
    primaryColor?: string;
    mode?: 'light' | 'dark' | 'auto';
  };
  logo?: {
    light?: string;
    dark?: string;
  };
  links?: {
    github?: string;
    [key: string]: string | undefined;
  };
  sections?: SectionConfig[];
  hub?: HubConfig;
}

export function defineConfig(config: Partial<ClearifyConfig>): Partial<ClearifyConfig> {
  return config;
}
