import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const runReviewScript = join(process.cwd(), 'scripts', 'run-review.ts');
const createdSandboxes: string[] = [];
const shellBinary = 'bash';
const LONG_WAIT_TEST_TIMEOUT_MS = 20_000;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'run-review-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function makeManifest(sandbox: string): Promise<string> {
  return makeManifestForTask(sandbox, 'sample-task', 'sample-run');
}

async function makeManifestForTask(sandbox: string, taskId: string, runId: string): Promise<string> {
  const runDir = join(sandbox, '.runs', taskId, 'cli', runId);
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ run: 'sample' }), 'utf8');
  return manifestPath;
}

async function runGit(args: string[], cwd: string): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

async function initGitRepoWithCommittedFiles(
  sandbox: string,
  fileCount: number
): Promise<{ files: string[] }> {
  await runGit(['init', '-q'], sandbox);
  await runGit(['config', 'user.email', 'run-review-tests@example.com'], sandbox);
  await runGit(['config', 'user.name', 'run-review-tests'], sandbox);

  const files: string[] = [];
  for (let index = 1; index <= fileCount; index += 1) {
    const file = `file-${index}.txt`;
    files.push(file);
    await writeFile(join(sandbox, file), `baseline-${index}\n`, 'utf8');
  }
  await runGit(['add', '.'], sandbox);
  await runGit(['commit', '-m', 'seed'], sandbox);
  return { files };
}

async function makeFakeCodex(sandbox: string): Promise<string> {
  const binPath = join(sandbox, 'codex-mock.sh');
  const script = `#!/usr/bin/env bash
set -euo pipefail
config_overrides=()
while [[ "\${1:-}" == "-c" ]]; do
  if [[ "$#" -lt 2 ]]; then
    echo "missing value for -c" >&2
    exit 2
  fi
  config_overrides+=("\${2}")
  shift 2
done
if [[ -n "\${RUN_REVIEW_ARGS_LOG:-}" ]]; then
  {
    if [[ "\${#config_overrides[@]}" -gt 0 ]]; then
      for override in "\${config_overrides[@]}"; do
        echo "config=$override"
      done
    fi
    echo "argv=$*"
  } > "\${RUN_REVIEW_ARGS_LOG}"
fi
if [[ "\${1:-}" == "--help" ]]; then
  echo "OpenAI Codex CLI"
  echo "  review   Review changes"
  exit 0
fi
  if [[ "\${1:-}" == "review" ]]; then
    mode="\${RUN_REVIEW_MODE:-ok}"
    if [[ "$mode" == "hang" ]]; then
      while true; do sleep 1; done
    fi
    if [[ "$mode" == "delegation-loop" ]]; then
      while true; do
        echo "mcp: delegation starting"
        echo "mcp: delegation ready"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "delegation-loop-with-banner" ]]; then
      echo "OpenAI Codex v0.104.0"
      while true; do
        echo "mcp: delegation starting"
        echo "mcp: delegation ready"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "delegation-loop-fragmented" ]]; then
      while true; do
        printf "mcp: delegation star"
        sleep 0.01
        printf "ting\\nmcp: delegation rea"
        sleep 0.01
        printf "dy\\n"
        sleep 0.05
      done
    fi
    if [[ "$mode" == "delegation-loop-cross-stream-fragmented" ]]; then
      while true; do
        printf "mcp: delegation star"
        printf "ting\\n" >&2
        sleep 0.05
      done
    fi
    if [[ "$mode" == "spam" ]]; then
      for i in $(seq 1 200); do
        echo "stdout-$i"
        echo "stderr-$i" >&2
      done
    exit 0
  fi
  echo "stdout-ok"
  echo "stderr-ok" >&2
  exit 0
fi
echo "unknown args: $*" >&2
exit 2
`;
  await writeFile(binPath, script, 'utf8');
  await chmod(binPath, 0o755);
  return binPath;
}

function baseEnv(sandbox: string, codexBin: string): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_NO_WARNINGS: '1',
    SKIP_DIFF_BUDGET: '1',
    NOTES: 'Goal: run-review regression tests | Summary: verify timeout/stall handling | Risks: none',
    FORCE_CODEX_REVIEW: '1',
    CODEX_REVIEW_NON_INTERACTIVE: '1',
    CODEX_CLI_BIN: codexBin,
    CODEX_ORCHESTRATOR_ROOT: sandbox
  };
  delete env.CODEX_REVIEW_STALL_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS;
  delete env.CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS;
  delete env.CODEX_REVIEW_MONITOR_INTERVAL_SECONDS;
  delete env.CODEX_REVIEW_ENABLE_DELEGATION_MCP;
  delete env.CODEX_REVIEW_DISABLE_DELEGATION_MCP;
  delete env.CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD;
  delete env.CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD;
  return env;
}

