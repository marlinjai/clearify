import { resolve, basename } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import type { HubProject } from '../types/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectProjectName(): string {
  const cwd = process.cwd();
  const pkgPath = resolve(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) {
        const raw = pkg.name.replace(/^@[^/]+\//, '');
        return raw
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
    } catch {
      // ignore
    }
  }
  return basename(cwd)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function getGitRemoteInfo(): { owner: string; repo: string } | null {
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    // Handle both SSH and HTTPS URLs
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) return { owner: match[1], repo: match[2] };
  } catch {
    // not a git repo or no remote
  }
  return null;
}

async function ghApiFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<{ status: number; data: any }> {
  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// Secret Encryption (libsodium sealed-box)
// ---------------------------------------------------------------------------

/**
 * Encrypt a secret value for a GitHub Actions repository secret using the
 * repo's public key (NaCl sealed box). Matches the format GitHub expects on
 * PUT /repos/{owner}/{repo}/actions/secrets/{name}.
 */
async function encryptSecret(plaintext: string, publicKey: string): Promise<string> {
  const sodium = (await import('libsodium-wrappers')).default;
  await sodium.ready;
  const keyBytes = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
  const messageBytes = sodium.from_string(plaintext);
  const sealed = sodium.crypto_box_seal(messageBytes, keyBytes);
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

async function getRepoPublicKey(
  token: string,
  owner: string,
  repo: string,
): Promise<{ key_id: string; key: string }> {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`;
  const res = await ghApiFetch(url, {
    headers: { Authorization: `token ${token}` },
  });
  if (res.status !== 200 || !res.data?.key || !res.data?.key_id) {
    throw new Error(
      `Failed to fetch public key for ${owner}/${repo}: ${res.status} ${JSON.stringify(res.data)}`,
    );
  }
  return { key_id: res.data.key_id, key: res.data.key };
}

async function storeDispatchToken(
  token: string,
  owner: string,
  repo: string,
  secretValue: string,
): Promise<void> {
  const { key_id, key } = await getRepoPublicKey(token, owner, repo);
  const encrypted_value = await encryptSecret(secretValue, key);
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/HUB_DISPATCH_TOKEN`;
  const res = await ghApiFetch(url, {
    method: 'PUT',
    headers: { Authorization: `token ${token}` },
    body: JSON.stringify({ encrypted_value, key_id }),
  });
  if (res.status !== 201 && res.status !== 204) {
    throw new Error(
      `Failed to write HUB_DISPATCH_TOKEN on ${owner}/${repo}: ${res.status} ${JSON.stringify(res.data)}`,
    );
  }
}

async function secretExists(
  token: string,
  owner: string,
  repo: string,
  name: string,
): Promise<boolean> {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${name}`;
  const res = await ghApiFetch(url, { headers: { Authorization: `token ${token}` } });
  return res.status === 200;
}

// ---------------------------------------------------------------------------
// Interactive Prompt Helpers
// ---------------------------------------------------------------------------

async function promptSecretMode(): Promise<'auto' | 'manual' | 'skip'> {
  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n  How would you like to provision HUB_DISPATCH_TOKEN on this sub-repo?');
  console.log('    1) auto    paste a PAT now, Clearify encrypts and PUTs it via the Secrets API');
  console.log('    2) manual  print instructions for the GitHub UI (I will paste it myself)');
  console.log('    3) skip    leave it alone (I manage it via Terraform)\n');

  const answer = await new Promise<string>((res) => {
    rl.question('  Choose [1/2/3] (default: 2): ', res);
  });
  rl.close();

  const trimmed = answer.trim();
  if (trimmed === '1' || trimmed.toLowerCase() === 'auto') return 'auto';
  if (trimmed === '3' || trimmed.toLowerCase() === 'skip') return 'skip';
  return 'manual';
}

async function promptHiddenInput(prompt: string): Promise<string> {
  const password = (await import('@inquirer/password')).default;
  const value = await password({ message: prompt, mask: '*' });
  if (!value) {
    throw new Error('Empty input; aborting.');
  }
  return value;
}

function printManualSecretInstructions(
  subRepo: { owner: string; repo: string },
  hub: { owner: string; repo: string },
): void {
  const url = `https://github.com/${subRepo.owner}/${subRepo.repo}/settings/secrets/actions/new`;
  console.log('\n  Manual secret provisioning');
  console.log(`    1. Open: ${url}`);
  console.log('    2. Secret name: HUB_DISPATCH_TOKEN');
  console.log(
    `    3. Value: a fine-grained PAT with "Contents: Read and Write" scope on ${hub.owner}/${hub.repo}, 90-day expiry.`,
  );
  console.log('    4. Save and push a doc change to verify the dispatch fires.\n');
}

// ---------------------------------------------------------------------------
// GitHub Device Flow OAuth
// ---------------------------------------------------------------------------

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

async function githubDeviceAuth(clientId: string): Promise<string> {
  // Step 1: Request device & user codes
  const codeRes = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ client_id: clientId, scope: 'repo' }),
  });

  const codeData: DeviceCodeResponse = await codeRes.json();

  console.log(`\n  Open this URL in your browser: ${codeData.verification_uri}`);
  console.log(`  Enter code: ${codeData.user_code}\n`);

  // Try to open the browser automatically
  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      execSync(`open "${codeData.verification_uri}"`);
    } else if (platform === 'linux') {
      execSync(`xdg-open "${codeData.verification_uri}"`);
    } else if (platform === 'win32') {
      execSync(`start "${codeData.verification_uri}"`);
    }
  } catch {
    // Browser open failed — user can open manually
  }

  // Step 2: Poll for token
  const interval = (codeData.interval || 5) * 1000;
  const deadline = Date.now() + codeData.expires_in * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: codeData.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      console.log('  GitHub authentication successful!\n');
      return tokenData.access_token;
    }

    if (tokenData.error === 'authorization_pending') {
      continue;
    }

    if (tokenData.error === 'slow_down') {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    if (tokenData.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }

    if (tokenData.error === 'access_denied') {
      throw new Error('Authorization denied by user.');
    }

    throw new Error(`OAuth error: ${tokenData.error} — ${tokenData.error_description}`);
  }

  throw new Error('Device code expired. Please try again.');
}

