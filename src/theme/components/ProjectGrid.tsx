import React from 'react';
import hub from 'virtual:clearify/hub';
import { ProjectCard } from './ProjectCard.js';

interface ProjectGridProps {
  cols?: number;
  children?: React.ReactNode;
}

export function ProjectGrid({ cols = 3, children }: ProjectGridProps) {
  const hasChildren = React.Children.count(children) > 0;

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
      {hasChildren
        ? children
        : hub?.projects.map((project) => (
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

      <style>{`
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
      `}</style>
    </div>
  );
}
