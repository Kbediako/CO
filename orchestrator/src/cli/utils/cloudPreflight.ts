import process from 'node:process';
import { spawn } from 'node:child_process';

import { fingerprintAuthProvenanceValue } from './authProvenanceFingerprint.js';
import { resolveCodexCliBin } from './codexCli.js';

export interface CloudPreflightIssue {
  code:
    | 'missing_environment'
    | 'codex_unavailable'
    | 'branch_missing'
    | 'git_unavailable'
    | 'pipeline_resolution_failed';
  message: string;
}

export interface CloudPreflightResult {
  ok: boolean;
  issues: CloudPreflightIssue[];
  details: {
    codexBin: string;
    environmentId: string | null;
    branch: string | null;
    authProvenance?: CloudPreflightAuthProvenance;
  };
}

export interface CloudPreflightAuthProvenance {
  providerKind: 'codex_cloud';
  activeProfileFingerprint: string | null;
  activeAccountFingerprint: string | null;
  cloudEnvId: string | null;
  cloudBranch: string | null;
  credentialSource: string | null;
  authFreshness: 'env_credential_present' | 'credential_source_unknown';
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CloudPreflightRequest {
  repoRoot: string;
  codexBin: string;
  environmentId: string | null;
  branch: string | null;
  env?: NodeJS.ProcessEnv;
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 4000).unref();
      resolve({
        exitCode: 124,
        stdout,
        stderr: `${stderr}\nTimed out after ${Math.round(timeoutMs / 1000)}s.`.trim()
      });
    }, timeoutMs);
    timer.unref();

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.once('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: typeof code === 'number' ? code : 1, stdout, stderr });
    });
  });
}

function normalizeBranch(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/^refs\/heads\//u, '');
}

function normalizeCloudPreflightRequestValue(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readFirstCloudPreflightEnvValue(
  env: NodeJS.ProcessEnv | undefined,
  keys: string[]
): string | null {
  if (!env) {
    return null;
  }
  for (const key of keys) {
    const value = normalizeCloudPreflightRequestValue(env[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function readFirstCloudPreflightCredentialSource(env: NodeJS.ProcessEnv | undefined): string | null {
  if (!env) {
    return null;
  }
  for (const key of [
    'CODEX_API_KEY',
    'OPENAI_API_KEY',
    'CODEX_AUTH_TOKEN',
    'OPENAI_AUTH_TOKEN',
    'CHATGPT_AUTH_TOKEN'
  ]) {
    if (normalizeCloudPreflightRequestValue(env[key])) {
      return `env:${key}`;
    }
  }
  return null;
}

export function buildCloudPreflightAuthProvenance(params: {
  env?: NodeJS.ProcessEnv;
  environmentId: string | null;
  branch: string | null;
}): CloudPreflightAuthProvenance {
  const credentialSource = readFirstCloudPreflightCredentialSource(params.env);
  const profile = readFirstCloudPreflightEnvValue(params.env, [
    'CODEX_AUTH_PROFILE',
    'CODEX_PROFILE',
    'OPENAI_PROFILE',
    'CHATGPT_AUTH_PROFILE',
    'CHATGPT_PROFILE'
  ]);
  const account = readFirstCloudPreflightEnvValue(params.env, [
    'CODEX_ACCOUNT_ID',
    'CODEX_ACCOUNT',
    'CODEX_ACCOUNT_EMAIL',
    'OPENAI_ACCOUNT_ID',
    'OPENAI_ORG_ID',
    'CHATGPT_ACCOUNT_ID',
    'CHATGPT_ACCOUNT',
    'CHATGPT_ACCOUNT_EMAIL'
  ]);
  return {
    providerKind: 'codex_cloud',
    activeProfileFingerprint: fingerprintAuthProvenanceValue(profile, params.env),
    activeAccountFingerprint: fingerprintAuthProvenanceValue(account, params.env),
    cloudEnvId: params.environmentId,
    cloudBranch: params.branch,
    credentialSource,
    authFreshness: credentialSource ? 'env_credential_present' : 'credential_source_unknown'
  };
}

export function buildCloudPreflightRequest(params: {
  repoRoot: string;
  environmentId: string | null;
  env?: NodeJS.ProcessEnv;
  branch?: string | null;
}): CloudPreflightRequest {
  const env = params.env ?? process.env;
  const branch =
    normalizeCloudPreflightRequestValue(params.branch)
    ?? normalizeCloudPreflightRequestValue(env.CODEX_CLOUD_BRANCH);

  return {
    repoRoot: params.repoRoot,
    codexBin: resolveCodexCliBin(env),
    environmentId: params.environmentId,
    branch,
    env
  };
}

export async function runCloudPreflight(params: CloudPreflightRequest): Promise<CloudPreflightResult> {
  const issues: CloudPreflightIssue[] = [];
  const branch = normalizeBranch(params.branch);

  if (!params.environmentId) {
    issues.push({
      code: 'missing_environment',
      message: 'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).'
    });
  }

  const codexCheck = await runCommand(params.codexBin, ['--version'], {
    cwd: params.repoRoot,
    env: params.env
  });
  if (codexCheck.exitCode !== 0) {
    issues.push({
      code: 'codex_unavailable',
      message: `Codex CLI is unavailable (${params.codexBin} --version failed).`
    });
  }

  if (branch) {
    const gitCheck = await runCommand('git', ['--version'], { cwd: params.repoRoot, env: params.env });
    if (gitCheck.exitCode !== 0) {
      issues.push({ code: 'git_unavailable', message: 'git is unavailable (required for cloud preflight).' });
    } else {
      const branchCheck = await runCommand(
        'git',
        ['ls-remote', '--exit-code', '--heads', 'origin', branch],
        { cwd: params.repoRoot, env: params.env }
      );
      if (branchCheck.exitCode !== 0) {
        issues.push({
          code: 'branch_missing',
          message: `Cloud branch '${branch}' was not found on origin. Push it first or set CODEX_CLOUD_BRANCH to an existing remote branch.`
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    details: {
      codexBin: params.codexBin,
      environmentId: params.environmentId,
      branch,
      authProvenance: buildCloudPreflightAuthProvenance({
        env: params.env,
        environmentId: params.environmentId,
        branch
      })
    }
  };
}
