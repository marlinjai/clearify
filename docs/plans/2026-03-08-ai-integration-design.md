---
title: "AI-Native Documentation Features"
category: plan
status: draft
date: 2026-03-08
tags: [ai, rag, mcp, v3.0]
---

# AI-Native Documentation Features

## Overview

Make Clearify docs AI-native: searchable by AI agents, queryable via conversational chat, and automatically summarized. This covers four capabilities — `llms.txt` generation, per-page AI summaries, an MCP server for agent access, a markdown export endpoint, and an embedded AI chat widget — ordered by implementation complexity.

## 1. llms.txt Generation (v2.1)

Auto-generate `/llms.txt` and `/llms-full.txt` at build time so AI agents and crawlers can discover and consume docs efficiently.

### Output Format

**`llms.txt`** — table of contents, one line per page:

```
# Project Name

> One-line project description from config

## Docs

- [Getting Started](/getting-started): Set up Clearify in under 5 minutes
- [Configuration](/configuration): All config options for clearify.config.ts
- [Components](/components): Built-in MDX components reference
```

**`llms-full.txt`** — full markdown content of all pages concatenated, separated by `---` and page path headers.

### Implementation

- Hook into the existing `clearify build` pipeline after static HTML generation
- Walk the resolved page tree, extract title + first sentence (or frontmatter `description`) for `llms.txt`
- For `llms-full.txt`, concatenate raw markdown source of each page
- Respect `excludePatterns` and draft/internal section visibility
- Write both files to the build output root

### Configuration

```ts
// clearify.config.ts
export default {
  ai: {
    llmsTxt: true, // default: false
  },
};
```

No additional dependencies required. Pure file generation at build time.

## 2. Per-Page Summaries

Generate 1-2 sentence AI summaries for every page at build time. Use them as meta descriptions, search result previews, and card descriptions.

### Build-Time Flow

1. Hash each page's markdown content (SHA-256)
2. Check cache (`node_modules/.cache/clearify-summaries/`) for existing summary with matching hash
3. If cache miss, send content to LLM with a fixed prompt: _"Summarize this documentation page in 1-2 sentences. Be specific and technical."_
4. Store result in cache as `{ hash, summary, model, timestamp }`

### Storage & Usage

- Write summaries to `_clearify/summaries.json` in build output
- Inject as `<meta name="description">` when page frontmatter lacks a `description`
- Feed into search index for richer result previews
- Use as card descriptions in hub project grids

### Configuration

```ts
ai: {
  summaries: {
    enabled: true,
    provider: 'openai',       // 'openai' | 'anthropic' | 'ollama'
    model: 'gpt-4o-mini',     // cheap, fast, good enough for summaries
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: undefined,       // custom endpoint for Ollama/proxies
  },
}
```

### Caching Strategy

- Cache key: `${pagePath}-${contentHash}`
- Summaries regenerate only when page content changes
- `clearify build --no-cache` forces full regeneration
- Cache is local — not committed to git

## 3. MCP Server

Expose Clearify docs as MCP (Model Context Protocol) resources so AI agents like Claude Code and Cursor can query them directly.

### Tools

| Tool | Description |
|------|-------------|
| `list_pages()` | Returns all page paths with titles and summaries |
| `read_page(path)` | Returns full markdown content of a single page |
| `search_docs(query)` | Full-text search across all pages, returns ranked results |
| `get_summary(path)` | Returns AI-generated summary for a page |

### Resources

Each doc page is exposed as an MCP resource:

```
clearify://project-name/getting-started
clearify://project-name/api/authentication
```

Resource metadata includes title, description, tags, and last-modified date.

### Architecture

- **Local mode**: `clearify mcp` starts a stdio-based MCP server reading from the docs directory
- **Remote mode**: `clearify mcp --remote` starts an HTTP SSE server (deployable as a Worker)
- Both modes share the same handler logic — only the transport differs

### Build Integration

