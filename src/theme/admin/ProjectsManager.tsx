import React, { useEffect, useState, useCallback } from 'react';
import type { HubProject } from '../../types/index.js';
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
/*  Empty default                                                      */
/* ------------------------------------------------------------------ */
function emptyProject(): HubProject {
  return {
    name: '',
    description: '',
    mode: 'link',
    status: 'active',
    icon: '',
    group: '',
    href: '',
    tags: [],
    git: { repo: '', ref: '' },
    embedSections: 'all',
    injectInto: '',
    docsPath: 'docs',
  };
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
/*  Clean project for saving                                           */
/* ------------------------------------------------------------------ */
function cleanProject(draft: HubProject, original?: HubProject): HubProject {
  const cleaned: HubProject = { ...draft };
  const mode = cleaned.mode ?? 'link';
  if (mode === 'link') {
    delete cleaned.git;
    delete cleaned.embedSections;
    delete cleaned.injectInto;
    delete cleaned.docsPath;
    // Don't add mode: 'link' if original didn't have it (it's the default)
    if (!original?.mode) delete cleaned.mode;
  } else if (mode === 'embed') {
    delete cleaned.href;
    delete cleaned.injectInto;
    delete cleaned.docsPath;
  } else if (mode === 'inject') {
    delete cleaned.href;
    delete cleaned.embedSections;
  }
  if (!cleaned.icon) delete cleaned.icon;
  if (!cleaned.group) delete cleaned.group;
  if (!cleaned.href) delete cleaned.href;
  if (cleaned.tags && cleaned.tags.length === 0) delete cleaned.tags;
  if (cleaned.git && !cleaned.git.repo) delete cleaned.git;
  if (cleaned.git && !cleaned.git.ref) delete cleaned.git.ref;
  if (cleaned.status === 'active' && !original?.status) delete cleaned.status;

  // Preserve original field ordering: rebuild using original's key order first
  if (original) {
    const ordered: any = {};
    for (const key of Object.keys(original)) {
      if (key in cleaned) ordered[key] = (cleaned as any)[key];
    }
    for (const key of Object.keys(cleaned)) {
      if (!(key in ordered)) ordered[key] = (cleaned as any)[key];
    }
    return ordered as HubProject;
  }
  return cleaned;
}

/* ------------------------------------------------------------------ */
/*  Project form                                                       */
/* ------------------------------------------------------------------ */
function ProjectForm({
  project,
  onChange,
  onSave,
  saving,
}: {
  project: HubProject;
  onChange: (p: HubProject) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const mode = project.mode ?? 'link';

  const set = <K extends keyof HubProject>(key: K, value: HubProject[K]) =>
    onChange({ ...project, [key]: value });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} value={project.name} onChange={(e) => set('name', e.target.value)} placeholder="my-project" />
      </div>
      <div>
        <label style={labelStyle}>Description *</label>
        <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={project.description} onChange={(e) => set('description', e.target.value)} placeholder="A short project description" />
      </div>
      <div>
        <label style={labelStyle}>Icon</label>
        <input style={inputStyle} value={project.icon ?? ''} onChange={(e) => set('icon', e.target.value)} placeholder="e.g. book, code, rocket" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Mode</label>
          <select style={inputStyle} value={mode} onChange={(e) => set('mode', e.target.value as HubProject['mode'])}>
            <option value="link">Link</option>
            <option value="embed">Embed</option>
            <option value="inject">Inject</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={project.status ?? 'active'} onChange={(e) => set('status', e.target.value as HubProject['status'])}>
            <option value="active">Active</option>
            <option value="beta">Beta</option>
            <option value="planned">Planned</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Group</label>
        <input style={inputStyle} value={project.group ?? ''} onChange={(e) => set('group', e.target.value)} placeholder="e.g. backend, frontend" />
      </div>

      {mode === 'link' && (
        <div>
          <label style={labelStyle}>URL (href)</label>
          <input style={inputStyle} value={project.href ?? ''} onChange={(e) => set('href', e.target.value)} placeholder="https://example.com/docs" />
        </div>
      )}

      {(mode === 'embed' || mode === 'inject') && (
        <>
          <div>
            <label style={labelStyle}>Git Repo</label>
            <input style={inputStyle} value={project.git?.repo ?? ''} onChange={(e) => set('git', { ...project.git, repo: e.target.value })} placeholder="org/repo" />
          </div>
          <div>
            <label style={labelStyle}>Git Ref</label>
            <input style={inputStyle} value={project.git?.ref ?? ''} onChange={(e) => set('git', { ...project.git, repo: project.git?.repo ?? '', ref: e.target.value })} placeholder="main" />
          </div>
        </>
      )}

      {mode === 'embed' && (
        <div>
          <label style={labelStyle}>Embed Sections</label>
          <select style={inputStyle} value={typeof project.embedSections === 'string' ? project.embedSections : 'all'} onChange={(e) => set('embedSections', e.target.value as 'all' | 'public')}>
            <option value="all">All</option>
            <option value="public">Public</option>
          </select>
        </div>
      )}

      {mode === 'inject' && (
        <>
          <div>
            <label style={labelStyle}>Inject Into</label>
            <input style={inputStyle} value={project.injectInto ?? ''} onChange={(e) => set('injectInto', e.target.value)} placeholder="section-id" />
          </div>
          <div>
            <label style={labelStyle}>Docs Path</label>
            <input style={inputStyle} value={project.docsPath ?? 'docs'} onChange={(e) => set('docsPath', e.target.value)} placeholder="docs" />
          </div>
        </>
      )}

      <div>
        <label style={labelStyle}>Tags (comma-separated)</label>
        <input
          style={inputStyle}
          value={(project.tags ?? []).join(', ')}
          onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
          placeholder="api, docs, internal"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
        <button style={primaryBtnStyle} onClick={onSave} disabled={saving}>
          {saving ? 'Saving\u2026' : 'Save Project'}
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
  const [draft, setDraft] = useState<HubProject>(emptyProject());
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

    const original = editIndex !== null && editIndex >= 0 ? projects[editIndex] : undefined;
    const cleaned = cleanProject(draft, original);
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
    setDraft(emptyProject());
    setEditIndex(-1);
  };

  const openEdit = (index: number) => {
    const p = projects[index];
    setDraft({
      ...emptyProject(),
      ...p,
      git: p.git ? { ...p.git } : { repo: '', ref: '' },
      tags: p.tags ? [...p.tags] : [],
    });
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
                {['Name', 'Description', 'Mode', 'Group', 'Status', ''].map((h) => (
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
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--clearify-text-secondary)' }}>{p.mode ?? 'link'}</td>
                    <td style={{ padding: '0.625rem 0.75rem', color: 'var(--clearify-text-secondary)' }}>{p.group ?? '\u2014'}</td>
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
        <ProjectForm project={draft} onChange={setDraft} onSave={handleSave} saving={saving} />
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
