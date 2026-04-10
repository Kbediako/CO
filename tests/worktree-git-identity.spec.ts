import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'worktree-git-identity.mjs');
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

async function createRepoWithLinkedWorktree(options?: {
  sharedIdentity?: { name: string; email: string };
}): Promise<{ repoRoot: string; worktreeRoot: string }> {
  const sandboxRoot = await mkdtemp(join(tmpdir(), 'worktree-git-identity-'));
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
  if (options?.sharedIdentity) {
    await execFileAsync('git', ['config', 'user.name', options.sharedIdentity.name], { cwd: repoRoot });
    await execFileAsync('git', ['config', 'user.email', options.sharedIdentity.email], { cwd: repoRoot });
  }
  await execFileAsync('git', ['worktree', 'add', '-b', 'archive', worktreeRoot], { cwd: repoRoot });

  return { repoRoot, worktreeRoot };
}

async function readCommonConfig(repoRoot: string): Promise<string> {
  return readFile(join(repoRoot, '.git', 'config'), 'utf8');
}

async function readWorktreeConfig(worktreeRoot: string): Promise<string | null> {
  const configPath = await runGit(worktreeRoot, ['rev-parse', '--git-path', 'config.worktree']);
  const resolvedConfigPath = isAbsolute(configPath) ? configPath : join(worktreeRoot, configPath);
  try {
    return await readFile(resolvedConfigPath, 'utf8');
  } catch {
    return null;
  }
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

describe('worktree-git-identity script', () => {
  it('preserves inherited identity when no explicit alternate identity is requested', async () => {
    const { repoRoot, worktreeRoot } = await createRepoWithLinkedWorktree();

    const result = await runScript(['--worktree', worktreeRoot]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('leaving inherited identity unchanged');
    await expect(access(join(repoRoot, '.git', 'config'))).resolves.toBeUndefined();
    const commonConfig = await readCommonConfig(repoRoot);
    const worktreeConfig = await readWorktreeConfig(worktreeRoot);
    expect(commonConfig).not.toContain('[user]');
    expect(commonConfig).not.toContain('worktreeConfig = true');
    expect(worktreeConfig).toBeNull();
  }, integrationTimeoutMs);

  it('restores inherited identity by clearing a prior worktree-local override', async () => {
    const { repoRoot, worktreeRoot } = await createRepoWithLinkedWorktree();
    await execFileAsync('git', ['config', '--local', 'extensions.worktreeConfig', 'true'], {
      cwd: worktreeRoot
    });
    await execFileAsync('git', ['config', '--worktree', 'user.name', 'github-actions[bot]'], {
      cwd: worktreeRoot
    });
    await execFileAsync(
      'git',
      ['config', '--worktree', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'],
      { cwd: worktreeRoot }
    );

    const result = await runScript(['--worktree', worktreeRoot]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Cleared worktree-local git identity override; allowing inherited identity.');
    const commonConfig = await readCommonConfig(repoRoot);
    const worktreeConfig = await readWorktreeConfig(worktreeRoot);
    expect(commonConfig).toContain('worktreeConfig = true');
    expect(commonConfig).not.toContain('[user]');
    expect(worktreeConfig).not.toBeNull();
    expect(worktreeConfig).not.toContain('[user]');
    await expect(runGit(worktreeRoot, ['config', '--worktree', '--get', 'user.name'])).rejects.toBeTruthy();
    await expect(runGit(worktreeRoot, ['config', '--worktree', '--get', 'user.email'])).rejects.toBeTruthy();
  }, integrationTimeoutMs);

  it('enables worktree config and writes alternate identity only to the linked worktree', async () => {
    const { repoRoot, worktreeRoot } = await createRepoWithLinkedWorktree();

    const result = await runScript([
      '--worktree',
      worktreeRoot,
      '--name',
      'github-actions[bot]',
      '--email',
      '41898282+github-actions[bot]@users.noreply.github.com'
    ]);

    expect(result.code).toBe(0);
    const commonConfig = await readCommonConfig(repoRoot);
    const worktreeConfig = await readWorktreeConfig(worktreeRoot);
    expect(commonConfig).toContain('worktreeConfig = true');
    expect(commonConfig).not.toContain('[user]');
    expect(worktreeConfig).not.toBeNull();
    expect(worktreeConfig).toContain('[user]');
    expect(worktreeConfig).toContain('name = github-actions[bot]');
    expect(worktreeConfig).toContain('email = 41898282+github-actions[bot]@users.noreply.github.com');
    await expect(runGit(worktreeRoot, ['config', '--worktree', '--get', 'user.name'])).resolves.toBe(
      'github-actions[bot]'
    );
    await expect(runGit(worktreeRoot, ['config', '--worktree', '--get', 'user.email'])).resolves.toBe(
      '41898282+github-actions[bot]@users.noreply.github.com'
    );
  }, integrationTimeoutMs);

  it('preserves a pre-existing shared repo-local identity override when writing worktree-local identity', async () => {
    const { repoRoot, worktreeRoot } = await createRepoWithLinkedWorktree({
      sharedIdentity: {
        name: 'Repo User',
        email: 'repo@example.com'
      }
    });

    const result = await runScript([
      '--worktree',
      worktreeRoot,
      '--name',
      'github-actions[bot]',
      '--email',
      '41898282+github-actions[bot]@users.noreply.github.com'
    ]);

    expect(result.code).toBe(0);
    const commonConfig = await readCommonConfig(repoRoot);
    const worktreeConfig = await readWorktreeConfig(worktreeRoot);
    expect(commonConfig).toContain('worktreeConfig = true');
    expect(commonConfig).toContain('[user]');
    expect(commonConfig).toContain('Repo User');
    expect(commonConfig).toContain('repo@example.com');
    expect(worktreeConfig).toContain('[user]');
    expect(worktreeConfig).toContain('name = github-actions[bot]');
    expect(worktreeConfig).toContain('email = 41898282+github-actions[bot]@users.noreply.github.com');
    await expect(runGit(worktreeRoot, ['config', '--get', 'user.name'])).resolves.toBe('github-actions[bot]');
    await expect(runGit(worktreeRoot, ['config', '--get', 'user.email'])).resolves.toBe(
      '41898282+github-actions[bot]@users.noreply.github.com'
    );
    await expect(runGit(repoRoot, ['config', '--local', '--get', 'user.name'])).resolves.toBe('Repo User');
    await expect(runGit(repoRoot, ['config', '--local', '--get', 'user.email'])).resolves.toBe('repo@example.com');
  }, integrationTimeoutMs);

  it('fails closed when only one explicit identity field is provided', async () => {
    const { repoRoot, worktreeRoot } = await createRepoWithLinkedWorktree();

    const result = await runScript(['--worktree', worktreeRoot, '--name', 'github-actions[bot]']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Provide both --name and --email together, or neither.');
    const commonConfig = await readCommonConfig(repoRoot);
    const worktreeConfig = await readWorktreeConfig(worktreeRoot);
    expect(commonConfig).not.toContain('[user]');
    expect(commonConfig).not.toContain('worktreeConfig = true');
    expect(worktreeConfig).toBeNull();
  }, integrationTimeoutMs);

  it('fails when a required flag value is missing', async () => {
    const result = await runScript(['--worktree']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Missing value for --worktree.');
  }, integrationTimeoutMs);
});
