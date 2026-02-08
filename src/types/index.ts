export interface ClearifyConfig {
  name: string;
  docsDir: string;
  outDir: string;
  port: number;
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
  links?: {
    github?: string;
    [key: string]: string | undefined;
  };
}

export interface NavigationItem {
  label: string;
  path?: string;
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
}

export function defineConfig(config: Partial<ClearifyConfig>): Partial<ClearifyConfig> {
  return config;
}
