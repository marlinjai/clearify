import { OpenAPI } from './OpenAPI.js';
// @ts-expect-error virtual module
import config from 'virtual:clearify/config';
// @ts-expect-error virtual module
import openapiSpec from 'virtual:clearify/openapi-spec';

export default function OpenAPIPage() {
  const basePath = config.openapi?.basePath ?? '/api';
  return (
    <div className="clearify-openapi-page" style={{ maxWidth: 'none' }}>
      <OpenAPI spec={openapiSpec} hideSidebar={true} pathRouting={{ basePath }} />
    </div>
  );
}

export const frontmatter = { title: 'API Reference', description: 'API documentation' };
