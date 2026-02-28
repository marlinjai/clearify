import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

export interface InitOptions {
  noInternal?: boolean;
  noClaudeRules?: boolean;
}

export async function init(options: InitOptions = {}) {
  const cwd = process.cwd();
  const publicDir = resolve(cwd, 'docs/public');
  const internalDir = resolve(cwd, 'docs/internal');
  const configPath = resolve(cwd, 'clearify.config.ts');

  console.log('\n  Initializing Clearify...\n');

  // Create docs/public directory
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
    console.log('  Created docs/public/');
  } else {
    console.log('  docs/public/ already exists, skipping');
  }

  // Create docs/public/index.md
  const indexPath = resolve(publicDir, 'index.md');
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

Edit this file at \`docs/public/index.md\` to update your home page.

## Features

- Write docs in **Markdown** or **MDX**
- Built-in **search** across all pages
- **Dark mode** support out of the box
- **Syntax highlighting** with Shiki
- **Zero config** — just add markdown files

## Next Steps

- Add more pages to the \`docs/public/\` folder
- Create subfolders for organized navigation
- Customize with \`clearify.config.ts\`
`
    );
    console.log('  Created docs/public/index.md');
  }

  // Create docs/public/getting-started.md
  const gettingStartedPath = resolve(publicDir, 'getting-started.md');
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

Create \`.md\` or \`.mdx\` files in the \`docs/public/\` folder. Each file becomes a page.

## Organizing with Folders

Create subfolders to group related pages:

\`\`\`
docs/
├── public/
│   ├── index.md              # Home page
│   ├── getting-started.md    # This page
│   └── guides/
│       ├── installation.md
│       └── configuration.md
└── internal/                 # Design docs, roadmaps
    └── index.md
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
    console.log('  Created docs/public/getting-started.md');
  }

  // Create docs/internal section (unless --no-internal)
  if (!options.noInternal) {
    if (!existsSync(internalDir)) {
      mkdirSync(internalDir, { recursive: true });
      console.log('  Created docs/internal/');
    } else {
      console.log('  docs/internal/ already exists, skipping');
    }

    const internalIndexPath = resolve(internalDir, 'index.md');
    if (!existsSync(internalIndexPath)) {
      writeFileSync(
        internalIndexPath,
        `---
title: Internal Docs
description: Internal documentation — design docs, roadmaps, and architecture
order: 0
---

# Internal Docs

This section is for internal documentation that isn't published to your public site.

## What goes here?

- **Design documents** — technical designs and proposals
- **Roadmaps** — planned features and milestones
- **Architecture decisions** — ADRs and context for past choices
- **Meeting notes** — decisions and action items

> This section is marked as \`draft\` and won't be included in production builds.
`
      );
      console.log('  Created docs/internal/index.md');
    }
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
    if (options.noInternal) {
      writeFileSync(
        configPath,
        `import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: 'My Documentation',
  docsDir: './docs/public',
  theme: {
    primaryColor: '#3B82F6',
    mode: 'auto',
  },
});
`
      );
    } else {
      writeFileSync(
        configPath,
        `import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: 'My Documentation',
  sections: [
    { label: 'Docs', docsDir: './docs/public' },
    { label: 'Internal', docsDir: './docs/internal', basePath: '/internal', draft: true },
  ],
  theme: {
    primaryColor: '#3B82F6',
    mode: 'auto',
  },
});
`
      );
    }
    console.log('  Created clearify.config.ts');
  } else {
    console.log('  clearify.config.ts already exists, skipping');
  }

  // Create .claude/rules/clearify-docs.md
  if (!options.noClaudeRules) {
    const claudeRulesDir = resolve(cwd, '.claude/rules');
    const claudeRulesPath = resolve(claudeRulesDir, 'clearify-docs.md');
    if (!existsSync(claudeRulesPath)) {
      mkdirSync(claudeRulesDir, { recursive: true });
      const hasInternal = !options.noInternal;
      const rulesContent = `# Clearify Documentation Rules

When making changes to this project, keep the documentation in sync:

1. **Changelog** — After any user-facing change, add a bullet under \`## [Unreleased]\` in \`CHANGELOG.md\` using [Keep a Changelog](https://keepachangelog.com/) format (\`Added\`, \`Changed\`, \`Fixed\`, \`Removed\`).

2. **Docs pages** — When a feature or behavior changes, update the relevant page in \`docs/public/\`. If a new feature has no page, create one.

3. **Config docs** — When config options are added or changed, update \`docs/public/configuration.md\` with the new option, type, default, and description.
${hasInternal ? `
4. **Architecture decisions** — For significant design decisions, add an entry to \`docs/internal/\` explaining the context, decision, and trade-offs.
` : ''}`;
      writeFileSync(claudeRulesPath, rulesContent);
      console.log('  Created .claude/rules/clearify-docs.md');
    } else {
      console.log('  .claude/rules/clearify-docs.md already exists, skipping');
    }
  }

  console.log(`
  Done! Next steps:

    npx clearify dev        Start the dev server
    npx clearify build      Build for production
`);
}
