interface SnippetInput {
  method: string;
  path: string;
  baseUrl: string;
  parameters?: Array<{ name: string; in: string; required?: boolean; schema?: { type?: string } }>;
  requestBody?: Record<string, any>;
  security?: Array<Record<string, string[]>>;
}

export function generateSnippets(input: SnippetInput): { label: string; code: string }[] {
  const { method, path, baseUrl, parameters = [], requestBody, security } = input;
  const upper = method.toUpperCase();
  const url = `${baseUrl}${path}`;

  // Replace path params with placeholder values
  const urlWithParams = url.replace(/\{(\w+)\}/g, ':$1');

  const hasBody = !!requestBody;
  const bodySchema = requestBody?.content?.['application/json']?.schema;
  const bodyExample = bodySchema ? generateExample(bodySchema) : null;
  const bodyJson = bodyExample ? JSON.stringify(bodyExample, null, 2) : null;

  const hasAuth = security && security.length > 0;
  const authHeader = hasAuth ? 'Authorization: Bearer YOUR_TOKEN' : '';

  const queryParams = parameters.filter(p => p.in === 'query');
  const queryString = queryParams.length > 0
    ? '?' + queryParams.map(p => `${p.name}=VALUE`).join('&')
    : '';

  // curl
  const curlParts = [`curl -X ${upper} '${urlWithParams}${queryString}'`];
  if (hasAuth) curlParts.push(`  -H '${authHeader}'`);
  if (hasBody) {
    curlParts.push("  -H 'Content-Type: application/json'");
    curlParts.push(`  -d '${bodyJson}'`);
  }
  const curl = curlParts.join(' \\\n');

  // JavaScript fetch
  const fetchHeaders: string[] = [];
  if (hasAuth) fetchHeaders.push(`    'Authorization': 'Bearer YOUR_TOKEN'`);
  if (hasBody) fetchHeaders.push(`    'Content-Type': 'application/json'`);

  let jsParts = `const response = await fetch('${urlWithParams}${queryString}', {\n  method: '${upper}',\n`;
  if (fetchHeaders.length > 0) {
    jsParts += `  headers: {\n${fetchHeaders.join(',\n')}\n  },\n`;
  }
  if (hasBody) {
    jsParts += `  body: JSON.stringify(${bodyJson}),\n`;
  }
  jsParts += '});\n\nconst data = await response.json();';

  // Python requests
  let pyParts = `import requests\n\n`;
  pyParts += `response = requests.${method.toLowerCase()}(\n    '${urlWithParams}${queryString}'`;
  if (hasAuth || hasBody) pyParts += ',';
  pyParts += '\n';
  if (hasAuth) {
    pyParts += `    headers={'Authorization': 'Bearer YOUR_TOKEN'}`;
    if (hasBody) pyParts += ',';
    pyParts += '\n';
  }
  if (hasBody) {
    pyParts += `    json=${bodyJson},\n`;
  }
  pyParts += ')\n\ndata = response.json()';

  return [
    { label: 'curl', code: curl },
    { label: 'JavaScript', code: jsParts },
    { label: 'Python', code: pyParts },
  ];
}

/** Generate a minimal example object from a JSON Schema */
function generateExample(schema: Record<string, any>): any {
  if (schema.example !== undefined) return schema.example;

  switch (schema.type) {
    case 'string':
      return schema.enum?.[0] ?? schema.default ?? 'string';
    case 'number':
    case 'integer':
      return schema.default ?? schema.minimum ?? 0;
    case 'boolean':
      return schema.default ?? true;
    case 'array':
      return schema.items ? [generateExample(schema.items)] : [];
    case 'object': {
      const obj: Record<string, any> = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExample(prop as Record<string, any>);
        }
      }
      return obj;
    }
    default:
      return null;
  }
}
