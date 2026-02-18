import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const CLI_ENTRY = join(process.cwd(), 'bin', 'codex-orchestrator.ts');
const TEST_TIMEOUT = 15000;
const CLI_EXEC_TIMEOUT_MS = TEST_TIMEOUT;
const FLOW_TARGET_TEST_TIMEOUT = 70000;

let tempDir: string | null = null;

afterEach(async () => {
  if (!tempDir) {
    return;
  }
  await rm(tempDir, { recursive: true, force: true });
  tempDir = null;
});

async function runCli(
  args: string[],
  env?: NodeJS.ProcessEnv,
  timeoutMs: number = CLI_EXEC_TIMEOUT_MS
): Promise<{ stdout: string; stderr: string }> {
  return await execFileAsync(process.execPath, ['--loader', 'ts-node/esm', CLI_ENTRY, ...args], {
    env: env ?? process.env,
    timeout: timeoutMs
  });
}

async function writeFakeCodexBinary(dir: string): Promise<string> {
  const binPath = join(dir, 'codex');
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "--version" ]; then',
      '  echo "codex 0.0.0-test"',
      '  exit 0',
      'fi',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      '  echo "multi_agent experimental true"',
      '  exit 0',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "--help" ]; then',
      '  exit 0',
      'fi',
      'if [ "$1" = "mcp" ] && [ "$2" = "list" ] && [ "$3" = "--json" ]; then',
      '  if [ -n "$CODEX_TEST_MCP_LIST_JSON" ]; then',
      '    echo "$CODEX_TEST_MCP_LIST_JSON"',
      '  else',
      '    echo "[]"',
      '  fi',
      '  exit 0',
      'fi',
      'if [ "$1" = "mcp" ] && [ "$2" = "add" ]; then',
      '  if [ -n "$CODEX_TEST_MCP_ADD_FAIL" ]; then',
      '    echo "${CODEX_TEST_MCP_ADD_FAIL_MESSAGE:-simulated mcp add failure}" 1>&2',
      '    exit 1',
      '  fi',
      '  exit 0',
      'fi',
      'exit 0'
    ].join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
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
    expect(stdout).toContain('--refresh-skills');
  }, TEST_TIMEOUT);

  it('prints flow help', async () => {
    const { stdout } = await runCli(['flow', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator flow');
    expect(stdout).toContain('docs-review');
    expect(stdout).toContain('implementation-gate');
  }, TEST_TIMEOUT);

  it('accepts scoped aliases for the matching flow pipeline and rejects scope-mismatched aliases', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-target-'));
    const config = {
      defaultPipeline: 'docs-review',
      pipelines: [
        {
          id: 'docs-review',
          title: 'Docs',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'docs-default',
              title: 'docs default',
              command: 'node -e "console.log(\'docs default\')"',
              plan: { aliases: ['docs-alias'] }
            }
          ]
        },
        {
          id: 'implementation-gate',
          title: 'Impl',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'impl-ok',
              title: 'impl ok',
              command: 'node -e "console.log(\'impl ok\')"',
              plan: { aliases: ['impl-alias', 'impl:quick'] }
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);

    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'flow-target'
    };

    const { stdout } = await runCli(
      ['flow', '--format', 'json', '--task', 'flow-target', '--target', 'implementation-gate:impl-alias'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    expect(stdout).toContain('"status": "succeeded"');

    const { stdout: unscopedColonStdout } = await runCli(
      ['flow', '--format', 'json', '--task', 'flow-target', '--target', 'impl:quick'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    expect(unscopedColonStdout).toContain('"status": "succeeded"');

    await expect(
      runCli(
        ['flow', '--format', 'json', '--task', 'flow-target', '--target', 'docs-review:impl-alias'],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        'Target stage "docs-review:impl-alias" is not defined in docs-review or implementation-gate.'
      )
    });

    await expect(
      runCli(
        ['flow', '--format', 'json', '--task', 'flow-target', '--target', ':impl-alias'],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        'Target stage ":impl-alias" is not defined in docs-review or implementation-gate.'
      )
    });
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('prints rlm help without running when help flag is passed before goal', async () => {
    const { stdout } = await runCli(['rlm', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator rlm');
    expect(stdout).toContain('--multi-agent [auto|true|false]');
    expect(stdout).toContain('--collab [auto|true|false]  Legacy alias for --multi-agent.');
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

  it('rejects conflicting multi-agent and collab flag values', async () => {
    await expect(
      runCli(['rlm', 'write tests', '--multi-agent', 'true', '--collab', 'false'])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Conflicting --multi-agent and --collab values.')
    });
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

  it('emits doctor cloud preflight payload in JSON output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-doctor-cloud-preflight-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_CLOUD_ENV_ID: '',
      CODEX_CLOUD_BRANCH: ''
    };
    const { stdout } = await runCli(['doctor', '--format', 'json', '--cloud-preflight'], env);
    const payload = JSON.parse(stdout) as {
      cloud_preflight?: {
        ok?: boolean;
        details?: { codex_bin?: string };
        issues?: Array<{ code?: string }>;
        guidance?: string[];
      };
    };
    expect(payload.cloud_preflight).toBeTruthy();
    expect(payload.cloud_preflight?.ok).toBe(false);
    expect(payload.cloud_preflight?.details?.codex_bin).toBe(fakeCodex);
    expect(payload.cloud_preflight?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing_environment' })])
    );
    expect(payload.cloud_preflight?.guidance?.join('\n')).toContain('CODEX_CLOUD_ENV_ID');
  }, TEST_TIMEOUT);

  it('returns terminal failed status when strict cloud preflight fails', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-cloud-preflight-deny-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cloud-preflight-deny',
      CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'deny',
      CODEX_CLOUD_ENV_ID: '',
      CODEX_CLOUD_BRANCH: ''
    };
    const { stdout } = await runCli(
      ['start', 'docs-review', '--execution-mode', 'cloud', '--target', 'review', '--format', 'json', '--task', 'cloud-preflight-deny'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      status?: string;
      summary?: string | null;
      manifest?: string;
    };
    expect(payload.status).toBe('failed');
    expect(payload.summary).toContain('cloud fallback is disabled');
    const manifestPath = isAbsolute(payload.manifest ?? '')
      ? (payload.manifest as string)
      : join(tempDir, payload.manifest ?? '');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      status?: string;
      status_detail?: string | null;
      completed_at?: string | null;
    };
    expect(manifest.status).toBe('failed');
    expect(manifest.status_detail).toBe('cloud-preflight-failed');
    expect(manifest.completed_at).toBeTruthy();
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('emits MCP enable plan payload in JSON output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };
    const { stdout } = await runCli(['mcp', 'enable', '--format', 'json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      targets?: string[];
      actions?: Array<{ name?: string; status?: string }>;
    };
    expect(payload.status).toBe('planned');
    expect(payload.targets).toEqual(['delegation']);
    expect(payload.actions).toEqual([
      expect.objectContaining({
        name: 'delegation',
        status: 'planned'
      })
    ]);
  }, TEST_TIMEOUT);

  it('returns non-zero when mcp enable --yes has failed actions', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-fail-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_ADD_FAIL: '1',
      CODEX_TEST_MCP_ADD_FAIL_MESSAGE: 'simulated add failure',
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };

    try {
      await runCli(['mcp', 'enable', '--yes'], env);
      throw new Error('expected mcp enable --yes to fail');
    } catch (error) {
      const stdout = (error as { stdout?: string }).stdout ?? '';
      expect(stdout).toContain('delegation: failed');
      expect(stdout).toContain('simulated add failure');
    }
  }, TEST_TIMEOUT);

  it('returns non-zero when mcp enable --yes reports missing targets', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-missing-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };

    await expect(runCli(['mcp', 'enable', '--yes', '--servers', 'unknown'], env)).rejects.toMatchObject({
      stdout: expect.stringContaining('unknown: missing')
    });
  }, TEST_TIMEOUT);

  it('returns non-zero when mcp enable --yes reports unsupported targets', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-unsupported-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          startup_timeout_sec: 30,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };

    await expect(runCli(['mcp', 'enable', '--yes', '--servers', 'delegation'], env)).rejects.toMatchObject({
      stdout: expect.stringContaining('delegation: unsupported')
    });
  }, TEST_TIMEOUT);

  it('rejects mcp enable --servers without a value', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-servers-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--servers'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('--servers must include a comma-separated list of MCP server names.')
    });
  }, TEST_TIMEOUT);

  it('rejects mcp enable --servers when the csv has no names', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-empty-csv-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--servers', ','], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('--servers must include a comma-separated list of MCP server names.')
    });
  }, TEST_TIMEOUT);

  it('rejects positional arguments for mcp enable to prevent unintended bulk enable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-positional-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', 'delegation', '--yes'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('mcp enable does not accept positional arguments')
    });
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
        skills?: {
          commandLines?: string[];
          note?: string;
        };
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
    expect(payload.steps?.guidance?.recommended_commands).toContain(
      'codex-orchestrator mcp enable --servers delegation --yes'
    );
    const commands = payload.steps?.skills?.commandLines ?? [];
    expect(commands).toHaveLength(1);
    expect(commands[0]).toContain('--only');
    expect(commands[0]).toContain('chrome-devtools');
    expect(commands.every((entry) => !entry.includes('--force'))).toBe(true);
    expect(payload.steps?.skills?.note).toContain('without overwriting existing files by default');
  }, TEST_TIMEOUT);

  it('emits setup plan JSON with refresh-skills overwrite commands', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-plan-refresh-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['setup', '--format', 'json', '--refresh-skills'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      steps?: {
        skills?: {
          commandLines?: string[];
          note?: string;
        };
      };
    };
    expect(payload.status).toBe('planned');
    const commands = payload.steps?.skills?.commandLines ?? [];
    expect(commands).toHaveLength(1);
    expect(commands.every((entry) => entry.includes('--force'))).toBe(true);
    expect(payload.steps?.skills?.note).toContain('overwrite enabled via --refresh-skills');
  }, TEST_TIMEOUT);

  it('setup --yes keeps existing skill files by default', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-apply-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const skillPath = join(tempDir, 'skills', 'docs-first', 'SKILL.md');
    await mkdir(join(tempDir, 'skills', 'docs-first'), { recursive: true });
    await writeFile(skillPath, 'MARKER\n', 'utf8');

    const env = {
      ...process.env,
      CODEX_HOME: tempDir,
      CODEX_CLI_BIN: fakeCodex
    };
    await runCli(['setup', '--yes'], env, FLOW_TARGET_TEST_TIMEOUT);
    expect(await readFile(skillPath, 'utf8')).toBe('MARKER\n');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('setup --yes --refresh-skills overwrites existing skill files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-refresh-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const skillPath = join(tempDir, 'skills', 'docs-first', 'SKILL.md');
    await mkdir(join(tempDir, 'skills', 'docs-first'), { recursive: true });
    await writeFile(skillPath, 'MARKER\n', 'utf8');

    const env = {
      ...process.env,
      CODEX_HOME: tempDir,
      CODEX_CLI_BIN: fakeCodex
    };
    await runCli(['setup', '--yes', '--refresh-skills'], env, FLOW_TARGET_TEST_TIMEOUT);
    const content = await readFile(skillPath, 'utf8');
    expect(content).not.toBe('MARKER\n');
    expect(content).toContain('docs-first');
  }, FLOW_TARGET_TEST_TIMEOUT);

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
