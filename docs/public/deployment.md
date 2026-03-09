---
title: Deployment
description: How to deploy a Clearify documentation site
order: 7
summary: Deploy your Clearify docs site to Cloudflare Pages, Vercel, Netlify, or any static host.
category: documentation
tags: [clearify, deployment, cloudflare, ci-cd]
projects: [clearify]
status: active
---

# Deployment

Clearify builds a fully static site to `docs-dist/` (configurable via `outDir` in `clearify.config.ts`). This means you can deploy it anywhere that serves static files.

```bash
pnpm exec clearify build
# Output: docs-dist/
```

## Cloudflare Pages (Recommended)

Cloudflare Pages gives you global CDN, automatic HTTPS, and preview deployments on PRs — all on the free tier.

### GitHub Actions Workflow

Create `.github/workflows/deploy-docs.yml`:

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm exec clearify build

      - name: Deploy to Cloudflare Pages
        run: pnpm exec wrangler pages deploy docs-dist/ --project-name=my-docs
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Setup

1. Create a Cloudflare Pages project in the dashboard (or let the first deploy create it).
2. Generate an API token at **Cloudflare Dashboard > My Profile > API Tokens** with `Cloudflare Pages: Edit` permission.
3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets in GitHub.
4. Replace `my-docs` in the workflow with your project name.

> If your build command differs (e.g., `pnpm run docs:build` that wraps `clearify build`), adjust the workflow step accordingly.

### Preview Deployments

To get preview URLs on pull requests, add a second trigger:

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

Wrangler automatically creates a preview deployment when the branch is not `main`.

## Vercel

Vercel works out of the box with static output.

**Build settings:**

| Setting          | Value                      |
| ---------------- | -------------------------- |
| Framework Preset | Other                      |
| Build Command    | `pnpm exec clearify build` |
| Output Directory | `docs-dist`                |
| Node.js Version  | 22                         |

Or deploy manually:

```bash
pnpm exec clearify build
npx vercel deploy docs-dist/ --prod
```

## Netlify

**Build settings:**

| Setting          | Value                      |
| ---------------- | -------------------------- |
| Build Command    | `pnpm exec clearify build` |
| Publish Directory| `docs-dist`                |

Or add a `netlify.toml`:

```toml
[build]
  command = "pnpm exec clearify build"
  publish = "docs-dist"

[build.environment]
  NODE_VERSION = "22"
```

## Any Static Host

Clearify outputs plain HTML, CSS, and JS. Serve `docs-dist/` with any static file server:

```bash
pnpm exec clearify build

# Local preview
npx serve docs-dist

# Or rsync to a server
rsync -avz docs-dist/ user@server:/var/www/docs/
```

Works with GitHub Pages, AWS S3 + CloudFront, Firebase Hosting, Fly.io, or a plain Nginx/Caddy server — anything that can serve static files.
