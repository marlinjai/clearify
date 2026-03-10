import React from 'react';
import { Link } from 'react-router-dom';

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--clearify-surface-elevated)',
  border: '1px solid var(--clearify-border)',
  borderRadius: 'var(--clearify-radius)',
  padding: '1.5rem',
  boxShadow: 'var(--clearify-shadow)',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'box-shadow 0.15s, border-color 0.15s',
};

interface DashboardCardProps {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
}

function DashboardCard({ title, description, to, icon }: DashboardCardProps) {
  return (
    <Link
      to={to}
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--clearify-shadow-glow)';
        e.currentTarget.style.borderColor = 'var(--clearify-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--clearify-shadow)';
        e.currentTarget.style.borderColor = 'var(--clearify-border)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--clearify-radius-sm)',
            background: 'var(--clearify-primary-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--clearify-primary)',
          }}
        >
          {icon}
        </div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 650, color: 'var(--clearify-text)' }}>
          {title}
        </h3>
      </div>
      <p style={{ fontSize: '0.875rem', color: 'var(--clearify-text-secondary)', lineHeight: 1.5 }}>
        {description}
      </p>
    </Link>
  );
}

export function AdminDashboard() {
  return (
    <div style={{ padding: '2rem', maxWidth: '64rem', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.035em',
          color: 'var(--clearify-text)',
          marginBottom: '0.5rem',
        }}
      >
        Admin Dashboard
      </h1>
      <p style={{ color: 'var(--clearify-text-secondary)', marginBottom: '2rem' }}>
        Manage your Clearify documentation site.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <DashboardCard
          title="Projects"
          description="Manage hub projects, add or remove project entries."
          to="/admin/projects"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          }
        />
        <DashboardCard
          title="Sections"
          description="Organize documentation sections and navigation structure."
          to="/admin/sections"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          }
        />
        <DashboardCard
          title="Site Settings"
          description="Configure site name, colors, links, and other settings."
          to="/admin/settings"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

export default AdminDashboard;
