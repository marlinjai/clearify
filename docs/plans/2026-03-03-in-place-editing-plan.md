---
title: In-Place Documentation Editing — Implementation Plan
summary: Plan for allowing authenticated users to edit documentation in-place on deployed Clearify sites, reducing friction for small fixes. Evaluates three architecture options with git as source of truth.
category: plan
tags: [clearify, in-place-editing, cms, git, implementation]
projects: [clearify]
status: active
date: 2026-03-03
---

# In-Place Documentation Editing — Implementation Plan

> Status: **Draft** | Created: 2026-03-03

## Problem

Clearify sites are currently read-only static sites. Engineers and administrators who spot a typo, want to update a section, or need to add a quick note must:

1. Clone the repo locally
2. Find the correct `.md` file
3. Edit it
4. Commit, push, wait for CI to rebuild and deploy

This friction means small fixes don't happen. Docs drift out of date.

## Goal

Allow authenticated users to **edit documentation in-place** on a deployed Clearify site — click edit, change the content, save, and see the result. The source of truth remains git.

## Architecture Decision: Three Options

### Option A: Git-Backed Editing (recommended first)

```
Browser editor  →  Clearify API  →  GitHub API (commit)  →  CI rebuild  →  deploy
```

**How it works:**

1. User visits a docs page, clicks "Edit this page"
2. Redirected to GitHub OAuth → grants Clearify permission to the source repo
3. An editor overlay appears (split pane: markdown source + live preview)
4. User edits, clicks "Save"
5. Clearify calls the **GitHub Contents API** (`PUT /repos/:owner/:repo/contents/:path`) with the new file content
6. This creates a **git commit** on `main` (or a configurable branch, or a PR)
7. GitHub Actions triggers: `clearify build` → `wrangler deploy`
8. **30–120 seconds later**, the live site reflects the change

**Key characteristics:**
- Deployed site remains **100% static** — no server component, no database
- **Git is the source of truth** — full history, blame, rollback for free
- Auth delegated to **GitHub OAuth** — no user management in Clearify
- Works with **every deployment target** (Pages, Workers, Netlify, Vercel, S3, Docker)
- **Tradeoff:** 30–120s delay between save and live update

### Option B: Direct Server-Side Editing

```
Browser editor  →  Server endpoint  →  write to filesystem  →  HMR / rebuild
```

**How it works:**
- The deployed site includes a server component (Node.js, Worker)
- Edits write directly to `.md` files (or KV/R2 on Workers)
- Instant in dev mode (Vite HMR), near-instant in production

**Key characteristics:**
- **Not compatible with static hosting** (Pages, Netlify, S3)
- Works with: Node.js servers, Docker, self-hosted
- On Workers: needs KV/R2 as storage layer (no filesystem)
- Simpler than Option C but less universal than Option A

### Option C: Hybrid — Instant Preview + Eventual Git Sync (premium)

```
Browser editor  →  Worker/API  →  KV/R2 (instant)  →  async git commit  →  eventual rebuild
```

**How it works:**

1. User saves an edit → the Worker stores the new markdown in Cloudflare KV (~5ms). User instantly sees the change.
2. Any reader visits that page → the Worker checks KV before serving the static asset. If a draft exists, it renders the draft markdown instead. Readers see the edit **immediately**.
3. In the background → the Worker commits to git via GitHub API. CI triggers a full rebuild + deploy (30–120s).
4. After rebuild → the static assets now include the edit "baked in." The KV draft is cleaned up (or expires via TTL).

**Key characteristics:**
- **Zero-delay editing** — edits visible to all readers instantly
- Git remains the **durable source of truth**, but KV is the fast layer
- Requires a **Worker middleware** in front of static assets (not purely static anymore)
- Requires **server-side markdown rendering** at the edge (remark/rehype in a Worker)
- Needs **conflict resolution** (two people editing the same page)
- Needs **cache invalidation** strategy (when to clean up KV drafts)

**Why this is "premium":**
It transforms Clearify from a **build tool** (generate static files) into a **runtime platform** (serve dynamic content with a build-time optimization layer). This is fundamentally different:

| | Git-backed (A) | Hybrid (C) |
|---|---|---|
| Clearify's role | Build tool | Build tool + runtime |
| Deployed site | Static files | Worker + static files |
| Edit latency | 30–120s | Instant |
| Infrastructure | Just hosting | Hosting + KV + Worker |
| Complexity | Low | High |
| Failure modes | Build fails → edit in git but not live | KV desync, edge render errors, conflicts |

The real-world analogy:
- **Option A** = Google Docs saving to a shared drive that rebuilds a PDF
- **Option C** = Notion — edit and everyone sees it instantly, background sync to durable storage

## Recommended Approach: Phased

### Phase 1 — Local Dev Editing (quick win, no auth needed)

The Clearify dev server already watches `.md` files via Vite. This phase adds:

- **Edit API endpoint** on the dev server: `POST /__clearify/save` accepts `{ filePath, content }`
- **Editor overlay** in the theme: toggle-able panel with a markdown editor (CodeMirror)
- **Flow:** user edits in browser → POST to dev server → server writes `.md` file → Vite HMR reloads instantly
- **Auth:** implicit — only accessible on `localhost`
- **Scope:** dev mode only, no production impact

**Config:**
```ts
export default defineConfig({
  editing: {
    dev: true, // enable in-browser editing in dev mode (default: false)
  },
});
```

