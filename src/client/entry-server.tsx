import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router';
import { MDXProvider } from '@mdx-js/react';
// @ts-expect-error virtual module
import routes from 'virtual:clearify/routes';
// @ts-expect-error virtual module
import config from 'virtual:clearify/config';
// @ts-expect-error virtual module
import sections from 'virtual:clearify/navigation';
import { Layout } from '../theme/Layout.js';
import { Head } from '../theme/Head.js';
import { mdxComponents } from '../theme/MDXComponents.js';
import { HeadProvider, type HeadData } from '../theme/HeadContext.js';
import '../theme/styles/globals.css';

interface RouteEntry {
  path: string;
  component: () => Promise<any>;
  frontmatter: { title?: string; description?: string };
}

export async function render(url: string): Promise<{ html: string; head: HeadData }> {
  // Find the matching route and pre-load its module
  const allRoutes = routes as RouteEntry[];
  // Prefer exact match over catch-all
  const matchedRoute =
    allRoutes.find((r) => r.path === url) ??
    allRoutes.find((r) => {
      if (!r.path.endsWith('/*')) return false;
      const base = r.path.slice(0, -2);
      return url === base || url.startsWith(base + '/');
    });

  let Component: React.ComponentType = () => null;
  let fm: { title?: string; description?: string } = {};

  if (matchedRoute) {
    const mod = await matchedRoute.component();
    Component = mod.default;
    fm = mod.frontmatter ?? matchedRoute.frontmatter;
  }

  // Collect head data during render
  let headData: HeadData = {
    title: config.name,
    description: `${config.name} documentation`,
    url,
    siteName: config.name,
  };

  const onCollect = (data: HeadData) => {
    headData = data;
  };

  const html = renderToString(
    <HeadProvider onCollect={onCollect}>
      <MemoryRouter initialEntries={[url]}>
        <MDXProvider components={mdxComponents}>
          <Layout config={config} sections={sections}>
            <Routes>
              <Route
                path={matchedRoute?.path ?? url}
                element={
                  <article>
                    <Head title={fm.title} description={fm.description} url={url} />
                    <Component />
                  </article>
                }
              />
            </Routes>
          </Layout>
        </MDXProvider>
      </MemoryRouter>
    </HeadProvider>
  );

  return { html, head: headData };
}
