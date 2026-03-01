import React from 'react';
import hub from 'virtual:clearify/hub';
import { ProjectCard } from './ProjectCard.js';
import type { HubProject } from '../../types/index.js';

interface ProjectGridProps {
  cols?: number;
  children?: React.ReactNode;
}

function ProjectGridInner({ cols, projects }: { cols: number; projects: HubProject[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '0.875rem',
      }}
      className="clearify-project-grid"
    >
      {projects.map((project) => (
        <ProjectCard
          key={project.name}
          name={project.name}
          description={project.description}
          href={project.href}
          repo={project.repo}
          status={project.status}
          icon={project.icon}
          tags={project.tags}
        />
      ))}
    </div>
  );
}

export function ProjectGrid({ cols = 3, children }: ProjectGridProps) {
  const hasChildren = React.Children.count(children) > 0;

  if (hasChildren) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '0.875rem',
          marginBottom: '1.5rem',
        }}
        className="clearify-project-grid"
      >
        {children}
        <style>{gridResponsiveStyles}</style>
      </div>
    );
  }

  const projects: HubProject[] = hub?.projects ?? [];
  const hasGroups = projects.some((p) => p.group);

  if (!hasGroups) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <ProjectGridInner cols={cols} projects={projects} />
        <style>{gridResponsiveStyles}</style>
      </div>
    );
  }

  // Group projects by their group field, preserving insertion order
  const groupOrder: string[] = [];
  const grouped: Record<string, HubProject[]> = {};
  const ungrouped: HubProject[] = [];

  for (const project of projects) {
    if (project.group) {
      if (!grouped[project.group]) {
        grouped[project.group] = [];
        groupOrder.push(project.group);
      }
      grouped[project.group].push(project);
    } else {
      ungrouped.push(project);
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {groupOrder.map((groupName) => (
        <div key={groupName} style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: 0,
              color: 'var(--clearify-text)',
              letterSpacing: '-0.01em',
            }}
          >
            {groupName}
          </h2>
          <ProjectGridInner cols={cols} projects={grouped[groupName]} />
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {groupOrder.length > 0 && (
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '0.75rem',
                marginTop: 0,
                color: 'var(--clearify-text)',
                letterSpacing: '-0.01em',
              }}
            >
              Other Projects
            </h2>
          )}
          <ProjectGridInner cols={cols} projects={ungrouped} />
        </div>
      )}

      <style>{gridResponsiveStyles}</style>
    </div>
  );
}

const gridResponsiveStyles = `
  @media (max-width: 900px) {
    .clearify-project-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
  @media (max-width: 640px) {
    .clearify-project-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;
