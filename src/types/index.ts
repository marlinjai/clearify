export interface SectionConfig {
  label: string;
  docsDir: string;
  basePath?: string;
  draft?: boolean;
  sitemap?: boolean;
  exclude?: string[];
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
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon?: string;
  badge?: string;
  badgeColor?: string;
  children?: NavigationItem[];
}

export interface PageFrontmatter {
  title?: string;
  description?: string;
  icon?: string;
  order?: number;
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
}

export interface HubConfig {
  projects: HubProject[];
  scan?: string;
}

export function defineConfig(config: Partial<ClearifyConfig>): Partial<ClearifyConfig> {
  return config;
}
