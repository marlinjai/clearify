import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
// @ts-expect-error virtual module
import routes from 'virtual:clearify/routes';
// @ts-expect-error virtual module
import config from 'virtual:clearify/config';
// @ts-expect-error virtual module
import navigation from 'virtual:clearify/navigation';
import { Layout } from '../theme/Layout.js';
import { Head } from '../theme/Head.js';
import { NotFound } from '../theme/NotFound.js';
import { mdxComponents } from '../theme/MDXComponents.js';
import '../theme/styles/globals.css';

interface RouteEntry {
  path: string;
  component: () => Promise<any>;
  frontmatter: { title?: string; description?: string };
}

function PageWrapper({ loader, fallbackFrontmatter }: { loader: () => Promise<any>; fallbackFrontmatter: any }) {
  const location = useLocation();
  const [page, setPage] = useState<{ Component: React.ComponentType; fm: any } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPage(null);
    loader().then((mod) => {
      if (cancelled) return;
      setPage({
        Component: mod.default,
        fm: mod.frontmatter ?? fallbackFrontmatter,
      });
    });
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (!page) {
    return <div style={{ padding: '2rem', color: 'var(--clearify-text-secondary)' }}>Loading...</div>;
  }

  const { Component, fm } = page;
  return (
    <article>
      <Head title={fm?.title} description={fm?.description} />
      <Component />
    </article>
  );
}

function AppRoutes() {
  return (
    <Layout config={config} navigation={navigation}>
      <Routes>
        {(routes as RouteEntry[]).map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<PageWrapper loader={route.component} fallbackFrontmatter={route.frontmatter} />}
          />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <MDXProvider components={mdxComponents}>
        <AppRoutes />
      </MDXProvider>
    </BrowserRouter>
  );
}
