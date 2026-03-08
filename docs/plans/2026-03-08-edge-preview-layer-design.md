---
title: "Edge Preview Layer — Detailed Design (v2.5 Phase 3)"
category: plan
status: draft
date: 2026-03-08
tags: [editing, edge, preview, v2.5]
---

# Edge Preview Layer — Detailed Design (v2.5 Phase 3)

> Status: **Draft** | Created: 2026-03-08
> Prerequisite: Phase 2 (Git-Backed Production Editing) must be implemented first.

## 1. Overview

### Problem

Phase 2 delivers git-backed in-place editing: the user saves, a GitHub commit is created, CI rebuilds the static site, and 30 seconds to 2 minutes later the change is live. This delay is acceptable for infrequent documentation updates, but it breaks the editing flow when authors are iterating on content. The editor clicks "Save," waits, refreshes, realizes a heading is wrong, edits again, waits again. Two minutes of latency per save makes multi-pass editing painful.

### Solution

Insert a Cloudflare Worker between the user and the static site. When an editor saves a change:

1. The rendered draft is written to **Cloudflare KV** immediately (~5ms).
2. The editor sees the update **instantly** on the next page load.
3. In the background, the Worker commits to git via the GitHub API and triggers the CI rebuild.
4. After rebuild completes, the KV draft is cleared and the static asset takes over.

This gives editors instant feedback while preserving git as the durable source of truth. Other visitors continue to see the published static version unless they have draft access.

## 2. Architecture

### Request Flow

```
                         ┌──────────────────────────┐
                         │   Cloudflare Worker       │
   Browser ──request──▶  │   (@marlinjai/clearify-   │
                         │    edge)                  │
                         │                           │
                         │  1. Authenticate request  │
                         │  2. Check KV for draft    │
                         │  3. If draft → serve it   │
                         │  4. If no draft → proxy   │
                         │     to static asset       │
                         └──────────┬────────────────┘
                                    │ fallback
                                    ▼
                         ┌──────────────────────────┐
                         │  Static Site (Pages/R2)   │
                         └──────────────────────────┘
```

### Save Flow

```
Editor clicks "Save"
       │
       ├──▶ [Sync]  Write draft HTML to KV          (~5ms)
       │             Return success to editor
       │
       └──▶ [Async] Commit to GitHub via API         (~1-3s)
                     GitHub Actions triggers rebuild  (~30-120s)
                     On rebuild complete:
                       ├── Webhook or poll confirms deploy
                       └── Clear KV draft entry
```

### Components

| Component | Role | Package |
|-----------|------|---------|
| **Edge Worker** | Intercepts requests, serves drafts from KV, proxies to static | `@marlinjai/clearify-edge` |
| **Save Endpoint** | Worker route `POST /__clearify/save` — writes KV + async git commit | Part of Edge Worker |
| **Rebuild Webhook** | Worker route `POST /__clearify/webhook` — clears KV after deploy | Part of Edge Worker |
| **Editor UI** | Browser-side editor from Phase 2, updated to POST to Worker | `@marlinjai/clearify` theme |

### Rendering Strategy

Drafts stored in KV are **pre-rendered HTML**. The Worker does not perform markdown-to-HTML conversion at the edge — that would require bundling remark/rehype into the Worker (adding ~200KB+ and cold-start risk). Instead:

1. The **browser editor** already renders a live preview using the theme's remark/rehype pipeline.
2. On save, the editor sends both the **raw MDX source** and the **rendered HTML** to the Worker.
3. The Worker stores the rendered HTML in KV for serving, and the raw MDX for the git commit.

This keeps the Worker thin and fast — it only does KV lookups and proxying.

## 3. KV Schema

### Key Format

```
draft:{normalized-path}:{userId}
```

**Examples:**
```
draft:/docs/quickstart:github|12345
draft:/api/authentication:github|67890
draft:/guides/setup:github|12345
```

### Value Structure

```json
{
  "html": "<article>...rendered HTML...</article>",
  "mdx": "---\ntitle: Quickstart\n---\n\n# Getting Started...",
  "path": "docs/public/quickstart.md",
  "author": "github|12345",
  "authorName": "marlinjai",
  "createdAt": "2026-03-08T14:30:00Z",
  "etag": "a1b2c3d4",
  "gitSha": null,
  "status": "draft"
}
```

### Secondary Index Key

