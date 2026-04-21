import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'cloud-canary-ci.mjs');
const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function writeExecutable(path: string, content: string): Promise<void> {
  await writeFile(path, content);
  await chmod(path, 0o755);
}

async function initFallbackCanaryRepo(
  runnerStderr: string,
  runId = 'run-fallback',
  runnerStdout = '',
  fallbackIssues = [
    {
      code: 'missing_environment',
      message: 'Missing CODEX_CLOUD_ENV_ID.'
    }
  ]
): Promise<{ repo: string; binDir: string }> {
  const repo = await mkdtemp(join(tmpdir(), 'cloud-canary-ci-'));
  createdDirs.push(repo);

  const binDir = join(repo, 'bin');
  await mkdir(binDir, { recursive: true });
  await mkdir(join(repo, 'dist', 'bin'), { recursive: true });

  await writeExecutable(
    join(binDir, 'codex'),
    `#!/usr/bin/env node
console.log('codex-cli 0.122.0');
`
  );
  await writeExecutable(
    join(binDir, 'git'),
    `#!/usr/bin/env node
process.exit(0);
`
  );

  await writeFile(
    join(repo, 'dist', 'bin', 'codex-orchestrator.js'),
    `#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const taskId = process.env.MCP_RUNNER_TASK_ID || 'ci-cloud-canary';
const runId = ${JSON.stringify(runId)};
const artifactRoot = join('.runs', taskId, 'cli', runId);
await mkdir(artifactRoot, { recursive: true });
const fallback = {
  mode_requested: 'cloud',
  mode_used: 'mcp',
  reason: 'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID.',
  issues: ${JSON.stringify(fallbackIssues)}
};
const runSummaryPath = join(artifactRoot, 'run-summary.json');
await writeFile(
  join(artifactRoot, 'manifest.json'),
  JSON.stringify(
    {
      status: 'succeeded',
      run_summary_path: runSummaryPath,
      cloud_fallback: fallback
    },
    null,
    2
  )
);
await writeFile(
  runSummaryPath,
  JSON.stringify(
    {
      cloudFallback: {
        modeRequested: fallback.mode_requested,
        modeUsed: fallback.mode_used,
        reason: fallback.reason
      }
    },
    null,
    2
  )
);
console.error(${JSON.stringify(runnerStderr)});
const extraStdout = ${JSON.stringify(runnerStdout)};
if (extraStdout) {
  console.log(extraStdout);
}
console.log(JSON.stringify({ run_id: runId }));
`
  );

  return { repo, binDir };
}

function fallbackEnv(repo: string, binDir: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
    CODEX_CLOUD_ENV_ID: 'env-test',
    CODEX_CLOUD_CANARY_REQUIRED: '1',
    CLOUD_CANARY_EXPECT_FALLBACK: '1',
    MCP_RUNNER_TASK_ID: 'cloud-canary-fallback-test',
    CODEX_API_KEY: '',
    OPENAI_API_KEY: '',
    CODEX_ORCHESTRATOR_ROOT: repo,
    CODEX_ORCHESTRATOR_RUNS_DIR: join(repo, '.runs'),
    CODEX_ORCHESTRATOR_OUT_DIR: join(repo, 'out')
  };
}

describe('cloud-canary-ci fallback contract', () => {
  it('accepts expected missing-environment fallback evidence in required mode', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo(
      'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID.'
    );

    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: repo,
      env: fallbackEnv(repo, binDir),
      timeout: 60_000
    });

    expect(stdout).toContain('## Cloud Canary Fallback Contract (Passed)');
    expect(stdout).toContain('- Expected contract: fallback');
    expect(stdout).toContain('- Fallback reason: Cloud preflight failed');
  });

  it('keeps credential failures fatal in required fallback mode', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo('Codex token unavailable.');

    await expect(
      execFileAsync(process.execPath, [scriptPath], {
        cwd: repo,
        env: fallbackEnv(repo, binDir),
        timeout: 60_000
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Failure class: credentials (auth_mismatch)')
    });
  });

  it('does not treat success stdout identifiers as connectivity failures', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo(
      'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID.',
      'run-503-benign'
    );

    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: repo,
      env: fallbackEnv(repo, binDir),
      timeout: 60_000
    });

    expect(stdout).toContain('## Cloud Canary Fallback Contract (Passed)');
    expect(stdout).toContain('run-503-benign');
  });

  it('keeps stdout credential failures fatal in required fallback mode', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo(
      'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID.',
      'run-fallback',
      'Codex token unavailable.'
    );

    await expect(
      execFileAsync(process.execPath, [scriptPath], {
        cwd: repo,
        env: fallbackEnv(repo, binDir),
        timeout: 60_000
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Failure class: credentials (auth_mismatch)')
    });
  });

  it('keeps explicit stdout connectivity failures fatal in required fallback mode', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo(
      'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID.',
      'run-fallback',
      'Network timeout while contacting the cloud endpoint.'
    );

    await expect(
      execFileAsync(process.execPath, [scriptPath], {
        cwd: repo,
        env: fallbackEnv(repo, binDir),
        timeout: 60_000
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Failure class: connectivity (network_connectivity)')
    });
  });

  it('keeps stdout HTTP 503 failures fatal in required fallback mode', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo(
      'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID.',
      'run-fallback',
      'codex cloud exec failed with exit 1: HTTP 503'
    );

    await expect(
      execFileAsync(process.execPath, [scriptPath], {
        cwd: repo,
        env: fallbackEnv(repo, binDir),
        timeout: 60_000
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Failure class: connectivity (network_connectivity)')
    });
  });

  it('does not treat benign stdout token identifiers as credential failures', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo(
      'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID.',
      'run-fallback',
      'run_id: canary-token-abc'
    );

    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: repo,
      env: fallbackEnv(repo, binDir),
      timeout: 60_000
    });

    expect(stdout).toContain('## Cloud Canary Fallback Contract (Passed)');
  });

  it('keeps credential failures fatal when fallback stderr also includes missing environment text', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo(
      'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID. Codex token unavailable.'
    );

    await expect(
      execFileAsync(process.execPath, [scriptPath], {
        cwd: repo,
        env: fallbackEnv(repo, binDir),
        timeout: 60_000
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Failure class: credentials (auth_mismatch)')
    });
  });

  it('keeps qualified token-name failures fatal in required fallback mode', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo('Missing access token.');

    await expect(
      execFileAsync(process.execPath, [scriptPath], {
        cwd: repo,
        env: fallbackEnv(repo, binDir),
        timeout: 60_000
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Failure class: credentials (auth_mismatch)')
    });
  });

  it('keeps fallback manifests with additional issue codes fatal in required fallback mode', async () => {
    const { repo, binDir } = await initFallbackCanaryRepo(
      'Cloud preflight failed; falling back to mcp. Missing CODEX_CLOUD_ENV_ID.',
      'run-fallback',
      '',
      [
        {
          code: 'missing_environment',
          message: 'Missing CODEX_CLOUD_ENV_ID.'
        },
        {
          code: 'branch_missing',
          message: "Cloud branch 'main' was not found on origin."
        }
      ]
    );

    await expect(
      execFileAsync(process.execPath, [scriptPath], {
        cwd: repo,
        env: fallbackEnv(repo, binDir),
        timeout: 60_000
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Failure class: configuration (env_config)')
    });
  });
});
