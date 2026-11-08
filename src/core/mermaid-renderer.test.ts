import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MermaidRenderer, type RenderedMermaid } from './mermaid-renderer.js';

// A render needs a real browser (puppeteer 25, our dev dependency) and
// loads mermaid from the CDN, so it takes longer than unit tests.
const RENDER_TIMEOUT = 90_000;

let renderer: MermaidRenderer | null = null;

afterAll(async () => {
  if (renderer) {
    await renderer.close();
    renderer = null;
  }
});

describe('MermaidRenderer (puppeteer build-time render)', () => {
  it('renders a flow diagram to light and dark SVG via the real browser', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'mermaid-renderer-test-'));
    renderer = new MermaidRenderer({ cacheDir });
    await renderer.launch();

    const definition = [
      'graph TD',
      '  A[Start] --> B{Decision}',
      '  B -->|Yes| C[Do it]',
      '  B -->|No| D[Stop]',
    ].join('\n');

    const out: RenderedMermaid = await renderer.render(definition);

    expect(out.lightSvg).toContain('<svg');
    expect(out.darkSvg).toContain('<svg');
    expect(out.lightSvg).toContain('flowchart');
    expect(out.darkSvg.length).toBeGreaterThan(0);
  }, RENDER_TIMEOUT);
});
