#!/usr/bin/env node
/**
 * Migrate a clearify.data.json registry from the legacy hub-project schema
 * (mode + href + git + embedSections + injectInto + docsPath) to the new
 * source+placement schema.
 *
 * Usage:
 *   node scripts/migrate-hub-schema.mjs <path-to-clearify.data.json>
 *
 * Idempotent: if every project entry already has `source` and `placement`,
 * the file is not rewritten.
 *
 * Mapping:
 *   mode = 'link'   -> source: none,  placement: { kind: card, href }
 *   mode = 'embed'  -> source: git,   placement: { kind: tab, sections }
 *   mode = 'inject' -> source: git,   placement: { kind: nested, into, docsPath, group }
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function usage() {
  console.error('Usage: node scripts/migrate-hub-schema.mjs <path-to-clearify.data.json>');
  process.exit(2);
}

/**
 * Migrate a single project entry from the legacy shape to the new shape.
 * Returns the new entry. If the entry already has `source` and `placement`,
 * returns it unchanged.
 */
export function migrateProject(entry) {
  if (entry && typeof entry === 'object' && 'source' in entry && 'placement' in entry) {
    return entry;
  }

  const { name, description, status, icon, tags, group, repo, hubUrl, hubName } = entry;
  const base = { name, description };
  if (status !== undefined) base.status = status;
  if (icon !== undefined) base.icon = icon;
  if (tags !== undefined) base.tags = tags;
  if (group !== undefined) base.group = group;
  if (repo !== undefined) base.repo = repo;
  if (hubUrl !== undefined) base.hubUrl = hubUrl;
  if (hubName !== undefined) base.hubName = hubName;

  // Infer mode if missing: git present => embed, href present => link
  let mode = entry.mode;
  if (!mode) {
    if (entry.git) mode = 'embed';
    else if (entry.href) mode = 'link';
    else mode = 'link';
  }

  if (mode === 'link') {
    return {
      ...base,
      source: { kind: 'none' },
      placement: { kind: 'card', href: entry.href ?? '#' },
    };
  }

  if (mode === 'embed') {
    const git = entry.git ?? {};
    const source = { kind: 'git', repo: git.repo };
    if (git.ref !== undefined) source.ref = git.ref;
    if (git.path !== undefined) source.path = git.path;
    if (git.sparse !== undefined) source.sparse = git.sparse;

    const placement = { kind: 'tab' };
    if (entry.embedSections !== undefined) placement.sections = entry.embedSections;

    return { ...base, source, placement };
  }

  if (mode === 'inject') {
    const git = entry.git ?? {};
    const source = { kind: 'git', repo: git.repo };
    if (git.ref !== undefined) source.ref = git.ref;
    if (git.path !== undefined) source.path = git.path;
    if (git.sparse !== undefined) source.sparse = git.sparse;

    const placement = { kind: 'nested', into: entry.injectInto ?? '' };
    if (entry.docsPath !== undefined) placement.docsPath = entry.docsPath;
    if (entry.group !== undefined) placement.group = entry.group;

    // `group` at top level was historically also used as a nested subfolder
    // indicator in inject mode. Keep the top-level `group` for grid grouping
    // (already in base) and copy it to placement only if no explicit one.
    if (placement.group === undefined && entry.group !== undefined) {
      placement.group = entry.group;
    }

    return { ...base, source, placement };
  }

  throw new Error(`Unknown hub project mode "${mode}" for "${entry.name}"`);
}

/**
 * Migrate an entire clearify.data.json document. Returns `{ data, changed }`.
 * `changed` is true if any entry was rewritten.
 */
export function migrateDocument(doc) {
  if (!doc || typeof doc !== 'object') return { data: doc, changed: false };
  const projects = doc?.hub?.projects;
  if (!Array.isArray(projects)) return { data: doc, changed: false };

  let changed = false;
  const migrated = projects.map((p) => {
    const next = migrateProject(p);
    if (next !== p) changed = true;
    return next;
  });

  if (!changed) return { data: doc, changed: false };

  return {
    data: { ...doc, hub: { ...doc.hub, projects: migrated } },
    changed: true,
  };
}

function main() {
  const arg = process.argv[2];
  if (!arg) usage();

  const filePath = resolve(process.cwd(), arg);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = readFileSync(filePath, 'utf-8');
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse JSON: ${err.message}`);
    process.exit(1);
  }

  const { data, changed } = migrateDocument(doc);
  if (!changed) {
    console.log(`No changes needed: ${filePath}`);
    return;
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`Migrated: ${filePath}`);
}

// Only run main when invoked as a script, not when imported from tests.
const invokedDirectly = import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main();
}
