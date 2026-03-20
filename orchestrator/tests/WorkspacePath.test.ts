import { execFile } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupProviderWorkspace,
  ensureProviderWorkspace,
  resolveProviderResumeWorkspacePath,
  resolveProviderWorkspacePath
} from '../src/cli/run/workspacePath.js';

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

  it('prunes stale git worktree registrations before recreating a deleted workspace', async () => {
    const repoRoot = await createRepoRoot();

    const workspacePath = await ensureProviderWorkspace(repoRoot, 'task-123');
    await rm(workspacePath, { recursive: true, force: true });

    const recreatedWorkspacePath = await ensureProviderWorkspace(repoRoot, 'task-123');

    expect(recreatedWorkspacePath).toBe(workspacePath);
    await expect(access(join(recreatedWorkspacePath, 'package.json'))).resolves.toBeUndefined();
    await expect(runGit(recreatedWorkspacePath, ['rev-parse', '--is-inside-work-tree'])).resolves.toBe(
      'true'
    );
  });

  it('removes provider-managed worktrees and prunes their git registration', async () => {
    const repoRoot = await createRepoRoot();

    const workspacePath = await ensureProviderWorkspace(repoRoot, 'task-123');

    await expect(cleanupProviderWorkspace(repoRoot, workspacePath)).resolves.toBe(true);
    await expect(access(workspacePath)).rejects.toThrow();
    await expect(runGit(repoRoot, ['worktree', 'list'])).resolves.not.toContain(workspacePath);
  });

  it('refuses to remove workspaces outside the provider-managed root', async () => {
    const repoRoot = await createRepoRoot();

    await expect(cleanupProviderWorkspace(repoRoot, repoRoot)).resolves.toBe(false);
    await expect(access(join(repoRoot, 'package.json'))).resolves.toBeUndefined();
  });

  it('rejects task ids that escape the provider workspace root before destructive setup', async () => {
    const repoRoot = await createRepoRoot();

    await expect(ensureProviderWorkspace(repoRoot, '../escape')).rejects.toThrow(
      'Invalid provider workspace task id: ../escape'
    );
    await expect(access(join(repoRoot, 'package.json'))).resolves.toBeUndefined();
  });

  it('ignores explicit manifest workspaces that belong to a different task', async () => {
    const repoRoot = await createRepoRoot();
    const taskAWorkspace = await ensureProviderWorkspace(repoRoot, 'task-a');
    const taskBWorkspace = await ensureProviderWorkspace(repoRoot, 'task-b');

    const resolvedWorkspace = await resolveProviderResumeWorkspacePath(repoRoot, 'task-a', {
      workspace_path: taskBWorkspace
    });

    expect(resolvedWorkspace).toBe(taskAWorkspace);
    expect(resolvedWorkspace).not.toBe(taskBWorkspace);
  });
});
