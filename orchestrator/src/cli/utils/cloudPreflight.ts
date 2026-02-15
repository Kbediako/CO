import { spawn } from 'node:child_process';

export interface CloudPreflightIssue {
  code: 'missing_environment' | 'codex_unavailable' | 'branch_missing' | 'git_unavailable';
  message: string;
}

export interface CloudPreflightResult {
  ok: boolean;
  issues: CloudPreflightIssue[];
  details: {
    codexBin: string;
    environmentId: string | null;
    branch: string | null;
  };
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
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

export async function runCloudPreflight(params: {
  repoRoot: string;
  codexBin: string;
  environmentId: string | null;
  branch: string | null | undefined;
  env?: NodeJS.ProcessEnv;
}): Promise<CloudPreflightResult> {
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
      branch
    }
  };
}

