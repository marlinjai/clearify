# Infrastructure Awareness & Agent Sync — Product Vision

**Status:** Draft / Long-term roadmap
**Created:** 2026-03-01
**Origin:** Production incident — a `clearify dev` process on the default port (4747) collided with a production docs server on the same port, taking down docs.lolastories.com for an unknown period.

---

## Problem Statement

Clearify already knows about projects (hub scanning, docs, OpenAPI specs). But it has zero awareness of how and where those projects are deployed. This leads to:

1. **Port collisions** — `clearify dev` defaults to port 4747. The Lola Stories production docs server also runs on 4747. Vite silently binds to IPv6 while the production server is on IPv4, and reverse proxies (cloudflared) route to the wrong one.
2. **No deployment visibility** — Knowing which services are running, on which ports, behind which domains, managed by which process manager (PM2, systemd, Docker) requires SSH-ing in and checking manually.
3. **Scattered infrastructure knowledge** — Port assignments, domain mappings, tunnel configs, and service dependencies live across cloudflared YAML, PM2 ecosystem files, agent memory files, and developers' heads. No single source of truth.
4. **Agent blind spots** — AI coding agents (Claude Code, etc.) don't know which ports are production-critical unless someone manually writes it into memory files. They can't warn you before starting a dev server on a port that'll break production.

## Vision

Extend Clearify from a documentation platform into an **infrastructure-aware documentation platform**. Projects already declare their identity via `clearify.config.ts` — they should also declare their deployment topology. This creates a single source of truth that serves humans (dashboard), dev tooling (port collision prevention), and AI agents (context sync).

---

## Proposed Phases

### Phase 1: Port Registry & Collision Prevention

**Goal:** `clearify dev` never starts on a port claimed by a production service.

**Config extension in `clearify.config.ts`:**

```ts
export default {
  name: 'Lola Stories Docs',
  deployment: {
    services: [
      {
        name: 'docs-server',
        port: 4747,
        type: 'production',
      },
    ],
  },
} satisfies Partial<ClearifyConfig>;
```

**Hub-level port registry:** When `hub.scan` discovers projects, it collects all declared ports into a registry. `clearify dev` checks this registry before binding and refuses to start (or picks a free port) if there's a conflict.

**Immediate default port fix:** Change the Clearify dev server default port from `4747` to something less likely to collide (e.g., `5147`). This is a quick win independent of the larger feature.

**Deliverables:**
- `deployment.services[]` config schema with `name`, `port`, `type` (production/staging/dev)
- Port registry built from hub scan
- `clearify dev` pre-flight port check with clear error message
- Changed default port

---

### Phase 2: Deployment Status & Health

**Goal:** `clearify status` shows what's running, what's down, and where.

**Config extension:**

```ts
deployment: {
  services: [
    {
      name: 'docs-server',
      port: 4747,
      type: 'production',
      domain: 'docs.lolastories.com',
      process: { manager: 'pm2', name: 'lola-docs' },
      healthCheck: 'http://localhost:4747/',
    },
  ],
  tunnel: {
    provider: 'cloudflare',
    configPath: '~/.cloudflared/config.yml',
  },
}
```

**CLI commands:**
- `clearify status` — table of all services across all scanned projects: name, port, domain, process status (via PM2 API / process check), health check result
- `clearify status --json` — machine-readable output for scripts and agents
- `clearify status --watch` — live dashboard (like `pm2 monit` but project-aware)

**Dashboard UI:** A `/status` page in the Clearify web UI showing service health, accessible from the hub. Color-coded: green (healthy), red (down), yellow (port conflict or degraded).

**Deliverables:**
- Extended config schema for domains, process managers, health checks, tunnels
- `clearify status` CLI command with table output
- Optional: web dashboard page in the Clearify theme

---

### Phase 3: Agent-Readable Manifest & Memory Sync

**Goal:** AI agents can consume Clearify's knowledge base as structured context, eliminating manual memory maintenance for infrastructure facts.

**Manifest generation:**
- `clearify manifest` outputs a JSON file summarizing all projects, ports, domains, services, and their status
- Could be written to a well-known path (e.g., `~/.clearify/manifest.json`) on a schedule or on-demand

**Agent integration patterns:**
- Claude Code reads the manifest via CLAUDE.md reference or memory file pointer
- The manifest replaces hand-maintained memory entries about ports, domains, and deployment topology
- Any agent can run `clearify status --json` to get live state

**Sync flow:**
```
clearify.config.ts (per project)
        ↓ hub scan
clearify manifest (aggregated)
        ↓ agent reads
Claude Code / other agents (informed context)
```

**Deliverables:**
- `clearify manifest` CLI command
- Well-known manifest path convention
- Documentation on agent integration patterns

---

### Phase 4: Cross-Machine Awareness (Future)

**Goal:** Clearify knows about services across multiple machines (e.g., Mac Mini production + MacBook Pro development).

This is speculative and depends on how the earlier phases land. Possible approaches:
- Clearify instances on each machine publish their manifest to a shared location (SMB share, S3, git repo)
- A lightweight Clearify daemon that exposes status over the network
- Integration with Tailscale for secure cross-machine service discovery

---

## Design Principles

1. **Config as source of truth** — Everything starts in `clearify.config.ts`. No separate config files to maintain.
2. **Opt-in complexity** — Phase 1 (port safety) should work with zero extra config beyond what `hub.scan` already provides. Deployment details are optional enrichment.
3. **CLI-first** — Every feature works from the terminal before it gets a UI. Agents and scripts consume CLI output.
4. **Non-invasive** — Clearify reads process/tunnel state but never manages it. It's an observer, not a process manager. PM2/systemd/Docker remain the actual managers.
5. **Incremental** — Each phase delivers standalone value. Phase 1 alone prevents the incident that motivated this plan.

## Open Questions

- Should the port registry be global (per machine) or per hub? A machine might host projects from multiple hubs.
- Should `clearify dev` auto-pick a free port on collision, or hard-fail with an error? Auto-pick is friendlier but might mask misconfiguration.
- How much overlap with PM2's ecosystem file? Should Clearify be able to generate/consume PM2 configs?
- For agent sync: push model (Clearify writes to agent memory) vs pull model (agent reads manifest on demand)?

## Related Files

- Clearify config schema: `src/core/config.ts`
- Clearify dev server: `src/node/index.ts`
- Clearify CLI: `src/cli/index.ts`
- Cloudflared tunnel config: `~/.cloudflared/config.yml`
- Lola Stories docs server: `~/lola-stories/scripts/docs-server.mjs`
- Lola Stories clearify config: `~/lola-stories/clearify.config.ts`
