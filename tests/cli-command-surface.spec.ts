import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
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
      '  if [ -n "$CODEX_TEST_MCP_ADD_LOG" ]; then',
      '    printf "%s\\n" "$*" >> "$CODEX_TEST_MCP_ADD_LOG"',
      '  fi',
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
    expect(stdout).toContain('--auto-issue-log [true|false]');
    expect(stdout).toContain('--repo-config-required [true|false]');
  }, TEST_TIMEOUT);

  it('prints start help without preparing a run', async () => {
    const { stdout } = await runCli(['start', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator start');
    expect(stdout).toContain('Start a new run');
    expect(stdout).toContain('--auto-issue-log [true|false]');
    expect(stdout).toContain('--repo-config-required [true|false]');
    expect(stdout).not.toContain('Run started:');
  }, TEST_TIMEOUT);

  it('prints plan help', async () => {
    const { stdout } = await runCli(['plan', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator plan');
    expect(stdout).toContain('Preview pipeline stages without executing.');
  }, TEST_TIMEOUT);

  it('prints init help without executing init', async () => {
    const { stdout } = await runCli(['init', '--help']);
    expect(stdout).toContain('Usage: codex-orchestrator init codex');
    expect(stdout).toContain('codex.orchestrator.json');
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

  it('writes doctor issue logs and bundles with downstream run context', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-doctor-issue-log-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const issueLogPath = join(tempDir, 'docs', 'codex-orchestrator-issues.md');
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'smoke',
              title: 'smoke',
              command: 'node -e "console.log(\'scenario-ok\')"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'scenario-issue-log',
      CODEX_CLOUD_ENV_ID: '',
      CODEX_CLOUD_BRANCH: ''
    };

    const { stdout: startStdout } = await runCli(
      ['start', 'diagnostics', '--format', 'json', '--task', 'scenario-issue-log'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    const startJsonOffset = startStdout.indexOf('{');
    const startPayload = JSON.parse(startJsonOffset >= 0 ? startStdout.slice(startJsonOffset) : startStdout) as {
      run_id?: string;
    };
    expect(startPayload.run_id).toBeTruthy();

    const { stdout } = await runCli(
      [
        'doctor',
        '--format',
        'json',
        '--issue-log',
        '--issue-title',
        'Scenario issue capture',
        '--issue-notes',
        'Simulated downstream failure reproduction.',
        '--issue-log-path',
        issueLogPath,
        '--task',
        'scenario-issue-log',
        '--cloud-preflight'
      ],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    const payload = JSON.parse(stdout) as {
      issue_log?: {
        issue_log_path?: string;
        bundle_path?: string;
        run_context?: {
          run_id?: string;
        } | null;
      };
      cloud_preflight?: {
        ok?: boolean;
        issues?: Array<{ code?: string }>;
      };
    };
    expect(payload.issue_log).toBeTruthy();
    expect(payload.issue_log?.run_context?.run_id).toBe(startPayload.run_id);
    expect(payload.cloud_preflight?.ok).toBe(false);
    expect(payload.cloud_preflight?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing_environment' })])
    );

    const issueLogOutputPath = payload.issue_log?.issue_log_path ?? issueLogPath;
    const issueLogOutputResolved = isAbsolute(issueLogOutputPath)
      ? issueLogOutputPath
      : join(process.cwd(), issueLogOutputPath);
    const issueLogContent = await readFile(issueLogOutputResolved, 'utf8');
    expect(issueLogContent).toContain('Scenario issue capture');
    expect(issueLogContent).toContain('missing_environment');
    expect(issueLogContent).toContain(startPayload.run_id ?? '');

    const bundleOutputPath = payload.issue_log?.bundle_path ?? '';
    const bundleOutputResolved = isAbsolute(bundleOutputPath)
      ? bundleOutputPath
      : join(process.cwd(), bundleOutputPath);
    const bundlePayload = JSON.parse(await readFile(bundleOutputResolved, 'utf8')) as {
      run_context?: {
        run_id?: string;
      } | null;
      cloud_preflight?: {
        issues?: Array<{ code?: string }>;
      } | null;
    };
    expect(bundlePayload.run_context?.run_id).toBe(startPayload.run_id);
    expect(bundlePayload.cloud_preflight?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing_environment' })])
    );
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('auto-captures failure issue log for start when --auto-issue-log is enabled', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-auto-issue-log-'));
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'fail-stage',
              title: 'fail-stage',
              command: 'node -e "process.exit(3)"'
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
      MCP_RUNNER_TASK_ID: 'start-auto-issue-log'
    };
    const { stdout } = await runCli(
      ['start', 'diagnostics', '--format', 'json', '--task', 'start-auto-issue-log', '--auto-issue-log'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      status?: string;
      run_id?: string;
      issue_log?: {
        issue_log_path?: string;
        bundle_path?: string;
        run_context?: {
          run_id?: string;
        } | null;
      } | null;
      issue_log_error?: string | null;
    };
    expect(payload.status).toBe('failed');
    expect(payload.issue_log_error ?? null).toBeNull();
    expect(payload.issue_log).toBeTruthy();
    expect(payload.issue_log?.run_context?.run_id).toBe(payload.run_id);

    const issueLogOutputPath = payload.issue_log?.issue_log_path ?? '';
    const issueLogOutputResolved = isAbsolute(issueLogOutputPath)
      ? issueLogOutputPath
      : join(process.cwd(), issueLogOutputPath);
    const issueLogContent = await readFile(issueLogOutputResolved, 'utf8');
    expect(issueLogContent).toContain('Auto issue log: start diagnostics failed');
    expect(issueLogContent).toContain(payload.run_id ?? '');

    const bundleOutputPath = payload.issue_log?.bundle_path ?? '';
    const bundleOutputResolved = isAbsolute(bundleOutputPath)
      ? bundleOutputPath
      : join(process.cwd(), bundleOutputPath);
    const bundlePayload = JSON.parse(await readFile(bundleOutputResolved, 'utf8')) as {
      run_context?: {
        run_id?: string;
      } | null;
    };
    expect(bundlePayload.run_context?.run_id).toBe(payload.run_id);
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('uses failed manifest task_id for start auto issue-log task filtering', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-auto-issue-log-task-filter-'));
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'fail-stage',
              title: 'fail-stage',
              command: 'node -e "process.exit(7)"'
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
      MCP_RUNNER_TASK_ID: 'start-auto-issue-log-actual',
      TASK: 'stale-task-id'
    };
    const { stdout } = await runCli(['start', 'diagnostics', '--format', 'json', '--auto-issue-log'], env, FLOW_TARGET_TEST_TIMEOUT);
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      status?: string;
      run_id?: string;
      issue_log?: {
        bundle_path?: string;
        run_context?: { run_id?: string } | null;
      } | null;
      issue_log_error?: string | null;
    };
    expect(payload.status).toBe('failed');
    expect(payload.issue_log_error ?? null).toBeNull();
    expect(payload.issue_log?.run_context?.run_id).toBe(payload.run_id);

    const bundleOutputPath = payload.issue_log?.bundle_path ?? '';
    const bundleOutputResolved = isAbsolute(bundleOutputPath)
      ? bundleOutputPath
      : join(process.cwd(), bundleOutputPath);
    const normalizedBundlePath = bundleOutputResolved.replace(/\\/g, '/');
    expect(normalizedBundlePath).toContain('/out/start-auto-issue-log-actual/');
    expect(normalizedBundlePath).not.toContain('/out/stale-task-id/');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('auto-captures issue log for start failures before run manifest creation', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-auto-issue-log-pre-manifest-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex,
      MCP_RUNNER_TASK_ID: 'start-pre-manifest-issue-log'
    };
    await expect(
      runCli(
        [
          'start',
          'diagnostics',
          '--task',
          'start-pre-manifest-issue-log',
          '--repo-config-required',
          '--auto-issue-log'
        ],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Auto issue log: saved to')
    });

    const issueLogContent = await readFile(join(tempDir, 'docs', 'codex-orchestrator-issues.md'), 'utf8');
    expect(issueLogContent).toContain('Auto issue log: start diagnostics failed before run manifest');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('auto-captures issue log for flow failures before run manifest creation', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-auto-issue-log-pre-manifest-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex,
      MCP_RUNNER_TASK_ID: 'flow-pre-manifest-issue-log'
    };
    await expect(
      runCli(
        [
          'flow',
          '--task',
          'flow-pre-manifest-issue-log',
          '--repo-config-required',
          '--auto-issue-log'
        ],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Auto issue log: saved to')
    });

    const issueLogContent = await readFile(join(tempDir, 'docs', 'codex-orchestrator-issues.md'), 'utf8');
    expect(issueLogContent).toContain('Auto issue log: flow failed before run manifest');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('auto-captures failure issue log for flow when CODEX_ORCHESTRATOR_AUTO_ISSUE_LOG=1', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-auto-issue-log-'));
    const config = {
      defaultPipeline: 'docs-review',
      pipelines: [
        {
          id: 'docs-review',
          title: 'Docs Review',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'docs-fail',
              title: 'docs-fail',
              command: 'node -e "process.exit(5)"'
            }
          ]
        },
        {
          id: 'implementation-gate',
          title: 'Implementation Gate',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'impl-pass',
              title: 'impl-pass',
              command: 'node -e "process.exit(0)"'
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
      MCP_RUNNER_TASK_ID: 'flow-auto-issue-log',
      CODEX_ORCHESTRATOR_AUTO_ISSUE_LOG: '1'
    };

    let stdout = '';
    try {
      await runCli(['flow', '--format', 'json', '--task', 'flow-auto-issue-log'], env, FLOW_TARGET_TEST_TIMEOUT);
      throw new Error('expected flow to fail');
    } catch (error) {
      stdout = (error as { stdout?: string }).stdout ?? '';
    }
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      failed_stage?: string | null;
      docs_review?: { run_id?: string };
      issue_log?: {
        issue_log_path?: string;
        run_context?: {
          run_id?: string;
        } | null;
      } | null;
      issue_log_error?: string | null;
    };
    expect(payload.failed_stage).toBe('docs-review');
    expect(payload.issue_log_error ?? null).toBeNull();
    expect(payload.issue_log).toBeTruthy();
    expect(payload.issue_log?.run_context?.run_id).toBe(payload.docs_review?.run_id);

    const issueLogOutputPath = payload.issue_log?.issue_log_path ?? '';
    const issueLogOutputResolved = isAbsolute(issueLogOutputPath)
      ? issueLogOutputPath
      : join(process.cwd(), issueLogOutputPath);
    const issueLogContent = await readFile(issueLogOutputResolved, 'utf8');
    expect(issueLogContent).toContain('Auto issue log: flow docs-review failed');
    expect(issueLogContent).toContain(payload.docs_review?.run_id ?? '');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('fails fast when --repo-config-required is enabled and repo config is missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-strict-repo-config-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out')
    };
    await expect(
      runCli(['plan', 'docs-review', '--repo-config-required'], env)
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Repo-local codex.orchestrator.json is required')
    });
  }, TEST_TIMEOUT);

  it('allows disabling strict repo config mode per command with --repo-config-required=false', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-strict-override-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
    };
    const { stdout } = await runCli(['plan', 'docs-review', '--format', 'json', '--repo-config-required=false'], env);
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      pipeline?: { id?: string };
    };
    expect(payload.pipeline?.id).toBe('docs-review');
  }, TEST_TIMEOUT);

  it('warns when plan uses packaged fallback config', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-package-fallback-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'plan-package-fallback'
    };
    const { stdout, stderr } = await runCli(['plan', 'docs-review', '--format', 'json'], env);
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      pipeline?: { id?: string };
    };
    expect(payload.pipeline?.id).toBe('docs-review');
    expect(stderr).toContain('Using packaged fallback codex.orchestrator.json');
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

  it('scopes mcp enable targets when using --servers=<csv> flag style', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-equals-'));
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
        },
        {
          name: 'playwright',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'npx',
            args: ['@playwright/mcp@latest']
          }
        }
      ])
    };

    const { stdout } = await runCli(['mcp', 'enable', '--format', 'json', '--servers=delegation'], env);
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

  it('treats --yes=false as a non-apply plan for mcp enable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-yes-false-'));
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

    const { stdout } = await runCli(['mcp', 'enable', '--format', 'json', '--yes=false'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      actions?: Array<{ status?: string }>;
    };
    expect(payload.status).toBe('planned');
    expect(payload.actions).toEqual([
      expect.objectContaining({
        status: 'planned'
      })
    ]);
  }, TEST_TIMEOUT);

  it('rejects stray positional arguments when using --servers=<csv> flag style', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-equals-positional-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--servers=delegation', 'unexpected'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('mcp enable does not accept positional arguments')
    });
  }, TEST_TIMEOUT);

  it('rejects unknown mcp enable flags to avoid unintended bulk enable fallback', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-unknown-flag-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--server', 'delegation', '--yes'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown mcp enable flag: --server')
    });
  }, TEST_TIMEOUT);

  it('rejects unknown equals-style mcp enable flags', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-unknown-flag-equals-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--server=delegation', '--yes'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown mcp enable flag: --server')
    });
  }, TEST_TIMEOUT);

  it('rejects duplicate --servers flags for mcp enable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-duplicate-servers-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(
      runCli(['mcp', 'enable', '--servers', 'delegation', '--servers', 'playwright', '--yes'], env)
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('--servers specified multiple times.')
    });
  }, TEST_TIMEOUT);

  it('rejects duplicate --yes flags for mcp enable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-duplicate-yes-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--yes', 'false', '--yes'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('--yes specified multiple times.')
    });
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

  it('quotes shell-sensitive repo args in setup delegation preview output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-plan-repo-quote-'));
    const repoRoot = join(tempDir, 'repo;quoted');
    await mkdir(repoRoot, { recursive: true });
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home')
    };
    const { stdout } = await runCli(['setup', '--repo', repoRoot], env);
    expect(stdout).toContain(`- Delegation: codex-orchestrator delegation setup --yes --repo '${repoRoot}'`);
  }, TEST_TIMEOUT);

  it('supports equals-style setup --format=json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-plan-equals-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['setup', '--format=json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      steps?: {
        guidance?: {
          note?: string;
        };
      };
    };
    expect(payload.status).toBe('planned');
    expect(payload.steps?.guidance?.note).toContain('Agent-first default');
  }, TEST_TIMEOUT);

  it('treats setup --yes=false as plan mode', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-yes-false-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['setup', '--yes=false', '--format', 'json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      steps?: {
        skills?: {
          commandLines?: string[];
        };
      };
    };
    expect(payload.status).toBe('planned');
    expect(payload.steps?.skills?.commandLines).toBeDefined();
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

  it('delegation setup --yes preserves explicit repo pin in mcp add command', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-repo-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const codexHome = join(tempDir, 'codex-home');
    const repoRoot = join(tempDir, 'repo with spaces');
    const addLog = join(tempDir, 'mcp-add.log');
    await mkdir(repoRoot, { recursive: true });

    const env = {
      ...process.env,
      CODEX_HOME: codexHome,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_ADD_LOG: addLog
    };

    await runCli(['delegation', 'setup', '--yes', '--repo', repoRoot], env, FLOW_TARGET_TEST_TIMEOUT);
    const log = await readFile(addLog, 'utf8');
    expect(log).toContain('mcp add delegation');
    expect(log).toContain(`--repo ${repoRoot}`);
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('delegation setup --yes reconfigures unpinned fallback entries when mcp get is unavailable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-fallback-repin-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const codexHome = join(tempDir, 'codex-home');
    const repoRoot = join(tempDir, 'repo');
    const addLog = join(tempDir, 'mcp-add.log');
    await mkdir(repoRoot, { recursive: true });
    await mkdir(codexHome, { recursive: true });
    await writeFile(
      join(codexHome, 'config.toml'),
      [
        '[mcp_servers.delegation]',
        'command = "codex-orchestrator"',
        'args = ["delegate-server"]',
        '[mcp_servers.delegation.env]',
        'KEEP_ME = "1"'
      ].join('\n'),
      'utf8'
    );

    const env = {
      ...process.env,
      CODEX_HOME: codexHome,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_ADD_LOG: addLog
    };

    await runCli(['delegation', 'setup', '--yes', '--repo', repoRoot], env, FLOW_TARGET_TEST_TIMEOUT);
    const log = await readFile(addLog, 'utf8');
    expect(log).toContain('mcp add delegation');
    expect(log).toContain('--env KEEP_ME=1');
    expect(log).toContain(`--repo ${repoRoot}`);
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('delegation setup plan includes explicit repo pin', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-plan-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const repoRoot = join(tempDir, 'repo');
    await mkdir(repoRoot, { recursive: true });
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex
    };

    const { stdout } = await runCli(['delegation', 'setup', '--format', 'json', '--repo', repoRoot], env);
    const payload = JSON.parse(stdout) as { plan?: { commandLine?: string } };
    expect(payload.plan?.commandLine).toContain('--repo');
    expect(payload.plan?.commandLine).toContain(repoRoot);
  }, TEST_TIMEOUT);

  it('delegation setup normalizes relative repo pin to absolute path', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-relative-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const repoRoot = join(tempDir, 'repo');
    await mkdir(repoRoot, { recursive: true });
    const repoArg = relative(process.cwd(), repoRoot);
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex
    };

    const { stdout } = await runCli(['delegation', 'setup', '--format', 'json', '--repo', repoArg], env);
    const payload = JSON.parse(stdout) as { plan?: { commandLine?: string; repoRoot?: string } };
    expect(payload.plan?.repoRoot).toBe(repoRoot);
    expect(payload.plan?.commandLine).toContain(`--repo ${repoRoot}`);
    expect(payload.plan?.commandLine).not.toContain(`--repo ${repoArg}`);
  }, TEST_TIMEOUT);

  it('delegation setup plan safely quotes shell-sensitive repo pins', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-quoted-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const repoRoot = join(tempDir, 'repo;tmp');
    await mkdir(repoRoot, { recursive: true });
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex
    };

    const { stdout } = await runCli(['delegation', 'setup', '--format', 'json', '--repo', repoRoot], env);
    const payload = JSON.parse(stdout) as { plan?: { commandLine?: string } };
    expect(payload.plan?.commandLine).toContain(`--repo '${repoRoot}'`);
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
