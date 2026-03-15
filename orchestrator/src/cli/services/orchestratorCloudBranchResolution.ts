import process from 'node:process';

function readCloudBranchString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function resolveCloudBranch(envOverrides?: NodeJS.ProcessEnv): string | null {
  return (
    readCloudBranchString(envOverrides?.CODEX_CLOUD_BRANCH) ??
    readCloudBranchString(process.env.CODEX_CLOUD_BRANCH)
  );
}
