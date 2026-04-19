import React, { useEffect, useState, useCallback } from 'react';
import type { HubProject, HubProjectSource, HubProjectPlacement } from '../../types/index.js';
import { Modal } from './components/Modal.js';
import { ConfirmDialog } from './components/ConfirmDialog.js';
import { useToast, ToastContainer } from './components/Toast.js';
import { ConfigPreview } from './components/ConfigPreview.js';

/* ------------------------------------------------------------------ */
/*  Status badge colors                                                */
/* ------------------------------------------------------------------ */
const statusColors: Record<string, { bg: string; text: string }> = {
  active:     { bg: '#16a34a22', text: '#16a34a' },
  beta:       { bg: '#2563eb22', text: '#2563eb' },
  planned:    { bg: '#ca8a0422', text: '#ca8a04' },
  deprecated: { bg: '#dc262622', text: '#dc2626' },
};

/* ------------------------------------------------------------------ */
/*  Draft form shape                                                   */
/* ------------------------------------------------------------------ */
/**
 * The form state carries every field for every kind so the user can flip
 * between kinds without losing input. We clean it to the discriminated-
 * union shape before saving.
 */
interface DraftProject {
  name: string;
  description: string;
  status: 'active' | 'beta' | 'planned' | 'deprecated';
  icon?: string;
  group?: string;
  tags?: string[];
  repo?: string;
  sourceKind: HubProjectSource['kind'];
  gitRepo: string;
  gitRef: string;
  gitPath: string;
  urlUrl: string;
  inlineMarkdown: string;
  placementKind: HubProjectPlacement['kind'];
  cardHref: string;
  tabSections: 'all' | 'public';
  nestedInto: string;
  nestedDocsPath: string;
  nestedGroup: string;
}

function emptyDraft(): DraftProject {
  return {
    name: '',
    description: '',
    status: 'active',
    icon: '',
    group: '',
    tags: [],
    repo: '',
    sourceKind: 'none',
    gitRepo: '',
    gitRef: 'main',
    gitPath: 'docs/public',
    urlUrl: '',
    inlineMarkdown: '',
    placementKind: 'card',
    cardHref: '',
    tabSections: 'public',
    nestedInto: '',
    nestedDocsPath: 'docs',
    nestedGroup: '',
  };
}

function projectToDraft(p: HubProject): DraftProject {
  const d = emptyDraft();
  d.name = p.name;
  d.description = p.description;
  d.status = p.status ?? 'active';
  d.icon = p.icon ?? '';
  d.group = p.group ?? '';
  d.tags = p.tags ? [...p.tags] : [];
  d.repo = p.repo ?? '';

  d.sourceKind = p.source.kind;
  if (p.source.kind === 'git') {
    d.gitRepo = p.source.repo;
    d.gitRef = p.source.ref ?? 'main';
    d.gitPath = p.source.path ?? 'docs/public';
  } else if (p.source.kind === 'url') {
    d.urlUrl = p.source.url;
  } else if (p.source.kind === 'inline') {
    d.inlineMarkdown = p.source.markdown;
  }

  d.placementKind = p.placement.kind;
  if (p.placement.kind === 'card') {
    d.cardHref = p.placement.href;
  } else if (p.placement.kind === 'tab') {
    const s = p.placement.sections;
    d.tabSections = s === 'all' ? 'all' : 'public';
  } else if (p.placement.kind === 'nested') {
    d.nestedInto = p.placement.into;
    d.nestedDocsPath = p.placement.docsPath ?? 'docs';
    d.nestedGroup = p.placement.group ?? '';
  }
  return d;
}