To list all drafts for a page (across editors):

```
drafts-by-path:{normalized-path}  →  ["github|12345", "github|67890"]
```

### TTL Policy

| Scenario | TTL |
|----------|-----|
| Active draft (not yet committed) | 24 hours |
| Committed draft (awaiting rebuild) | 2 hours |
| Fallback (rebuild failed) | 72 hours |

TTLs are set via KV's `expirationTtl` on write. This guarantees stale drafts are auto-cleaned even if the webhook never fires.

## 4. Draft States

A draft transitions through three states:

```
 ┌─────────┐      git commit       ┌────────────┐     rebuild done     ┌────────────┐
 │  DRAFT  │ ──────────────────▶   │  COMMITTED │ ──────────────────▶  │ PUBLISHED  │
 │ (KV)    │                       │ (KV + git) │                      │ (static)   │
 └─────────┘                       └────────────┘                      └────────────┘
      │                                  │                                    │
      │  editor discards                 │  rebuild fails                     │
      ▼                                  ▼                                    │
 ┌─────────┐                       ┌────────────┐                            │
 │ DELETED │                       │  FALLBACK  │  ◀── admin can retry ──────┘
 └─────────┘                       │ (KV persists)│
                                   └────────────┘
```

- **DRAFT**: Exists only in KV. The editor sees it; no one else does (unless sharing is enabled). Git has no knowledge of it.
- **COMMITTED**: The git commit has been created. KV still serves the draft while the rebuild runs. `status` field updated to `"committed"`, `gitSha` populated.
- **PUBLISHED**: Rebuild completed successfully. KV entry is deleted. The static site now contains the change.
- **FALLBACK**: Rebuild failed. KV entry persists with extended TTL (72h). Admin is notified and can retry or discard.

## 5. Conflict Resolution

### Scenario

Two editors (Alice and Bob) both edit `/docs/quickstart` at the same time.

### Strategy: Last-Write-Wins with Optimistic Locking

Each draft carries an `etag` — a hash of the content at the time the editor loaded the page. On save:

1. Editor sends `{ content, etag }` to `POST /__clearify/save`.
2. Worker checks if a draft already exists for that path.
3. If the existing draft's `etag` matches the submitted `etag`, the save proceeds (the editor had the latest version).
4. If the `etag` does not match, the Worker returns `409 Conflict` with the current draft content.
5. The editor UI shows a diff: "This page was modified by Bob 2 minutes ago. Review changes and retry."

### Per-User Drafts

Each editor gets their own KV entry (`draft:{path}:{userId}`). This means Alice and Bob can both have drafts simultaneously without overwriting each other. The conflict check happens at **git commit time** — when committing, the Worker verifies the file's current SHA in git matches what the editor started from.

### Merge Policy

Clearify does **not** attempt automatic merging. If a conflict is detected:

- The editor is shown both versions side by side.
- The editor manually resolves and saves again.
- This keeps the system simple and avoids silent data loss.

## 6. Cache Invalidation

### Cache Layers

| Layer | Controlled by | Invalidation method |
|-------|---------------|---------------------|
| **KV draft** | Worker | Delete key after rebuild webhook |
| **Worker cache (Cache API)** | Worker | `caches.default.delete(request)` on save |
| **Cloudflare CDN** | Cloudflare | Purge via API on rebuild webhook |
| **Browser cache** | `Cache-Control` header | Draft responses: `no-cache, must-revalidate` |

### Purge Strategy

**On editor save (draft created):**
1. Write draft to KV.
2. Purge the Worker's Cache API entry for that URL.
3. Draft responses include `Cache-Control: no-cache, no-store` — browsers always re-fetch.

**On rebuild complete (webhook received):**
1. Delete all KV draft entries for the rebuilt paths.
2. Purge Cloudflare CDN cache for those URLs via `POST https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache`.
3. Static assets resume with standard cache headers (`max-age=3600` or similar).

### Stale Content Window

Between rebuild completion and CDN purge propagation, there is a brief window (~1-5s) where some edge nodes may serve stale content. This is acceptable — it resolves itself within seconds.

## 7. Preview vs Published

### Editor Experience

When an authenticated editor views a page with an active draft:

```html
<div class="clearify-draft-banner" role="alert">
  <span>You are viewing a draft preview. This change is not yet published.</span>
  <span class="clearify-draft-meta">Saved 2 minutes ago · Rebuilding...</span>
  <button data-action="discard">Discard draft</button>
</div>
```