// ---------------------------------------------------------------------------
// Hub Selection
// ---------------------------------------------------------------------------

async function promptHubRepo(): Promise<{ owner: string; repo: string }> {
  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question('  Hub repository (owner/repo): ', resolve);
  });
  rl.close();

  const parts = answer.trim().split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repository format: "${answer}". Expected "owner/repo".`);
  }

  return { owner: parts[0], repo: parts[1] };
}

// ---------------------------------------------------------------------------
// Registry Update
// ---------------------------------------------------------------------------

async function updateHubRegistry(
  token: string,
  hub: { owner: string; repo: string },
  project: {
    name: string;
    description: string;
    gitRepoUrl: string;
    gitRef: string;
    docsPath: string;
  },
): Promise<void> {
  const authHeaders = { Authorization: `token ${token}` };
  const apiBase = 'https://api.github.com';

  // 1. Read current clearify.data.json from hub repo
  const fileUrl = `${apiBase}/repos/${hub.owner}/${hub.repo}/contents/clearify.data.json`;
  const getRes = await ghApiFetch(fileUrl, { headers: authHeaders });

  let currentData: any = { hub: { projects: [] } };
  let fileSha: string | undefined;

  if (getRes.status === 200 && getRes.data?.content) {
    const decoded = Buffer.from(getRes.data.content, 'base64').toString('utf-8');
    currentData = JSON.parse(decoded);
    fileSha = getRes.data.sha;
    if (!currentData.hub) currentData.hub = { projects: [] };
    if (!currentData.hub.projects) currentData.hub.projects = [];
  } else if (getRes.status !== 404) {
    throw new Error(`Failed to read hub registry: ${getRes.status} ${JSON.stringify(getRes.data)}`);
  }

  // 2. Check if project already registered
  const existingIdx = currentData.hub.projects.findIndex(
    (p: any) => p.name === project.name,
  );

  const entry: HubProject = {
    name: project.name,
    description: project.description,
    status: 'active',
    mode: 'embed',
    git: {
      repo: project.gitRepoUrl,
      ref: project.gitRef,
      path: project.docsPath,
    },
  };

  if (existingIdx >= 0) {
    currentData.hub.projects[existingIdx] = entry;
    console.log(`  Updated existing project "${project.name}" in hub registry`);
  } else {
    currentData.hub.projects.push(entry);
    console.log(`  Added project "${project.name}" to hub registry`);
  }

  // 3. Write updated clearify.data.json
  const updatedContent = Buffer.from(
    JSON.stringify(currentData, null, 2) + '\n',
  ).toString('base64');

  const putBody: any = {
    message: `docs: register ${project.name} in hub`,
    content: updatedContent,
  };
  if (fileSha) putBody.sha = fileSha;

  const putRes = await ghApiFetch(fileUrl, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(putBody),
  });

  if (putRes.status !== 200 && putRes.status !== 201) {
    throw new Error(
      `Failed to update hub registry: ${putRes.status} ${JSON.stringify(putRes.data)}`,
    );
  }

  console.log('  Hub registry updated successfully');
}


// ---------------------------------------------------------------------------
// Local File Generation
// ---------------------------------------------------------------------------

function generateConfig(
  projectName: string,
  hubProject: Omit<HubProject, 'name'> | undefined,
): void {
  const cwd = process.cwd();
  const configPath = resolve(cwd, 'clearify.config.ts');

  if (existsSync(configPath)) {
    console.log('  clearify.config.ts already exists — skipping config generation');
    console.log('  Add a hubProject block manually if needed');
    return;
  }

  const description = hubProject?.description ?? 'Project documentation';
  const config = `import { defineConfig } from '@marlinjai/clearify';

