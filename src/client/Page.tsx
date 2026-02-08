import React from 'react';

interface PageProps {
  content: React.ComponentType;
  frontmatter: { title?: string; description?: string };
}

export function Page({ content: Content, frontmatter }: PageProps) {
  return (
    <article>
      {frontmatter.title && <h1>{frontmatter.title}</h1>}
      <Content />
    </article>
  );
}
