import { describe, it, expect } from 'vitest';
import { inferDocType } from './navigation.js';
import { VALID_TYPES, VALID_STATUSES } from '../node/check.js';
import type { DocType, DocStatus } from '../types/index.js';

// Vocabulary contract: knowledge-base/standards/document-lifecycle.md.
// These tests pin Clearify to the shared `type` + 6-status model and guard the
// path-inference fallback rules, including the `handover` type.

describe('inferDocType (path-based type inference)', () => {
  it('infers readme from the filename', () => {
    expect(inferDocType('/repo/README.md')).toBe('readme');
    expect(inferDocType('/repo/docs/readme.mdx')).toBe('readme');
  });

  it('infers changelog from changelog/changes filenames', () => {
    expect(inferDocType('/repo/CHANGELOG.md')).toBe('changelog');
    expect(inferDocType('/repo/CHANGES.md')).toBe('changelog');
  });

  it('infers roadmap from the filename', () => {
    expect(inferDocType('/repo/ROADMAP.md')).toBe('roadmap');
  });

  it('infers handover from a *handover* filename', () => {
    expect(inferDocType('/repo/docs/2026-06-07-session-handover.md')).toBe('handover');
    expect(inferDocType('/repo/SESSION-RECOVERY-handover.md')).toBe('handover');
  });

  it('infers handover from a /handovers/ directory', () => {
    expect(inferDocType('/repo/docs/handovers/2026-06-07-resume.md')).toBe('handover');
  });

  it('infers plan from pre-implementation directories', () => {
    expect(inferDocType('/repo/docs/plans/feature-x.md')).toBe('plan');
    expect(inferDocType('/repo/docs/specs/api.md')).toBe('plan');
    expect(inferDocType('/repo/docs/research/spike.md')).toBe('plan');
    expect(inferDocType('/repo/docs/decisions/0001.md')).toBe('plan');
    expect(inferDocType('/repo/superpowers/idea.md')).toBe('plan');
  });

  it('falls back to documentation for public/internal/default paths', () => {
    expect(inferDocType('/repo/docs/public/getting-started.md')).toBe('documentation');
    expect(inferDocType('/repo/docs/internal/notes.md')).toBe('documentation');
    expect(inferDocType('/repo/docs/whatever.md')).toBe('documentation');
  });

  it('handles Windows-style separators', () => {
    expect(inferDocType('C:\\repo\\docs\\plans\\x.md')).toBe('plan');
    expect(inferDocType('C:\\repo\\README.md')).toBe('readme');
  });

  it('only returns values from the shared type vocabulary', () => {
    const sampled: DocType | undefined = inferDocType('/repo/docs/public/x.md');
    expect(sampled).toBeDefined();
    expect(VALID_TYPES).toContain(sampled);
  });
});

describe('shared vocabulary constants', () => {
  it('VALID_TYPES matches the standard (readme/documentation/plan/roadmap/changelog/handover)', () => {
    expect(VALID_TYPES).toEqual([
      'readme',
      'documentation',
      'plan',
      'roadmap',
      'changelog',
      'handover',
    ]);
  });

  it('VALID_STATUSES is the 6-value plan lifecycle (draft..rejected)', () => {
    const expected: DocStatus[] = [
      'draft',
      'decided',
      'in-progress',
      'completed',
      'archived',
      'rejected',
    ];
    expect(VALID_STATUSES).toEqual(expected);
  });

  it('no longer carries the legacy 3-status values', () => {
    expect(VALID_STATUSES as string[]).not.toContain('active');
    expect(VALID_STATUSES as string[]).not.toContain('superseded');
  });
});