export default defineConfig({
  name: '${projectName}',
  sections: [
    { label: 'Docs', docsDir: './docs/public' },
  ],
  theme: {
    primaryColor: '#3B82F6',
    mode: 'auto',
  },
  hubProject: {
    description: '${description}',
    status: 'active',
  },
});
`;

  writeFileSync(configPath, config);
  console.log('  Created clearify.config.ts with hubProject config');
}

function generateWorkflow(hub: { owner: string; repo: string }): void {
  const cwd = process.cwd();
  const workflowDir = resolve(cwd, '.github/workflows');
  const workflowPath = resolve(workflowDir, 'docs-trigger.yml');

  if (existsSync(workflowPath)) {
    console.log('  .github/workflows/docs-trigger.yml already exists — skipping');
    return;
  }

  mkdirSync(workflowDir, { recursive: true });

  const workflow = `name: Docs Trigger

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'clearify.config.ts'

jobs:
  notify-hub:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger hub rebuild
        run: |
          curl --fail-with-body -X POST \\
            -H "Authorization: token \${{ secrets.HUB_DISPATCH_TOKEN }}" \\
            -H "Accept: application/vnd.github.v3+json" \\
            https://api.github.com/repos/${hub.owner}/${hub.repo}/dispatches \\
            -d '{"event_type": "docs-update"}'
