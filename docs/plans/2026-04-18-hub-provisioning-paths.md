---
title: Hub Provisioning Paths
type: plan
status: completed
date: 2026-04-18
summary: Make Clearify's hub mode legible to anyone, not just Lumitra. Support three first-class provisioning paths for HUB_DISPATCH_TOKEN (manual, CLI-assisted, Terraform), restore the CLI-side secret write that was cut in 4e2b775, and rewrite README / installation / hub-model so a zero-context reader can onboard.
tags: [clearify, hub, dx, cli, onboarding, docs, secrets]
projects: [clearify]
---

# Hub Provisioning Paths

## Context

Clearify's hub model shipped in v1.14.0. It works end-to-end for one shape: Marlin's Lumitra setup, where Terraform at `/Users/marlinjai/software-dev/infra/deployments/hub-dispatch/` owns the `HUB_DISPATCH_TOKEN` across 9 repos via `github_actions_secret`. For anyone else installing `@marlinjai/clearify` from npm, onboarding silently dead-ends: `clearify init --hub` writes the registry entry and `docs-trigger.yml`, then prints "next steps: edit `github.tf`, run `terraform apply`." That message assumes the reader is Marlin.

Today's session confirmed the gap in three ways:

1. **Audit of the hub-evolution.md plan** (2026-04-07, status: decided) found `infra` was missing from the registry even though its `docs-trigger.yml` was wired. The `Definition of Done` item "pushing a doc change to `infra` triggers hub rebuild" was broken end-to-end. Fixed today in commit `e87d89e`.
2. **CHANGELOG vs plan drift**: commit `4e2b775` "simplify hub-register: remove secret encryption, delegate to Terraform" said "remove" but investigation (git log all branches + diff of 4e2b775^) showed the NaCl sealing code was never committed. The file was born in its current simplified form. There is no prior implementation to restore: we build the CLI-assisted path from scratch.
3. **Docs audit**: the new `hub-model.md` shipped today (`2aa73c5`) frames Terraform as "the answer" and does not document the manual path at all. The README (82 lines) has zero hub mentions. A reader discovering Clearify on npm cannot onboard via any supported path without guessing.

The fix is not "swap Terraform back to CLI." Both are legitimate. Different users live in different worlds. The fix is: support all three paths (manual, CLI-assisted, Terraform) as first-class, document them for someone who does not share Marlin's context, and keep the current Lumitra workflow byte-identical under a `--secret-mode=manual` default.

## Decisions made in this plan

These are settled for implementation. Do not re-litigate without a new plan.

1. **Three provisioning paths are first-class.** Manual (UI), CLI-assisted (API), Terraform (declarative). Ordered from simplest to most scalable. Never rank by preference globally: rank per persona.

2. **`clearify init --hub` stays as the single entry.** No new `clearify hub register` subcommand. Instead, add `--secret-mode={prompt,auto,manual,skip}` as a flag. Rationale: one mental model for onboarding, multiple shapes under it. Rotation may grow into `clearify hub rotate` later but is out of scope here.

3. **Default `--secret-mode` is `prompt`.** Interactive dialogue presents the three paths explicitly. For non-interactive CI, `auto`/`manual`/`skip` work via flags. Marlin's current workflow (no interactive prompt expected) continues by passing `--secret-mode=manual`, which is byte-identical to today's behavior.

4. **CLI-assisted path takes a pasted PAT, not the OAuth token.** The OAuth token is only used for the registry write (Contents API) and the sub-repo Secrets API write. The *value* stored in `HUB_DISPATCH_TOKEN` is a separate PAT the user pastes at a hidden prompt. This keeps the stored secret stable across OAuth sessions and keeps the blast radius narrower (OAuth token dies when the CLI exits, the stored PAT is what ends up long-lived).

5. **`--hub-token <pat>` flag for the no-OAuth-App case.** External users cannot use Marlin's OAuth App (`CLEARIFY_GITHUB_CLIENT_ID=Iv1...`). Either they register their own OAuth App (one-time, documented), or they bypass OAuth entirely with `--hub-token` and pass a PAT directly. Both are supported. The "set up an OAuth App" step is never a hard blocker.

