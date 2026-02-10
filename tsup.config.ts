import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
    'node/index': 'src/node/index.ts',
    'node/build': 'src/node/build.ts',
    'node/init': 'src/node/init.ts',
    'node/check': 'src/node/check.ts',
    'core/config': 'src/core/config.ts',
    'core/navigation': 'src/core/navigation.ts',
    'core/search': 'src/core/search.ts',
    'core/remark-mermaid': 'src/core/remark-mermaid.ts',
    'core/mermaid-utils': 'src/core/mermaid-utils.ts',
    'core/mermaid-renderer': 'src/core/mermaid-renderer.ts',
    'core/openapi-parser': 'src/core/openapi-parser.ts',
    'vite-plugin/index': 'src/vite-plugin/index.ts',
    'types/index': 'src/types/index.ts',
    'presets/nestjs': 'src/presets/nestjs.ts',
  },
  outDir: 'dist/node',
  format: 'esm',
  dts: true,
  splitting: true,
  clean: true,
  target: 'node20',
  external: ['vite', 'react', 'react-dom', 'esbuild', 'puppeteer', '@nestjs/core', '@nestjs/common', '@nestjs/swagger'],
});
