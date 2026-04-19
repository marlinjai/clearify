---
title: Clearify IaC Alignment (CF Pages via Terraform)
type: plan
status: draft
date: 2026-04-19
tags: [clearify, infra, terraform, cloudflare, iac]
projects: [clearify, infra]
summary: Bring the Clearify hub and standalone doc sites under Terraform management alongside the rest of Marlin's infra stack: cloudflare_pages_project, cloudflare_pages_domain, DNS records, HUB_DISPATCH_TOKEN, Cloudflare API tokens via Infisical.
---

# Clearify IaC Alignment (CF Pages via Terraform)

## The problem

The Clearify deployments are the last piece of Marlin's stack that isn't in Terraform. Everything else (Coolify apps, Hetzner servers, Route53 zones, GitHub Actions secrets on sub-repos, Cloudflare R2 buckets for Storage Brain) is declared and applied via the `infra` repo. The Clearify Pages projects, their custom domains, and the API tokens that deploy them live in a mix of:

1. **Cloudflare dashboard** (clicked in once, drift risk)
2. **1Password** (legacy path, CLOUDFLARE_API_TOKEN for old `wrangler pages deploy` workflows)
3. **Infisical** (current path for everything else, but never wired into the Clearify workflows)
4. **GitHub Actions secrets clicked in per repo** (receipt-ocr-app, email-editor still on this pattern after 2026-04-19 revert)

The immediate symptom: every time a new sub-repo comes online or an existing one moves between embed and link modes, there's manual setup. A Cloudflare Pages project to create by hand, a CNAME in Route53, an API token to scope and paste, maybe a 1Password item to create. No `terraform plan` shows the gap, because there's no TF state covering any of it.

The fix: treat Clearify's hub site and every standalone Clearify site exactly like any other deployment. A `deployments/<site>-docs/` directory in `infra`, a module that wraps the standard shape, Infisical as the secret source of truth, and the GitHub Actions workflow pulls the token via `infisical run` instead of 1Password.

## Current state

Zero Cloudflare Pages projects under Terraform today. Inventory of what exists in the wild:

| Site | Pages project | Custom domain | Deploy workflow | API token source |
|------|---------------|---------------|-----------------|------------------|
| ERP hub (`docs.lumitra.co`) | `erp-suite-docs` | yes | `.github/workflows/deploy-docs.yml` on ERP-suite | 1Password |
| Receipt OCR docs (`docs.receipts.lumitra.co`) | `receipt-ocr-app-docs` | yes | `.github/workflows/deploy-docs.yml` on receipt-ocr-app | 1Password |
| Email Editor docs (`docs.email-editor.lumitra.co`) | `email-editor-docs` | yes | `.github/workflows/deploy-docs.yml` on email-editor | 1Password |
| Clearify docs (`docs.clearify.lumitra.co`, planned) | not created yet | planned | not created yet | n/a |

Secrets involved:

- `CLOUDFLARE_API_TOKEN`: scoped to the Pages projects above. One token, five consumers (three workflows plus future Clearify site plus local `wrangler` use). Currently in 1Password item `cloudflare-deploy-token`. Needs to move to Infisical (project: `infra`, path: `/cloudflare`).
- `CLOUDFLARE_ACCOUNT_ID`: not secret but not committed either, in 1Password.
- `HUB_DISPATCH_TOKEN`: already in Infisical (`/hub-dispatch/HUB_DISPATCH_TOKEN`), already wired through Terraform for the 7 repos in `deployments/hub-dispatch/github.tf`. This piece is done, included here only for mental completeness.

So the gap is: all CF Pages infrastructure is unmanaged, and the token that deploys it is in 1Password instead of Infisical.

## Target state

Every Clearify site has a TF deployment in `infra` that declares:

1. `cloudflare_pages_project` (the Pages app)
2. `cloudflare_pages_domain` (the custom domain binding)
3. `cloudflare_record` (the CNAME or A record in the zone)
4. Wiring for the deploy token (from Infisical via the existing `infisical_secret` data source pattern used elsewhere in `infra`)

All four resources come out of a new `modules/cloudflare/pages-site` module so each deployment is 15 lines of HCL plus a variables file.

Directory layout after this lands:

```
infra/
├── deployments/
│   ├── hub-dispatch/              (already exists)
│   ├── erp-suite-docs/            NEW
│   ├── receipt-ocr-app-docs/      NEW
│   ├── email-editor-docs/         NEW
│   └── clearify-docs/             NEW, once the Clearify site is stood up
└── modules/
    └── cloudflare/
        └── pages-site/            NEW
```

Every GitHub Actions `deploy-docs.yml` workflow on the sub-repos gets updated to:

1. `infisical run --env=prod -- wrangler pages deploy ...`
2. No more 1Password step, no `op run`.

## The `modules/cloudflare/pages-site` module

Standard inputs, one resource block per piece. Sketch:

```hcl
# modules/cloudflare/pages-site/variables.tf
variable "account_id" {
  type        = string
  description = "Cloudflare account ID"
}

variable "project_name" {
  type        = string
  description = "Cloudflare Pages project name (e.g. erp-suite-docs)"
}

variable "custom_domain" {
  type        = string
  description = "Fully-qualified domain (e.g. docs.lumitra.co)"
}

variable "zone_id" {
  type        = string
  description = "Cloudflare zone ID that owns the custom domain"
}

variable "production_branch" {
  type    = string
  default = "main"
}
```

