import { defineConfig } from './src/types/index.js';

export default defineConfig({
  name: 'Clearify',
  sections: [
    { label: 'Documentation', docsDir: './docs/public' },
    { label: 'Internal', docsDir: './docs/internal', basePath: '/internal', draft: true },
  ],
});
