import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { RemoteGitSource, SectionConfig } from '../types/index.js';

interface ResolvedRemote {
  localPath: string;
  resolvedCommit: string;
  cached: boolean;
}

/**
 * Generate a filesystem-safe slug from a repo URL + ref.
 * e.g. "git@github.com:marlinjai/brain-core.git" + "main" → "marlinjai-brain-core--main"
 */
function repoSlug(repo: string, ref: string): string {
  return repo
    .replace(/^(https?:\/\/|git@)/, '')
    .replace(/\.git$/, '')
    .replace(/[/:@]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '--' + ref;
}

/**
 * Check whether a ref looks like a pinned SHA (40-char hex) or a semver tag.
 */
function isPinnedRef(ref: string): boolean {
  return /^[0-9a-f]{40}$/i.test(ref) || /^v?\d+\.\d+/.test(ref);
}

/**
 * Clone or update a git repo into the cache directory.
 */
export async function resolveRemoteSource(
  source: RemoteGitSource,
  cacheDir: string,
): Promise<ResolvedRemote> {
  const ref = source.ref ?? 'main';
  const slug = repoSlug(source.repo, ref);
  const localPath = resolve(cacheDir, slug);
  const sparse = source.sparse !== false;

  mkdirSync(cacheDir, { recursive: true });

  if (existsSync(resolve(localPath, '.git'))) {
    // Cache exists — check if we need to update
    if (!isPinnedRef(ref)) {
      try {
        execSync(`git -C ${JSON.stringify(localPath)} fetch origin ${ref} --depth 1`, {
          stdio: 'pipe',
          timeout: 30_000,
        });
        execSync(`git -C ${JSON.stringify(localPath)} checkout FETCH_HEAD`, {
          stdio: 'pipe',
        });
      } catch (err) {
        console.warn(
          `  ⚠ Failed to update remote "${source.repo}" (ref: ${ref}), using stale cache.`,
          err instanceof Error ? err.message : '',
        );
      }
    }

    const commit = getHeadCommit(localPath);
    return { localPath, resolvedCommit: commit, cached: true };
  }

  // Fresh clone
  try {
    if (sparse && source.path) {
      execSync(
        `git clone --no-checkout --depth 1 --branch ${ref} ${source.repo} ${JSON.stringify(localPath)}`,
        { stdio: 'pipe', timeout: 60_000 },
      );
      execSync(`git -C ${JSON.stringify(localPath)} sparse-checkout init --cone`, {
        stdio: 'pipe',
      });
      execSync(`git -C ${JSON.stringify(localPath)} sparse-checkout set ${source.path}`, {
        stdio: 'pipe',
      });
      execSync(`git -C ${JSON.stringify(localPath)} checkout`, { stdio: 'pipe' });
    } else {
      execSync(
        `git clone --depth 1 --branch ${ref} ${source.repo} ${JSON.stringify(localPath)}`,
        { stdio: 'pipe', timeout: 60_000 },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to clone remote repo "${source.repo}" (ref: ${ref}): ${msg}`,
    );
  }

  const commit = getHeadCommit(localPath);
  return { localPath, resolvedCommit: commit, cached: false };
}

function getHeadCommit(repoPath: string): string {
  try {
    return execSync(`git -C ${JSON.stringify(repoPath)} rev-parse HEAD`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * For each section with a `git` source, clone/update the repo and rewrite
 * `docsDir` to the absolute path inside the cached clone.
 */
export async function resolveRemoteSections(
  sections: SectionConfig[],
  cacheDir: string,
): Promise<SectionConfig[]> {
  const results: SectionConfig[] = [];

  for (const section of sections) {
    if (!section.git) {
      results.push(section);
      continue;
    }

    const { localPath, cached } = await resolveRemoteSource(section.git, cacheDir);
    const absoluteDocsDir = resolve(localPath, section.docsDir);

    if (!existsSync(absoluteDocsDir)) {
      throw new Error(
        `Remote section "${section.label}": docs directory "${section.docsDir}" not found in cloned repo "${section.git.repo}".`,
      );
    }

    console.log(
      `  Remote section "${section.label}": ${cached ? 'cached' : 'cloned'} → ${absoluteDocsDir}`,
    );

    results.push({
      ...section,
      docsDir: absoluteDocsDir,
      git: undefined, // Already resolved — docsDir is now absolute
    });
  }

  return results;
}
