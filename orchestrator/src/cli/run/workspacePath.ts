import { execFile } from 'node:child_process';
import { access, lstat, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
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
  return join(repoRoot, PROVIDER_WORKSPACE_ROOT_DIRNAME, taskId);
}

export async function ensureProviderWorkspace(repoRoot: string, taskId: string): Promise<string> {
  const workspacePath = resolveProviderWorkspacePath(repoRoot, taskId);
  if (await isUsableProviderWorkspace(workspacePath)) {
    return workspacePath;
  }

  await rm(workspacePath, { recursive: true, force: true });
  await mkdir(join(repoRoot, PROVIDER_WORKSPACE_ROOT_DIRNAME), { recursive: true });
  await execFileAsync('git', ['-C', repoRoot, 'worktree', 'add', '--detach', workspacePath, 'HEAD']);
  return workspacePath;
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
