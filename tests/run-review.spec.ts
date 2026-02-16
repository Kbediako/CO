import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const runReviewScript = join(process.cwd(), 'scripts', 'run-review.ts');
const createdSandboxes: string[] = [];

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'run-review-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function makeManifest(sandbox: string): Promise<string> {
  const runDir = join(sandbox, 'runs', 'sample-task', 'cli', 'sample-run');
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ run: 'sample' }), 'utf8');
  return manifestPath;
}

async function makeFakeCodex(sandbox: string): Promise<string> {
  const binPath = join(sandbox, 'codex-mock.sh');
  const script = `#!/usr/bin/env bash
set -euo pipefail
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
  return {
    ...process.env,
    NODE_NO_WARNINGS: '1',
    SKIP_DIFF_BUDGET: '1',
    NOTES: 'Goal: run-review regression tests | Summary: verify timeout/stall handling | Risks: none',
    FORCE_CODEX_REVIEW: '1',
    CODEX_REVIEW_NON_INTERACTIVE: '1',
    CODEX_CLI_BIN: codexBin,
    CODEX_ORCHESTRATOR_ROOT: sandbox
  };
}

async function runReviewCommand(
  manifestPath: string,
  env: Record<string, string | undefined>
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ['--loader', 'ts-node/esm', runReviewScript, '--manifest', manifestPath, '--non-interactive'],
      { cwd: process.cwd(), env, maxBuffer: 16 * 1024 * 1024 }
    );
    return { exitCode: 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { code?: number; stdout?: unknown; stderr?: unknown };
    const stdout =
      typeof err.stdout === 'string'
        ? err.stdout
        : err.stdout
        ? Buffer.from(err.stdout as never).toString('utf8')
        : '';
    const stderr =
      typeof err.stderr === 'string'
        ? err.stderr
        : err.stderr
        ? Buffer.from(err.stderr as never).toString('utf8')
        : '';
    return { exitCode: Number(err.code ?? 1), stdout, stderr };
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

describe('scripts/run-review regression', () => {
  it('logs the default non-interactive stall timeout value', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const result = await runReviewCommand(manifestPath, baseEnv(sandbox, codexBin));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[run-review] enforcing codex review stall timeout at 600s');
    expect(result.stdout).toContain('Review output saved to:');
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
  });

  it('does not crash when stdout pipe closes early', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const codexBin = await makeFakeCodex(sandbox);
    const cmd = [
      'set -o pipefail',
      `${process.execPath} --loader ts-node/esm ${runReviewScript} --manifest ${manifestPath} --non-interactive 2>/dev/null | head -n 1 >/dev/null`
    ].join('\n');

    const { stdout, stderr } = await execFileAsync('zsh', ['-lc', cmd], {
      cwd: process.cwd(),
      env: { ...baseEnv(sandbox, codexBin), RUN_REVIEW_MODE: 'spam' },
      maxBuffer: 16 * 1024 * 1024
    });

    expect(String(stdout ?? '')).toBe('');
    expect(String(stderr ?? '')).toBe('');
  });
});
