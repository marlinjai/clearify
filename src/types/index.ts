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
  /**
   * When true (default), `clearify build` writes `llms.txt` and
   * `llms-full.txt` into the output directory for AI agents and crawlers.
   * Requires `siteUrl` to be set. Set to `false` to skip generation.
   */
  generateLlmsTxt?: boolean;
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon?: string;
  badge?: string;
  badgeColor?: string;
  children?: NavigationItem[];
}

/**
 * Document type vocabulary. Source of truth:
 * knowledge-base/standards/document-lifecycle.md (the single contract both
 * the Session Dashboard and Clearify read). Keep this union in sync with the
 * "Type" table in that standard. `category` (the legacy field) and its values
 * (`internal`, `research`, `decision`) were reconciled away in favor of `type`.
 */
export type DocType =
  | 'readme'
  | 'documentation'
  | 'plan'
  | 'roadmap'
  | 'changelog'
  | 'handover';

/**
 * Document status vocabulary. Source of truth:
 * knowledge-base/standards/document-lifecycle.md.
 *
 * For `type: plan` this tracks the workflow lifecycle (all six values).
 * For `type: documentation` only `draft` is meaningful (omitted = published).
 * Status is optional on every type and a missing status is never filtered.
 */
export type DocStatus =
  | 'draft'
  | 'decided'
  | 'in-progress'
  | 'completed'
  | 'archived'
  | 'rejected';

export interface PageFrontmatter {
  title?: string;
  description?: string;
  icon?: string;
  order?: number;
  summary?: string;
  /** See {@link DocType}. Inferred from path when omitted. */
  type?: DocType;
  tags?: string[];
  projects?: string[];
  /** See {@link DocStatus}. Missing status is treated as unset (not filtered). */
  status?: DocStatus;
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