6. **Recommended PAT type: fine-grained.** Docs recommend fine-grained PATs with `Contents: Read and Write` on the hub repo only, 90-day expiration. Classic `repo`-scoped PATs also work and the code accepts them. Fine-grained is the safer default in the copy.

7. **Use `libsodium-wrappers` for NaCl sealed-box encryption**, dynamically imported inside `hub-register.ts` so the 500KB cost only lands when `--secret-mode={prompt,auto}` runs. Runtime dependency, lazy-loaded. Added as a new entry in `package.json#dependencies`.

8. **Plan is an amendment to `hub-evolution.md`, not a replacement.** See Section 9 for explicit mapping. All "Decisions Made" in the original plan stay intact.

9. **Hidden input via `@inquirer/password`**. Small dep, dots-as-you-type UX, paste handling that does not trip on multi-chunk reads.

10. **One public "Clearify Hub" OAuth App hosted by Marlin**. Client ID hardcoded in Clearify, ships with the package. External users never create their own OAuth App. `--hub-token` PAT path remains as the escape hatch for anyone who refuses browser-auth.

## The three paths

### Path 1: Manual (GitHub UI)

**When**: first sub-repo in a new hub, or compliance environments that require UI-audited secret creation, or anyone who has not set up an OAuth App yet.

**Who owns what**: Clearify writes `clearify.config.ts` and `.github/workflows/docs-trigger.yml`. User opens GitHub in a browser, pastes the PAT into Settings: Secrets and variables: Actions. Clearify never sees the token.

**CLI flow**: `clearify init --hub --secret-mode=manual`. Prints exact instructions with the GitHub URL, the secret name, and the scope the PAT needs.

**Journey** (Persona B, first onboarding, approx 5-10 min):

1. `pnpm add -D @marlinjai/clearify`
2. `pnpm exec clearify init --hub --secret-mode=manual`
3. CLI prompts for hub repo (`owner/repo`). Writes `clearify.config.ts`, `docs-trigger.yml`. Skips registry write because no OAuth is set up (falls through to "open a PR manually" escape hatch, or uses `--hub-token` if provided).
4. CLI prints URL to `github.com/<sub-owner>/<sub-repo>/settings/secrets/actions/new` with name + scope to paste.
5. User opens browser, creates a fine-grained PAT with `Contents: Write` on hub repo, pastes as `HUB_DISPATCH_TOKEN`.
6. User opens PR to hub's `clearify.data.json` adding the registry entry (or asks hub owner). Hub owner merges.
7. User pushes a doc change. Dispatch fires. Hub rebuilds. Live.

**Limit**: stop using this path when the same PAT has been pasted into 3+ sub-repos by hand. Switch to Path 3.

### Path 2: CLI-assisted (`clearify init --hub --secret-mode=auto`)

**When**: solo developers, second-onwards sub-repo in a small team, anyone happy to paste a PAT into a tool once.

**Who owns what**: Clearify does everything. OAuth device flow handles the registry write. User pastes a PAT at a hidden prompt for the `HUB_DISPATCH_TOKEN` value. Clearify encrypts via libsodium sealed-box, PUTs to Secrets API, discards token from memory.

**CLI flow**: `clearify init --hub --secret-mode=auto --secret-pat $PAT` non-interactive, or `clearify init --hub --secret-mode=prompt` (default) for interactive menu.

**Journey** (Persona A, solo, approx 8-12 min including PAT creation):

1. `pnpm add -D @marlinjai/clearify`
2. User creates a fine-grained PAT (if they do not have one): `github.com/settings/personal-access-tokens/new`, `Contents: Write` on the hub repo, 90-day expiry.
3. `pnpm exec clearify init --hub`. CLI prompts for hub repo, starts OAuth device flow, browser opens, user approves.
4. CLI presents the three-path menu. User selects option 1 ("paste a PAT, Clearify writes it"). Clearify prompts for the PAT at a hidden prompt. User pastes.
5. Clearify does, in order: `PUT clearify.data.json` on hub (registry), `GET actions/secrets/public-key` on sub-repo, sealed-box encrypt, `PUT actions/secrets/HUB_DISPATCH_TOKEN`, writes `clearify.config.ts` + `docs-trigger.yml`.
6. Commit and push. Dispatch fires. Hub rebuilds. Live.

