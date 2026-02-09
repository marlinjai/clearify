import { resolve } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { mermaidContentHash } from './mermaid-utils.js';

export interface RenderedMermaid {
  lightSvg: string;
  darkSvg: string;
}

export class MermaidRenderer {
  private cacheDir: string;
  private browser: any = null;
  private page: any = null;

  constructor(options: { cacheDir: string }) {
    this.cacheDir = options.cacheDir;
    mkdirSync(this.cacheDir, { recursive: true });
  }

  async launch(): Promise<void> {
    const puppeteer = await MermaidRenderer.loadPuppeteer();
    this.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    this.page = await this.browser.newPage();
    // Load mermaid into the page once
    await this.page.setContent(`
      <!DOCTYPE html>
      <html><head></head><body>
        <div id="container"></div>
        <script type="module">
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
          window.__mermaid = mermaid;
          window.__mermaidReady = true;
        </script>
      </body></html>
    `);
    await this.page.waitForFunction('window.__mermaidReady === true', { timeout: 30000 });
  }

  async render(definition: string): Promise<RenderedMermaid> {
    const hash = mermaidContentHash(definition);
    const cached = this.readCache(hash);
    if (cached) return cached;

    if (!this.page) {
      throw new Error('MermaidRenderer not launched. Call launch() first.');
    }

    const lightSvg = await this.renderWithTheme(definition, 'default', `light-${hash}`);
    const darkSvg = await this.renderWithTheme(definition, 'dark', `dark-${hash}`);

    const result: RenderedMermaid = { lightSvg, darkSvg };
    this.writeCache(hash, result);
    return result;
  }

  async renderBatch(definitions: Map<string, string>): Promise<Map<string, RenderedMermaid>> {
    const results = new Map<string, RenderedMermaid>();

    // Check cache first, collect uncached
    const uncached = new Map<string, string>();
    for (const [hash, definition] of definitions) {
      const cached = this.readCache(hash);
      if (cached) {
        results.set(hash, cached);
      } else {
        uncached.set(hash, definition);
      }
    }

    if (uncached.size === 0) return results;

    if (!this.page) {
      throw new Error('MermaidRenderer not launched. Call launch() first.');
    }

    for (const [hash, definition] of uncached) {
      try {
        const lightSvg = await this.renderWithTheme(definition, 'default', `light-${hash}`);
        const darkSvg = await this.renderWithTheme(definition, 'dark', `dark-${hash}`);
        const result: RenderedMermaid = { lightSvg, darkSvg };
        this.writeCache(hash, result);
        results.set(hash, result);
      } catch (err) {
        console.warn(`  Warning: Failed to render mermaid diagram (${hash}):`, err instanceof Error ? err.message : err);
      }
    }

    return results;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async renderWithTheme(definition: string, theme: string, id: string): Promise<string> {
    return await this.page.evaluate(
      async (def: string, thm: string, diagId: string) => {
        const mermaid = (window as any).__mermaid;
        mermaid.initialize({ startOnLoad: false, theme: thm, securityLevel: 'loose' });
        const { svg } = await mermaid.render(diagId, def);
        return svg;
      },
      definition,
      theme,
      id
    );
  }

  private readCache(hash: string): RenderedMermaid | null {
    const cachePath = resolve(this.cacheDir, `${hash}.json`);
    if (existsSync(cachePath)) {
      try {
        return JSON.parse(readFileSync(cachePath, 'utf-8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  private writeCache(hash: string, data: RenderedMermaid): void {
    const cachePath = resolve(this.cacheDir, `${hash}.json`);
    writeFileSync(cachePath, JSON.stringify(data));
  }

  private static async loadPuppeteer(): Promise<any> {
    try {
      // Use dynamic string to prevent TypeScript from resolving the module at compile time
      const moduleName = 'puppeteer';
      return await import(/* @vite-ignore */ moduleName);
    } catch {
      throw new Error(
        'Puppeteer is required for mermaid build-time rendering.\n' +
        'Install it with: npm install puppeteer\n' +
        'Or set mermaid.strategy to "client" in your clearify config.'
      );
    }
  }
}
