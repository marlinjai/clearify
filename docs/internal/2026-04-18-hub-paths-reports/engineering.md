# Hub Dispatch Token Paths: Engineering Analysis

> Staff-engineering input for the new hub-paths plan. Paired with parallel product/DX and documentation analyses.

## 1. Problem statement

Clearify is one tool, but it ships into at least three very different deployment contexts: Marlin's Lumitra-internal mono-ecosystem (where Terraform in `/Users/marlinjai/software-dev/infra/deployments/hub-dispatch/github.tf` holds the token), a solo developer publishing `@marlinjai/clearify` from npm and wiring their own hub, and a team somewhere in between that wants the hub model but does not want to adopt Terraform. All three need the same primitive on the wire: a `HUB_DISPATCH_TOKEN` Actions secret on every sub-repo, readable by `.github/workflows/docs-trigger.yml` (generated today at `src/node/hub-register.ts:304-340`).

Commit `4e2b775` ("simplify hub-register: remove secret encryption, delegate to Terraform") chose one path and cut the others. Before that commit the file did not exist on disk at all (`git log --all --oneline -- src/node/hub-register.ts` shows only `aa2d1fa` and `4e2b775`): the NaCl sealing code was drafted in-session and never committed. What shipped in v1.14.0 writes the registry (Contents API PUT) and scaffolds the workflow file, then prints a "next steps" block telling the user to edit `github.tf` and run `terraform apply` (see `src/node/hub-register.ts:391-399`).

