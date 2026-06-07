---
title: Clearify Hub Provisioning: Product and DX Analysis
type: plan
status: draft
date: 2026-04-17
summary: Product and DX analysis for supporting all three HUB_DISPATCH_TOKEN provisioning paths (manual, CLI-assisted, Terraform) as first-class options in Clearify.
tags: [clearify, hub, dx, onboarding, personas]
---

# Clearify Hub Provisioning: Product and DX Analysis

## 1. User personas

### Persona A: Solo dev from npm

Lena, a freelance full-stack dev. Found Clearify on npm while looking for a docs generator. Has 2-3 personal GitHub repos (a React component library, a CLI tool, a blog). No Terraform, no Infisical, no GitHub org, no CI beyond basic deploys.

**Constraints:** zero tolerance for infra setup. If onboarding takes more than 10 minutes, she bails and uses Mintlify or just GitHub Pages. Reads the README, skims getting-started, closes the tab if she sees the word "Terraform."

**Success for Lena:** `pnpm exec clearify init` in each repo, one browser auth, one paste of a PAT, and within 10 minutes `docs.mydomain.dev` shows docs from all three repos. If she pushes a doc change, it appears within a few minutes with no further action.

### Persona B: Small team (5-20 devs)

Jonas leads a 12-person engineering team at a Series A startup. Four microservices, each with its own repo, plus a shared platform repo. Already using GitHub Actions for CI/CD. PATs are a known concept. No Terraform shop: Infra lives in hand-tuned Pulumi and a few shell scripts.

**Constraints:** wants predictable onboarding for new engineers ("run this one command"), but won't adopt Terraform just for secret management. PAT rotation happens quarterly, manually, as part of a broader security review.

**Success for Jonas:** a documented runbook that says "to add a new service to the docs hub, do X." X is short, reproducible, and doesn't require the engineer adding the service to have admin rights to the hub repo (an owner runs one follow-up step). Rotation is a known, documented step.

### Persona C: Platform engineer at a larger org (Lumitra shape)

Marlin, running Lumitra. 9 sub-repos, Infisical for all secrets, Terraform for all infra, Cloudflare for everything. The docs hub is one of ~15 production systems.

**Constraints:** atomic rotation across all repos is non-negotiable. Secrets never live in someone's 1Password. Registry of what-is-provisioned-where must be declarative and diffable. New engineers learn the Terraform workflow on day one.

**Success for Marlin:** `clearify init --hub` scaffolds the project-side files (registry entry, config, workflow), then the sub-repo gets added to `local.hub_repos` in one Terraform commit, one `tfrun.sh apply`, and done. Rotation is still `update Infisical > tfrun.sh apply`.

## 2. Persona to path decision matrix

| Persona | Manual | CLI-assisted | Terraform |
|---|---|---|---|
| A (solo) | works, fine as a fallback | **recommended** | overkill, will not do |
| B (small team) | **recommended** for first sub-repo, good for low-volume | works, nice for new engineers onboarding | overkill unless they already use TF |
| C (platform) | emergency fallback only | not used (breaks atomic rotation) | **recommended** |

Reasoning per row:

- **Persona A**: CLI-assisted is fastest (one paste, no UI clicking). Manual works but adds tab-switching friction. Terraform is a non-starter.
- **Persona B**: Manual is honest, transparent, and matches how they already manage secrets. CLI-assisted is nice for the second and third repo once they've created a PAT once. Terraform is a big adoption cost for one secret.
- **Persona C**: Terraform owns the state. CLI-assisted would create drift (a secret set outside of TF). Manual is only for emergency break-glass if Terraform is broken.

## 3. Onboarding journey maps

### Path 1: Manual (Persona B, first onboarding)

Variant: second sub-repo joining an existing hub.

1. Dev runs `pnpm add -D @marlinjai/clearify` and then `pnpm exec clearify init --hub` in the sub-repo.
2. CLI detects `origin` remote, asks for the hub repo as `owner/repo`, writes `clearify.config.ts` with the `hubProject` block, writes `.github/workflows/docs-trigger.yml` pointed at the chosen hub. It does **not** write the registry entry (no OAuth) and does **not** write the secret.
3. CLI prints: "To finish, (a) open a PR to <hub>/clearify.data.json adding your entry (or ask the hub owner), and (b) add `HUB_DISPATCH_TOKEN` to this repo's Actions secrets. See <link>."
4. Dev opens GitHub in browser: Settings > Secrets and variables > Actions > New repository secret. Name: `HUB_DISPATCH_TOKEN`. Value: PAT with `Contents: Write` on the hub repo (provided by the hub owner via a secure channel).
5. Dev opens a PR to the hub repo adding the registry entry to `clearify.data.json`. Hub owner reviews, merges.
6. Dev pushes a doc change to `main` in the sub-repo. `docs-trigger.yml` fires, curls the hub's dispatches endpoint, gets 204.
7. Hub's `deploy-docs.yml` runs on `repository_dispatch`, clones `docs/public/` sparse, builds, deploys. Live.