**Rotation**: per-repo, via `clearify init --hub --rotate-secret --secret-mode=auto --secret-pat $NEW_PAT`. A batched `clearify hub rotate` is future work.

### Path 3: Terraform (`github_actions_secret`)

**When**: 5+ sub-repos, teams who care about atomic rotation, orgs that already run Terraform for infra.

**Who owns what**: Clearify scaffolds `clearify.config.ts`, `docs-trigger.yml`, and the registry entry. Terraform owns `HUB_DISPATCH_TOKEN` distribution. PAT lives in Infisical (or Vault, AWS Secrets Manager, etc).

**CLI flow**: `clearify init --hub --secret-mode=skip`. Identical to v1.14.0 behavior today: scaffold everything except the secret, print a pointer to the Terraform deployment.

**Journey** (Persona C, adding 10th repo to existing Terraform-managed hub, approx 3-5 min):

1. `pnpm exec clearify init --hub --secret-mode=skip` in the new project.
2. CLI writes `clearify.config.ts`, `docs-trigger.yml`, pushes registry entry to hub's `clearify.data.json` via OAuth. Prints "add `<repo>` to `local.hub_repos` in Terraform."
3. User opens `infra/deployments/hub-dispatch/github.tf`, adds repo name to `local.hub_repos`, opens PR.
4. PR merges. `cd infra/deployments/hub-dispatch && ../../scripts/tfrun.sh apply`. Terraform writes `HUB_DISPATCH_TOKEN` to the new sub-repo.
5. User pushes a doc change. Dispatch fires. Hub rebuilds. Live.

**Rotation**: update PAT value in Infisical, `terraform apply` once. Every sub-repo in `local.hub_repos` gets the new value atomically. This is the entire reason Path 3 exists.

### Persona to path decision matrix

| Persona | Manual | CLI-assisted | Terraform |
|---|---|---|---|
| A (solo dev from npm, 2-3 repos, no infra) | works | **recommended** | overkill |
| B (5-20 dev team, no TF shop) | **recommended** for first sub-repo | works, good for second-onwards | adoption cost too high for one secret |
| C (platform engineer, Lumitra shape, 5+ repos) | emergency only | breaks atomic rotation, not used | **recommended** |

## Engineering plan

Implementation lives in `/Users/marlinjai/software-dev/ERP-suite/projects/clearify/src/node/hub-register.ts` and `src/cli/index.ts`. New runtime dependency: `libsodium-wrappers`. Estimated diff: +250 LOC, ~10 LOC modified, 0 LOC deleted.

### New flags on `clearify init`

```
--hub                     (existing) Register the project with a docs hub
--hub-token <pat>         (new) Skip OAuth. Use this PAT for the registry write.
                                  Reused as HUB_DISPATCH_TOKEN value unless --secret-pat is given.
--secret-mode <mode>      (new) prompt (default) | auto | manual | skip
--secret-pat <pat>        (new) PAT value to write as HUB_DISPATCH_TOKEN.
                                  Required when --secret-mode=auto and --hub-token is not reused.
--rotate-secret           (new) Force re-write of HUB_DISPATCH_TOKEN even if it already exists.
```

### New functions in `hub-register.ts`

1. `encryptSecret(plaintext: string, publicKey: string): Promise<string>` (~15 LOC). Dynamic `import('libsodium-wrappers')`, await `sodium.ready`, call `crypto_box_seal`, return base64.
2. `getRepoPublicKey(token, owner, repo): Promise<{ key_id, key }>` (~10 LOC). Mirrors existing `ghApiFetch` pattern.
3. `storeDispatchToken(token, owner, repo, secretValue): Promise<void>` (~25 LOC). Fetch key, encrypt, PUT `/repos/{owner}/{repo}/actions/secrets/HUB_DISPATCH_TOKEN`. Throws typed error on non-201/204.
4. `promptSecretMode(): Promise<'auto' | 'manual' | 'skip'>` (~20 LOC). Readline menu with three numbered options.
5. `promptHiddenInput(prompt: string): Promise<string>` (~30 LOC). Raw-mode stdin, echo-suppress, handle Enter/Ctrl-C. Roll our own to avoid new UI dep.
6. `printManualSecretInstructions(subRepo, hub)` (~15 LOC). Prints the GitHub URL + secret name + scope guidance.

