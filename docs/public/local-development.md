---
title: Local Development
description: Using Clearify across projects with pnpm link
order: 5
---

# Local Development

Clearify is designed to be used across multiple standalone projects. Since there is no shared monorepo workspace, `pnpm link` is the recommended way to use a local build of Clearify in other projects.

## Building Clearify

First, build and link Clearify globally:

```bash
cd projects/clearify
pnpm run build
pnpm link --global
```

This makes the `clearify` package available globally on your machine.

## Using in another project

In the project where you want to use Clearify:

```bash
cd projects/data-table
pnpm link --global @marlinjai/clearify
```

Now you can create a `docs/` folder and run the dev server:

```bash
mkdir -p docs
echo "# Data Table Docs" > docs/index.md
pnpm exec clearify dev
```

The dev server starts at `http://localhost:4747`. The header will automatically show the project name from `package.json`.

## Configuration

Create a `clearify.config.ts` in the project root to customize behavior:

```typescript
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: 'Data Table',
  exclude: ['ROADMAP.md', '**/design-*.md'],
});
```

## Unlinking

To remove the link when you're done:

```bash
cd projects/data-table
pnpm unlink @marlinjai/clearify
```

## Rebuilding after changes

After making changes to Clearify itself, rebuild before testing:

```bash
cd projects/clearify
pnpm run build
```

The link persists across rebuilds — no need to re-link.
