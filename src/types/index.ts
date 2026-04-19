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
  hubProject?: HubProjectPartial;
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

/**
 * Where a hub project's content comes from.
 *
 * `none`: no content pulled, card links out only.
 * `git`: sparse-clone a repo subdirectory.
 * `url`: reserved for future remote-docs fetch, not implemented.
 * `inline`: reserved for future inline markdown, not implemented.
 */
export type HubProjectSource =
  | { kind: 'none' }
  | {
      kind: 'git';
      repo: string;
      /** branch, tag, or SHA. Default: 'main' */
      ref?: string;
      /** subdirectory to sparse-checkout. Default: 'docs/public' */
      path?: string;
      /** defaults to true when path is set */
      sparse?: boolean;
    }
  | { kind: 'url'; url: string }
  | { kind: 'inline'; markdown: string };

/**
 * How a hub project shows up in the hub UI.
 *
 * `card`: grid entry that links to an external href.
 * `tab`: full tab in the hub nav, rendering the cloned sections.
 * `nested`: folded into an existing hub section as a subfolder.
 */
export type HubProjectPlacement =
  | { kind: 'card'; href: string }
  | { kind: 'tab'; sections?: 'all' | 'public' | string[] }
  | { kind: 'nested'; into: string; docsPath?: string; group?: string };

export interface HubProject {
  name: string;
  description: string;
  repo?: string;
  status?: 'active' | 'beta' | 'planned' | 'deprecated';
  icon?: string;
  tags?: string[];
  group?: string;
  hubUrl?: string;
  hubName?: string;
  source: HubProjectSource;
  placement: HubProjectPlacement;
}

/**
 * The subset of HubProject fields a sub-project can declare about itself in
 * `clearify.config.ts`. The hub scanner composes this with the sub-project's
 * `siteUrl` and assigns `source` + `placement` on its own side.
 */
export interface HubProjectPartial {
  description: string;
  repo?: string;
  status?: 'active' | 'beta' | 'planned' | 'deprecated';
  icon?: string;
  tags?: string[];
  group?: string;
  /** URL of the parent hub site, used by the Sidebar back-link. */
  hubUrl?: string;
  /** Display name for the Sidebar back-link. Default: 'Hub'. */
  hubName?: string;
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