That is broken for anyone outside Lumitra. A developer running `pnpm exec clearify init --hub` against their own hub has no Terraform to fall back on. Today they get the registry entry and the workflow file, push, and watch the curl 401 forever because `HUB_DISPATCH_TOKEN` was never set. The fix is to make Clearify support all three provisioning paths as first-class: (1) manual UI, (2) CLI-assisted (the cut NaCl sealing path, restored), (3) Terraform-managed (today's default for Lumitra).

## 2. OAuth scope + API capability matrix

| Path | GitHub endpoints called | Credentials held | Clearify stores on disk | Writes to sub-repo |
|---|---|---|---|---|
| Manual | (none by Clearify) | user handles PAT in browser | nothing secret | via UI: Secrets page |
| CLI-assisted | `POST /login/device/code`, `POST /login/oauth/access_token`, `GET/PUT /repos/{o}/{r}/contents/clearify.data.json`, `GET /repos/{o}/{r}/actions/secrets/public-key`, `PUT /repos/{o}/{r}/actions/secrets/{name}` | OAuth access token in process memory for the duration of init | `clearify.config.ts`, `.github/workflows/docs-trigger.yml`. Never the token. | registry entry (on hub), workflow file (local), Actions secret (via API) |
| Terraform-managed | CLI: same as manual (registry + workflow). Terraform: `github_actions_secret` via GitHub Terraform provider (which internally hits `PUT /repos/.../actions/secrets/...`). | PAT sourced from Infisical at apply-time. Never on disk. | same as manual | registry + workflow via CLI. Secret via `terraform apply`. |

### Scope check

`repo` classic OAuth scope is sufficient for all endpoints listed. The Actions Secrets API docs (`https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28#create-or-update-a-repository-secret`) specify: "OAuth app tokens and personal access tokens (classic) need the `repo` scope to use this endpoint." Same for `GET ...secrets/public-key`. The device-flow request at `src/node/hub-register.ts:84` already asks for `scope: 'repo'`, so the token returned has everything needed. Fine-grained PATs need explicit `Secrets: Read and Write` permission plus `Contents: Read and Write` on the hub repo (for the registry PUT) and on the sub-repo (for the secret PUT). That is relevant only for the manual-with-PAT variant (option 2 below).

### Who holds what

Path 1 (manual): zero credentials touch Clearify. User pastes the token into `https://github.com/<owner>/<repo>/settings/secrets/actions`.

Path 2 (CLI-assisted): one of
- (2a) **Reuse OAuth token.** After device-flow auth, the token is in memory. The CLI can both update the registry and PUT the Actions secret with the same token. Lowest friction, but the user is told a secret value they need to paste (the token they want to use as `HUB_DISPATCH_TOKEN` is different from the OAuth token they just authorized).
- (2b) **Prompt for a separate PAT.** User generates a fine-grained PAT, pastes it as hidden input, CLI encrypts and PUTs it. The OAuth token is only used for registry + secret endpoint access; the *value* stored in the sub-repo secret is the pasted PAT. This is what Marlin actually wants stored, because he does not want his OAuth session token sitting in a sub-repo forever.

Path 3 (Terraform): the PAT lives in Infisical (`infisical.lumitra.co`, project `infra`, key `HUB_DISPATCH_TOKEN`). Terraform provider reads `var.hub_dispatch_token` at apply time and hits the same PUT endpoint. Clearify knows nothing about it.

## 3. Secret encryption requirement

GitHub Actions secrets require libsodium sealed-box encryption. The wire flow is two requests:

1. `GET /repos/{o}/{r}/actions/secrets/public-key`: returns `{ key_id: string, key: base64-encoded 32-byte X25519 public key }`
2. `PUT /repos/{o}/{r}/actions/secrets/HUB_DISPATCH_TOKEN`: body `{ encrypted_value: base64(sealed_box(plaintext, public_key)), key_id }`

The encryption is NaCl's anonymous `crypto_box_seal`. Node's built-in `crypto` module does **not** expose sealed-box, so we need a library.

### Current state

`package.json` at `/Users/marlinjai/software-dev/ERP-suite/projects/clearify/package.json` has no crypto dependency. Zero nacl/sodium libs. `libsodium-wrappers` is not there, neither is `tweetsodium`. We are starting from scratch.

### Library options

| Library | Install size | Pros | Cons |
|---|---|---|---|
| `libsodium-wrappers` (official) | ~500KB bundled, 1.7MB unpacked | Canonical, actively maintained, full NaCl surface | Large, requires `await sodium.ready` before first use |
| `libsodium-wrappers-sumo` | ~700KB | Full libsodium | Even larger, we do not need the sumo surface |
| `tweetsodium` | ~15KB | Tiny, GitHub actually shipped this as their own example in the Actions Secrets API docs | Unmaintained since 2020, pure-JS tweetnacl wrapper |
| `tweetnacl` + `tweetnacl-sealedbox-js` | ~25KB combined | Small, has sealed-box primitive | Two packages |
| `@stablelib/nacl` | ~60KB | Modern, tree-shakeable, active | No sealed-box primitive directly: would need `@stablelib/x25519` + manual sealed-box construction |

**Recommendation**: `libsodium-wrappers`. 500KB is not meaningful for a CLI tool that already ships `shiki` (3MB), `mermaid` (5MB), and `@shikijs/rehype`. GitHub's own docs example uses it. Lazy-load behind a dynamic import inside `hub-register.ts` so the bundle cost only lands when `--secret-mode` is not `manual` or `skip`:

```ts
// inside encryptSecret(), not top-level
const sodium = await import('libsodium-wrappers');
await sodium.default.ready;
```

That keeps `clearify build` and `clearify dev` untouched (they never import hub-register) and keeps the default `init` path lean (hub-register is already dynamically imported at `src/node/init.ts:317,328`).

### Runtime-only dep

Goes in `dependencies`, not `devDependencies`: the CLI needs it at runtime when invoked. But the dynamic import means `require('@marlinjai/clearify')` for the config-export surface (defined in `package.json:14-18`) never pulls it in.

## 4. CLI surface design

### Entry point

`clearify init --hub` remains the entry. The `--hub` flag is defined at `src/cli/index.ts:50` and passed through to `init()` at `src/node/init.ts:316-331`. The interactive prompt at `src/node/init.ts:321-323` ("Register this project with a documentation hub? [y/N]") stays. The change happens inside `registerWithHub()` (`src/node/hub-register.ts:346-400`), after `generateWorkflow()` and before the final "Hub registration complete!" message.

### New flags

```
clearify init --hub [options]

  --hub-token <pat>         Skip OAuth. Use this PAT for the registry write.
                            Also reused as HUB_DISPATCH_TOKEN unless --secret-pat is given.
  --secret-mode <mode>      How to provision HUB_DISPATCH_TOKEN on this repo.
                            prompt (default) | auto | manual | skip
  --secret-pat <pat>        The PAT value to write as HUB_DISPATCH_TOKEN.
                            Required when --secret-mode=auto and not reusing --hub-token.
  --rotate-secret           Force re-write of HUB_DISPATCH_TOKEN even if it already exists.
```

### `--secret-mode` semantics

- `prompt` (default): interactive dialogue shown below.
- `auto`: writes the secret non-interactively. Requires `--secret-pat` or `--hub-token` reuse. Exits with error if neither is present.
- `manual`: skip the secret write. Print a block with the exact GitHub Secrets URL and the secret name. Use this when Terraform or an external process will handle it. This is the current v1.14.0 behavior and should remain accessible via flag for Marlin's workflow.
- `skip`: same as `manual` but suppresses the instructional block. For CI scenarios where the user already knows.

### Interactive prompt shape

After the registry PUT and workflow generation, for `prompt` mode:

```
  HUB_DISPATCH_TOKEN setup
  
  Your sub-repo needs a GitHub Personal Access Token stored as
  HUB_DISPATCH_TOKEN so the workflow can trigger the hub rebuild.
  
  How would you like to set it up?
  
    1) Write it now via the GitHub API (needs a PAT with repo scope)
    2) I'll set it manually in the GitHub UI
    3) Terraform / external tooling will handle it (skip)
  
  Choice [1/2/3]:
```

Option 1 then prompts hidden for the PAT, hits `GET .../secrets/public-key`, seals, PUTs, confirms.

Option 2 prints:

```
  Manual setup
  
  1. Open: https://github.com/<owner>/<repo>/settings/secrets/actions/new
  2. Name:  HUB_DISPATCH_TOKEN
  3. Value: <a PAT with repo scope, or fine-grained with Contents:Write on the hub>
  4. Click "Add secret"
  
  Then push your generated files. The next push to docs/** will trigger the hub.
```

Option 3 prints a one-liner pointing at the Terraform section of `docs/public/hub-model.md` and exits.

### Error handling

If the sealed-box PUT fails (422, 404, scope error), catch it and fall back to printing the manual instructions. Never exit non-zero on a secret-provisioning failure when the registry + workflow already succeeded: the user has a recoverable state. Print a clear warning:

```
  Could not write HUB_DISPATCH_TOKEN via API: <error>
  
  Your registry entry and workflow are already committed. Finish setup manually:
  <manual block>
```

## 5. Implementation plan

Concrete function list for `src/node/hub-register.ts`. All additions, zero deletions (the current flow stays functional as `--secret-mode=manual` default-if-no-client-id).

1. **`encryptSecret(plaintext: string, publicKey: string): Promise<string>`**. Uses `libsodium-wrappers` via dynamic import. Returns base64 sealed-box ciphertext. ~15 lines.

2. **`getRepoPublicKey(token, owner, repo): Promise<{ key_id: string, key: string }>`**. Calls `GET /repos/{owner}/{repo}/actions/secrets/public-key`. ~10 lines, mirrors `ghApiFetch` pattern at `src/node/hub-register.ts:43-62`.

3. **`storeDispatchToken(token, owner, repo, secretValue): Promise<void>`**. Orchestrates: fetch key, encrypt, PUT `/repos/{owner}/{repo}/actions/secrets/HUB_DISPATCH_TOKEN`. On non-201/204 throws a typed error the caller can recover from. ~25 lines.

4. **`promptSecretMode(): Promise<'auto' | 'manual' | 'skip'>`**. Readline-driven, reuses the pattern from `promptHubRepo` at `src/node/hub-register.ts:160-175`. ~20 lines.

5. **`promptHiddenInput(prompt: string): Promise<string>`**. Hidden input for the PAT. Use `readline` with `process.stdin.setRawMode(true)` and manual character handling, or add a dep (`@inquirer/password`). Given we already avoid inquirer-style deps (zero prompting libraries in `package.json`), rolling this by hand is ~30 lines and worth it. Node's built-in `readline` does not mute input natively.

6. **`printManualSecretInstructions(hub, subRepo, tokenHint?)`**. Just logs the block from section 4 above. ~15 lines.

7. **Extend `registerWithHub()` signature** (`src/node/hub-register.ts:346`) with `secretMode`, `secretPat`, `hubToken`. Add step 4.5 between the current step 4 (generate local files) and the final message. Shape:

```ts
// after generateWorkflow(hub) at line 389
if (options.secretMode !== 'skip') {
  const mode = options.secretMode === 'prompt' ? await promptSecretMode() : options.secretMode;
  if (mode === 'auto') {
    const secretValue = options.secretPat ?? token; // reuse OAuth only if explicitly opted in
    try {
      await storeDispatchToken(token, currentRepo.owner, currentRepo.repo, secretValue);
      console.log('  HUB_DISPATCH_TOKEN written to sub-repo');
    } catch (err) {
      console.warn(`  Could not write secret: ${err.message}`);
      printManualSecretInstructions(hub, currentRepo);
    }
  } else {
    printManualSecretInstructions(hub, currentRepo);
  }
}
```

8. **CLI wiring** at `src/cli/index.ts:46-54`: add `.option()` lines for the four new flags, pass them through to `init()`, then from `init()` to `registerWithHub()`. `init.ts:25-29`'s `InitOptions` interface gets three new fields.

9. **Graceful degradation for no-client-id**: at `src/node/hub-register.ts:350-355`, when `CLEARIFY_GITHUB_CLIENT_ID` is unset but `--hub-token` is provided, skip the device flow and use the provided PAT directly for all subsequent API calls. This unblocks external users who cannot or will not set up an OAuth App.

Total estimated diff: ~250 lines added, ~10 lines modified, 0 lines deleted. One new runtime dependency (`libsodium-wrappers`).

## 6. Edge cases + gotchas

### No `CLEARIFY_GITHUB_CLIENT_ID`

Current behavior (`src/node/hub-register.ts:350-355`) is hard exit. Proposed fix above: if `--hub-token` is passed, skip OAuth and use the PAT. If neither is set, print a helpful error that lists both options ("set `CLEARIFY_GITHUB_CLIENT_ID` to use OAuth, or pass `--hub-token` to use a PAT directly"). This also means external users of `@marlinjai/clearify` can onboard without Marlin's OAuth App.

### Token rotation across N sub-repos

A user on the CLI-assisted path with 5 sub-repos needs to rotate `HUB_DISPATCH_TOKEN` in all 5 at once. Two shapes:

- (a) `clearify init --hub --rotate-secret --secret-mode=auto --secret-pat $NEW_PAT` in each sub-repo. Works but requires N invocations.
- (b) `clearify hub rotate --secret-pat $NEW_PAT` as a new top-level command that reads the hub's `clearify.data.json`, walks every `embed` entry, and writes the secret to each sub-repo via the OAuth token (one auth, N writes). Cleaner UX, more code.

Recommend (a) for v1 and note (b) as future work. Terraform users already have this (one `apply`, N writes) so we do not need to beat that for parity, just exist.

### `hub.scan` still in schema

Flagged in `docs/internal/2026-04-18-plans-inventory.md:142`. `hub.scan` regex pattern still resolved in `src/core/config.ts:438-447` and `src/vite-plugin/index.ts:276`. It predates the registry+dispatch model and is load-bearing for the admin panel (`src/theme/admin/ProjectsManager.tsx:474` labels scanned entries as "read-only"). Removing it is a separate concern: a feature flag to disable auto-scan when `hub.projects[]` is explicit would be enough. Out of scope for this plan but worth naming so the next audit can pick it up.

### Why 4e2b775 removed this in the first place

Marlin removed the encryption path before it shipped because for Lumitra the Terraform path is strictly better: one apply covers all repos, rotation is atomic across the set, Infisical holds the key, zero CLI-user-memory credentials. Any restoration must leave that path untouched. The `--secret-mode=manual` default (when neither interactive nor auto is selected) means the current Lumitra workflow is unchanged: same printed next-steps block pointing at `github.tf`. Marlin can keep running what he runs today and the default output is byte-identical.

### Hub-repo token distribution

Someone onboarding to a brand-new hub also needs the hub repo to have a workflow that can receive dispatches. That is one-time hub setup (the `repository_dispatch: [types: docs-update]` trigger in `deploy-docs.yml`). Not this plan's scope. Note it in docs and move on.

### Two code paths risk

The reason Marlin cut this code is legitimate: maintaining both Terraform and CLI provisioning means two places to keep consistent. The restored path must be opt-in via flag (default stays `manual`) so Marlin never accidentally hits it. If the CLI-assisted path ever diverges from Terraform (different secret name, different repo targeting), that is a documentation and test problem, not an architecture problem: both are writing to `PUT /repos/.../actions/secrets/HUB_DISPATCH_TOKEN` with a sealed-box value. Same wire, different drivers.

## 7. Security model

### Token lifetimes

- **OAuth device-flow token** (`src/node/hub-register.ts:76-154`): in-memory only, for the duration of the init run. Not persisted. Default GitHub OAuth app tokens do not expire unless the app is configured for expiration. After init completes, the Node process exits and the token is gone.
- **PAT for `HUB_DISPATCH_TOKEN`** (the value written into the sub-repo): whatever the user generates. Recommend fine-grained PAT with `Contents: Read and Write` on the hub repo only, 90-day expiration. Never on the CLI user's disk: pasted into hidden prompt, encrypted, PUT, discarded.
- **Terraform path**: PAT lives in Infisical, pulled at apply time. Also never on disk.

### Worst case on compromised machine

If someone runs `init --hub --secret-mode=auto` on a compromised laptop:

- The OAuth token is in process memory briefly. Attacker with root can read it. Token has `repo` scope on every repo the user has access to: broad blast radius.
- The PAT (if passed as `--secret-pat`) is in argv, visible in `ps`. This is why the interactive hidden-input flow is safer than the flag.
- The PAT ends up encrypted in GitHub's secrets store. Attacker with repo admin on the sub-repo can read it back (GitHub decrypts for Actions runners). No extra exposure vs. manual flow.

### Why manual might be preferred

For security-sensitive environments (regulated industries, compliance audits), the manual path is the only one where the *tool* never sees the secret. CLI-assisted requires trusting Clearify's sealing code (though that code is just a thin wrapper over `libsodium-wrappers`). Terraform requires trusting the Terraform state file not to leak (it stores a hash, but the token passes through provider memory). Manual path: user copies from password manager, pastes into GitHub UI, tool never sees it.

Call this out in docs. Not everyone wants auto-provisioning, and that is fine.

## 8. Superseding `hub-evolution.md`

Explicit mapping against `docs/plans/hub-evolution.md` (status: decided, date 2026-04-07):

| `hub-evolution.md` section | New plan relationship |
|---|---|
| "Decisions Made" bullet "Hub-only model" (lines 28-30) | **Intact**. Unchanged. |
| "Decisions Made" bullet "Sparse checkout as default" (lines 34-35) | **Intact**. Shipped, no change. |
| "Decisions Made" bullet "`clearify init` is the primary feature" (lines 36-37) | **Amended**. Still primary, but the claim "one command, zero manual steps after" is replaced with "one command per secret-provisioning path." |
| Target Architecture section "`clearify init` flow" step 4 "Creates HUB_DISPATCH_TOKEN Actions secret via Secrets API" (line 69) | **Restored and made optional**. This was silently dropped in 4e2b775; new plan reinstates it behind `--secret-mode=auto` or `prompt`. |
| Implementation Tasks Task 1 GitHub API calls list items for `public-key` and `actions/secrets/HUB_DISPATCH_TOKEN` (lines 87-88) | **Restored**. The original plan listed these and they were never coded. |
| Tasks 2-6 (sparse checkout, hub registry migration, hub CI simplification, standalone site retirement, infra docs trigger) | **Intact**. All shipped or in flight, not affected by this plan. |
| "What NOT to Build" section | **Intact**. Still no webhook service, no GitHub App. |
| Definition of Done bullet 1 "clearify init in a new repo wires everything in under 60 seconds, one browser auth" (line 159) | **Amended**. New DoD: "one command per chosen secret-provisioning mode." For `manual` and `skip` paths the 60s target still holds; for `auto` it depends on PAT-generation time (user-dependent). |

The new plan does not touch the "decided" decisions. It restores scope that was silently cut in `4e2b775` and adds two paths (manual, Terraform) that were never enumerated as first-class options in `hub-evolution.md`. Treat this plan as an amendment, not a replacement.

## 9. Open questions

1. **Fine-grained PAT vs classic `repo`**: docs example uses classic. Fine-grained requires the user to pick permissions at creation time and is harder to instruct. Should the docs recommend fine-grained (strictly scoped, 90-day expiry, more work) or classic (broader scope, simpler)? Current hub-model.md line 195 says "classic tokens: `repo` scope" without alternative. My gut: recommend fine-grained in docs, accept classic in code.

2. **Hidden-input library vs roll-your-own**: Is it worth adding a 5KB `@inquirer/password` dep, or eat the 30 lines of raw stdin handling? I lean roll-your-own (zero new deps for UI primitives), but the UX of `@inquirer/password` is better (shows dots, handles paste correctly).

3. **Does the OAuth App exist for external users?**: `CLEARIFY_GITHUB_CLIENT_ID` is Marlin's OAuth App. An external user cannot use the device flow against Marlin's app (the app can only authorize Marlin's repos or repos the user explicitly installs it on, and installation friction is high). We should either (a) recommend external users bring their own client ID (documented), (b) ship a public Clearify OAuth App anyone can install, or (c) tell external users to skip OAuth entirely and use `--hub-token`. Option (c) is simplest.

4. **Should `clearify hub rotate` exist in v1?**: The rotation command is a nice-to-have but every extra command is surface area to maintain. If Marlin keeps using Terraform for his own ecosystem, the rotation command only benefits external users. Unclear if that's worth building before there are known external users asking for it.

5. **What happens on retry when secret already exists?**: `PUT .../secrets/HUB_DISPATCH_TOKEN` is idempotent at the GitHub API level (overwrites). But from a UX standpoint, should we `GET` first to warn "this secret already exists, overwrite?" or just silently re-write? Current proposal: silent re-write, because the user just went through the prompt and meant to. Add `--rotate-secret` as the explicit opt-in for re-writes if we decide silent is too magical.
