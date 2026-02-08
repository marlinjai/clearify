import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
    'node/index': 'src/node/index.ts',
    'node/build': 'src/node/build.ts',
    'node/init': 'src/node/init.ts',
    'core/config': 'src/core/config.ts',
    'core/navigation': 'src/core/navigation.ts',
    'core/search': 'src/core/search.ts',
    'core/remark-mermaid': 'src/core/remark-mermaid.ts',
    'vite-plugin/index': 'src/vite-plugin/index.ts',
    'types/index': 'src/types/index.ts',
  },
  outDir: 'dist/node',
  format: 'esm',
  dts: true,
  splitting: true,
  clean: true,
  target: 'node20',
  external: ['vite', 'react', 'react-dom'],
});