The banner is injected by the Worker when serving draft HTML. It is styled with a distinct background (amber/yellow) and is sticky at the top of the viewport.

### Visitor Experience

Unauthenticated visitors and editors without drafts always see the **published static version**. The Worker skips KV lookup entirely when no valid auth token is present — zero performance overhead for regular traffic.

### Shared Draft Preview

Editors can generate a time-limited preview URL to share with reviewers:

```
https://docs.example.com/__clearify/preview/{token}?path=/docs/quickstart
```

The token is a signed JWT (1-hour expiry) that grants read access to a specific draft. This lets reviewers see changes without needing GitHub access.

## 8. Authentication

### Reuse Phase 2 OAuth

The Edge Worker validates the same GitHub OAuth token used in Phase 2. The flow:

1. User authenticates via GitHub OAuth (handled by the editor UI).
2. OAuth token is stored in an `httpOnly` cookie: `clearify_token`.
3. On each request, the Worker extracts the cookie and validates the token.

### Token Validation

The Worker does **not** call the GitHub API on every request — that would add latency. Instead:

1. On first auth, the Worker exchanges the OAuth token for a short-lived JWT signed with a Worker secret.
2. The JWT contains: `{ sub: "github|12345", login: "marlinjai", exp: <1h>, repos: ["marlinjai/storage-brain"] }`.
3. On subsequent requests, the Worker validates the JWT signature locally (sub-millisecond).
4. When the JWT expires, the Worker re-validates the OAuth token with GitHub and issues a fresh JWT.

### Authorization

A user can only view/create drafts for repos they have **write access** to (verified via GitHub API during JWT issuance). The `repos` claim in the JWT lists authorized repositories.

## 9. Rollback

### Rebuild Failure

If the CI rebuild fails after a git commit:

1. The KV draft remains with `status: "fallback"` and extended TTL (72h).
2. The editor is notified: "Rebuild failed. Your changes are saved in git but the live preview is temporary."
3. Admin can trigger a manual rebuild via the Clearify dashboard or CI.
4. Once rebuild succeeds, normal cleanup proceeds.

### Discard Draft

An editor can discard their draft at any time:

