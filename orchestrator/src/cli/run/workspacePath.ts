import { execFile } from 'node:child_process';
import { access, lstat, mkdir, rm } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

export const PROVIDER_WORKSPACE_ROOT_DIRNAME = '.workspaces';
const execFileAsync = promisify(execFile);

export function normalizeWorkspacePath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveProviderWorkspacePath(repoRoot: string, taskId: string): string {
  const workspacePath = resolve(repoRoot, PROVIDER_WORKSPACE_ROOT_DIRNAME, taskId);
  if (!isProviderWorkspacePathWithinRoot(repoRoot, workspacePath)) {
    throw new Error(`Invalid provider workspace task id: ${taskId}`);
  }
  return workspacePath;
}

export function resolveExplicitProviderWorkspacePathWithinRoot(
  repoRoot: string,
  manifestRecord: Record<string, unknown>
): string | null {
  const explicitWorkspacePath = resolveManifestWorkspacePath(manifestRecord);
  if (!explicitWorkspacePath || !isProviderWorkspacePathWithinRoot(repoRoot, explicitWorkspacePath)) {
    return null;
  }
  return resolve(explicitWorkspacePath);
}

export async function ensureProviderWorkspace(repoRoot: string, taskId: string): Promise<string> {
  const workspacePath = resolveProviderWorkspacePath(repoRoot, taskId);
  if (await isUsableProviderWorkspace(workspacePath)) {
    return workspacePath;
  }

  await rm(workspacePath, { recursive: true, force: true });
  await mkdir(join(repoRoot, PROVIDER_WORKSPACE_ROOT_DIRNAME), { recursive: true });
  await execFileAsync('git', ['-C', repoRoot, 'worktree', 'prune', '--expire', 'now']);
  await execFileAsync('git', ['-C', repoRoot, 'worktree', 'add', '--detach', workspacePath, 'HEAD']);
  return workspacePath;
}

export async function resolveProviderResumeWorkspacePath(
  repoRoot: string,
  taskId: string,
  manifestRecord: Record<string, unknown>
): Promise<string> {
  const explicitWorkspacePath = resolveExplicitProviderWorkspacePathWithinRoot(repoRoot, manifestRecord);
  if (
    explicitWorkspacePath &&
    (await isUsableProviderWorkspace(explicitWorkspacePath))
  ) {
    return explicitWorkspacePath;
  }
  return ensureProviderWorkspace(repoRoot, taskId);
}

export async function cleanupProviderWorkspace(repoRoot: string, workspacePath: string): Promise<boolean> {
  if (!isProviderWorkspacePathWithinRoot(repoRoot, workspacePath)) {
    return false;
  }
  const resolvedWorkspacePath = resolve(workspacePath);
  await execFileAsync('git', ['-C', repoRoot, 'worktree', 'remove', '--force', resolvedWorkspacePath]).catch(
    () => undefined
  );
  await rm(resolvedWorkspacePath, { recursive: true, force: true });
  await execFileAsync('git', ['-C', repoRoot, 'worktree', 'prune', '--expire', 'now']).catch(
    () => undefined
  );
  return true;
}

export function resolveLegacyWorkspacePathFromRunDir(runDir: string): string {
  return resolve(runDir, '..', '..', '..', '..');
}

export function resolveManifestWorkspacePath(
  manifestRecord: Record<string, unknown>,
  runDir: string | null = null
): string | null {
  const explicitWorkspacePath =
    normalizeWorkspacePath(manifestRecord.workspace_path) ??
    normalizeWorkspacePath(manifestRecord.workspacePath);
  if (explicitWorkspacePath) {
    return explicitWorkspacePath;
  }
  return runDir ? resolveLegacyWorkspacePathFromRunDir(runDir) : null;
}

async function isUsableProviderWorkspace(workspacePath: string): Promise<boolean> {
  try {
    const stats = await lstat(workspacePath);
    if (!stats.isDirectory()) {
      return false;
    }
    await access(join(workspacePath, '.git'));
    return true;
  } catch {
    return false;
  }
}

function isProviderWorkspacePathWithinRoot(repoRoot: string, workspacePath: string): boolean {
  const workspaceRoot = resolve(repoRoot, PROVIDER_WORKSPACE_ROOT_DIRNAME);
  const candidatePath = resolve(workspacePath);
  const relativePath = relative(workspaceRoot, candidatePath);
  return relativePath !== '' && !relativePath.startsWith('..') && !isAbsolute(relativePath);
}
