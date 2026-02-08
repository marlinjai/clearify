import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

export async function init() {
  const cwd = process.cwd();
  const docsDir = resolve(cwd, 'docs');
  const configPath = resolve(cwd, 'clearify.config.ts');

  console.log('\n  Initializing Clearify...\n');

  // Create docs directory
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
    console.log('  Created docs/');
  } else {
    console.log('  docs/ already exists, skipping');
  }

  // Create docs/index.md
  const indexPath = resolve(docsDir, 'index.md');
  if (!existsSync(indexPath)) {
    writeFileSync(
      indexPath,
      `---
title: Welcome
description: Welcome to your documentation
order: 0
---

# Welcome

Welcome to your documentation site, powered by **Clearify**.

## Getting Started

Edit this file at \`docs/index.md\` to update your home page.

## Features

- Write docs in **Markdown** or **MDX**
- Built-in **search** across all pages
- **Dark mode** support out of the box
- **Syntax highlighting** with Shiki
- **Zero config** — just add markdown files

## Next Steps

- Add more pages to the \`docs/\` folder
- Create subfolders for organized navigation
- Customize with \`clearify.config.ts\`
`
    );
    console.log('  Created docs/index.md');
  }

  // Create docs/getting-started.md
  const gettingStartedPath = resolve(docsDir, 'getting-started.md');
  if (!existsSync(gettingStartedPath)) {
    writeFileSync(
      gettingStartedPath,
      `---
title: Getting Started
description: How to get started with your documentation
order: 1
---

# Getting Started

## Adding Pages

Create \`.md\` or \`.mdx\` files in the \`docs/\` folder. Each file becomes a page.

## Organizing with Folders

Create subfolders to group related pages:

\`\`\`
docs/
├── index.md              # Home page
├── getting-started.md    # This page
└── guides/
    ├── installation.md
    └── configuration.md
\`\`\`

Folders automatically become navigation groups.

## Frontmatter

Control page metadata with frontmatter:

\`\`\`yaml
---
title: My Page Title
description: A brief description
order: 1
---
\`\`\`

## Running the Dev Server

\`\`\`bash
npx clearify dev
\`\`\`

## Building for Production

\`\`\`bash
npx clearify build
\`\`\`

This outputs a static site to \`docs-dist/\`.
`
    );
    console.log('  Created docs/getting-started.md');
  }

  // Create CHANGELOG.md at project root
  const changelogPath = resolve(cwd, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(
      changelogPath,
      `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - ${today}

### Added

- Initial project setup
- Documentation site powered by Clearify
`
    );
    console.log('  Created CHANGELOG.md');
  } else {
    console.log('  CHANGELOG.md already exists, skipping');
  }

  // Create clearify.config.ts
  if (!existsSync(configPath)) {
    writeFileSync(
      configPath,
      `import { defineConfig } from 'clearify';

export default defineConfig({
  name: 'My Documentation',
  theme: {
    primaryColor: '#3B82F6',
    mode: 'auto',
  },
});
`
    );
    console.log('  Created clearify.config.ts');
  } else {
    console.log('  clearify.config.ts already exists, skipping');
  }

  console.log(`
  Done! Next steps:

    npx clearify dev        Start the dev server
    npx clearify build      Build for production
`);
}