Total time: 5-10 minutes first time (once PAT exists), 2 minutes per additional repo.

### Path 2: CLI-assisted (Persona A, single-user case)

Variant: solo dev, hub repo and sub-repo owned by the same user.

1. Dev runs `pnpm add -D @marlinjai/clearify` and then `pnpm exec clearify init --hub`.
2. CLI prompts: "Hub repo (owner/repo)?" Dev types `lena/my-docs-hub`.
3. CLI prompts: "How should we provision the HUB_DISPATCH_TOKEN secret on this repo?" Dev picks "I'll paste a PAT, you write it."
4. CLI says: "Create a PAT at https://github.com/settings/tokens with `Contents: Write` on `lena/my-docs-hub`. Paste it here (input is masked):". Dev opens browser, creates a fine-grained PAT with one repo scoped, pastes it.
5. CLI starts GitHub OAuth device flow (for writing the registry). Dev's browser opens, enters the displayed code, approves. CLI receives the OAuth token.
6. CLI does, in order: `PUT clearify.data.json` on the hub (registry entry), `PUT actions/secrets/HUB_DISPATCH_TOKEN` on the sub-repo (using the pasted PAT value, encrypted via the sub-repo's public key), writes local `clearify.config.ts` and `.github/workflows/docs-trigger.yml`.
7. CLI prints: "Done. Push a doc change to trigger the first hub build."
8. Dev pushes a doc change. Dispatch fires. Hub rebuilds. Live.

Total time: 8-12 minutes including PAT creation.

### Path 3: Terraform (Persona C)

Variant: adding the 10th repo to an existing Terraform-managed hub.

1. Dev runs `pnpm add -D @marlinjai/clearify` and `pnpm exec clearify init --hub`.
2. CLI prompts: "Hub repo?" `marlinjai/ERP-suite`. CLI prompts: "How to provision the secret?" Dev picks "Skip, I manage secrets externally (Terraform, etc.)."
3. CLI does OAuth device flow (for the registry write), writes the registry entry, writes `clearify.config.ts` and `.github/workflows/docs-trigger.yml`. Does not touch secrets.
4. CLI prints: "Registry and workflow done. To finish, add `<repo>` to `local.hub_repos` in your Terraform deployment and apply."
5. Dev opens `infra/deployments/hub-dispatch/github.tf`, adds the repo name to `local.hub_repos`, opens a PR.
6. PR merges. Dev runs `cd infra/deployments/hub-dispatch && ../../scripts/tfrun.sh apply`. Terraform creates `HUB_DISPATCH_TOKEN` on the new sub-repo.
7. Dev pushes a doc change. Dispatch fires. Hub rebuilds. Live.

Total time: 3-5 minutes (already has the workflow memorized).

## 4. Decision tree (prose)

First-time user ran `clearify init`. After the normal scaffolding finishes, the CLI asks:

```
? Does this project belong to a documentation hub? (Y/n)
```

If "no", exit. If "yes":

```
? Hub repository (owner/repo):
  > marlinjai/ERP-suite
```

Validate the format. Then:

```
? How should Clearify provision the HUB_DISPATCH_TOKEN secret on this repo?

  > Paste a Personal Access Token, Clearify writes it for you
    (fastest, recommended for solo projects and first-time setup)

  > Skip secret setup, show me how to add it manually
    (recommended if your org requires UI-audited secret creation)

  > Skip secret setup, I manage secrets via Terraform or another tool
    (recommended for platform teams with existing secret infrastructure)
```

Sub-flow for option 1 (paste PAT):

```
Clearify needs a PAT with "Contents: Write" scope on marlinjai/ERP-suite.
Create one at: https://github.com/settings/tokens?type=beta

Paste the token (input hidden):
> ********************************************

The token will be:
  - Used ONCE to write the secret via GitHub's Actions Secrets API
  - NEVER stored on disk, logged, or sent anywhere except api.github.com
  - Encrypted with this repo's public key before the PUT

Proceed? (Y/n)
```

Sub-flow for option 2 (manual, show me how):

```
Opening GitHub in your browser to: https://github.com/<owner>/<this-repo>/settings/secrets/actions/new

Set:
  Name:  HUB_DISPATCH_TOKEN
  Value: <a PAT with Contents: Write on marlinjai/ERP-suite>

When done, press Enter to continue (or Ctrl-C to exit).
```

CLI still does the registry write and local file generation regardless of which branch.

**If `CLEARIFY_GITHUB_CLIENT_ID` is not set:**

```
! Clearify needs a GitHub OAuth App client ID to write the registry entry for you.

  Options:

  > I'll set CLEARIFY_GITHUB_CLIENT_ID and re-run
    (one-time setup, see <docs link>)

  > Open a PR to the hub manually instead
    (Clearify will print the exact JSON to add)
```

The "open a PR manually" escape hatch matters a lot for Persona B. Never force OAuth App creation as a hard blocker.

**"Recommended" means:** tuned for the most-likely persona hitting that branch. Solo users default to pasting, everyone else explicitly opts out. Do not make the paste-PAT flow the unattended default (no "press enter to accept"): require an explicit choice so no one types a PAT they didn't mean to.

## 5. Progressive disclosure strategy

### README.md

Add one paragraph under "Features" or a new "Hub Mode" section, 4-6 lines max:

```markdown
## Hub Mode

Run one Clearify site that aggregates docs from many repos. Each project owns its own `docs/public/`, registers with the hub via `clearify init --hub`, and pushes trigger a hub rebuild via GitHub's repository dispatch. Three provisioning styles: paste-and-go for solo projects, manual secret entry for security-conscious teams, Terraform for platform teams.

Full walkthrough: [Hub Model](./docs/public/hub-model.md).
```

That's it. No decision trees in the README. One link, one sentence summarizing the three paths so a reader knows the model flexes to their situation.

### docs/public/getting-started.md

Add a new section **after** "Building for production" called "Using Clearify as a hub," targeted at Persona A. 15-25 lines. Covers:

1. What a hub is, in one sentence.
2. The 10-minute path: `clearify init --hub`, pick "paste a PAT", done.
3. Snippet showing the expected output.
4. Link to `hub-model.md` for the other two paths and the full model.

Do not explain embed vs inject vs link here. Do not explain Terraform here. Do not explain sparse checkout here. Those go in `hub-model.md`.

### docs/public/hub-model.md

Already the long-form reference. Restructure to make path choice the top-level decision the reader makes, not an afterthought:

- Keep "What a hub is" and "The three project modes" at the top (structural concepts).
- Move the sparse checkout section below.
- Add a new section **Provisioning HUB_DISPATCH_TOKEN** with three subsections (Manual, CLI-assisted, Terraform), each with the journey map from section 3 of this plan.
- Add a decision table at the top of the Provisioning section:

```markdown
| If you... | Use |
|---|---|
| are a solo dev with your own hub repo | CLI-assisted (paste-and-go) |
| run a team that manages secrets in GitHub UI | Manual |
| already use Terraform for infrastructure | Terraform |
```

- Add a "Rotating the token" section covering all three paths.
- Add a troubleshooting entry per path.

The section currently titled "`HUB_DISPATCH_TOKEN` via Terraform" becomes one of three subsections under "Provisioning." The current copy is mostly reusable verbatim.

### docs/public/installation.md

Current content (36 lines) stays. Add a new section at the bottom:

```markdown
## Hub Mode Prerequisites

Clearify works fine standalone with no extras. If you plan to use Hub Mode to aggregate multiple repos into one site, what you need depends on how you provision the `HUB_DISPATCH_TOKEN` Actions secret:

**Manual path (no extras).** You create the secret in the GitHub UI. Clearify writes everything else.

**CLI-assisted path (recommended for solo projects).** Create a GitHub OAuth App once (any GitHub account can do this in 2 minutes). Export `CLEARIFY_GITHUB_CLIENT_ID=<your app id>`. The CLI then uses device-flow auth plus a PAT you paste at runtime. See [Creating the OAuth App](./hub-model.md#creating-the-oauth-app).

**Terraform path (recommended for platform teams).** Your Terraform setup manages `github_actions_secret` resources. See [Terraform provisioning](./hub-model.md#terraform).
```

Short, specific, explicit about which persona each path is for.

## 6. Anti-patterns to avoid

1. **Do not require Persona A to understand OAuth Apps before they can onboard.** The moment the first error message says "set CLEARIFY_GITHUB_CLIENT_ID" with no escape hatch, Lena quits. The CLI must offer "open a PR manually instead" when the env var is unset.

2. **Do not hide the manual path.** Some orgs audit UI-only secret creation and will reject any tool that writes secrets via API. The manual path is not a second-class fallback, it's the primary path for that persona.

3. **Do not make the CLI-assisted path opt-out.** A user should never accidentally hand a PAT to a CLI. Require an explicit menu choice. Print exactly what Clearify will do with the token before proceeding.

4. **Do not assume the hub lives in the same GitHub org as the sub-repo.** Jonas's team might have `acme-corp/docs-hub` and `jonas-personal/sdk`. The token targets the hub; the secret lives on the sub-repo. Error messages and prompts must keep these two separated.

5. **Do not couple registry write and secret write.** They're independent operations against different APIs with different failure modes. If the user picks Terraform, Clearify must still do the registry write. If the registry write fails, Clearify must not have written a secret that references a registry entry that doesn't exist.

6. **Do not ship a "one command does everything" narrative the code doesn't support.** The v1.14.0 docs already hit this problem (hub-model.md claims "Distribution is handled by Terraform" as if it's the only path). Be honest in every surface: the CLI offers three explicit routes, pick one.