function draftToProject(d: DraftProject): HubProject {
  let source: HubProjectSource;
  if (d.sourceKind === 'git') {
    const g: Extract<HubProjectSource, { kind: 'git' }> = {
      kind: 'git',
      repo: d.gitRepo,
    };
    if (d.gitRef && d.gitRef !== 'main') g.ref = d.gitRef;
    if (d.gitPath) g.path = d.gitPath;
    source = g;
  } else if (d.sourceKind === 'url') {
    source = { kind: 'url', url: d.urlUrl };
  } else if (d.sourceKind === 'inline') {
    source = { kind: 'inline', markdown: d.inlineMarkdown };
  } else {
    source = { kind: 'none' };
  }

  let placement: HubProjectPlacement;
  if (d.placementKind === 'tab') {
    const t: Extract<HubProjectPlacement, { kind: 'tab' }> = { kind: 'tab' };
    if (d.tabSections && d.tabSections !== 'public') t.sections = d.tabSections;
    placement = t;
  } else if (d.placementKind === 'nested') {
    const n: Extract<HubProjectPlacement, { kind: 'nested' }> = {
      kind: 'nested',
      into: d.nestedInto,
    };
    if (d.nestedDocsPath && d.nestedDocsPath !== 'docs') n.docsPath = d.nestedDocsPath;
    if (d.nestedGroup) n.group = d.nestedGroup;
    placement = n;
  } else {
    placement = { kind: 'card', href: d.cardHref };
  }

  const project: HubProject = {
    name: d.name.trim(),
    description: d.description.trim(),
    source,
    placement,
  };
  if (d.status && d.status !== 'active') project.status = d.status;
  if (d.icon) project.icon = d.icon;
  if (d.group) project.group = d.group;
  if (d.tags && d.tags.length > 0) project.tags = d.tags;
  if (d.repo) project.repo = d.repo;
  return project;
}

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--clearify-border)',
  borderRadius: 'var(--clearify-radius-sm)',
  fontSize: '0.875rem',
  backgroundColor: 'var(--clearify-bg)',
  color: 'var(--clearify-text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--clearify-text-secondary)',
  marginBottom: '0.25rem',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--clearify-gradient)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--clearify-radius-sm)',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
};

/* ------------------------------------------------------------------ */
/*  Summary of the source+placement combo for the list view            */
/* ------------------------------------------------------------------ */
function combo(project: HubProject): string {
  return `${project.source.kind} + ${project.placement.kind}`;
}