**Files to create/modify:**
- `src/theme/components/Editor.tsx` — CodeMirror-based markdown editor with split preview
- `src/theme/components/EditButton.tsx` — floating "Edit" button on each page
- `src/vite-plugin/index.ts` — add `/__clearify/save` POST handler in `configureServer`
- `src/types/index.ts` — add `editing` config option

### Phase 2 — Git-Backed Production Editing (Option A)

This is the universal production editing capability.

**Config:**
```ts
export default defineConfig({
  editing: {
    dev: true,
    provider: 'github',
    repo: 'marlinjai/storage-brain', // inferred from git remote if omitted
    branch: 'main',                  // default: 'main'
    mode: 'direct',                  // 'direct' = commit to branch, 'pr' = create PR
  },
});
```

**Auth flow:**
1. User clicks "Edit" → if not authenticated, redirect to GitHub OAuth
2. OAuth app requests `repo` scope (to write files)
3. Token stored in browser (httpOnly cookie or localStorage)
4. Subsequent edits use the token to call GitHub API

**Save flow:**
1. Editor POSTs `{ path: 'docs/public/quickstart.md', content: '...' }` to a client-side function
2. Client calls GitHub Contents API directly (no Clearify backend needed):
   ```
   PUT https://api.github.com/repos/:owner/:repo/contents/:path
   Headers: Authorization: token <user-oauth-token>
   Body: { message: "docs: update quickstart", content: base64(newContent), sha: currentSha }
   ```
3. GitHub creates a commit. CI triggers rebuild.
4. UI shows "Saved — rebuilding..." with a link to the commit

**For remote sections (git-based):**
When editing a page from a remote git section (e.g., Brain Core docs embedded in Cloud), the save targets the **source repo** (brain-core), not the host repo (cloud). The editor resolves the correct repo from the section's `git` config.

**Files to create/modify:**
- `src/theme/components/GitHubAuth.tsx` — OAuth flow + token management
- `src/theme/components/Editor.tsx` — extend with save-to-GitHub
- `src/types/index.ts` — extend `editing` config with provider options
- `src/client/github-api.ts` — GitHub Contents API wrapper (get SHA, update file)

**No server-side changes needed** — the browser talks directly to GitHub's API.

### Phase 3 — Instant Preview Layer (Option C, if demand warrants)

Only build this when users say "I need instant editing in production."

**Architecture:**
- A Clearify Worker middleware (published as `@marlinjai/clearify-edge`) sits in front of static assets
- On save: store rendered HTML in KV (key = URL path), store markdown in R2 (for future rebuilds)
- On read: Worker checks KV before serving static asset. If draft exists, serve it
- Async: commit to git, trigger rebuild. After deploy, clean up KV draft
- Needs a rendering pipeline that runs in a Worker (subset of remark/rehype)

**Config:**
```ts
export default defineConfig({
  editing: {
    dev: true,
    provider: 'github',
    repo: 'marlinjai/storage-brain',
    instant: true,  // enable Option C
    kv: { binding: 'CLEARIFY_DRAFTS' },
  },
});
```

**Additional complexity:**
- Server-side markdown → HTML rendering in a Worker (bundle size matters)
- Conflict resolution when two users edit the same page
- KV TTL and cleanup after successful rebuild
- Fallback behavior when KV is unavailable
- Image upload handling (need R2 or similar)

## The Editor Component

The editor itself is shared across all phases. Design choices:

| Approach | Pros | Cons |
|---|---|---|
| **Source editor** (CodeMirror) | Simple, handles MDX naturally, familiar to engineers | Non-technical users may struggle |
| **Block editor** (Notion-like) | Great UX for non-technical users | Complex to build, MDX components hard to represent |
| **Split pane** (source + preview) | Good middle ground, preview matches deployed rendering | More screen space needed |

**Recommendation:** Start with **split pane** (CodeMirror on left, live Clearify preview on right). This covers the target audience (engineers and admins) well. A block editor is a separate, much larger project.

**MDX handling:** The editor should support frontmatter editing (title, description, order, icon) via a structured form at the top, with the markdown body below. MDX components (`<Callout>`, `<Steps>`, etc.) are edited as raw source — the preview renders them.

## Deployment Compatibility

| Deployment | Phase 1 (dev) | Phase 2 (git-backed) | Phase 3 (instant) |
|---|---|---|---|
| Local dev server | yes | n/a | n/a |
| Cloudflare Pages | n/a | yes | needs Worker middleware |
| Cloudflare Workers | n/a | yes | yes (native KV/R2) |
| Netlify | n/a | yes | needs edge function |
| Vercel | n/a | yes | needs edge middleware |
| Docker / Node.js | n/a | yes | yes (Redis/file as KV) |
| S3 + CloudFront | n/a | yes | needs Lambda@Edge |

Phase 2 (git-backed) is **universally compatible** because it requires zero changes to the deployment — the browser talks directly to GitHub.

## Out of Scope (for now)

- **User management / roles** — rely on GitHub permissions (repo access = edit access)
- **Approval workflows** — use `mode: 'pr'` to create PRs instead of direct commits
- **Real-time collaboration** — one editor at a time per page
- **Non-GitHub providers** — GitLab, Bitbucket support can come later with the same pattern
- **Image upload** — Phase 3 concern (needs R2 or similar storage)

## Priority

1. **Phase 1** — low effort, high value for local development workflows
2. **Phase 2** — the core production feature, universally compatible
3. **Phase 3** — only if "instant editing" becomes a user demand
