import { describe, it, expect } from 'vitest';
import { generateLlmsTxt, generateLlmsFullTxt, type LlmsDocEntry } from './llms-txt.js';
import type { ClearifyConfig } from '../types/index.js';

function baseConfig(overrides: Partial<ClearifyConfig> = {}): ClearifyConfig {
  return {
    name: 'Acme Docs',
    docsDir: './docs',
    outDir: './docs-dist',
    port: 4747,
    siteUrl: 'https://docs.acme.example',
    theme: { primaryColor: '#3B82F6', mode: 'auto' },
    navigation: null,
    hubProject: {
      description: 'Everything you need to ship Acme.',
      status: 'active',
    },
    ...overrides,
  } as ClearifyConfig;
}

describe('generateLlmsTxt', () => {
  it('emits a minimal header when docs is empty', () => {
    const config = baseConfig();
    const out = generateLlmsTxt(config, []);

    expect(out).toContain('# Acme Docs');
    expect(out).toContain('> Everything you need to ship Acme.');
    // No section H2s when no docs.
    expect(out).not.toContain('## ');
  });

  it('falls back to a generic tagline when no description is set', () => {
    const config = baseConfig({ hubProject: undefined });
    const out = generateLlmsTxt(config, []);
    expect(out).toContain('> Documentation for Acme Docs.');
  });

  it('renders three pages grouped by section with absolute URLs', () => {
    const docs: LlmsDocEntry[] = [
      {
        title: 'Getting Started',
        routePath: '/getting-started',
        sectionLabel: 'Documentation',
        markdown:
          '---\ntitle: Getting Started\n---\n\n# Getting Started\n\nInstall the package and run dev.\n',
      },
      {
        title: 'Configuration',
        routePath: '/configuration',
        sectionLabel: 'Documentation',
        markdown:
          '---\ntitle: Configuration\n---\n\n# Configuration\n\nAll the options.\n',
      },
      {
        title: 'Admin Panel',
        routePath: '/internal/admin',
        sectionLabel: 'Internal',
        markdown:
          '---\ntitle: Admin Panel\n---\n\n# Admin Panel\n\nThe admin panel manages content.\n',
      },
    ];
    const out = generateLlmsTxt(baseConfig(), docs);

    expect(out).toContain('## Documentation');
    expect(out).toContain('## Internal');
    expect(out).toContain(
      '- [Getting Started](https://docs.acme.example/getting-started): Install the package and run dev.',
    );
    expect(out).toContain(
      '- [Configuration](https://docs.acme.example/configuration): All the options.',
    );
    expect(out).toContain(
      '- [Admin Panel](https://docs.acme.example/internal/admin): The admin panel manages content.',
    );
  });

  it('produces absolute URLs without double slashes or missing protocols', () => {
    const docs: LlmsDocEntry[] = [
      {
        title: 'Root',
        routePath: '/',
        sectionLabel: 'Documentation',
        markdown: '# Root\n\nLanding page.\n',
      },
    ];
    const out = generateLlmsTxt(
      baseConfig({ siteUrl: 'https://example.com/' }),
      docs,
    );
    // Trailing slash on siteUrl must be stripped, and the route path keeps its /.
    expect(out).toMatch(/\[Root\]\(https:\/\/example\.com\/\)/);
    // No "//" other than the protocol "://".
    const withoutProtocol = out.replace(/https:\/\//g, '');
    expect(withoutProtocol).not.toContain('//');
    // Protocol must be present.
    expect(out).toContain('https://example.com/');
  });

  it('places flagged docs under ## Optional at the end', () => {
    const docs: LlmsDocEntry[] = [
      {
        title: 'Getting Started',
        routePath: '/getting-started',
        sectionLabel: 'Documentation',
        markdown: '# Getting Started\n\nMain guide.\n',
      },
      {
        title: 'Changelog',
        routePath: '/changelog',
        sectionLabel: 'Documentation',
        markdown: '# Changelog\n\nRelease history.\n',
        optional: true,
      },
    ];
    const out = generateLlmsTxt(baseConfig(), docs);
    expect(out).toContain('## Optional');
    expect(out.indexOf('## Documentation')).toBeLessThan(out.indexOf('## Optional'));
    expect(out).toContain(
      '- [Changelog](https://docs.acme.example/changelog): Release history.',
    );
  });

  it('falls back to frontmatter summary when the body has no prose', () => {
    const docs: LlmsDocEntry[] = [
      {
        title: 'Reference',
        routePath: '/ref',
        sectionLabel: 'Documentation',
        markdown:
          '---\nsummary: API reference table.\n---\n\n# Reference\n\n| col | val |\n|-----|-----|\n| a | 1 |\n',
      },
    ];
    const out = generateLlmsTxt(baseConfig(), docs);
    expect(out).toContain('- [Reference](https://docs.acme.example/ref): API reference table.');
  });
});

describe('generateLlmsFullTxt', () => {
  it('includes the full markdown body of each page with a Source line', () => {
    const docs: LlmsDocEntry[] = [
      {
        title: 'Getting Started',
        routePath: '/getting-started',
        sectionLabel: 'Documentation',
        markdown:
          '---\ntitle: Getting Started\n---\n\n# Getting Started\n\nFirst, install.\n\nSecond, run dev.\n',
      },
      {
        title: 'Configuration',
        routePath: '/configuration',
        sectionLabel: 'Documentation',
        markdown:
          '---\ntitle: Configuration\n---\n\n# Configuration\n\nEvery option explained.\n',
      },
    ];
    const out = generateLlmsFullTxt(baseConfig(), docs);

    expect(out).toContain('# Acme Docs');
    expect(out).toContain('## Getting Started');
    expect(out).toContain('Source: https://docs.acme.example/getting-started');
    expect(out).toContain('First, install.');
    expect(out).toContain('Second, run dev.');
    expect(out).toContain('## Configuration');
    expect(out).toContain('Source: https://docs.acme.example/configuration');
    expect(out).toContain('Every option explained.');
    // The leading H1 from each page must be stripped so the section H2 is the only heading.
    expect(out).not.toMatch(/## Getting Started\s*\n\nSource:[^\n]+\n\n# Getting Started/);
  });

  it('handles markdown without frontmatter', () => {
    const docs: LlmsDocEntry[] = [
      {
        title: 'Raw',
        routePath: '/raw',
        sectionLabel: 'Documentation',
        markdown: 'Just a paragraph. No heading.',
      },
    ];
    const out = generateLlmsFullTxt(baseConfig(), docs);
    expect(out).toContain('## Raw');
    expect(out).toContain('Just a paragraph. No heading.');
  });
});