### `registerWithHub()` integration

After `generateWorkflow(hub)` at `src/node/hub-register.ts:389`, before the final "Hub registration complete!" block, add:

```typescript
if (options.secretMode !== 'skip') {
  const mode = options.secretMode === 'prompt'
    ? await promptSecretMode()
    : options.secretMode;
  if (mode === 'auto') {
    const secretValue = options.secretPat ?? options.hubToken;
    if (!secretValue) {
      console.warn('  --secret-mode=auto requires --secret-pat or --hub-token');
      printManualSecretInstructions(currentRepo, hub);
    } else {
      try {
        await storeDispatchToken(token, currentRepo.owner, currentRepo.repo, secretValue);
        console.log('  HUB_DISPATCH_TOKEN written to sub-repo');
      } catch (err) {
        console.warn(`  Could not write secret: ${err.message}`);
        printManualSecretInstructions(currentRepo, hub);
      }
    }
  } else {
    printManualSecretInstructions(currentRepo, hub);
  }
}
```

### Graceful degradation when `CLEARIFY_GITHUB_CLIENT_ID` is unset

Current behavior (`src/node/hub-register.ts:350-355`): hard exit. New behavior: if `--hub-token <pat>` is provided, skip the device flow entirely and use the PAT directly as the OAuth token for all subsequent API calls. If neither is set, print a clear error listing both options ("set `CLEARIFY_GITHUB_CLIENT_ID` and create an OAuth App at `github.com/settings/applications/new`, or pass `--hub-token` with a PAT directly"). No silent exits.

### Security model

- **OAuth device-flow token**: in-memory for the duration of `init`. Not persisted. Token has `repo` scope on every repo the user has access to: broad blast radius, but short-lived.
- **Pasted PAT for `HUB_DISPATCH_TOKEN`**: hidden input, encrypted with sub-repo's public key, PUT to Secrets API, discarded. Never on disk, never in argv (use the hidden prompt, not `--secret-pat`, unless scripting).
- **Terraform path**: PAT from Infisical at apply-time. Never on disk.
- **`--secret-pat` in argv**: visible in `ps` on multi-user systems. Discouraged in docs, flagged in `--help`. Prefer the hidden prompt.

### Why Manual can be the right answer

For regulated industries or compliance audits, Manual is the only path where Clearify never sees the PAT. CLI-assisted requires trusting our sealing code (thin wrapper over `libsodium-wrappers`, but still). Terraform requires trusting state-file hygiene (the value passes through provider memory). Manual leaves the secret in a password manager > browser > GitHub UI > sub-repo. Shortest trust chain. Document that explicitly.

## Documentation plan

Full-text drafts for README and `installation.md` live in the docs-agent report at `docs/internal/2026-04-18-hub-paths-reports/docs.md`, sections 4 and 5. These will be copied verbatim into the repo during implementation (see Section 7 below). The detailed edit map for `hub-model.md` also lives there. This plan embeds the key tables and decisions; the appendices capture the full drafts so everything lives in one place once the plan is decided.

### Target information architecture

