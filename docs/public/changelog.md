---
title: Changelog & Docs Automation
description: Automatic changelog and documentation updates with Claude Code
order: 6
---

# Changelog & Docs Automation

Clearify keeps your changelog and documentation in sync with your code — automatically.

## Auto-generated on init

Running `pnpm exec clearify init` scaffolds a starter `CHANGELOG.md` at your project root alongside the docs folder and config file. The changelog follows the [Keep a Changelog](https://keepachangelog.com) format out of the box.

## Auto-detected as a docs page

Clearify automatically detects `CHANGELOG.md` at your project root and serves it as a `/changelog` page. No configuration needed.

1. Place a `CHANGELOG.md` in your project root (or let `clearify init` create one)
2. Run `clearify dev` or `clearify build`
3. The changelog appears in the sidebar at `/changelog`

The file is watched during development — edits trigger a hot reload.

## Recommended format

We recommend the [Keep a Changelog](https://keepachangelog.com) format:

```markdown
# Changelog

## [Unreleased]

### Added

- New feature description

## [1.0.0] - 2026-02-08

### Added

- Initial release

### Changed

- Updated dependency X

### Fixed

- Bug in feature Y
```

## Claude Code hook

Clearify includes a Claude Code hook that fires after every git commit and instructs Claude to:

1. **Update CHANGELOG.md** — append an entry under `[Unreleased]` with what changed
2. **Update relevant docs** — check if committed changes affect any existing documentation (guides, API references, architecture docs, roadmap, etc.) and update them to reflect the current state
3. **Rebuild docs** — run `pnpm run build` so the docs site is always current

### Setup

Add this to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/scripts/post-commit-changelog.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

The hook script lives at `.claude/scripts/post-commit-changelog.sh`. Copy it from the Clearify project or create your own.

### Workflow

```
You: "Implement feature X"
Claude: [implements, commits]
Hook fires:
  → "Update CHANGELOG.md with this change"
  → "Update any docs pages affected by this change"
  → "Rebuild docs"
Claude: [updates changelog, updates docs, runs pnpm run build]
```

The changelog and documentation stay in sync with code — without manual effort.

### What gets updated

The hook is context-aware. After a commit, Claude checks:

- **CHANGELOG.md** — always updated with what changed
- **Getting started / setup guides** — if installation steps or config changed
- **API / usage docs** — if public interfaces or behavior changed
- **Architecture docs** — if internal structure or patterns changed
- **Roadmap** — if a planned feature was implemented (can be marked as done)

Only pages that are actually affected by the commit get updated.

## Per-project changelogs

Every project using Clearify gets this automatically. Either run `pnpm exec clearify init` (creates CHANGELOG.md for you) or add one manually:

```bash
cd projects/data-table
echo "# Changelog" > CHANGELOG.md
pnpm exec clearify dev
# → /changelog page appears in sidebar
```
