import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const CLI_ENTRY = join(process.cwd(), 'bin', 'codex-orchestrator.ts');
const TEST_TIMEOUT = 15000;
const CLI_EXEC_TIMEOUT_MS = TEST_TIMEOUT;

let tempDir: string | null = null;

afterEach(async () => {
  if (!tempDir) {
    return;
  }
  await rm(tempDir, { recursive: true, force: true });
  tempDir = null;
});

async function runCli(args: string[], env?: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  return await execFileAsync(process.execPath, ['--loader', 'ts-node/esm', CLI_ENTRY, ...args], {
    env: env ?? process.env,
    timeout: CLI_EXEC_TIMEOUT_MS
  });
}

describe('codex-orchestrator command surface', () => {
  it('prints status help without requiring a run id', async () => {
    const { stdout } = await runCli(['status', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator status --run <id>');
  }, TEST_TIMEOUT);

  it('rejects skills install --only when no skill list is provided', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-skills-only-'));
    await expect(runCli(['skills', 'install', '--only', '--codex-home', tempDir, '--format', 'json'])).rejects.toMatchObject({
      stderr: expect.stringContaining('--only requires a comma-separated list of skill names.')
    });
  }, TEST_TIMEOUT);

  it('prints resume help without requiring a run id', async () => {
    const { stdout } = await runCli(['resume', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator resume --run <id>');
  }, TEST_TIMEOUT);

  it('prints delegate-server help', async () => {
    const { stdout } = await runCli(['delegate-server', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator delegate-server');
  }, TEST_TIMEOUT);

  it('prints pr help', async () => {
    const { stdout } = await runCli(['pr', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator pr <subcommand>');
    expect(stdout).toContain('docs/guides/review-artifacts.md');
  }, TEST_TIMEOUT);

  it('prints pr watch-merge help', async () => {
    const { stdout } = await runCli(['pr', 'watch-merge', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator pr watch-merge');
  }, TEST_TIMEOUT);

  it('prints setup help', async () => {
    const { stdout } = await runCli(['setup', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator setup');
  }, TEST_TIMEOUT);

  it('prints flow help', async () => {
    const { stdout } = await runCli(['flow', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator flow');
    expect(stdout).toContain('docs-review');
    expect(stdout).toContain('implementation-gate');
  }, TEST_TIMEOUT);

  it('prints rlm help without running when help flag is passed before goal', async () => {
    const { stdout } = await runCli(['rlm', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator rlm');
    expect(stdout).not.toContain('Task:');
  }, TEST_TIMEOUT);

  it('prints rlm help without running when help flag is accidentally given a value', async () => {
    const { stdout } = await runCli(['rlm', '--help', 'write tests']);
    expect(stdout).toContain('Usage: codex-orchestrator rlm');
    expect(stdout).not.toContain('Task:');
  }, TEST_TIMEOUT);

  it('prints rlm help without running when help flag follows the goal', async () => {
    const { stdout } = await runCli(['rlm', 'write tests', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator rlm');
    expect(stdout).not.toContain('Task:');
  }, TEST_TIMEOUT);

  it('prints doctor apply plan when wiring is missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-doctor-apply-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['doctor', '--apply'], env);
    expect(stdout).toContain('Doctor apply plan:');
    expect(stdout).toContain('chrome-devtools');
    expect(stdout).toContain('delegation');
  }, TEST_TIMEOUT);

  it('emits setup plan JSON', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-plan-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['setup', '--format', 'json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      steps?: {
        guidance?: {
          note?: string;
          references?: string[];
          recommended_commands?: string[];
        };
      } & Record<string, unknown>;
    };
    expect(payload.status).toBe('planned');
    expect(payload.steps).toBeTruthy();
    expect(payload.steps?.guidance?.note).toContain('Agent-first default');
    expect(payload.steps?.guidance?.references).toContain(
      'https://github.com/Kbediako/CO/blob/main/docs/AGENTS.md'
    );
    expect(payload.steps?.guidance?.recommended_commands).toContain(
      'codex-orchestrator flow --task <task-id>'
    );
  }, TEST_TIMEOUT);

  it('supports quoted exec commands passed as a single token', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-surface-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cli-surface'
    };

    const { stdout } = await runCli(['exec', 'echo quoted-smoke', '--json', 'compact'], env);
    const lines = stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const payload = JSON.parse(lines[lines.length - 1] ?? '{}') as {
      payload?: {
        command?: { argv?: string[] };
        outputs?: { stdout?: string };
      };
    };
    expect(payload.payload?.command?.argv?.[0]).toBe('echo');
    expect(payload.payload?.outputs?.stdout).toContain('quoted-smoke');
  }, TEST_TIMEOUT);

  it('preserves backslashes in quoted single-token exec commands', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-surface-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cli-surface'
    };

    const { stdout } = await runCli(['exec', 'echo C:\\tmp\\foo', '--json', 'compact'], env);
    const lines = stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const payload = JSON.parse(lines[lines.length - 1] ?? '{}') as {
      payload?: { command?: { argv?: string[] }; outputs?: { stdout?: string } };
    };

    expect(payload.payload?.command?.argv).toEqual(['echo', 'C:\\tmp\\foo']);
  }, TEST_TIMEOUT);

  it('handles escaped quotes inside quoted single-token exec commands', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-surface-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cli-surface'
    };

    const { stdout } = await runCli(
      ['exec', 'node -e "console.log(\\\"x y\\\")"', '--json', 'compact'],
      env
    );
    const lines = stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const payload = JSON.parse(lines[lines.length - 1] ?? '{}') as {
      payload?: { command?: { argv?: string[] }; outputs?: { stdout?: string } };
    };

    expect(payload.payload?.command?.argv).toEqual(['node', '-e', 'console.log("x y")']);
    expect(payload.payload?.outputs?.stdout).toContain('x y');
  }, TEST_TIMEOUT);
});