7. **Do not use the word "recommended" without qualifying for whom.** "Recommended" is meaningless absent a persona. Every recommendation in docs and CLI copy should say "recommended for solo projects" or "recommended for teams using Terraform."

## 7. Metrics and success criteria

Quantitative:

- **Time to first successful dispatch**, measured from `clearify init --hub` to the first green hub deploy. Target: under 10 minutes for Persona A, under 15 for Persona B, under 5 for Persona C (since they've done it before).
- **README bounce for hub mode**: of users who hit the hub-mode section, what percentage click through to `hub-model.md`? Low click-through is fine if the one paragraph did its job.
- **Support questions per onboarding attempt**: tracked as GitHub issues tagged `hub` filed by users attempting their first `init --hub`. Target: under 0.3 per attempt.

Qualitative:

- **Can a zero-context reader pick the right path from reading only the README and `hub-model.md`?** Validate with 2-3 testers who've never used Clearify.
- **Does `clearify init --hub` produce output a user can paste into an issue when it fails?** No cryptic stacks, every error includes the path taken and the next step.
- **Does the docs narrative survive the "Marlin test":** one paragraph describes the concept, specific numbers replace vague claims, the structure is scannable, every section earns its place.

## 8. Risks

1. **PAT trust model is unclear.** Users pasting a PAT into Clearify may not understand that the token is used once and never stored. Mitigation: explicit pre-paste copy (see decision tree), link to a short "What Clearify does with your PAT" docs section, never log the token, never write it to disk even temporarily.

2. **OAuth App creation blocks Persona B.** Jonas's team won't create a GitHub OAuth App for one secret. Mitigation: make the manual path fully first-class and explicit that it skips the OAuth requirement entirely.

3. **Three-path docs bloat.** Covering all three paths in every surface makes `hub-model.md` long and noisy. Mitigation: progressive disclosure, the decision tree at the top routes readers to the one subsection they need.

4. **PAT scope mistakes in the manual path.** Users create a PAT with the wrong scope (`repo` vs fine-grained with `Contents: Write`), hit a silent 401 from the dispatch. Mitigation: `docs-trigger.yml` already uses `--fail-with-body`; docs must show the exact scope to pick, with screenshots if we can cheaply produce them.

5. **Terraform path drifts from CLI registry writes.** If the CLI writes a registry entry for a repo that Terraform hasn't added to `local.hub_repos`, the hub registry references a repo whose dispatch will never fire. Mitigation: `clearify init --hub` on the Terraform path prints an explicit "add this repo to Terraform now or the dispatch will silently fail" warning, plus a `clearify hub check` command that diffs registry entries against a resolvable set of secrets (stretch).

6. **PAT sharing in the manual path leaks blast radius.** The hub owner shares one PAT across multiple sub-repos (this is the current Terraform-managed reality). If a sub-repo's secret leaks, the whole hub is compromised. Mitigation: document rotation procedure for all three paths up front; future work could support a CI-specific token-per-repo model, but that's out of scope for this plan.

## 9. Open questions

1. **Is `Contents: Write` on the hub repo the right scope for all three paths, or do we need stricter scoping for the CLI-assisted path?** Fine-grained PATs with just "Actions > Repository dispatches > Write" would be tighter, but scope naming has shifted in GitHub's fine-grained tokens. Engineering agent should confirm the exact fine-grained permission name and whether it's sufficient.

2. **Should `clearify init --hub` be split into two commands?** E.g. `clearify init --hub` for local scaffolding plus registry write, `clearify hub secret` for the separate secret-provisioning step. Split feels cleaner (each command does one thing) but doubles the onboarding step count. My lean: keep it one command, but let the secret-provisioning step be skippable via the decision prompt.

3. **Do we offer a `clearify hub unregister` counterpart?** Not in scope for v1 but worth a line in the plan. How do users remove a project from a hub cleanly?

4. **How do we handle the case where the hub repo already has a registry entry for this project name but with a different `git.repo`?** Overwrite silently, prompt, or error? Current `hub-register.ts` overwrites. That's probably wrong for the "I forked the repo and ran init in the fork" case.

5. **Should the CLI-assisted path print the `curl` command it would run so advanced users can copy-paste it instead of pasting a PAT into the CLI?** Would make some Persona B users more comfortable. Costs us a clean UX. Worth discussing.
