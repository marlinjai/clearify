import React, { useEffect, useState, useCallback } from 'react';
import { FormField } from './components/FormField.js';
import { useToast, ToastContainer } from './components/Toast.js';
import { Modal } from './components/Modal.js';
import { ConfigPreview } from './components/ConfigPreview.js';
import type { ClearifyDataConfig } from '../../types/index.js';

type ThemeMode = 'light' | 'dark' | 'auto';

interface LinkRow {
  key: string;
  value: string;
}

interface FormState {
  name: string;
  siteUrl: string;
  primaryColor: string;
  mode: ThemeMode;
  logoLight: string;
  logoDark: string;
  links: LinkRow[];
}

function configToForm(data: ClearifyDataConfig): FormState {
  const links: LinkRow[] = [];
  if (data.links) {
    for (const [key, value] of Object.entries(data.links)) {
      if (value !== undefined) links.push({ key, value });
    }
  }
  return {
    name: data.name ?? '',
    siteUrl: data.siteUrl ?? '',
    primaryColor: data.theme?.primaryColor ?? '#6366f1',
    mode: data.theme?.mode ?? 'auto',
    logoLight: data.logo?.light ?? '',
    logoDark: data.logo?.dark ?? '',
    links,
  };
}

function formToConfig(form: FormState): ClearifyDataConfig {
  const links: Record<string, string> = {};
  for (const row of form.links) {
    const k = row.key.trim();
    if (k) links[k] = row.value;
  }
  return {
    name: form.name || undefined,
    siteUrl: form.siteUrl || undefined,
    theme: { primaryColor: form.primaryColor, mode: form.mode },
    logo: form.logoLight || form.logoDark
      ? { light: form.logoLight || undefined, dark: form.logoDark || undefined }
      : undefined,
    links: Object.keys(links).length > 0 ? links : undefined,
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  borderRadius: 'var(--clearify-radius-sm)',
  border: '1px solid var(--clearify-border-strong)',
  backgroundColor: 'var(--clearify-bg)',
  color: 'var(--clearify-text)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '1rem',
  color: 'var(--clearify-text)',
  marginBottom: '0.5rem',
};

const sectionStyle: React.CSSProperties = {
  paddingBottom: '1.5rem',
  marginBottom: '1.5rem',
  borderBottom: '1px solid var(--clearify-border)',
};

const modes: ThemeMode[] = ['light', 'dark', 'auto'];

export function SiteSettings() {
  const [form, setForm] = useState<FormState | null>(null);
  const [initial, setInitial] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toasts, show } = useToast();
  const [preview, setPreview] = useState<{ before: object; after: object } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/__clearify/api/config/data');
      if (!res.ok) throw new Error('Failed to fetch config');
      const data: ClearifyDataConfig = await res.json();
      const state = configToForm(data);
      setForm(state);
      setInitial(JSON.stringify(state));
    } catch {
      show('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const hasChanges = form !== null && JSON.stringify(form) !== initial;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateLink = (index: number, field: 'key' | 'value', val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const links = [...prev.links];
      links[index] = { ...links[index], [field]: val };
      return { ...prev, links };
    });
  };

  const addLink = () => {
    setForm((prev) => (prev ? { ...prev, links: [...prev.links, { key: '', value: '' }] } : prev));
  };

  const removeLink = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const links = prev.links.filter((_, i) => i !== index);
      return { ...prev, links };
    });
  };

  const doSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch('/__clearify/api/config/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToConfig(form)),
      });
      if (!res.ok) throw new Error('Save failed');
      setInitial(JSON.stringify(form));
      show('Settings saved successfully', 'success');
      setPreview(null);
    } catch {
      show('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, show]);

  const handleSave = async () => {
    if (!form) return;
    try {
      const res = await fetch('/__clearify/api/config/data');
      const currentData = await res.json();
      const before = { name: currentData.name, siteUrl: currentData.siteUrl, theme: currentData.theme, logo: currentData.logo, links: currentData.links };
      const after = formToConfig(form);
      setPreview({ before, after });
    } catch {
      doSave();
    }
  };

  if (loading || !form) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--clearify-text)' }}>
          Site Settings
        </h2>
        <p style={{ color: 'var(--clearify-text-secondary)', marginTop: '0.5rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '640px' }}>
      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--clearify-text)',
          marginBottom: '0.25rem',
        }}
      >
        Site Settings
      </h2>
      <p style={{ color: 'var(--clearify-text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Configure your documentation site.
      </p>

      {/* General */}
      <div style={sectionStyle}>
        <h3 style={sectionHeadingStyle}>General</h3>
        <FormField label="Site name" htmlFor="cfg-name">
          <input
            id="cfg-name"
            type="text"
            style={inputStyle}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="My Docs"
          />
        </FormField>
        <FormField label="Site URL" htmlFor="cfg-url">
          <input
            id="cfg-url"
            type="text"
            style={inputStyle}
            value={form.siteUrl}
            onChange={(e) => update('siteUrl', e.target.value)}
            placeholder="https://docs.example.com"
          />
        </FormField>
      </div>

      {/* Theme */}
      <div style={sectionStyle}>
        <h3 style={sectionHeadingStyle}>Theme</h3>
        <FormField label="Primary color">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => update('primaryColor', e.target.value)}
              style={{
                width: 40,
                height: 36,
                padding: 0,
                border: '1px solid var(--clearify-border-strong)',
                borderRadius: 'var(--clearify-radius-sm)',
                cursor: 'pointer',
                backgroundColor: 'transparent',
              }}
            />
            <input
              type="text"
              value={form.primaryColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) update('primaryColor', v);
              }}
              style={{ ...inputStyle, width: '120px', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
            />
          </div>
        </FormField>
        <FormField label="Color mode">
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {modes.map((m) => {
              const active = form.mode === m;
              return (
                <button
                  key={m}
                  onClick={() => update('mode', m)}
                  style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: 'var(--clearify-radius-sm)',
                    fontSize: '0.8125rem',
                    fontWeight: active ? 600 : 450,
                    cursor: 'pointer',
                    border: active ? 'none' : '1px solid var(--clearify-border)',
                    backgroundColor: active ? 'var(--clearify-primary-soft)' : 'transparent',
                    color: active ? 'var(--clearify-primary)' : 'var(--clearify-text-secondary)',
                    transition: 'background-color 0.15s, color 0.15s',
                  }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              );
            })}
          </div>
        </FormField>
      </div>

      {/* Logo */}
      <div style={sectionStyle}>
        <h3 style={sectionHeadingStyle}>Logo</h3>
        <FormField label="Light logo path" htmlFor="cfg-logo-light">
          <input
            id="cfg-logo-light"
            type="text"
            style={inputStyle}
            value={form.logoLight}
            onChange={(e) => update('logoLight', e.target.value)}
            placeholder="/images/logo-light.svg"
          />
        </FormField>
        <FormField label="Dark logo path" htmlFor="cfg-logo-dark">
          <input
            id="cfg-logo-dark"
            type="text"
            style={inputStyle}
            value={form.logoDark}
            onChange={(e) => update('logoDark', e.target.value)}
            placeholder="/images/logo-dark.svg"
          />
        </FormField>
      </div>

      {/* Links */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={sectionHeadingStyle}>Links</h3>
        {form.links.map((link, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Key"
              value={link.key}
              onChange={(e) => updateLink(i, 'key', e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="text"
              placeholder="URL"
              value={link.value}
              onChange={(e) => updateLink(i, 'value', e.target.value)}
              style={{ ...inputStyle, flex: 2 }}
            />
            <button
              onClick={() => removeLink(i)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--clearify-text-tertiary)',
                padding: '0.375rem',
                borderRadius: 'var(--clearify-radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
              title="Remove link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
        <button
          onClick={addLink}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--clearify-radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--clearify-primary)',
            backgroundColor: 'var(--clearify-primary-soft)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add link
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        style={{
          padding: '0.5rem 1.5rem',
          borderRadius: 'var(--clearify-radius-sm)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#fff',
          backgroundColor: hasChanges ? 'var(--clearify-primary)' : 'var(--clearify-text-tertiary)',
          border: 'none',
          cursor: hasChanges ? 'pointer' : 'not-allowed',
          opacity: saving ? 0.7 : 1,
          transition: 'background-color 0.15s, opacity 0.15s',
        }}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>

      {/* Config preview */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title="Review Changes">
        {preview && (
          <ConfigPreview
            before={preview.before}
            after={preview.after}
            onConfirm={doSave}
            onCancel={() => setPreview(null)}
          />
        )}
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default SiteSettings;
