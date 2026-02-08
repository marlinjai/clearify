#!/bin/bash
# Claude Code PostToolUse hook — detects git commits and reminds Claude
# to update CHANGELOG.md, relevant documentation pages, and rebuild docs.
#
# Receives JSON on stdin with tool_input.command from the Bash tool.
# Outputs JSON with additionalContext when a git commit is detected.

INPUT=$(cat)

# Extract the command that was run
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Check if this was a git commit (not amend, not just git commit --help, etc.)
if echo "$COMMAND" | grep -qE 'git commit\b' && ! echo "$COMMAND" | grep -qE '\-\-help|log|show'; then

  # Skip if the commit only touches docs/changelog (prevents infinite hook loop)
  CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
  NON_DOC_FILES=$(echo "$CHANGED_FILES" | grep -vE '^(docs/|CHANGELOG\.md$|internal/|\.claude/)' | head -1)
  if [ -z "$NON_DOC_FILES" ]; then
    exit 0
  fi

  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "A git commit was just made. Please do the following:\n\n1. **Update CHANGELOG.md** — Add an entry under the [Unreleased] section using Keep a Changelog format (Added/Changed/Fixed/Removed). Write a concise description of what changed and why.\n\n2. **Update relevant documentation** — Check if the committed changes affect any existing docs pages (guides, getting-started, API references, architecture docs, roadmap, etc.). If a feature was added or behavior changed, update the corresponding docs to reflect the current state. Create new doc pages if the change introduces something not yet documented.\n\n3. **Rebuild docs** — Run `npm run build` to regenerate the documentation site.\n\nKeep a Changelog format: https://keepachangelog.com"
  }
}
EOF
fi

exit 0
