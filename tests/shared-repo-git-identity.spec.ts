import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'shared-repo-git-identity.mjs');
const cleanupRoots: string[] = [];
const integrationTimeoutMs = 60_000;

afterEach(async () => {
  while (cleanupRoots.length > 0) {
    const root = cleanupRoots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

async function createRepoWithLinkedWorktree(): Promise<{ repoRoot: string; worktreeRoot: string }> {
  const sandboxRoot = await mkdtemp(join(tmpdir(), 'shared-repo-git-identity-'));
  cleanupRoots.push(sandboxRoot);

  const repoRoot = join(sandboxRoot, 'repo');
  const worktreeRoot = join(sandboxRoot, 'archive-worktree');

  await mkdir(repoRoot, { recursive: true });
  await execFileAsync('git', ['init'], { cwd: repoRoot });
  await writeFile(join(repoRoot, 'README.md'), '# test\n', 'utf8');
  await execFileAsync('git', ['add', 'README.md'], { cwd: repoRoot });
  await execFileAsync(
    'git',
    ['-c', 'user.name=Test User', '-c', 'user.email=test@example.com', 'commit', '-m', 'init'],
    { cwd: repoRoot }
  );
  await execFileAsync('git', ['worktree', 'add', '-b', 'archive', worktreeRoot], { cwd: repoRoot });

  return { repoRoot, worktreeRoot };
}

async function readSharedConfig(repoRoot: string): Promise<string> {
  return readFile(join(repoRoot, '.git', 'config'), 'utf8');
}

async function runScript(
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
      env: { ...process.env }
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return {
      code: Number((error as { code?: number }).code ?? 1),
      stdout: String((error as { stdout?: string }).stdout ?? ''),
      stderr: String((error as { stderr?: string }).stderr ?? '')
    };
  }
}

describe('shared-repo-git-identity script', () => {
  it('reports when no shared repo-local identity override is present', async () => {
    const { repoRoot } = await createRepoWithLinkedWorktree();

    const result = await runScript(['--repo-root', repoRoot]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No shared repo-local git identity override detected');
    expect(result.stdout).toContain(`repo_root=${repoRoot}`);
    expect(result.stdout).toContain(`config_path=${join(repoRoot, '.git', 'config')}`);
    expect(result.stdout).toContain('override_present=false');
  }, integrationTimeoutMs);

  it('reports the configured shared repo-local identity override when present', async () => {
    const { repoRoot } = await createRepoWithLinkedWorktree();
    await execFileAsync('git', ['config', 'user.name', 'Repo User'], { cwd: repoRoot });
    await execFileAsync('git', ['config', 'user.email', 'repo@example.com'], { cwd: repoRoot });

    const result = await runScript(['--repo-root', repoRoot]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Shared repo-local git identity override detected');
    expect(result.stdout).toContain('override_present=true');
    expect(result.stdout).toContain('user.name=Repo User');
    expect(result.stdout).toContain('user.email=repo@example.com');
  }, integrationTimeoutMs);

  it('clears only shared repo-local user overrides when explicitly requested', async () => {
    const { repoRoot } = await createRepoWithLinkedWorktree();
    await execFileAsync('git', ['config', 'extensions.worktreeConfig', 'true'], { cwd: repoRoot });
    await execFileAsync('git', ['config', 'user.name', 'Repo User'], { cwd: repoRoot });
    await execFileAsync('git', ['config', 'user.email', 'repo@example.com'], { cwd: repoRoot });

    const result = await runScript(['--repo-root', repoRoot, '--clear']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Cleared shared repo-local git identity override');
    expect(result.stdout).toContain('override_present_before=true');
    expect(result.stdout).toContain('cleared=true');
    expect(result.stdout).toContain('override_present_after=false');
    await expect(runGit(repoRoot, ['config', '--local', '--get', 'user.name'])).rejects.toBeTruthy();
    await expect(runGit(repoRoot, ['config', '--local', '--get', 'user.email'])).rejects.toBeTruthy();
    const sharedConfig = await readSharedConfig(repoRoot);
    expect(sharedConfig).toContain('worktreeConfig = true');
    expect(sharedConfig).not.toContain('[user]');
  }, integrationTimeoutMs);

  it('reports a no-op clear when no shared repo-local override exists', async () => {
    const { repoRoot } = await createRepoWithLinkedWorktree();

    const result = await runScript(['--repo-root', repoRoot, '--clear']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('nothing to clear');
    expect(result.stdout).toContain('override_present_before=false');
    expect(result.stdout).toContain('cleared=false');
    expect(result.stdout).toContain('override_present_after=false');
  }, integrationTimeoutMs);

  it('fails closed when invoked from a linked worktree path', async () => {
    const { worktreeRoot } = await createRepoWithLinkedWorktree();

    const result = await runScript(['--repo-root', worktreeRoot]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Historical cleanup must be run from the shared checkout root');
    expect(result.stdout).toBe('');
  }, integrationTimeoutMs);

  it('fails when the required repo-root flag is missing', async () => {
    const result = await runScript([]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Missing required --repo-root <path>.');
  }, integrationTimeoutMs);
});
