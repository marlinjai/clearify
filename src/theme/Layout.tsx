import React, { useState } from 'react';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { Content } from './Content.js';
import { TableOfContents } from './TableOfContents.js';
import { Footer } from './Footer.js';
import { ThemeProvider } from './ThemeProvider.js';
import type { ClearifyConfig, SectionNavigation } from '../types/index.js';

interface LayoutProps {
  config: ClearifyConfig;
  sections: SectionNavigation[];
  children: React.ReactNode;
}

export function Layout({ config, sections, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider mode={config.theme.mode}>
      {/* Subtle gradient mesh background */}
      <div className="clearify-bg-mesh" aria-hidden="true" />

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header
          name={config.name}
          links={config.links}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar
            sections={sections}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <Content>{children}</Content>
          <TableOfContents />
        </div>
        <Footer name={config.name} links={config.links} />
      </div>
    </ThemeProvider>
  );
}