When `ai.mcp` is enabled, `clearify build` outputs an `mcp-server.js` bundle alongside the static site. This is a standalone Node script that serves the built docs via MCP.

### Configuration

```ts
ai: {
  mcp: true, // default: false — adds MCP server to build output
}
```

### Usage

```json
// .claude/settings.json or mcp.json
{
  "mcpServers": {
    "project-docs": {
      "command": "node",
      "args": ["./dist/mcp-server.js"]
    }
  }
}
```

## 4. Markdown Export Endpoint

Serve raw markdown for any page via a simple HTTP endpoint, useful for AI agents that prefer markdown over HTML.

### Endpoint

```
GET /api/docs/:path.md
```

Returns the raw markdown source with `Content-Type: text/markdown; charset=utf-8`.

### Behavior

- Path maps directly to the docs file tree: `/api/docs/getting-started.md` → `docs/public/getting-started.md`
- Returns 404 for non-existent pages or pages excluded by `excludePatterns`
- Respects section visibility (internal pages require auth if configured)
- `Cache-Control: public, max-age=3600` for static deployments

### Implementation Options

- **Static build**: Generate `.md` copies in `/api/docs/` directory during build — works on any static host
- **Worker/server**: Add route handler in dev server and optional edge middleware

### Rate Limiting

For deployed sites, apply per-IP rate limiting (60 req/min default) via config:

```ts
ai: {
  markdownExport: {
    enabled: true,
    rateLimit: 60, // requests per minute per IP
  },
}
```

## 5. AI Chat Widget (v3.0)

Embedded conversational chat component in the docs site, powered by RAG over the documentation content.

### RAG Pipeline

**Build time:**
1. Split each page into chunks (~500 tokens, respecting heading boundaries)
2. Generate vector embeddings for each chunk
3. Store in a local index file (`_clearify/vectors.json`) or external vector DB

**Runtime:**
1. User submits question in chat widget
2. Embed the query using the same model
3. Similarity search against the index → top-k relevant chunks
4. Assemble prompt: system instructions + retrieved chunks + user question
5. Stream LLM response to the UI

### Citation

Every response includes source references linking back to the exact doc section. Rendered as clickable footnotes: _"Based on [Configuration > Theme](/configuration#theme) and [Components > Callout](/components#callout)."_

### Architecture Options

| Approach | Pros | Cons |
|----------|------|------|
| **API proxy (Worker)** | Keys stay server-side, works everywhere | Needs deployment, adds latency |
| **Client-side (WebLLM)** | Zero server cost, fully private | Large model download, limited quality |
| **External service** | Managed RAG, no infra | Vendor lock-in, cost |

Default: API proxy via Cloudflare Worker. Ship a `clearify-chat-worker/` template that users deploy to their own account.

### Configuration

```ts
ai: {
  chat: {
    enabled: true,
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY, // used by proxy Worker
    proxyUrl: 'https://docs-chat.example.workers.dev',
    welcomeMessage: 'Ask anything about this project.',
  },
}
```

### UI

- Floating button (bottom-right corner), expandable to a side panel
- Markdown rendering in responses with syntax highlighting
- Conversation history persisted in `sessionStorage`
- Keyboard shortcut: `Cmd+K` (configurable, avoids conflict with search via modifier)

## Implementation Order

| Phase | Feature | Effort | Value |
|-------|---------|--------|-------|
| 1 | llms.txt generation | ~1 day | High — zero-config AI discoverability |
| 2 | Per-page summaries | ~2 days | Medium — improves SEO and search UX |
| 3 | MCP server | ~3 days | High — direct agent integration |
| 4 | Markdown export | ~1 day | Medium — simple, supports agents |
| 5 | AI chat widget | ~2 weeks | High — flagship feature, needs infra |

Phases 1-4 are build-time features with no runtime infrastructure. Phase 5 requires a deployed proxy and vector storage, making it significantly more complex. Ship 1-4 as part of v2.1-v2.5, then tackle chat as the centerpiece of v3.0.
