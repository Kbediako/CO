import { execFile } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { ensureProviderWorkspace, resolveProviderWorkspacePath } from '../src/cli/run/workspacePath.js';

const execFileAsync = promisify(execFile);
const cleanupRoots: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function runGit(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', repoRoot, ...args]);
  return stdout.trim();
}

async function createRepoRoot(): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), 'workspace-path-'));
  cleanupRoots.push(repoRoot);
  await runGit(repoRoot, ['init']);
  await runGit(repoRoot, ['config', 'user.email', 'workspace-path@example.com']);
  await runGit(repoRoot, ['config', 'user.name', 'workspace-path']);
  await writeFile(join(repoRoot, 'package.json'), JSON.stringify({ name: 'workspace-path-test' }), 'utf8');
  await runGit(repoRoot, ['add', 'package.json']);
  await runGit(repoRoot, ['commit', '-m', 'init']);
  return repoRoot;
}

describe('workspacePath', () => {
  it('creates and reuses a deterministic per-issue git worktree', async () => {
    const repoRoot = await createRepoRoot();

    const workspacePath = await ensureProviderWorkspace(repoRoot, 'task-123');
    const reusedWorkspacePath = await ensureProviderWorkspace(repoRoot, 'task-123');

    expect(workspacePath).toBe(resolveProviderWorkspacePath(repoRoot, 'task-123'));
    expect(reusedWorkspacePath).toBe(workspacePath);
    await expect(access(join(workspacePath, 'package.json'))).resolves.toBeUndefined();
    await expect(runGit(workspacePath, ['rev-parse', '--is-inside-work-tree'])).resolves.toBe('true');
  });
});
