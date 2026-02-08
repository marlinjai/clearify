import { useEffect } from 'react';
// @ts-expect-error virtual module
import config from 'virtual:clearify/config';

interface HeadProps {
  title?: string;
  description?: string;
}

export function Head({ title, description }: HeadProps) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${config.name}` : config.name;
    document.title = pageTitle;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description ?? `${config.name} documentation`);

    // Update OG tags
    setMeta('og:title', pageTitle);
    setMeta('og:description', description ?? `${config.name} documentation`);
    setMeta('og:type', 'website');
  }, [title, description]);

  return null;
}

function setMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