`;

  writeFileSync(workflowPath, workflow);
  console.log('  Created .github/workflows/docs-trigger.yml');
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export async function registerWithHub(options: {
  projectName?: string;
  hubProject?: Omit<HubProject, 'name'>;
  hubToken?: string;
  secretMode?: 'prompt' | 'auto' | 'manual' | 'skip';
  secretPat?: string;
  rotateSecret?: boolean;
}): Promise<void> {
  const clientId = process.env.CLEARIFY_GITHUB_CLIENT_ID;
  if (!clientId && !options.hubToken) {
    console.error('\n  Error: no GitHub credentials available for hub onboarding.');
    console.error('  Clearify needs one of these to write the hub registry entry:\n');
    console.error('    1) Set CLEARIFY_GITHUB_CLIENT_ID to a GitHub OAuth App client ID');
    console.error('       (create one at https://github.com/settings/applications/new,');
    console.error('       scope "repo"), then re-run this command.');
    console.error('    2) Pass --hub-token <pat> to use a Personal Access Token directly');
    console.error('       (fine-grained PAT with "Contents: Read and Write" on the hub repo).');
    console.error('');
    process.exit(1);
  }

  const projectName = options.projectName ?? detectProjectName();
  const currentRepo = getGitRemoteInfo();

  if (!currentRepo) {
    console.error('\n  Error: Could not detect git remote origin.');
    console.error('  Make sure this is a git repository with a GitHub remote.\n');
    process.exit(1);
  }

  console.log(`\n  Registering "${projectName}" with a documentation hub\n`);

  // 1. Select hub repository
  const hub = await promptHubRepo();
  console.log(`  Hub: ${hub.owner}/${hub.repo}\n`);

  // 2. Acquire a GitHub token. Prefer --hub-token if provided, otherwise device flow.
  let token: string;
  if (options.hubToken) {
    console.log('  Using provided --hub-token for GitHub API calls.');
    token = options.hubToken;
  } else {
    console.log('  Starting GitHub authentication...');
    token = await githubDeviceAuth(clientId!);
  }

  // 3. Update hub registry
  console.log('  Updating hub registry...');
  await updateHubRegistry(token, hub, {
    name: projectName,
    description: options.hubProject?.description ?? 'Project documentation',
    gitRepoUrl: `https://github.com/${currentRepo.owner}/${currentRepo.repo}.git`,
    gitRef: 'main',
    docsPath: 'docs/public',
  });

  // 4. Generate local files
  console.log('  Generating local files...');
  generateConfig(projectName, options.hubProject);
  generateWorkflow(hub);

  // 5. Provision HUB_DISPATCH_TOKEN on this sub-repo
  if (options.secretMode !== 'skip') {
    const mode =
      options.secretMode === 'prompt' || options.secretMode === undefined
        ? await promptSecretMode()
        : options.secretMode;
    if (mode === 'auto') {
      if (!options.rotateSecret) {
        const exists = await secretExists(
          token,
          currentRepo.owner,
          currentRepo.repo,
          'HUB_DISPATCH_TOKEN',
        );
        if (exists) {
          console.log(
            '  HUB_DISPATCH_TOKEN already exists on this sub-repo; pass --rotate-secret to overwrite',
          );
          printSuccessFooter(currentRepo);
          return;
        }
      }
      const secretValue =
        options.secretPat ??
        options.hubToken ??
        (await promptHiddenInput('Paste the PAT to store as HUB_DISPATCH_TOKEN: '));
      try {
        await storeDispatchToken(token, currentRepo.owner, currentRepo.repo, secretValue);
        console.log('  HUB_DISPATCH_TOKEN written to sub-repo');
      } catch (err) {
        console.warn(`  Could not write secret: ${(err as Error).message}`);
        printManualSecretInstructions(currentRepo, hub);
      }
    } else if (mode === 'manual') {
      printManualSecretInstructions(currentRepo, hub);
    }
  }

  printSuccessFooter(currentRepo);
}

function printSuccessFooter(currentRepo: { owner: string; repo: string }): void {
  console.log(`
  Hub registration complete!

  Next steps:
    1. Review clearify.config.ts and update the hubProject description
    2. If you manage HUB_DISPATCH_TOKEN via Terraform, add "${currentRepo.repo}" to the repos list in infra/deployments/hub-dispatch/github.tf and apply
    3. Commit the generated files and push to main
`);
}
