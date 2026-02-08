import React, { useState } from 'react';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { Content } from './Content.js';
import { TableOfContents } from './TableOfContents.js';
import { Footer } from './Footer.js';
import { ThemeProvider } from './ThemeProvider.js';
import type { ClearifyConfig, NavigationItem } from '../types/index.js';

interface LayoutProps {
  config: ClearifyConfig;
  navigation: NavigationItem[];
  children: React.ReactNode;
}

export function Layout({ config, navigation, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider mode={config.theme.mode}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header
          name={config.name}
          links={config.links}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar
            navigation={navigation}
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
