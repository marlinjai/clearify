---
title: Installation
description: Installation guide and prerequisites per usage mode
order: 3
summary: Installation guide for Clearify covering system requirements, package manager options, and prerequisites for hub mode onboarding.
type: documentation
tags: [clearify, installation, setup, npm, hub]
projects: [clearify]
---

# Installation

## Requirements

- Node.js 22 or later
- npm, pnpm, or yarn

## Package Managers

### pnpm (recommended)

```bash
pnpm add -D @marlinjai/clearify
```

### npm

```bash
npm install @marlinjai/clearify --save-dev
```

### yarn

```bash
yarn add -D @marlinjai/clearify
```

## Prerequisites for Hub Mode

Hub mode aggregates docs from many repos into one site. Onboarding a sub-repo requires one secret, `HUB_DISPATCH_TOKEN`, a GitHub Actions secret on the sub-repo. Three paths to provision it (see [Hub Model](./hub-model.md) for the decision tree).

**Always need:** a GitHub account with access to both repos, and a PAT with `Contents: Write` on the hub repo (classic `repo` scope also works). This PAT is the `HUB_DISPATCH_TOKEN` value.

**Path-specific:**

| Path | Extra prerequisites |
|------|---------------------|
| Manual (GitHub UI) | None. Good for one-off onboarding. |
| CLI-assisted (`clearify init --hub --auto-secret`, planned) | A GitHub OAuth App with `repo` scope. Export `CLEARIFY_GITHUB_CLIENT_ID`. |
| Terraform (`github_actions_secret`) | Terraform 1.6+, `integrations/github` provider, secret manager (Infisical, Vault, etc) for the raw PAT. |

Next: follow the [Hub onboarding walkthrough](./getting-started.md#hub-onboarding).
