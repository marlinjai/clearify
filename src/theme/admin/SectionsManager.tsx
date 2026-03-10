import React, { useEffect, useState, useCallback } from 'react';
import type { SectionConfig } from '../../types/index.js';
import { Modal as SharedModal } from './components/Modal.js';
import { ConfigPreview } from './components/ConfigPreview.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Toast {
  message: string;
  type: 'success' | 'error';
  id: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const API_DATA = '/__clearify/api/config/data';
const API_DIRS = '/__clearify/api/fs/dirs';

async function fetchSections(): Promise<SectionConfig[]> {
  const res = await fetch(API_DATA);
  const data = await res.json();
  return data.sections ?? [];
}

async function saveSections(sections: SectionConfig[]): Promise<void> {
  const res = await fetch(API_DATA, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Save failed');
  }
}

async function fetchDirs(root: string): Promise<string[]> {
  const res = await fetch(`${API_DIRS}?root=${encodeURIComponent(root)}`);
  const data = await res.json();
  return data.dirs ?? [];
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background-color 0.15s, color 0.15s, opacity 0.15s',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  padding: '0.5rem 1rem',
  borderRadius: 'var(--clearify-radius-sm)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: '#fff',
  background: 'var(--clearify-primary)',
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  padding: '0.5rem 1rem',
  borderRadius: 'var(--clearify-radius-sm)',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--clearify-text)',
  background: 'var(--clearify-bg-secondary)',
};

const btnDanger: React.CSSProperties = {
  ...btnBase,
  padding: '0.5rem 1rem',
  borderRadius: 'var(--clearify-radius-sm)',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#ef4444',
  background: 'transparent',
};

const btnArrow: React.CSSProperties = {
  ...btnBase,
  width: 24,
  height: 24,
  borderRadius: 'var(--clearify-radius-sm)',
  background: 'var(--clearify-bg-secondary)',
  color: 'var(--clearify-text-secondary)',
  fontSize: '0.75rem',
  padding: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--clearify-radius-sm)',
  border: '1px solid var(--clearify-border)',
  backgroundColor: 'var(--clearify-bg)',
  color: 'var(--clearify-text)',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--clearify-text-secondary)',
  marginBottom: '0.375rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--clearify-surface)',
  borderRadius: 'var(--clearify-radius)',
  border: '1px solid var(--clearify-border)',
  padding: '1.5rem',
  width: '100%',
  maxWidth: 480,
  maxHeight: '80vh',
  overflow: 'auto',
};

/* ------------------------------------------------------------------ */
/*  Directory Picker                                                   */
/* ------------------------------------------------------------------ */

function DirPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (dir: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dirs, setDirs] = useState<string[]>([]);
  const [currentRoot, setCurrentRoot] = useState('.');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (root: string) => {
    setLoading(true);
    try {
      const d = await fetchDirs(root);
      setDirs(d.filter((name) => !name.startsWith('.')));
      setCurrentRoot(root);
    } catch {
      setDirs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load('.');
  }, [open, load]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          style={inputStyle}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="docs"
        />
        <button
          type="button"
          style={btnSecondary}
          onClick={() => setOpen(!open)}
        >
          Browse
        </button>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: 'var(--clearify-surface)',
            border: '1px solid var(--clearify-border)',
            borderRadius: 'var(--clearify-radius-sm)',
            maxHeight: 200,
            overflow: 'auto',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {currentRoot !== '.' && (
            <button
              type="button"
              style={{
                ...btnBase,
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
                color: 'var(--clearify-text-secondary)',
                background: 'none',
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: '0.375rem',
              }}
              onClick={() => {
                const parent = currentRoot.split('/').slice(0, -1).join('/') || '.';
                load(parent);
              }}
            >
              {'← Back'}
            </button>
          )}
          {loading && (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: 'var(--clearify-text-secondary)' }}>
              Loading...
            </div>
          )}
          {!loading && dirs.length === 0 && (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: 'var(--clearify-text-tertiary)' }}>
              No subdirectories
            </div>
          )}
          {dirs.map((dir) => {
            const fullPath = currentRoot === '.' ? dir : `${currentRoot}/${dir}`;
            return (
              <div key={dir} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    ...btnBase,
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    color: 'var(--clearify-text)',
                    background: 'none',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    fontFamily: 'var(--clearify-font-mono, monospace)',
                  }}
                  onClick={() => {
                    onChange(fullPath);
                    setOpen(false);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--clearify-bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {dir}
                </button>
                <button
                  type="button"
                  style={{
                    ...btnBase,
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--clearify-text-tertiary)',
                    background: 'none',
                  }}
                  title="Browse subdirectories"
                  onClick={() => load(fullPath)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--clearify-text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--clearify-text-tertiary)';
                  }}
                >
                  {'→'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Form Modal                                                 */
/* ------------------------------------------------------------------ */

function SectionFormModal({
  section,
  onSave,
  onClose,
}: {
  section: SectionConfig | null;
  onSave: (s: SectionConfig) => void;
  onClose: () => void;
}) {
  const isEdit = section !== null;
  const [label, setLabel] = useState(section?.label ?? '');
  const [docsDir, setDocsDir] = useState(section?.docsDir ?? '');
  const [basePath, setBasePath] = useState(section?.basePath ?? '');
  const [draft, setDraft] = useState(section?.draft ?? false);

  const autoBasePath = basePath === '' ? `/${slugify(label)}` : basePath;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !docsDir.trim()) return;
    const result: SectionConfig = {
      label: label.trim(),
      docsDir: docsDir.trim(),
    };
    const bp = basePath.trim();
    if (bp) result.basePath = bp;
    if (draft) result.draft = true;
    onSave(result);
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--clearify-text)', margin: '0 0 1.25rem' }}>
          {isEdit ? 'Edit Section' : 'Add Section'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Label *</label>
            <input
              style={inputStyle}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Getting Started"
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Docs Directory *</label>
            <DirPicker value={docsDir} onChange={setDocsDir} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Base Path</label>
            <input
              style={inputStyle}
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              placeholder={autoBasePath || '/section-path'}
            />
            {label && !basePath && (
              <div style={{ fontSize: '0.75rem', color: 'var(--clearify-text-tertiary)', marginTop: '0.25rem' }}>
                Auto-generated: {autoBasePath}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: 'var(--clearify-text)',
              }}
            >
              <input
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                style={{ accentColor: 'var(--clearify-primary)' }}
              />
              Draft (hidden from public navigation)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" style={btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={{ ...btnPrimary, opacity: (!label.trim() || !docsDir.trim()) ? 0.5 : 1 }}>
              {isEdit ? 'Save Changes' : 'Add Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

function DeleteConfirmModal({
  sectionLabel,
  onConfirm,
  onClose,
}: {
  sectionLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--clearify-text)', margin: '0 0 0.75rem' }}>
          Delete Section
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--clearify-text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong style={{ color: 'var(--clearify-text)' }}>{sectionLabel}</strong>?
          This will remove the section from the configuration but won't delete any files.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button style={btnSecondary} onClick={onClose}>Cancel</button>
          <button
            style={{ ...btnPrimary, background: '#ef4444' }}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: '0.625rem 1rem',
            borderRadius: 'var(--clearify-radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#fff',
            backgroundColor: t.type === 'success' ? '#22c55e' : '#ef4444',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SectionsManager() {
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Config preview state
  const [preview, setPreview] = useState<{ before: object; after: object; updatedSections: SectionConfig[] } | null>(null);

  let toastId = 0;
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const load = useCallback(async () => {
    try {
      const s = await fetchSections();
      setSections(s);
    } catch (err: any) {
      addToast(err.message ?? 'Failed to load sections', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const doPersist = useCallback(async (updated: SectionConfig[]) => {
    setSaving(true);
    try {
      await saveSections(updated);
      setSections(updated);
      addToast('Sections saved', 'success');
      setPreview(null);
    } catch (err: any) {
      addToast(err.message ?? 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }, [addToast]);

  const persist = useCallback(async (updated: SectionConfig[]) => {
    try {
      const res = await fetch(API_DATA);
      const currentData = await res.json();
      const before = { sections: currentData?.sections ?? [] };
      const after = { sections: updated };
      setPreview({ before, after, updatedSections: updated });
    } catch {
      doPersist(updated);
    }
  }, [doPersist]);

  /* Reorder */
  const move = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    persist(updated);
  }, [sections, persist]);

  /* Add / Edit */
  const handleSave = useCallback((s: SectionConfig) => {
    let updated: SectionConfig[];
    if (editIndex !== null) {
      updated = sections.map((existing, i) => (i === editIndex ? s : existing));
    } else {
      updated = [...sections, s];
    }
    persist(updated);
    setShowForm(false);
    setEditIndex(null);
  }, [sections, editIndex, persist]);

  /* Delete */
  const handleDelete = useCallback(() => {
    if (deleteIndex === null) return;
    const updated = sections.filter((_, i) => i !== deleteIndex);
    persist(updated);
    setDeleteIndex(null);
  }, [sections, deleteIndex, persist]);

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--clearify-text)' }}>Sections</h2>
        <p style={{ color: 'var(--clearify-text-secondary)', marginTop: '0.5rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--clearify-text)', margin: 0 }}>
          Sections
        </h2>
        <button
          style={btnPrimary}
          onClick={() => { setEditIndex(null); setShowForm(true); }}
          disabled={saving}
        >
          + Add Section
        </button>
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--clearify-text-tertiary)', margin: '0 0 1.5rem' }}>
        First section serves as the home page. Drag order determines navigation priority.
      </p>

      {/* Section list */}
      {sections.length === 0 ? (
        <div
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            borderRadius: 'var(--clearify-radius)',
            border: '1px dashed var(--clearify-border)',
            color: 'var(--clearify-text-tertiary)',
            fontSize: '0.875rem',
          }}
        >
          No sections configured yet. Click "Add Section" to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sections.map((section, index) => {
            const isDraft = !!section.draft;
            const displayBasePath = section.basePath ?? `/${slugify(section.label)}`;
            const isFirst = index === 0;

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--clearify-radius-sm)',
                  border: '1px solid var(--clearify-border)',
                  backgroundColor: 'var(--clearify-surface)',
                  opacity: isDraft ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* Reorder arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    style={{ ...btnArrow, opacity: index === 0 ? 0.3 : 1 }}
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || saving}
                    title="Move up"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    style={{ ...btnArrow, opacity: index === sections.length - 1 ? 0.3 : 1 }}
                    onClick={() => move(index, 1)}
                    disabled={index === sections.length - 1 || saving}
                    title="Move down"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {/* Section info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--clearify-text)' }}>
                      {section.label}
                    </span>
                    {isFirst && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--clearify-primary-soft)',
                          color: 'var(--clearify-primary)',
                        }}
                      >
                        Home
                      </span>
                    )}
                    {isDraft && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--clearify-bg-secondary)',
                          color: 'var(--clearify-text-tertiary)',
                        }}
                      >
                        Draft
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--clearify-text-secondary)',
                        fontFamily: 'var(--clearify-font-mono, monospace)',
                      }}
                    >
                      {section.docsDir}
                    </span>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--clearify-text-tertiary)',
                      }}
                    >
                      {displayBasePath}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button
                    style={btnSecondary}
                    onClick={() => { setEditIndex(index); setShowForm(true); }}
                    disabled={saving}
                  >
                    Edit
                  </button>
                  <button
                    style={btnDanger}
                    onClick={() => setDeleteIndex(index)}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <SectionFormModal
          section={editIndex !== null ? sections[editIndex] : null}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditIndex(null); }}
        />
      )}

      {deleteIndex !== null && (
        <DeleteConfirmModal
          sectionLabel={sections[deleteIndex].label}
          onConfirm={handleDelete}
          onClose={() => setDeleteIndex(null)}
        />
      )}

      {/* Config preview */}
      <SharedModal open={preview !== null} onClose={() => setPreview(null)} title="Review Changes">
        {preview && (
          <ConfigPreview
            before={preview.before}
            after={preview.after}
            onConfirm={() => doPersist(preview.updatedSections)}
            onCancel={() => setPreview(null)}
          />
        )}
      </SharedModal>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default SectionsManager;
