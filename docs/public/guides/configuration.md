---
title: Configuration
description: How to configure Clearify
order: 2
---

# Configuration

Clearify works with zero configuration. But when you need control, create a `clearify.config.ts`:

```typescript
import { defineConfig } from 'clearify';

export default defineConfig({
  name: 'My Project',
  theme: {
    primaryColor: '#8B5CF6',
    mode: 'auto',
  },
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'Documentation'` | Site name shown in header |
| `docsDir` | `string` | `'./docs'` | Path to docs folder |
| `outDir` | `string` | `'./docs-dist'` | Build output directory |
| `theme.primaryColor` | `string` | `'#3B82F6'` | Primary brand color |
| `theme.mode` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Color scheme |
