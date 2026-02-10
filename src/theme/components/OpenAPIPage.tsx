import { OpenAPI } from './OpenAPI.js';
// @ts-expect-error virtual module
import config from 'virtual:clearify/config';

export default function OpenAPIPage() {
  const basePath = config.openapi?.basePath ?? '/api';
  return (
    <div className="clearify-openapi-page" style={{ margin: '0 -1.5rem', maxWidth: 'none' }}>
      <OpenAPI hideSidebar={true} pathRouting={{ basePath }} />
    </div>
  );
}

export const frontmatter = { title: 'API Reference', description: 'API documentation' };
