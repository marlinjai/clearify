import { describe, it, expect } from 'vitest';
import { ClearifyDataSchema } from './config.js';

describe('ClearifyDataSchema: hub project source+placement', () => {
  it('accepts source:none + placement:card', () => {
    const data = {
      hub: {
        projects: [
          {
            name: 'A',
            description: 'd',
            source: { kind: 'none' },
            placement: { kind: 'card', href: 'https://a' },
          },
        ],
      },
    };
    const parsed = ClearifyDataSchema.parse(data);
    const p = parsed.hub!.projects[0];
    expect(p.source.kind).toBe('none');
    expect(p.placement.kind).toBe('card');
  });

  it('accepts source:git + placement:tab with default sections', () => {
    const data = {
      hub: {
        projects: [
          {
            name: 'B',
            description: 'd',
            source: { kind: 'git', repo: 'https://example.com/r.git', ref: 'main', path: 'docs/public' },
            placement: { kind: 'tab' },
          },
        ],
      },
    };
    const parsed = ClearifyDataSchema.parse(data);
    const p = parsed.hub!.projects[0];
    expect(p.source).toMatchObject({ kind: 'git', repo: 'https://example.com/r.git' });
    expect(p.placement.kind).toBe('tab');
  });

  it('accepts source:git + placement:tab with sections:all', () => {
    const data = {
      hub: {
        projects: [
          {
            name: 'C',
            description: 'd',
            source: { kind: 'git', repo: 'https://example.com/r.git' },
            placement: { kind: 'tab', sections: 'all' },
          },
        ],
      },
    };
    const parsed = ClearifyDataSchema.parse(data);
    const placement = parsed.hub!.projects[0].placement;
    if (placement.kind !== 'tab') throw new Error('expected tab');
    expect(placement.sections).toBe('all');
  });

  it('accepts source:git + placement:nested with into + docsPath', () => {
    const data = {
      hub: {
        projects: [
          {
            name: 'D',
            description: 'd',
            source: { kind: 'git', repo: 'https://example.com/r.git' },
            placement: { kind: 'nested', into: 'architecture', docsPath: 'docs', group: 'Services' },
          },
        ],
      },
    };
    const parsed = ClearifyDataSchema.parse(data);
    const placement = parsed.hub!.projects[0].placement;
    if (placement.kind !== 'nested') throw new Error('expected nested');
    expect(placement.into).toBe('architecture');
    expect(placement.docsPath).toBe('docs');
    expect(placement.group).toBe('Services');
  });

  it('accepts source:url (reserved, typed only)', () => {
    const data = {
      hub: {
        projects: [
          {
            name: 'E',
            description: 'd',
            source: { kind: 'url', url: 'https://example.com/spec.json' },
            placement: { kind: 'card', href: 'https://example.com' },
          },
        ],
      },
    };
    const parsed = ClearifyDataSchema.parse(data);
    expect(parsed.hub!.projects[0].source.kind).toBe('url');
  });

  it('accepts source:inline (reserved, typed only)', () => {
    const data = {
      hub: {
        projects: [
          {
            name: 'F',
            description: 'd',
            source: { kind: 'inline', markdown: '# hi' },
            placement: { kind: 'card', href: 'https://example.com' },
          },
        ],
      },
    };
    const parsed = ClearifyDataSchema.parse(data);
    expect(parsed.hub!.projects[0].source.kind).toBe('inline');
  });

  it('rejects a project missing source or placement', () => {
    expect(() =>
      ClearifyDataSchema.parse({
        hub: { projects: [{ name: 'x', description: 'd' }] },
      }),
    ).toThrow();
  });

  it('rejects a placement:card without href', () => {
    expect(() =>
      ClearifyDataSchema.parse({
        hub: {
          projects: [
            {
              name: 'x',
              description: 'd',
              source: { kind: 'none' },
              placement: { kind: 'card' },
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('rejects a source:git without repo', () => {
    expect(() =>
      ClearifyDataSchema.parse({
        hub: {
          projects: [
            {
              name: 'x',
              description: 'd',
              source: { kind: 'git' },
              placement: { kind: 'tab' },
            },
          ],
        },
      }),
    ).toThrow();
  });
});