async function runReviewCommand(
  manifestPath: string | null,
  env: Record<string, string | undefined>,
  extraArgs: string[] = []
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const args = ['--loader', 'ts-node/esm', runReviewScript, ...extraArgs];
  if (manifestPath) {
    args.push('--manifest', manifestPath);
  }
  args.push('--non-interactive');
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      args,
      { cwd: process.cwd(), env, maxBuffer: 16 * 1024 * 1024, timeout: 30_000 }
    );
    return { exitCode: 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      code?: number | string;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    const stdout =
      typeof err.stdout === 'string'
        ? err.stdout
        : Buffer.isBuffer(err.stdout)
        ? err.stdout.toString('utf8')
        : '';
    const stderr =
      typeof err.stderr === 'string'
        ? err.stderr
        : Buffer.isBuffer(err.stderr)
        ? err.stderr.toString('utf8')
        : '';
    const exitCode = typeof err.code === 'number' && Number.isFinite(err.code) ? err.code : 1;
    return { exitCode, stdout, stderr };
  }
}

afterEach(async () => {
  while (createdSandboxes.length > 0) {
    const dir = createdSandboxes.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('scripts/run-review regression', { timeout: LONG_WAIT_TEST_TIMEOUT_MS }, () => {
  it('does not enforce default timeout/stall/startup-loop guards', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('enforcing codex review timeout');
    expect(result.stdout).not.toContain('enforcing codex review stall timeout');
    expect(result.stdout).not.toContain('enforcing delegation-startup loop timeout');
    expect(result.stdout).toContain('delegation MCP enabled for this review (default');
    expect(result.stdout).toContain('Review output saved to:');
  });

  it('keeps delegation MCP enabled by default for wrapper review runs', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_ARGS_LOG: argsLogPath
    });

    expect(result.exitCode).toBe(0);
    const loggedArgs = await readFile(argsLogPath, 'utf8');
    expect(loggedArgs).not.toContain('config=mcp_servers.delegation.enabled=false');
  });

  it('allows explicit delegation MCP disable for wrapper review runs', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_ARGS_LOG: argsLogPath,
      CODEX_REVIEW_DISABLE_DELEGATION_MCP: '1'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('delegation MCP disabled for this review');
    const loggedArgs = await readFile(argsLogPath, 'utf8');
    expect(loggedArgs).toContain('config=mcp_servers.delegation.enabled=false');
  });

  it('supports legacy enable env override for explicit disable', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const argsLogPath = join(sandbox, 'review-args.log');
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_ARGS_LOG: argsLogPath,
      CODEX_REVIEW_ENABLE_DELEGATION_MCP: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('delegation MCP disabled for this review');
    const loggedArgs = await readFile(argsLogPath, 'utf8');
    expect(loggedArgs).toContain('config=mcp_servers.delegation.enabled=false');
  });

  it('fails a silent review process via stall-timeout override', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review stalled with no output for 1s');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('emits patience-first monitor checkpoints during long-running waits', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_TIMEOUT_SECONDS: '2',
      CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0.2'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stdout).toContain('patience-first monitor checkpoints every');
    expect(result.stdout).toContain('waiting on codex review (');
    expect(result.stderr).toContain('codex review timed out after 2s');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('allows disabling monitor checkpoints explicitly', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stdout).toContain('patience-first monitor checkpoints disabled');
    expect(result.stdout).not.toContain('waiting on codex review (');
    expect(result.stderr).toContain('codex review timed out after 1s');
  });

  it('warns and injects a scope advisory when uncommitted scope is large', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 3);
    for (const file of files) {
      await writeFile(join(sandbox, file), `updated-${file}\n`, 'utf8');
    }

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '2',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '2'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('review scope metrics: 3 files, 6 lines.');
    expect(result.stderr).toContain('large uncommitted review scope detected');
    expect(result.stderr).toContain('prefer scoped reviews (`--base`/`--commit`)');

    const promptPath = join(dirname(manifestPath), 'review', 'prompt.txt');
    const prompt = await readFile(promptPath, 'utf8');
    expect(prompt).toContain('Scope advisory: large uncommitted diff detected');
    expect(prompt).toContain('Prioritize highest-risk findings first');
  });

  it('counts untracked file lines when evaluating large uncommitted scope', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    await initGitRepoWithCommittedFiles(sandbox, 1);
    await writeFile(join(sandbox, 'huge-untracked.txt'), `${'line\n'.repeat(30)}`, 'utf8');

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '99',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '10'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('review scope metrics: 1 files, 30 lines.');
    expect(result.stderr).toContain('large uncommitted review scope detected');
  });

  it('skips non-regular untracked paths when computing scope line metrics', async () => {
    if (process.platform === 'win32') {
      return;
    }

    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const { files } = await initGitRepoWithCommittedFiles(sandbox, 1);
    await writeFile(join(sandbox, files[0] ?? 'file-1.txt'), 'updated\n', 'utf8');
    await symlink('/dev/zero', join(sandbox, 'endless-stream'));

    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD: '99',
      CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD: '99'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('review scope metrics:');
  });

  it('disables stall termination when CODEX_REVIEW_STALL_TIMEOUT_SECONDS=0', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('stalled with no output');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('defaults manifest selection to active task env when --task is omitted', async () => {
    const sandbox = await makeSandbox();
    await makeManifestForTask(
      sandbox,
      '0975-codex-cli-capability-adoption-redesign',
      '2026-02-19T01-00-00-000Z-older'
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    await makeManifestForTask(sandbox, '0101', '2026-02-19T02-00-00-000Z-newer');

    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(null, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: '0975-codex-cli-capability-adoption-redesign'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('evidence: .runs/0975-codex-cli-capability-adoption-redesign/');
    expect(result.stdout).not.toContain('evidence: .runs/0101/');
  });

  it('fails fast when delegation startup loops without review progress', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delegation-loop',
      CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '2',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review appears stuck in delegation startup loop');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('still detects startup loops when non-progress banner lines appear before the loop', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delegation-loop-with-banner',
      CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '2',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review appears stuck in delegation startup loop');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('detects startup loops when startup lines span multiple output chunks', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delegation-loop-fragmented',
      CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '2',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review appears stuck in delegation startup loop');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('does not merge startup-loop fragments across stdout/stderr streams', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'delegation-loop-cross-stream-fragmented',
      CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '1',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0',
      CODEX_REVIEW_TIMEOUT_SECONDS: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('codex review timed out after 1s');
    expect(result.stderr).not.toContain('delegation startup loop');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('derives task context from explicit manifest instead of stale task env fallback', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifestForTask(sandbox, 'task-b', 'run-b');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'task-a',
      FORCE_CODEX_REVIEW: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Review task: task-b');
    expect(result.stdout).not.toContain('Review task: task-a');
  });

  it('derives task context from legacy run-layout manifests', async () => {
    const sandbox = await makeSandbox();
    const legacyManifestPath = join(sandbox, '.runs', 'task-legacy', 'run-legacy', 'manifest.json');
    await mkdir(dirname(legacyManifestPath), { recursive: true });
    await writeFile(legacyManifestPath, JSON.stringify({ run: 'legacy' }), 'utf8');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(legacyManifestPath, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'task-a',
      FORCE_CODEX_REVIEW: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Review task: task-legacy');
    expect(result.stdout).not.toContain('Review task: task-a');
  });

  it('uses the nearest run-root segment when ancestor paths contain "runs"', async () => {
    const sandbox = await makeSandbox();
    const nestedManifestPath = join(sandbox, 'runs', 'repo', '.runs', 'task-b', 'cli', 'run-b', 'manifest.json');
    await mkdir(dirname(nestedManifestPath), { recursive: true });
    await writeFile(nestedManifestPath, JSON.stringify({ run: 'nested' }), 'utf8');
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(nestedManifestPath, {
      ...baseEnv(sandbox, codexBin),
      MCP_RUNNER_TASK_ID: 'task-a',
      FORCE_CODEX_REVIEW: '0'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Review task: task-b');
    expect(result.stdout).not.toContain('Review task: repo');
  });

  it('captures an issue bundle on review failure when auto issue log is enabled', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, {
      ...baseEnv(sandbox, codexBin),
      RUN_REVIEW_MODE: 'hang',
      CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '60',
      CODEX_REVIEW_AUTO_ISSUE_LOG: '1'
    });

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('[run-review] captured review failure issue log:');

    const issueLogPath = join(sandbox, 'docs', 'codex-orchestrator-issues.md');
    const issueLog = await readFile(issueLogPath, 'utf8');
    expect(issueLog).toContain('Auto issue log: standalone review failed');
  }, LONG_WAIT_TEST_TIMEOUT_MS);

  it('does not crash when stdout pipe closes early', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const cmd = [
      'set -o pipefail',
      `${shellQuote(process.execPath)} --loader ts-node/esm ${shellQuote(runReviewScript)} --manifest ${shellQuote(manifestPath)} --non-interactive 2>/dev/null | head -n 1 >/dev/null`
    ].join('\n');

    const { stdout, stderr } = await execFileAsync(shellBinary, ['-lc', cmd], {
      cwd: process.cwd(),
      env: { ...baseEnv(sandbox, codexBin), RUN_REVIEW_MODE: 'spam' },
      maxBuffer: 16 * 1024 * 1024
    });

    expect(String(stdout ?? '')).toBe('');
    expect(String(stderr ?? '')).toBe('');
  });
});