```
README.md
  ├── What Clearify is (kept, 2-3 lines)
  ├── Quick Start (kept, single-project)
  ├── Hub mode (NEW, 1 paragraph, link to hub-model.md)
  ├── Features (expanded with hub bullets)
  ├── CLI Commands (add init --hub)
  └── Links (+ hub mode)

docs/public/installation.md
  ├── Requirements (kept)
  ├── Package Managers (kept)
  └── NEW: Prerequisites for Hub Mode (per-path table)

docs/public/getting-started.md
  ├── Existing single-project flow (kept)
  └── NEW: Hub onboarding (10-min walkthrough, Persona A happy path, link to hub-model.md)

docs/public/hub-model.md
  ├── What a hub is, three modes, sparse checkout, dispatch pipeline (kept)
  ├── REWRITE: Provisioning HUB_DISPATCH_TOKEN (decision tree + three paths)
  ├── REWRITE: clearify init --hub (scaffolding + secret-provisioning split)
  ├── NEW: Rotation (general flow + per-path)
  └── Troubleshooting
      ├── NEW: "Which provisioning path am I on?" subsection
      └── Existing subsections (kept)

docs/public/configuration.md
  └── Hub Mode config reference (kept, + 1-line pointer to hub-model.md)
```

### Progressive disclosure rules

| Surface | Purpose | Length | Links out |
|---|---|---|---|
| README hub paragraph | Discovery on GitHub | 4 lines | hub-model.md |
| installation.md hub prereqs | Pre-flight for onboarding | 60 lines | hub-model.md, getting-started.md |
| getting-started.md hub walkthrough | Persona A's 10-min path | 50 lines | hub-model.md |
| hub-model.md three-path reference | The definitive guide | 180 new lines | configuration.md, installation.md |
| hub-model.md rotation | Operator maintaining the hub | 40 new lines | internal anchors |
| configuration.md hub reference | Field-level config | unchanged | hub-model.md |

### Anti-patterns (what not to do)

1. Never require an OAuth App before onboarding can start. Always offer the `--hub-token` or "open PR manually" escape.
2. Never hide the manual path. It is first-class for compliance shops.
3. Never make the CLI-assisted flow opt-out. Always require an explicit menu pick.
4. Never assume hub and sub-repo share the same GitHub org.
5. Never couple registry write and secret write. Different APIs, different failure modes.
6. Never use "recommended" without naming the persona. "Recommended for solo projects," not just "recommended."
7. Never ship a "one command does everything" narrative the code does not support. Be honest in every surface.

### Voice and style checklist (apply to every new/edited doc)

1. No em-dashes (U+2014) or en-dashes (U+2013). Colons, parens, commas, periods only.
2. "sub-repo" (hyphenated) consistently. Reserve "project" for the broader concept.
3. Three-paths always ordered Manual, CLI-assisted, Terraform.
4. Code blocks always declare language.
5. Planned vs shipped always called out explicitly.
6. `HUB_DISPATCH_TOKEN` in backticks, uppercase, every reference.
7. Decision tables pair "what X does" with "when to use X."
8. Anchor slugs stable across revisions (`#prerequisites-for-hub-mode`, etc).
9. Frontmatter aligned to document-lifecycle standard (`type`, `status` optional, `tags`, `summary`).
10. Mermaid reserved for architecture diagrams, not trivial lists.
11. Tables over bullets when comparing 2+ dimensions.
12. No emoji in docs body.

## Plan hygiene (adjacent to this work, same PR batch)

The plans-inventory audit (`docs/internal/2026-04-18-plans-inventory.md`) flagged several items that rhyme with this work:

1. **`hub-evolution.md` status flip**: once this plan lands and implementation ships, flip `hub-evolution.md` from `decided` to `completed` with an amendment note referencing this plan.
2. **Three plans lying about status**: `2026-02-16-custom-openapi-renderer-design.md`, `-plan.md`, and `2026-03-09-visual-config-editing-design.md` all shipped in v1.6 and v1.12 respectively but still read `draft`. Flip to `completed`. Separate commit.
3. **ROADMAP.md stale header**: says "Last updated 2026-03-03, v1.10". Actual v1.14.1. Add sections for v1.11 (auto-render roadmap), v1.12 (admin panel), v1.13 (includeReadme), v1.14 (hub-register simplification) from the CHANGELOG.
4. **`edge-preview-layer-design.md`** is Phase 3 of `in-place-editing-plan.md`. Merge or cross-link.
5. **`visual-diagram-editor-plan.md`** references a design doc that was never created. Either stub the design or remove the reference.

Items 1 and 3 ship with the implementation PR for this plan. Items 2, 4, 5 are separate housekeeping PRs.

## Implementation sequencing