- `DELETE /__clearify/draft?path=/docs/quickstart` — removes the KV entry.
- If the draft was already committed to git, the git commit remains (it's part of history). The editor can revert via a new commit.

### Revert Published Change

If a published change (already rebuilt into static) needs to be reverted:

1. Editor clicks "Revert" on the page.
2. The Worker fetches the previous version from git (`GET /repos/:owner/:repo/contents/:path?ref=HEAD~1`).
3. A new commit is created reverting the file.
4. The standard draft → commit → rebuild flow runs.

## 10. Performance

### Latency Budget

| Operation | Target | Mechanism |
|-----------|--------|-----------|
| KV read (draft check) | < 10ms | Cloudflare KV global edge reads |
| KV miss (no draft, proxy to static) | < 5ms overhead | Single KV GET, then passthrough |
| Save to KV | < 15ms | Single KV PUT |
| JWT validation | < 1ms | Local HMAC verification |
| Total overhead for non-draft requests | < 10ms | KV miss + no auth = fast path |

### Cold Start

Cloudflare Workers have **no cold start** — they run on V8 isolates that initialize in < 5ms. The Edge Worker is lightweight (no heavy dependencies), so startup is not a concern.

### Fast Path Optimization

For unauthenticated requests (the vast majority of traffic), the Worker skips both auth and KV lookup:

```ts
if (!request.headers.get('cookie')?.includes('clearify_token')) {
  return fetch(request); // passthrough to static, zero overhead
}
```

This ensures the preview layer adds **no measurable latency** for regular visitors.

## 11. Configuration

### Clearify Config

```ts
// clearify.config.ts
export default defineConfig({
  editing: {
    dev: true,
    provider: 'github',
    repo: 'marlinjai/storage-brain',
    preview: true,                          // enable edge preview layer
    kvNamespace: 'CLEARIFY_DRAFTS',         // KV namespace binding name
    workerUrl: 'https://docs-edge.example.com', // Worker URL (auto-detected if on CF)
    draftTtl: 86400,                        // draft TTL in seconds (default: 24h)
    fallbackTtl: 259200,                    // fallback TTL in seconds (default: 72h)
  },
});
```

### Environment Variables (Worker)

| Variable | Purpose |
|----------|---------|
| `CLEARIFY_DRAFTS` | KV namespace binding |
| `GITHUB_APP_PRIVATE_KEY` | For async git commits (GitHub App, not user token) |
| `JWT_SECRET` | HMAC secret for signing preview JWTs |
| `GITHUB_WEBHOOK_SECRET` | For verifying rebuild-complete webhooks |
| `STATIC_ASSETS_ORIGIN` | Origin URL of the static site (for proxying) |

## 12. Deployment

### Wrangler Configuration

```toml
# wrangler.toml
name = "clearify-edge"
main = "src/worker.ts"
compatibility_date = "2026-03-01"

[[kv_namespaces]]
binding = "CLEARIFY_DRAFTS"
id = "abc123"
preview_id = "def456"

[vars]
STATIC_ASSETS_ORIGIN = "https://docs.example.com"

# Route: all traffic to the docs domain goes through this Worker
[[routes]]
pattern = "docs.example.com/*"
zone_name = "example.com"
```

### Deployment Steps

1. **Create KV namespace:** `wrangler kv:namespace create CLEARIFY_DRAFTS`
2. **Set secrets:** `wrangler secret put JWT_SECRET`, etc.
3. **Deploy Worker:** `wrangler deploy`
4. **Configure DNS:** Point the docs domain to the Worker route.
5. **Set up webhook:** In the GitHub repo settings, add a webhook for `workflow_run` events pointing to `https://docs.example.com/__clearify/webhook`.
6. **Update Clearify config:** Set `editing.preview: true` and deploy the static site.

### CI Integration

The existing CI pipeline (GitHub Actions) needs one addition: after successful deploy, hit the webhook endpoint to trigger KV cleanup.

```yaml
# .github/workflows/deploy.yml (addition)
- name: Notify Clearify Edge
  if: success()
  run: |
    curl -X POST https://docs.example.com/__clearify/webhook \
      -H "X-Hub-Signature-256: sha256=$(echo -n '${{ toJSON(github) }}' | openssl dgst -sha256 -hmac '${{ secrets.CLEARIFY_WEBHOOK_SECRET }}')" \
      -H "Content-Type: application/json" \
      -d '{"action":"completed","paths":${{ steps.changed-files.outputs.json }}}'
```

## 13. Trade-offs

### What This Changes About Clearify

This phase transforms Clearify from a **pure build tool** (generate static files, done) into a **build tool + runtime platform** (generate static files + serve them through a smart edge layer). This is a fundamental architectural shift.

| Concern | Without Preview Layer | With Preview Layer |
|---------|----------------------|-------------------|
| Runtime dependencies | None | Cloudflare Worker + KV |
| Failure modes | Build fails = no deploy | Build fails + KV desync + Worker errors |
| Operational burden | Zero (static hosting) | Monitor Worker, KV usage, webhook delivery |
| Cost | Static hosting only | + Worker requests + KV reads/writes |
| Debugging | View source = view truth | Draft layer may differ from published |

### When NOT to Use This

- **Small teams (1-3 editors)** — the 30-120s delay from Phase 2 is tolerable. The complexity is not worth it.
- **Infrequent edits** — if docs are updated weekly, instant preview adds no meaningful value.
- **Non-Cloudflare deployments** — this design is Cloudflare-native. Adapting to Lambda@Edge or Vercel Edge adds significant work.
- **Regulatory environments** — draft content visible at the edge (even behind auth) may not meet compliance requirements for some organizations.

### When This Shines

- **Content-heavy teams** with 5+ editors making daily updates.
- **Multi-pass editing** where authors iterate on content and need fast feedback loops.
- **Review workflows** where stakeholders need to preview changes before they go live.
- **Training/onboarding** where documentation is actively being written and reviewed.

### Cost Estimate

| Resource | Free Tier | Paid (~10k daily page views) |
|----------|-----------|------------------------------|
| Worker requests | 100k/day free | ~$0.50/month |
| KV reads | 100k/day free | ~$0.50/month |
| KV writes | 1k/day free | ~$0.10/month |
| KV storage | 1 GB free | Negligible (drafts are small) |
| **Total** | **$0** | **~$1-2/month** |

For most documentation sites, the preview layer fits entirely within Cloudflare's free tier.