```hcl
# modules/cloudflare/pages-site/main.tf
resource "cloudflare_pages_project" "this" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = var.production_branch
}

resource "cloudflare_pages_domain" "this" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.this.name
  domain       = var.custom_domain
}

resource "cloudflare_record" "this" {
  zone_id = var.zone_id
  name    = var.custom_domain
  type    = "CNAME"
  value   = "${cloudflare_pages_project.this.subdomain}"
  proxied = true
  ttl     = 1
}

output "pages_project_subdomain" {
  value = cloudflare_pages_project.this.subdomain
}
```

Consumers are thin:

```hcl
# deployments/erp-suite-docs/main.tf
module "erp_suite_docs" {
  source = "../../modules/cloudflare/pages-site"

  account_id    = data.infisical_secret.cf_account_id.value
  project_name  = "erp-suite-docs"
  custom_domain = "docs.lumitra.co"
  zone_id       = data.cloudflare_zone.lumitra.id
}
```

The `infisical_secret` data source is already used in `deployments/hub-dispatch/` for `HUB_DISPATCH_TOKEN`. Same pattern here for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## GitHub Actions workflow pattern

Today's workflow on each docs-producing repo (pre-revert and post-revert alike):

```yaml
- uses: 1password/load-secrets-action@v2
  with:
    export-env: true
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
    CLOUDFLARE_API_TOKEN: op://infra/cloudflare-deploy-token/credential
- run: pnpm docs:build
- run: npx wrangler pages deploy docs-dist --project-name=erp-suite-docs
```

Target pattern:

```yaml
- uses: Infisical/secrets-action@v1
  with:
    domain: https://infisical.lumitra.co
    client-id: ${{ secrets.INFISICAL_CLIENT_ID }}
    client-secret: ${{ secrets.INFISICAL_CLIENT_SECRET }}
    project-slug: infra
    env-slug: prod
    secret-path: /cloudflare
    export-type: env
- run: pnpm docs:build
- run: npx wrangler pages deploy docs-dist --project-name=erp-suite-docs
  env:
    CLOUDFLARE_API_TOKEN: ${{ env.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ env.CLOUDFLARE_ACCOUNT_ID }}
```

Two secrets drop from each repo (`OP_SERVICE_ACCOUNT_TOKEN` goes away, Infisical's machine identity takes its place). That Infisical machine identity is ideally provisioned via Terraform too (`infisical_identity` resource), but that can come in a follow-up: starting with manually-created machine identities is fine because they live in one place and the workflow pattern is the same.

## Migration order

One deployment at a time, hub first, because the hub is the most important site and any breakage there is most visible.

1. **erp-suite-docs** (hub). Create the deployment directory, import existing Pages project into state (`terraform import cloudflare_pages_project.this <account>/<project>`), apply, confirm no drift. Switch workflow to Infisical. Deploy once, confirm `docs.lumitra.co` still works.
2. **receipt-ocr-app-docs**. Same shape. Same import dance. Switch workflow.
3. **email-editor-docs**. Same.
4. **clearify-docs** (new, if and when we stand up a dedicated Clearify docs site).

Each step is one PR against `infra` plus one PR against the sub-repo workflow. The two PRs merge together, then `terraform apply` in the new deployment, then the workflow runs green on the next doc push.

Rollback for any step: revert the sub-repo workflow commit (back to 1Password), leave the TF state in place. Pages project keeps working because it exists either way.

## Relationship to the schema-redesign plan

This plan and 2026-04-19-hub-schema-redesign.md compose cleanly:

1. The schema redesign unlocks a `clearify_hub_project` TF resource that naturally maps to `source { kind = "git" ... }` + `placement { kind = "card" href = "..." }`. That Terraform provider is a future plan.
2. This IaC plan covers the Cloudflare side (the actual Pages projects and DNS). It's independent: even without the schema redesign, we can still put every site under Terraform today.
3. The order to do them in: this one first (Cloudflare Pages under TF, existing schema unchanged), schema redesign next (Clearify code only), then the `clearify_hub_project` provider that combines both.

If we ever want "one `terraform apply` adds a new sub-repo to the hub, creates its docs site if standalone, writes the entry to `clearify.data.json`, sets the secret", that's the composition of all three plans.

## Open questions

1. **Zone ID lookup**: `lumitra.co` is in Cloudflare already. Use `data.cloudflare_zone` by zone name or hardcode the zone ID? Existing `infra` pattern (check `deployments/*`) uses the data source. Follow.
2. **API token scope**: one token for all Pages projects vs one token per project? Today it's one token. Keep one token. The rotation story is simpler and the blast radius is "all docs sites, no production data."
3. **Import vs recreate**: importing existing Pages projects into state is safer (no downtime). Recreating would blow away edit history in CF dashboard and any manual domain bindings. Import.
4. **State backend**: same S3 bucket as the rest of `infra`. No change needed beyond a new state key per deployment.

## Non-goals

Explicitly out of scope for this plan:

1. Turning off 1Password entirely. Only the Clearify path moves. Other workflows that still use 1Password stay on 1Password until they have their own migration plan.
2. Moving Cloudflare R2 (Storage Brain) into this module. R2 has its own shape and lives in `deployments/storage-brain-r2/` already.
3. The `clearify_hub_project` Terraform provider. Separate plan, depends on the schema redesign.

## Dependencies

- **Depends on**: nothing blocking. The existing Infisical machine identity pattern in `deployments/hub-dispatch/` is the template.
- **Unblocks**: the "clearify_hub_project as a TF resource" work (not yet planned), because once CF Pages is in TF the hub registry is the last manual surface.
- **Related**: 2026-04-19-hub-schema-redesign.md (the registry shape that a future provider writes against).
