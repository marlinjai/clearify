import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
// @ts-expect-error virtual module
import routes from 'virtual:clearify/routes';
// @ts-expect-error virtual module
import config from 'virtual:clearify/config';
// @ts-expect-error virtual module
import sections from 'virtual:clearify/navigation';
// @ts-expect-error virtual module
import adminEnabled from 'virtual:clearify/admin-enabled';
import { Layout } from '../theme/Layout.js';
import { Head } from '../theme/Head.js';
import { NotFound } from '../theme/NotFound.js';
import { mdxComponents } from '../theme/MDXComponents.js';
import '../theme/styles/globals.css';

const AdminLayout = React.lazy(() => import('../theme/admin/AdminLayout.js'));
const AdminDashboard = React.lazy(() => import('../theme/admin/AdminDashboard.js'));
const ProjectsManager = React.lazy(() => import('../theme/admin/ProjectsManager.js'));
const SectionsManager = React.lazy(() => import('../theme/admin/SectionsManager.js'));
const SiteSettings = React.lazy(() => import('../theme/admin/SiteSettings.js'));

interface RouteEntry {
  path: string;
  component?: () => Promise<any>;
  frontmatter?: { title?: string; description?: string };
  redirectTo?: string;
}

function PageWrapper({ loader, fallbackFrontmatter }: { loader: () => Promise<any>; fallbackFrontmatter: any }) {
  const location = useLocation();
  const [page, setPage] = useState<{ Component: React.ComponentType; fm: any } | null>(null);
  const isInitialRender = useRef(true);

  useEffect(() => {
    let cancelled = false;

    // On SSR-hydrated pages, the initial route's content is already visible.
    // Still load the module so subsequent SPA navigations work, but don't
    // flash "Loading..." by clearing state only on navigation changes.
    if (isInitialRender.current) {
      isInitialRender.current = false;
      // Load eagerly but don't clear existing DOM content
      loader().then((mod) => {
        if (cancelled) return;
        setPage({
          Component: mod.default,
          fm: mod.frontmatter ?? fallbackFrontmatter,
        });
      });
      return () => { cancelled = true; };
    }

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
    // If we're hydrating an SSR page, don't show loading — the HTML is already there.
    // The browser will display the server-rendered content until React hydrates.
    const isSSR = typeof document !== 'undefined' && document.getElementById('root')?.dataset.clearifySsr;
    if (isSSR && isInitialRender.current) {
      return null;
    }
    return <div style={{ padding: '2rem', color: 'var(--clearify-text-secondary)' }}>Loading...</div>;
  }

  const { Component, fm } = page;
  return (
    <article>
      <Head title={fm?.title} description={fm?.description} url={location.pathname} />
      <Component />
    </article>
  );
}

function AdminDisabled() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--clearify-text-secondary)', fontFamily: 'var(--font-sans)' }}>
      Admin panel is only available in dev mode.
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Admin routes — outside Layout, lazy-loaded */}
      {adminEnabled ? (
        <Route
          path="/admin"
          element={
            <React.Suspense fallback={<div style={{ padding: '2rem', color: 'var(--clearify-text-secondary)' }}>Loading...</div>}>
              <AdminLayout />
            </React.Suspense>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="projects" element={<ProjectsManager />} />
          <Route path="sections" element={<SectionsManager />} />
          <Route path="settings" element={<SiteSettings />} />
        </Route>
      ) : (
        <Route path="/admin/*" element={<AdminDisabled />} />
      )}

      {/* Docs routes — wrapped in Layout */}
      <Route
        path="*"
        element={
          <Layout config={config} sections={sections}>
            <Routes>
              {(routes as RouteEntry[]).map((route) =>
                route.redirectTo ? (
                  <Route key={route.path} path={route.path} element={<Navigate to={route.redirectTo} replace />} />
                ) : (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={<PageWrapper loader={route.component!} fallbackFrontmatter={route.frontmatter} />}
                  />
                )
              )}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
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