/* ------------------------------------------------------------------ */
/*  Project form                                                       */
/* ------------------------------------------------------------------ */
function ProjectForm({
  draft,
  onChange,
  onSave,
  saving,
}: {
  draft: DraftProject;
  onChange: (d: DraftProject) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const set = <K extends keyof DraftProject>(key: K, value: DraftProject[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="my-project" />
      </div>
      <div>
        <label style={labelStyle}>Description *</label>
        <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="A short project description" />
      </div>
      <div>
        <label style={labelStyle}>Icon</label>
        <input style={inputStyle} value={draft.icon ?? ''} onChange={(e) => set('icon', e.target.value)} placeholder="e.g. book, code, rocket" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={draft.status} onChange={(e) => set('status', e.target.value as DraftProject['status'])}>
            <option value="active">Active</option>
            <option value="beta">Beta</option>
            <option value="planned">Planned</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Group</label>
          <input style={inputStyle} value={draft.group ?? ''} onChange={(e) => set('group', e.target.value)} placeholder="e.g. backend, frontend" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Source</label>
          <select
            style={inputStyle}
            value={draft.sourceKind}
            onChange={(e) => set('sourceKind', e.target.value as HubProjectSource['kind'])}
          >
            <option value="none">none (no content pulled)</option>
            <option value="git">git (sparse clone)</option>
            <option value="url" disabled>url (reserved)</option>
            <option value="inline" disabled>inline (reserved)</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Placement</label>
          <select
            style={inputStyle}
            value={draft.placementKind}
            onChange={(e) => set('placementKind', e.target.value as HubProjectPlacement['kind'])}
          >
            <option value="card">card (grid entry, link out)</option>
            <option value="tab">tab (full hub tab)</option>
            <option value="nested">nested (into existing section)</option>
          </select>
        </div>
      </div>

      {draft.sourceKind === 'git' && (
        <>
          <div>
            <label style={labelStyle}>Git repo *</label>
            <input style={inputStyle} value={draft.gitRepo} onChange={(e) => set('gitRepo', e.target.value)} placeholder="https://github.com/org/repo.git" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Git ref</label>
              <input style={inputStyle} value={draft.gitRef} onChange={(e) => set('gitRef', e.target.value)} placeholder="main" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Git path</label>
              <input style={inputStyle} value={draft.gitPath} onChange={(e) => set('gitPath', e.target.value)} placeholder="docs/public" />
            </div>
          </div>
        </>
      )}

      {draft.placementKind === 'card' && (
        <div>
          <label style={labelStyle}>Card href *</label>
          <input style={inputStyle} value={draft.cardHref} onChange={(e) => set('cardHref', e.target.value)} placeholder="https://example.com/docs" />
        </div>
      )}

      {draft.placementKind === 'tab' && (
        <div>
          <label style={labelStyle}>Tab sections</label>
          <select style={inputStyle} value={draft.tabSections} onChange={(e) => set('tabSections', e.target.value as 'all' | 'public')}>
            <option value="public">public (non-draft)</option>
            <option value="all">all</option>
          </select>
        </div>
      )}

      {draft.placementKind === 'nested' && (
        <>
          <div>
            <label style={labelStyle}>Nest into (section label) *</label>
            <input style={inputStyle} value={draft.nestedInto} onChange={(e) => set('nestedInto', e.target.value)} placeholder="Documentation" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Docs path (in cloned repo)</label>
              <input style={inputStyle} value={draft.nestedDocsPath} onChange={(e) => set('nestedDocsPath', e.target.value)} placeholder="docs" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Nested group (optional)</label>
              <input style={inputStyle} value={draft.nestedGroup} onChange={(e) => set('nestedGroup', e.target.value)} placeholder="Services" />
            </div>
          </div>
        </>
      )}

      <div>
        <label style={labelStyle}>Tags (comma-separated)</label>
        <input
          style={inputStyle}
          value={(draft.tags ?? []).join(', ')}
          onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
          placeholder="api, docs, internal"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
        <button style={primaryBtnStyle} onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Project'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProjectsManager (main)                                             */
/* ------------------------------------------------------------------ */
export function ProjectsManager() {
  const [projects, setProjects] = useState<HubProject[]>([]);
  const [scannedProjects, setScannedProjects] = useState<HubProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, show } = useToast();

  // modal state
  const [editIndex, setEditIndex] = useState<number | null>(null); // null = closed, -1 = new
  const [draft, setDraft] = useState<DraftProject>(emptyDraft());
  const [saving, setSaving] = useState(false);

  // delete confirm
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // config preview state
  const [preview, setPreview] = useState<{ before: object; after: object; updatedProjects: HubProject[] } | null>(null);

  /* ---------- fetch ---------- */
  const fetchProjects = useCallback(async () => {
    try {
      const [dataRes, resolvedRes] = await Promise.all([
        fetch('/__clearify/api/config/data'),
        fetch('/__clearify/api/config'),
      ]);
      if (!dataRes.ok) throw new Error(`Failed to load config (${dataRes.status})`);
      const data = await dataRes.json();
      const manualProjects: HubProject[] = data?.hub?.projects ?? [];
      setProjects(manualProjects);

      // Resolved config includes scanned projects merged with manual ones.
      // Show scanned-only projects (not in manual list) as read-only.
      if (resolvedRes.ok) {
        const resolved = await resolvedRes.json();
        const allResolved: HubProject[] = resolved?.hub?.projects ?? [];
        const manualNames = new Set(manualProjects.map((p: HubProject) => p.name));
        setScannedProjects(allResolved.filter((p: HubProject) => !manualNames.has(p.name)));
      }

      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /* ---------- persist (actual PATCH) ---------- */
  const persist = useCallback(
    async (updatedProjects: HubProject[]) => {
      setSaving(true);
      try {
        const res = await fetch('/__clearify/api/config/data', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hub: { projects: updatedProjects } }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        setProjects(updatedProjects);
        show('Project saved', 'success');
        setEditIndex(null);
        setPreview(null);
      } catch (err: unknown) {
        show(err instanceof Error ? err.message : 'Save failed', 'error');
      } finally {
        setSaving(false);
      }
    },
    [show],
  );

  /* ---------- save: show preview first ---------- */
  const handleSave = useCallback(async () => {
    if (!draft.name.trim() || !draft.description.trim()) {
      show('Name and description are required', 'error');
      return;
    }
    if (draft.sourceKind === 'git' && !draft.gitRepo.trim()) {
      show('Git repo is required for git source', 'error');
      return;
    }
    if (draft.placementKind === 'card' && !draft.cardHref.trim()) {
      show('Card href is required for card placement', 'error');
      return;
    }
    if (draft.placementKind === 'nested' && !draft.nestedInto.trim()) {
      show('Nest-into section label is required for nested placement', 'error');
      return;
    }

    const cleaned = draftToProject(draft);
    const next = [...projects];
    if (editIndex === -1) {
      next.push(cleaned);
    } else if (editIndex !== null) {
      next[editIndex] = cleaned;
    }

    // Fetch current server state as "before"
    try {
      const res = await fetch('/__clearify/api/config/data');
      const currentData = await res.json();
      const before = { hub: { projects: currentData?.hub?.projects ?? [] } };
      const after = { hub: { projects: next } };
      setPreview({ before, after, updatedProjects: next });
    } catch {
      // If fetch fails, persist directly
      persist(next);
    }
  }, [draft, editIndex, projects, persist, show]);

  /* ---------- delete: show preview ---------- */
  const handleDelete = useCallback(async () => {
    if (deleteIndex === null) return;
    const next = projects.filter((_, i) => i !== deleteIndex);
    setDeleteIndex(null);

    try {
      const res = await fetch('/__clearify/api/config/data');
      const currentData = await res.json();
      const before = { hub: { projects: currentData?.hub?.projects ?? [] } };
      const after = { hub: { projects: next } };
      setPreview({ before, after, updatedProjects: next });
    } catch {
      persist(next);
    }
  }, [deleteIndex, projects, persist]);

  /* ---------- open modal ---------- */
  const openAdd = () => {
    setDraft(emptyDraft());
    setEditIndex(-1);
  };

  const openEdit = (index: number) => {
    const p = projects[index];
    setDraft(projectToDraft(p));
    setEditIndex(index);
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--clearify-text-secondary)' }}>Loading projects\u2026</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#dc2626' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--clearify-text)', margin: 0 }}>Projects</h2>
          <p style={{ color: 'var(--clearify-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage hub projects and their configuration.
          </p>
        </div>
        <button style={primaryBtnStyle} onClick={openAdd}>+ Add Project</button>
      </div>

      {/* Table */}
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--clearify-text-tertiary)', fontSize: '0.9375rem' }}>
          No projects configured yet. Click &quot;Add Project&quot; to get started.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--clearify-border)', borderRadius: 'var(--clearify-radius-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--clearify-bg-secondary)', borderBottom: '1px solid var(--clearify-border)' }}>
                {['Name', 'Description', 'Source + Placement', 'Group', 'Status', ''].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--clearify-text-secondary)', fontSize: '0.8125rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                const st = p.status ?? 'active';
                const colors = statusColors[st] ?? statusColors.active;
                return (
                  <tr
                    key={i}
                    style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--clearify-border)' : undefined, cursor: 'pointer', transition: 'background-color 0.1s' }}
                    onClick={() => openEdit(i)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--clearify-bg-secondary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--clearify-text)' }}>
                      {p.icon ? `${p.icon} ` : ''}{p.name}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--clearify-text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--clearify-text-secondary)' }}>{combo(p)}</td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--clearify-text-secondary)' }}>{p.group ?? '-'}</td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: colors.bg, color: colors.text }}>
                        {st}
                      </span>
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clearify-text-tertiary)', padding: '0.25rem', display: 'inline-flex' }}
                        title="Delete project"
                        onClick={(e) => { e.stopPropagation(); setDeleteIndex(i); }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Scanned projects (read-only) */}
      {scannedProjects.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--clearify-text-secondary)', marginBottom: '0.75rem' }}>
            Auto-discovered projects
            <span style={{ fontWeight: 400, fontSize: '0.8125rem', marginLeft: '0.5rem' }}>
              (from hub.scan — read-only)
            </span>
          </h3>
          <div style={{ border: '1px solid var(--clearify-border)', borderRadius: 'var(--clearify-radius-sm)', overflow: 'hidden', opacity: 0.75 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--clearify-bg-secondary)', borderBottom: '1px solid var(--clearify-border)' }}>
                  {['Name', 'Description', 'Group', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--clearify-text-secondary)', fontSize: '0.8125rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scannedProjects.map((p, i) => {
                  const st = p.status ?? 'active';
                  const colors = statusColors[st] ?? statusColors.active;
                  return (
                    <tr key={i} style={{ borderBottom: i < scannedProjects.length - 1 ? '1px solid var(--clearify-border)' : undefined }}>
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--clearify-text)' }}>
                        {p.icon ? `${p.icon} ` : ''}{p.name}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--clearify-text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--clearify-text-secondary)' }}>{p.group ?? '\u2014'}</td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: colors.bg, color: colors.text }}>
                          {st}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Add modal */}
      <Modal open={editIndex !== null} onClose={() => setEditIndex(null)} title={editIndex === -1 ? 'Add Project' : `Edit: ${editIndex !== null && editIndex >= 0 ? projects[editIndex]?.name ?? '' : ''}`}>
        <ProjectForm draft={draft} onChange={setDraft} onSave={handleSave} saving={saving} />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={deleteIndex !== null ? `Delete project "${projects[deleteIndex]?.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
      />

      {/* Config preview */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title="Review Changes">
        {preview && (
          <ConfigPreview
            before={preview.before}
            after={preview.after}
            onConfirm={() => persist(preview.updatedProjects)}
            onCancel={() => setPreview(null)}
          />
        )}
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default ProjectsManager;