Tight execution order. Each step can be an agent task.

### Phase A: docs rewrite (no code changes, low risk)

Can start immediately after this plan is decided.

1. README.md: add Hub mode paragraph, expand Features, update CLI Commands table. (~15 line delta)
2. installation.md: add "Prerequisites for Hub Mode" section with per-path table. (~60 line delta)
3. hub-model.md: rewrite Provisioning section as three paths with decision tree. Add Rotation section. Add "Which provisioning path am I on?" troubleshooting subsection. Rewrite `clearify init --hub` section to separate scaffolding from secret-provisioning. (~180 new lines, ~50 rewritten)
4. getting-started.md: add Hub onboarding 10-min walkthrough. Fix frontmatter table (`category` -> `type`). Depends on Phase A step 3 landing so links resolve. (~50 line delta)
5. configuration.md: add 1-line pointer from Hub Mode section to hub-model.md. (~5 line delta)

Phase A ships as one PR. All doc-agent's drafts in `docs/internal/2026-04-18-hub-paths-reports/docs.md` sections 4, 5, 6 are the starting point.

### Phase B: implementation (code change, requires review)

Depends on Phase A landing so the `--help` text can reference stable anchors.

1. Add `libsodium-wrappers` to `package.json#dependencies`. Run `pnpm install`.
2. Implement new functions in `hub-register.ts`: `encryptSecret`, `getRepoPublicKey`, `storeDispatchToken`, `promptSecretMode`, `promptHiddenInput`, `printManualSecretInstructions`.
3. Extend `registerWithHub()` signature and wire in the new step between `generateWorkflow` and the final message.
4. Extend `InitOptions` interface in `init.ts` with the three new fields. Wire through from CLI.
5. Add `--hub-token`, `--secret-mode`, `--secret-pat`, `--rotate-secret` flags in `cli/index.ts`.
6. Add graceful degradation when `CLEARIFY_GITHUB_CLIENT_ID` is unset.
7. Write unit tests for `encryptSecret` (use a known key pair and ciphertext fixture). Manual-test the OAuth + Secrets API flow against a real test repo.
8. Update CHANGELOG.md entry.
9. ROADMAP.md: add the hub-paths work under v1.15 or v2.0.

Phase B ships as a second PR once Phase A is merged.

### Phase C: plan hygiene (concurrent with Phase A)

1. Flip `hub-evolution.md` status to `completed` with amendment note.
2. Flip `2026-02-16-custom-openapi-renderer-{design,plan}.md` and `2026-03-09-visual-config-editing-design.md` status to `completed`.
3. ROADMAP.md: fill in missing v1.11 to v1.14 sections from CHANGELOG.
4. Merge or cross-link `edge-preview-layer-design.md` and `in-place-editing-plan.md`.
5. Resolve the dead reference in `visual-diagram-editor-plan.md`.

Phase C is cheap and parallelizable with Phase A.

### Rough ordering summary

```
Day 1 (today)
  Phase A (docs rewrite) and Phase C (plan hygiene) agents in parallel -> one PR each

Day 2 or next session
  Phase B (code implementation) agent, after Phase A merges

Day 3 (after Phase B merges)
  Release v1.15.0 via semantic-release
  Optional: announcement note in hub-model.md troubleshooting
```

## Superseding map (amendment to `hub-evolution.md`)

Explicit mapping. `hub-evolution.md` stays at `status: decided` until Phase B completes, then flips to `completed` with this plan referenced.

