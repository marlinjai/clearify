import { describe, it, expect } from 'vitest';
import { migrateProject, migrateDocument } from './migrate-hub-schema.mjs';

describe('migrateProject', () => {
  it('migrates legacy mode=link to source:none + placement:card', () => {
    const legacy = {
      name: 'Acme',
      description: 'External docs',
      mode: 'link',
      href: 'https://example.com',
      status: 'active',
      icon: 'book',
      tags: ['api'],
      group: 'External',
    };
    const next = migrateProject(legacy);
    expect(next).toEqual({
      name: 'Acme',
      description: 'External docs',
      status: 'active',
      icon: 'book',
      tags: ['api'],
      group: 'External',
      source: { kind: 'none' },
      placement: { kind: 'card', href: 'https://example.com' },
    });
  });

  it('migrates legacy mode=embed to source:git + placement:tab', () => {
    const legacy = {
      name: 'Storage Brain',
      description: 'Storage service',
      mode: 'embed',
      git: { repo: 'https://github.com/org/repo.git', ref: 'main', path: 'docs/public' },
      embedSections: 'public',
      status: 'active',
    };
    const next = migrateProject(legacy);
    expect(next).toEqual({
      name: 'Storage Brain',
      description: 'Storage service',
      status: 'active',
      source: {
        kind: 'git',
        repo: 'https://github.com/org/repo.git',
        ref: 'main',
        path: 'docs/public',
      },
      placement: { kind: 'tab', sections: 'public' },
    });
  });

  it('migrates legacy mode=inject to source:git + placement:nested', () => {
    const legacy = {
      name: 'Brain Core',
      description: 'Shared infra',
      mode: 'inject',
      git: { repo: 'https://github.com/org/brain-core.git' },
      injectInto: 'architecture',
      docsPath: 'docs',
      group: 'Services',
    };
    const next = migrateProject(legacy);
    expect(next).toEqual({
      name: 'Brain Core',
      description: 'Shared infra',
      group: 'Services',
      source: {
        kind: 'git',
        repo: 'https://github.com/org/brain-core.git',
      },
      placement: { kind: 'nested', into: 'architecture', docsPath: 'docs', group: 'Services' },
    });
  });

  it('infers mode=embed when git is present but mode is missing', () => {
    const legacy = {
      name: 'Repo',
      description: 'd',
      git: { repo: 'https://example.com/r.git' },
    };
    const next = migrateProject(legacy);
    expect(next.source.kind).toBe('git');
    expect(next.placement.kind).toBe('tab');
  });

  it('is idempotent: entries already in new shape pass through unchanged', () => {
    const already = {
      name: 'X',
      description: 'd',
      source: { kind: 'none' },
      placement: { kind: 'card', href: 'https://x' },
    };
    const next = migrateProject(already);
    expect(next).toBe(already);
  });
});

describe('migrateDocument', () => {
  it('returns changed=false for a document already in new shape', () => {
    const doc = {
      name: 'Hub',
      hub: {
        projects: [
          {
            name: 'A',
            description: 'a',
            source: { kind: 'none' },
            placement: { kind: 'card', href: 'https://a' },
          },
        ],
      },
    };
    const { changed } = migrateDocument(doc);
    expect(changed).toBe(false);
  });

  it('migrates a legacy document and reports changed=true', () => {
    const doc = {
      name: 'Hub',
      hub: {
        projects: [
          { name: 'A', description: 'a', mode: 'link', href: 'https://a' },
          {
            name: 'B',
            description: 'b',
            mode: 'embed',
            git: { repo: 'https://github.com/x/y.git' },
          },
        ],
      },
    };
    const { data, changed } = migrateDocument(doc);
    expect(changed).toBe(true);
    expect(data.hub.projects[0].placement.kind).toBe('card');
    expect(data.hub.projects[1].source.kind).toBe('git');
    expect(data.hub.projects[1].placement.kind).toBe('tab');
  });

  it('handles documents with no hub.projects', () => {
    const doc = { name: 'Hub' };
    const { data, changed } = migrateDocument(doc);
    expect(changed).toBe(false);
    expect(data).toBe(doc);
  });
});
