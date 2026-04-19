---
title: llms.txt for AI Discoverability
description: Auto-generated llms.txt and llms-full.txt so AI agents can consume your docs
order: 7
summary: Clearify generates /llms.txt and /llms-full.txt on every build so AI agents like ChatGPT and Claude can discover and ingest your documentation.
type: documentation
tags: [clearify, ai, llms-txt, discoverability]
projects: [clearify]
---

# llms.txt

Clearify writes two AI-native text files into your build output on every `clearify build`:

- `/llms.txt`: a short index listing every documentation page with a one-line summary and an absolute URL. Based on the [llms.txt proposal](https://llmstxt.org/).
- `/llms-full.txt`: the full markdown body of every documentation page concatenated into a single file.

Both files live at the root of your build output next to `index.html`, so they are served as `https://your-site.com/llms.txt` and `https://your-site.com/llms-full.txt`.

## Why it matters

AI agents like ChatGPT, Claude, and custom RAG systems use these files as a zero-friction ingest path. Rather than crawling the HTML, stripping navigation, and guessing at structure, they fetch one file with clean markdown and source URLs. Shipping them puts your docs directly into the context window of whoever is asking.

## What gets included

The generator walks every production section configured in `clearify.config.ts` (draft sections are skipped) and emits one bullet per page in `llms.txt`, grouped by section label. For example:

```
# Clearify

> Documentation site generator (powers this site)

## Documentation

- [Getting Started](https://clearify.lumitra.co/getting-started): Install Clearify as a dev dependency.
- [Configuration](https://clearify.lumitra.co/configuration): All config options for clearify.config.ts.

## Optional

- [Changelog](https://clearify.lumitra.co/changelog): Release history.
- [Roadmap](https://clearify.lumitra.co/roadmap): Planned and upcoming features.
```

The summary for each page is the first prose paragraph of the markdown body. If the body has no prose (reference pages, tables-only), the generator falls back to the frontmatter `summary` or `description` field.

High-order pages like the root `CHANGELOG.md` and `ROADMAP.md` (order >= 9000) land under `## Optional` at the end of the index.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `generateLlmsTxt` | `boolean` | `true` | Whether to write `llms.txt` and `llms-full.txt` during `clearify build`. |
| `siteUrl` | `string` | - | Production URL used as the base for absolute links. Required when `generateLlmsTxt` is `true`. |

Example:

```typescript
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: 'My Project',
  siteUrl: 'https://docs.example.com',
  generateLlmsTxt: true,
});
```

If `generateLlmsTxt` is `true` (the default) but `siteUrl` is unset, the build fails with a clear error. Set `generateLlmsTxt: false` to opt out entirely.

## When to disable

Disable `generateLlmsTxt` if:

- Your site is private and you don't want an easily-crawlable markdown dump.
- You maintain `llms.txt` by hand and prefer it not to be overwritten.
- You build to a target where writing text files at the output root conflicts with your hosting platform.

In all other cases, leave it on. The files are tiny (typically a few KB for `llms.txt`, under 1 MB for `llms-full.txt` on most doc sites) and every deployed site benefits from being AI-readable by default.