| `hub-evolution.md` section | Relationship |
|---|---|
| "Decisions Made" -> Hub-only model | Intact |
| "Decisions Made" -> Retire standalone sites | Intact, mostly done (3 Pages projects deleted today, 3 blocked by custom domains, 1 already gone) |
| "Decisions Made" -> No persistent webhook service | Intact |
| "Decisions Made" -> Sparse checkout as default | Intact, shipped |
| "Decisions Made" -> clearify init as primary feature | Amended. "Zero manual steps after" becomes "one step per chosen secret-provisioning mode." Manual and Terraform modes have explicit follow-up steps by design. |
| Target Architecture -> clearify init flow step 4 ("Creates HUB_DISPATCH_TOKEN via Secrets API") | Restored as optional behavior behind `--secret-mode=auto` or `prompt`. |
| Implementation Tasks 1 -> GitHub API calls for `secrets/public-key` and `actions/secrets/HUB_DISPATCH_TOKEN` | Restored. Originally listed, never shipped. |
| Implementation Tasks 2-6 (sparse, registry migration, CI simplification, standalone retirement, infra trigger) | Intact, shipped today. |
| "What NOT to Build" | Intact. Still no webhook service, no GitHub App. |
| Definition of Done #1 ("one command, one browser auth, under 60 seconds") | Amended. Rephrased to "one command per chosen mode." For `manual` and `skip` paths the 60-second target still holds; for `auto` it depends on user PAT creation time. |
| Definition of Done #2-6 | Intact, shipped today (commits `e87d89e`, `22fe578`, `859d997`, `aa2d1fa`, `e4fc4b3`, `3c4c7f8`). |

## Decisions on open questions (resolved 2026-04-18)

1. **Hidden-input implementation**: use `@inquirer/password`. 5KB dep, shows dots as you type, handles paste correctly. DX wins over zero-dep purity.

2. **OAuth App for external users**: Marlin hosts one public "Clearify Hub" OAuth App. Client ID ships hardcoded in Clearify. External users never need their own. `--hub-token $PAT` remains as the always-works escape for anyone who refuses browser auth. Registration is one-time, zero-maintenance. Blast radius of account compromise: ship a new Client ID in a patch release.

3. **`clearify hub rotate` in v1**: deferred. Ship without. Add later if an external user asks. Terraform users already have atomic rotation, CLI-assisted users can run per-repo `--rotate-secret` for now.

4. **Registry conflict handling**: silent overwrite on re-run. Trust the user.

5. **Persona count**: three (Lena, Jonas, Marlin) confirmed.

6. **`hub-model.md` split**: keep as one file. If the post-rewrite draft grows awkward during implementation, split into `hub-architecture.md` + `hub-onboarding.md` at that point. Decision made once we see the real word count.

## Success criteria

Quantitative:

- **Time to first successful dispatch**, Persona A: under 10 minutes. Persona B: under 15. Persona C: under 5.
- **Zero silent 401s** from the dispatch curl: `--fail-with-body` already shipped today in `aa2d1fa`. Every failure mode produces a red workflow, never a green exit.
- **Docs coverage**: README, installation, getting-started, hub-model all mention hub mode in their first 50 lines. Measurable by grep.

Qualitative:

- **Zero-context reader test**: 2 to 3 testers who have never used Clearify read README + hub-model + installation in order. They can pick the right path for their situation and onboard their first project without asking.
- **The Marlin test**: does every new section earn its place, use concrete numbers, avoid corporate speak, survive the "would he say this out loud?" check?
- **`clearify init --hub` produces paste-into-issue output on failure**: no raw stack traces, every error includes the path taken and the next step.

## Related open work (not in scope of this plan)

These surfaced in today's session but belong elsewhere:

- Three sub-repos (`data-table`, `framer-clone`, `email-editor`) still have zombie `deploy-docs.yml` with standalone `wrangler pages deploy`. Uncommitted work blocked today's Agent A. User action: commit or stash in each, then re-run the workflow migration per Section 9 of today's audit.
- Three Cloudflare Pages projects (`email-editor-docs`, `receipt-ocr-docs`, `storage-brain-docs`) blocked on custom domain detachment before `wrangler pages project delete`. User action: detach via dashboard or via `infisical run -- curl` against the Cloudflare API.
- `tfrun.sh apply` pending in `/Users/marlinjai/software-dev/infra/deployments/hub-dispatch/` to revoke `HUB_DISPATCH_TOKEN` from the two archived brain repos removed in commit `859d997`.
- `hub.scan` still resolved in `src/core/config.ts:438` and `src/vite-plugin/index.ts:276` despite being deprecated by the explicit-registry model. Separate cleanup plan, low priority.
- `scanHubProjects` swallows clone errors silently. Add an end-of-build summary listing skipped embeds, or a `CLEARIFY_STRICT=1` env. Small observability improvement, not blocking.

