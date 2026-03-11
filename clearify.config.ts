import { defineConfig } from './src/types/index.js';

export default defineConfig({
  name: 'Clearify',
  includeReadme: true,
  hubProject: {
    description: 'Documentation site generator (powers this site)',
    status: 'active' as const,
    icon: '📚',
    tags: ['tooling', 'docs'],
    hubUrl: 'https://docs.lumitra.co',
    hubName: 'ERP Suite',
  },
  sections: [
    { label: 'Documentation', docsDir: './docs/public' },
    { label: 'Internal', docsDir: './docs/internal', basePath: '/internal', draft: true },
  ],
});
