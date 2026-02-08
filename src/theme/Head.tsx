import { useEffect } from 'react';
// @ts-expect-error virtual module
import config from 'virtual:clearify/config';
import { useHeadContext } from './HeadContext.js';

interface HeadProps {
  title?: string;
  description?: string;
  url?: string;
}

export function Head({ title, description, url }: HeadProps) {
  const headCtx = useHeadContext();

  // SSR mode: push data to collector, no DOM access
  if (headCtx) {
    const pageTitle = title ? `${title} | ${config.name}` : config.name;
    const desc = description ?? `${config.name} documentation`;
    headCtx.collect({
      title: pageTitle,
      description: desc,
      url: url ?? '',
      siteName: config.name,
    });
    return null;
  }

  // Client mode: useEffect DOM mutations (existing behavior)
  useEffect(() => {
    const pageTitle = title ? `${title} | ${config.name}` : config.name;
    document.title = pageTitle;

    const desc = description ?? `${config.name} documentation`;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', desc);

    // Update OG tags
    setMeta('og:title', pageTitle);
    setMeta('og:description', desc);
    setMeta('og:type', 'article');
    setMeta('og:site_name', config.name);

    // Update Twitter tags
    setMeta('twitter:card', 'summary', 'name');
    setMeta('twitter:title', pageTitle, 'name');
    setMeta('twitter:description', desc, 'name');

    // Update canonical link
    if (url) {
      const siteUrl = config.siteUrl?.replace(/\/$/, '') ?? '';
      const canonical = siteUrl ? `${siteUrl}${url}` : url;
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }
  }, [title, description, url]);

  return null;
}

function setMeta(key: string, content: string, attr: 'property' | 'name' = 'property') {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