---

## Appendix A: Full README draft

Authoritative draft from the docs-agent report. Copy verbatim in Phase A step 1. 102 lines.

```markdown
# Clearify

An open-source documentation site generator. Turn markdown into beautiful docs. Run one site per project, or aggregate many repos into a single hub.

## Quick Start

```bash
pnpm add -D @marlinjai/clearify
pnpm exec clearify init
pnpm exec clearify dev
```

Your docs are live at `http://localhost:4747`.

## Hub mode

Hub mode aggregates docs from many repos into one site. Each sub-repo owns its `docs/public/` folder. The hub clones only the docs from each registered repo, assembles them, and deploys once. To add a project to an existing hub, run `clearify init --hub`. See [Hub Model](./docs/public/hub-model.md) for the full onboarding walkthrough and provisioning paths.

## Features

- Zero config: drop markdown in `docs/public/` and go
- MDX support (Callout, Tabs, Steps, Cards, CodeGroup, Accordion, Badge, Tooltip, Columns, Frame)
- Mermaid diagrams (client or build-time via Puppeteer)
- Built-in full-text search
- Dark mode, syntax highlighting (Shiki, dual themes)
- SSG and SEO: pre-rendered HTML, Open Graph, Twitter Cards, JSON-LD, sitemap, robots.txt
- OpenAPI API Reference: custom renderer with code examples and schema viewer
- Multi-section support (pill-based section switcher)
- Hub mode: aggregate many repos into one site with sparse checkout and dispatch-triggered rebuilds
- Auto changelog, README as landing page

## Configuration

Customize with `clearify.config.ts`:

```typescript
import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: 'My Project',
  sections: [
    { label: 'Docs', docsDir: './docs/public' },
    { label: 'Internal', docsDir: './docs/internal', basePath: '/internal', draft: true },
  ],
  theme: { primaryColor: '#3B82F6', mode: 'auto' },
  openapi: { spec: './docs/openapi.json' },
});
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `clearify dev` | Start Vite-powered dev server with HMR |
| `clearify build` | Build static documentation site |
| `clearify init` | Scaffold a docs folder (use `--no-internal` to skip internal section) |
| `clearify init --hub` | Scaffold and register the project with an existing hub (prompts for hub owner/repo) |
| `clearify check` | Check for broken internal links |
| `clearify openapi:generate` | Generate OpenAPI spec from a NestJS app |

## Requirements

- Node.js 22 or later
- npm, pnpm, or yarn
- For hub onboarding: a GitHub account and (for CLI-assisted secret provisioning) a GitHub OAuth App. See [Installation](./docs/public/installation.md) for prerequisites per path.

## Links

- [Documentation](https://docs.lumitra.co/clearify)
- [Hub Model](./docs/public/hub-model.md)
- [GitHub](https://github.com/marlinjai/clearify)
- [Changelog](./CHANGELOG.md)

## License

[MIT](./LICENSE)
```

## Appendix B: Full installation.md draft

Authoritative draft from the docs-agent report. Copy verbatim in Phase A step 2.

```markdown
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
```

## Appendix C: hub-model.md edit spec

Full drafts of the Provisioning + Rotation + Troubleshooting sections are in the docs-agent report at `docs/internal/2026-04-18-hub-paths-reports/docs.md` section 6. The edit map:

- **Keep unchanged**: lines 12-19, 21-87, 89-114, 116-191, 287-327.
- **Line 197 edit**: change "Distribution is handled by Terraform..." to "There are three paths to get this secret onto every sub-repo. See below."
- **Replace lines 199-285** with the new Provisioning + Rotation sections (approx +180 lines).
- **Insert before line 289** ("My docs don't appear on the hub"): the new "Which provisioning path am I on?" troubleshooting subsection.

Every section keeps the Manual, CLI-assisted, Terraform ordering. Decision table at the top of the Provisioning section. Rotation section cross-references all three paths. See `docs/internal/2026-04-18-hub-paths-reports/docs.md` for the full markdown to paste in.
