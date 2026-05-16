import { execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProviderIssueHandoffService } from '../src/cli/control/providerIssueHandoff.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';

import { __test__ as controlHostCliShellTest } from '../src/cli/controlHostCliShell.js';
import {
  CONFIG_AUTHORITY_MODE_ENV_KEY,
  REPO_CONFIG_REQUIRED_ENV_KEY,
  resolveConfigAuthorityMode
} from '../src/cli/config/repoConfigPolicy.js';
import { REPO_CONFIG_PATH_ENV_KEY } from '../src/cli/config/userConfig.js';
import { createProviderWorkflowConfigStore } from '../src/cli/control/providerWorkflowConfigStore.js';
import { PROVIDER_WORKER_HOST_ENV_KEY } from '../src/cli/control/providerWorkerHosts.js';
import { PROVIDER_LINEAR_WORKER_PROOF_FILENAME } from '../src/cli/providerLinearWorkerRunner.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const {
  DEFAULT_PROVIDER_START_PIPELINE_ID,
  buildProviderLaunchSpec,
  buildRemoteProviderEnvValues,
  buildRemoteProviderLaunchCommand,
  buildRemoteProviderSshInvocation,
  buildProviderLinearSourceEnvOverrides,
  buildProviderResidentSessionEnvOverrides,
  buildProviderOverrideOwnershipEnv,
  beginProviderIssueHandoffStartupRefresh,
  findSpawnManifest,
  rehydrateProviderIssueHandoffOnStartup,
  refreshProviderIssueHandoffOnStartup,
  resolveRemoteProviderNodePath,
  resolveSpawnManifestWaitTimeoutMs,
  resolveProviderResumeLaunchSpec,
  assertResumeLaunchSpecMatchesAdmittedWorkerHost,
  resolveProviderOverridePackageRoot,
  createControlHostTrackedIssueResolvers,
  snapshotRunManifests,
  writeRemoteProviderScriptToSshChild
} = controlHostCliShellTest;
const execFileAsync = promisify(execFile);

let tempRoot: string | null = null;

afterEach(async () => {
  if (!tempRoot) {
    return;
  }
  await rm(tempRoot, { recursive: true, force: true });
  tempRoot = null;
});

async function writeManifest(
  taskRunsRoot: string,
  runId: string,
  manifest: Record<string, unknown>
): Promise<string> {
  const runDir = join(taskRunsRoot, runId);
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest), 'utf8');
  return manifestPath;
}

async function runGit(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', repoRoot, ...args]);
  return stdout.trim();
}

async function initializeRepo(repoRoot: string): Promise<void> {
  await runGit(repoRoot, ['init']);
  await runGit(repoRoot, ['config', 'user.email', 'control-host@example.com']);
  await runGit(repoRoot, ['config', 'user.name', 'control-host']);
  await writeFile(join(repoRoot, 'package.json'), JSON.stringify({ name: 'control-host-test' }), 'utf8');
  await runGit(repoRoot, ['add', 'package.json']);
  await runGit(repoRoot, ['commit', '-m', 'init']);
}

class FakeWritable extends EventEmitter {
  endImpl: ((chunk: string) => void) | null = null;

  end(chunk: string): void {
    this.endImpl?.(chunk);
  }
}

class FakeDetachedChild {
  stdin: FakeWritable | null;
  unref = vi.fn();

  constructor(stdin: FakeWritable | null) {
    this.stdin = stdin;
  }
}

describe('controlHostCliShell manifest discovery', () => {
  it('defaults provider starts to the provider worker pipeline', () => {
    expect(DEFAULT_PROVIDER_START_PIPELINE_ID).toBe('provider-linear-worker');
  });

  it('maps tracked issue scope bindings into provider worker env overrides', () => {
    expect(
      buildProviderLinearSourceEnvOverrides({
        provider: 'linear',
        workspaceId: 'workspace-1',
        teamId: 'team-1',
        projectId: 'project-1'
      })
    ).toEqual({
      CO_LINEAR_WORKSPACE_ID: 'workspace-1',
      CO_LINEAR_TEAM_ID: 'team-1',
      CO_LINEAR_PROJECT_ID: 'project-1'
    });
  });

  it('clears null tracked issue scope bindings in provider worker env overrides', () => {
    expect(
      buildProviderLinearSourceEnvOverrides({
        provider: 'linear',
        workspaceId: 'workspace-1',
        teamId: null,
        projectId: null
      })
    ).toEqual({
      CO_LINEAR_WORKSPACE_ID: 'workspace-1',
      CO_LINEAR_TEAM_ID: '',
      CO_LINEAR_PROJECT_ID: ''
    });
  });

  it('pins provider child launches to the cached last-known-good repo config snapshot', () => {
    const env: EnvironmentPaths = {
      repoRoot: '/repo',
      runsRoot: '/repo/.runs',
      outRoot: '/repo/out',
      taskId: 'local-mcp'
    };

    expect(
      buildProviderLaunchSpec(env, '/repo/.workspaces/provider-task', '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json')
    ).toEqual({
      cwd: '/repo/.workspaces/provider-task',
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: '/repo/.workspaces/provider-task',
        CODEX_ORCHESTRATOR_RUNS_DIR: '/repo/.runs',
        CODEX_ORCHESTRATOR_OUT_DIR: '/repo/out',
        [REPO_CONFIG_PATH_ENV_KEY]:
          '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
        [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
        [PROVIDER_WORKER_HOST_ENV_KEY]: ''
      },
      transport: {
        kind: 'local'
      }
    });
  });

  it('forces provider launches back to repo-authoritative mode under inherited compatibility envs', () => {
    const env: EnvironmentPaths = {
      repoRoot: '/repo',
      runsRoot: '/repo/.runs',
      outRoot: '/repo/out',
      taskId: 'local-mcp'
    };
    const launchSpec = buildProviderLaunchSpec(
      env,
      '/repo/.workspaces/provider-task',
      '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json'
    );

    expect(
      resolveConfigAuthorityMode({
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'downstream-compatibility',
        ...launchSpec.envOverrides
      })
    ).toEqual({
      mode: 'repo-authoritative',
      reason: `${CONFIG_AUTHORITY_MODE_ENV_KEY}=repo-authoritative`
    });
  });

  it('uses configured source binding only for existing-claim revalidation while dispatch pilot is disabled', async () => {
    const runtimeEnv = {
      CO_LINEAR_WORKSPACE_ID: 'workspace-env',
      CO_LINEAR_TEAM_ID: 'team-env',
      CO_LINEAR_PROJECT_ID: 'project-env'
    } as NodeJS.ProcessEnv;
    const resolveIssueById = vi.fn(async (request: {
      issueId: string;
      sourceSetup?: {
        provider: 'linear';
        workspace_id: string | null;
        team_id: string | null;
        project_id: string | null;
      } | null;
      env?: NodeJS.ProcessEnv;
    }) => ({
      kind: 'unavailable' as const,
      status: 404,
      code: 'dispatch_source_unavailable' as const,
      reason: 'dispatch_source_issue_not_found',
      details: {
        sourceSetup: request.sourceSetup
      }
    }));
    const resolvers = createControlHostTrackedIssueResolvers({
      readFeatureToggles: () => ({
        dispatch_pilot: {
          enabled: false,
          source: {
            provider: 'linear',
            live: true
          }
        }
      }),
      resolveEnv: () => runtimeEnv,
      resolveIssueById
    });

    expect(resolvers.resolveTrackedIssue).toBeDefined();
    expect(resolvers.resolveTrackedIssues).toBeDefined();
    expect(resolvers.resolveRevalidationTrackedIssue).toBeDefined();
    await expect(
      resolvers.resolveTrackedIssue!({ provider: 'linear', issueId: 'lin-issue-510' })
    ).resolves.toEqual({
      kind: 'skip',
      reason: 'dispatch_source_disabled'
    });
    await expect(
      resolvers.resolveTrackedIssues!({ mode: 'recovery_sweep' })
    ).resolves.toEqual({
      kind: 'skip',
      reason: 'dispatch_source_disabled'
    });
    expect(resolveIssueById).not.toHaveBeenCalled();

    await expect(
      resolvers.resolveRevalidationTrackedIssue!({ provider: 'linear', issueId: 'lin-issue-510' })
    ).resolves.toEqual({
      kind: 'release',
      reason: 'dispatch_source_issue_not_found'
    });
    expect(resolveIssueById).toHaveBeenCalledWith({
      issueId: 'lin-issue-510',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'workspace-env',
        team_id: 'team-env',
        project_id: 'project-env'
      },
      env: runtimeEnv
    });
  });

  it('builds an ssh transport launch spec when a worker host is selected', () => {
    const env: EnvironmentPaths = {
      repoRoot: '/repo',
      runsRoot: '/repo/.runs',
      outRoot: '/repo/out',
      taskId: 'local-mcp'
    };

    expect(
      buildProviderLaunchSpec(
        env,
        '/repo/.workspaces/provider-task',
        '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        {
          name: 'worker-host-01',
          transport: 'ssh',
          ssh_destination: 'codex@worker-host-01',
          ssh_options: ['-p', '2222'],
          max_concurrent_agents: 2,
          node_path: '/opt/homebrew/bin/node'
        }
      )
    ).toEqual({
      cwd: '/repo/.workspaces/provider-task',
      envOverrides: {
        CODEX_ORCHESTRATOR_NODE_BIN: '/opt/homebrew/bin/node',
        CODEX_ORCHESTRATOR_ROOT: '/repo/.workspaces/provider-task',
        CODEX_ORCHESTRATOR_RUNS_DIR: '/repo/.runs',
        CODEX_ORCHESTRATOR_OUT_DIR: '/repo/out',
        [REPO_CONFIG_PATH_ENV_KEY]:
          '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
        [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
        [PROVIDER_WORKER_HOST_ENV_KEY]: 'worker-host-01'
      },
      transport: {
        kind: 'ssh',
        host: {
          name: 'worker-host-01',
          transport: 'ssh',
          ssh_destination: 'codex@worker-host-01',
          ssh_options: ['-p', '2222'],
          max_concurrent_agents: 2,
          node_path: '/opt/homebrew/bin/node'
        }
      }
    });
  });

  it('defaults remote worker launches to `node` when node_path is omitted', () => {
    const workerHost = {
      name: 'worker-host-01',
      transport: 'ssh' as const,
      ssh_destination: 'codex@worker-host-01',
      ssh_options: [],
      max_concurrent_agents: 1,
      node_path: null
    };

    expect(resolveRemoteProviderNodePath(workerHost)).toBe('node');
    const command = buildRemoteProviderLaunchCommand({
      cwd: '/repo/.workspaces/provider-task',
      nodePath: resolveRemoteProviderNodePath(workerHost),
      cliEntrypoint: '/repo/dist/bin/codex-orchestrator.js',
      args: ['start', 'provider-linear-worker'],
      envValues: {
        CODEX_ORCHESTRATOR_ROOT: '/repo/.workspaces/provider-task'
      }
    });

    expect(command).toContain(
      "exec env -i PATH=\"$PATH\" CODEX_ORCHESTRATOR_ROOT='/repo/.workspaces/provider-task'"
    );
    expect(command).toContain("'node'");
    expect(command).toContain("'/repo/dist/bin/codex-orchestrator.js'");
    expect(command).toContain("'start' 'provider-linear-worker'");
  });

  it('uses a longer spawn-manifest wait window for ssh worker launches', () => {
    const env: EnvironmentPaths = {
      repoRoot: '/repo',
      runsRoot: '/repo/.runs',
      outRoot: '/repo/out',
      taskId: 'local-mcp'
    };
    const localSpec = buildProviderLaunchSpec(
      env,
      '/repo/.workspaces/provider-task',
      '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json'
    );
    const remoteSpec = buildProviderLaunchSpec(
      env,
      '/repo/.workspaces/provider-task',
      '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
      {
        name: 'worker-host-01',
        transport: 'ssh',
        ssh_destination: 'codex@worker-host-01',
        ssh_options: [],
        max_concurrent_agents: 1,
        node_path: null
      }
    );

    expect(resolveSpawnManifestWaitTimeoutMs(localSpec)).toBe(5_000);
    expect(resolveSpawnManifestWaitTimeoutMs(remoteSpec)).toBe(20_000);
  });

  it('quotes special shell characters in remote worker launch commands', () => {
    const command = buildRemoteProviderLaunchCommand({
      cwd: '/repo/.workspaces/provider-task',
      nodePath: '/opt/homebrew/bin/node',
      cliEntrypoint: '/repo/dist/bin/codex-orchestrator.js',
      args: ['start', "O'Reilly", 'line-1\nline-2'],
      envValues: {
        CODEX_ORCHESTRATOR_ROOT: "/repo/O'Reilly",
        LINEAR_API_KEY: 'line-1\nline-2'
      }
    });

    expect(command).toContain("CODEX_ORCHESTRATOR_ROOT='/repo/O'\\''Reilly'");
    expect(command).toContain("LINEAR_API_KEY='line-1\nline-2'");
    expect(command).toContain("'/opt/homebrew/bin/node'");
    expect(command).toContain("'/repo/dist/bin/codex-orchestrator.js'");
    expect(command).toContain("'start' 'O'\\''Reilly' 'line-1\nline-2'");
  });

  it('keeps remote worker secrets out of ssh argv while preserving them in stdin script', () => {
    const invocation = buildRemoteProviderSshInvocation({
      host: {
        name: 'worker-host-01',
        transport: 'ssh',
        ssh_destination: 'codex@worker-host-01',
        ssh_options: ['-p', '2222'],
        max_concurrent_agents: 1,
        node_path: null
      },
      cwd: '/repo/.workspaces/provider-task',
      nodePath: '/opt/homebrew/bin/node',
      cliEntrypoint: '/repo/dist/bin/codex-orchestrator.js',
      args: ['start', 'provider-linear-worker'],
      envValues: {
        CODEX_ORCHESTRATOR_ROOT: '/repo/.workspaces/provider-task',
        LINEAR_API_KEY: 'lin-secret',
        OPENAI_API_KEY: 'sk-secret'
      }
    });

    expect(invocation.sshArgs).toEqual([
      '-o',
      'BatchMode=yes',
      '-p',
      '2222',
      'codex@worker-host-01',
      'sh',
      '-s'
    ]);
    expect(invocation.sshArgs.join(' ')).not.toContain('lin-secret');
    expect(invocation.sshArgs.join(' ')).not.toContain('sk-secret');
    expect(invocation.remoteScript).toContain("LINEAR_API_KEY='lin-secret'");
    expect(invocation.remoteScript).toContain("OPENAI_API_KEY='sk-secret'");
    expect(invocation.remoteScript).toContain("'/opt/homebrew/bin/node'");
  });

  it('rejects ssh launch stdin EPIPE failures instead of leaving them uncaught', async () => {
    const stdin = new FakeWritable();
    const child = new FakeDetachedChild(stdin);
    const epipe = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });

    stdin.endImpl = () => {
      stdin.emit('error', epipe);
    };

    await expect(writeRemoteProviderScriptToSshChild(child, 'echo ready\n')).rejects.toThrow(
      'write EPIPE'
    );
    expect(child.unref).not.toHaveBeenCalled();
  });

  it('does not inherit local process.execArgv in remote worker launch commands', () => {
    const originalExecArgv = process.execArgv;
    process.execArgv = ['--require', '/tmp/local-only-register.js', '--inspect=9230'];

    try {
      const command = buildRemoteProviderLaunchCommand({
        cwd: '/repo/.workspaces/provider-task',
        nodePath: '/opt/homebrew/bin/node',
        cliEntrypoint: '/repo/dist/bin/codex-orchestrator.js',
        args: ['start', 'provider-linear-worker'],
        envValues: {
          CODEX_ORCHESTRATOR_ROOT: '/repo/.workspaces/provider-task'
        }
      });

      expect(command).not.toContain('/tmp/local-only-register.js');
      expect(command).not.toContain('--inspect=9230');
      expect(command).toContain("'/opt/homebrew/bin/node' '/repo/dist/bin/codex-orchestrator.js'");
    } finally {
      process.execArgv = originalExecArgv;
    }
  });

  it('only forwards the bounded inherited env allowlist to remote worker launches', () => {
    expect(
      buildRemoteProviderEnvValues(
        {
          all_proxy: 'socks5://lowercase-proxy.internal:1080',
          CO_LINEAR_API_TOKEN: 'lin-token',
          CO_PROVIDER_WORKER_MAX_TURNS: '12',
          CODEX_CONFIG_OVERRIDES: 'model_reasoning_effort="xhigh"',
          CODEX_HOME: '/tmp/codex-home',
          CODEX_MCP_CONFIG_OVERRIDES: 'delegation.enabled=true',
          CODEX_ORCHESTRATOR_APPSERVER_SKIP_LOGIN_CHECK: '1',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '24',
          CODEX_ORCHESTRATOR_RUNTIME_FALLBACK: 'deny',
          CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli',
          CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'cli',
          CODEX_RUNTIME_MODE: 'cli',
          http_proxy: 'http://proxy.internal:8080',
          https_proxy: 'https://proxy.internal:8444',
          no_proxy: 'localhost,127.0.0.1',
          OPENAI_API_KEY: 'sk-test',
          HTTPS_PROXY: 'https://proxy.internal:8443',
          LINEAR_API_KEY: 'lin-key',
          SSH_AUTH_SOCK: '/tmp/launchd.sock',
          HOME: '/Users/kbediako'
        },
        {
          CODEX_ORCHESTRATOR_ROOT: '/repo/.workspaces/provider-task'
        }
      )
    ).toEqual({
      all_proxy: 'socks5://lowercase-proxy.internal:1080',
      CO_LINEAR_API_TOKEN: 'lin-token',
      CO_PROVIDER_WORKER_MAX_TURNS: '12',
      CODEX_CONFIG_OVERRIDES: 'model_reasoning_effort="xhigh"',
      CODEX_HOME: '/tmp/codex-home',
      CODEX_MCP_CONFIG_OVERRIDES: 'delegation.enabled=true',
      CODEX_ORCHESTRATOR_APPSERVER_SKIP_LOGIN_CHECK: '1',
      CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '24',
      CODEX_ORCHESTRATOR_RUNTIME_FALLBACK: 'deny',
      CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli',
      CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'cli',
      CODEX_RUNTIME_MODE: 'cli',
      http_proxy: 'http://proxy.internal:8080',
      https_proxy: 'https://proxy.internal:8444',
      no_proxy: 'localhost,127.0.0.1',
      OPENAI_API_KEY: 'sk-test',
      HTTPS_PROXY: 'https://proxy.internal:8443',
      LINEAR_API_KEY: 'lin-key',
      CODEX_ORCHESTRATOR_ROOT: '/repo/.workspaces/provider-task'
    });
  });

  it('serializes guarded resident-session continuity seeds into provider worker env overrides', () => {
    expect(
      buildProviderResidentSessionEnvOverrides({
        source_run_id: 'run-prev',
        source_updated_at: '2026-04-09T09:00:00.000Z',
        source_end_reason: 'max_turns_reached_issue_still_active',
        source_thread_id: 'thread-1',
        logical_turn_count: 20,
        restart_count: 1
      })
    ).toEqual({
      CODEX_ORCHESTRATOR_PROVIDER_RESIDENT_SESSION_SEED: JSON.stringify({
        source_run_id: 'run-prev',
        source_updated_at: '2026-04-09T09:00:00.000Z',
        source_end_reason: 'max_turns_reached_issue_still_active',
        source_thread_id: 'thread-1',
        logical_turn_count: 20,
        restart_count: 1
      })
    });
  });

  it('clears guarded resident-session continuity seeds when the next launch should start fresh', () => {
    expect(buildProviderResidentSessionEnvOverrides(null)).toEqual({
      CODEX_ORCHESTRATOR_PROVIDER_RESIDENT_SESSION_SEED: ''
    });
  });

  it('prefers launch-time package-root overrides when stamping provider ownership markers', () => {
    expect(
      buildProviderOverrideOwnershipEnv('/tmp/codex-orchestrator.js', {
        CODEX_ORCHESTRATOR_PACKAGE_ROOT: '/tmp/override-package-root',
        [REPO_CONFIG_PATH_ENV_KEY]: '/tmp/provider-workflow.last-known-good.json'
      })
    ).toEqual({
      CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH: '/tmp/provider-workflow.last-known-good.json',
      CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT: '/tmp/override-package-root'
    });
  });

  it('resolves provider override package root from the real CLI target when the entrypoint is symlinked', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    const originalPackageRoot = process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT;
    delete process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT;

    const packageRoot = join(tempRoot, 'package-root');
    const realCliEntrypoint = join(packageRoot, 'dist', 'bin', 'codex-orchestrator.js');
    const symlinkedEntrypoint = join(tempRoot, 'node_modules', '.bin', 'codex-orchestrator');
    await mkdir(join(packageRoot, 'dist', 'bin'), { recursive: true });
    await mkdir(join(tempRoot, 'node_modules', '.bin'), { recursive: true });
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: '@kbediako/codex-orchestrator' }), 'utf8');
    await writeFile(realCliEntrypoint, 'export {};\n', 'utf8');
    await symlink(realCliEntrypoint, symlinkedEntrypoint);

    try {
      await expect(realpath(resolveProviderOverridePackageRoot(symlinkedEntrypoint) as string)).resolves.toBe(
        await realpath(packageRoot)
      );
    } finally {
      if (originalPackageRoot === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT;
      } else {
        process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT = originalPackageRoot;
      }
    }
  });

  it('falls back to the package root when dist/bin lookup cannot find package metadata', () => {
    const originalPackageRoot = process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT;
    delete process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT;

    try {
      expect(
        resolveProviderOverridePackageRoot('/tmp/provider-package/dist/bin/codex-orchestrator.js')
      ).toBe('/tmp/provider-package');
    } finally {
      if (originalPackageRoot === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT;
      } else {
        process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT = originalPackageRoot;
      }
    }
  });

  it('keeps the newly spawned manifest even when its mtime falls before the local spawn timestamp', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));

    await writeManifest(tempRoot, 'run-existing', { run_id: 'run-existing', task_id: 'task-1' });
    const baselineRuns = await snapshotRunManifests(tempRoot);

    const manifestPath = await writeManifest(tempRoot, 'run-new', { run_id: 'run-new', task_id: 'task-1' });
    const coarseTimestamp = new Date('2026-03-20T00:00:00.000Z');
    await utimes(manifestPath, coarseTimestamp, coarseTimestamp);

    await expect(
      findSpawnManifest({
        taskRunsRoot: tempRoot,
        taskId: 'task-1',
        baselineRuns
      })
    ).resolves.toEqual({
      runId: 'run-new',
      manifestPath
    });
  });

  it('ignores a preexisting run directory that gains a manifest after the baseline snapshot', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));

    await mkdir(join(tempRoot, 'run-existing'), { recursive: true });
    const baselineRuns = await snapshotRunManifests(tempRoot);

    const newManifestPath = await writeManifest(tempRoot, 'run-new', {
      run_id: 'run-new',
      task_id: 'task-1'
    });
    const existingManifestPath = await writeManifest(tempRoot, 'run-existing', {
      run_id: 'run-existing',
      task_id: 'task-1'
    });
    const laterTimestamp = new Date('2026-03-20T00:00:02.000Z');
    await utimes(existingManifestPath, laterTimestamp, laterTimestamp);

    await expect(
      findSpawnManifest({
        taskRunsRoot: tempRoot,
        taskId: 'task-1',
        baselineRuns
      })
    ).resolves.toEqual({
      runId: 'run-new',
      manifestPath: newManifestPath
    });
  });

  it('matches the launched manifest by issue metadata before accepting newer concurrent manifests', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));

    const baselineRuns = await snapshotRunManifests(tempRoot);

    const expectedManifestPath = await writeManifest(tempRoot, 'run-expected', {
      run_id: 'run-expected',
      task_id: 'task-1',
      issue_provider: 'linear',
      issue_id: 'issue-1',
      issue_identifier: 'CO-1',
      issue_updated_at: '2026-03-20T00:00:00.000Z',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'provider-host-run'
    });
    const newerOtherManifestPath = await writeManifest(tempRoot, 'run-other', {
      run_id: 'run-other',
      task_id: 'task-1',
      issue_provider: 'linear',
      issue_id: 'issue-2',
      issue_identifier: 'CO-2',
      issue_updated_at: '2026-03-20T00:00:01.000Z',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'provider-host-run'
    });
    const laterTimestamp = new Date('2026-03-20T00:00:02.000Z');
    await utimes(newerOtherManifestPath, laterTimestamp, laterTimestamp);

    await expect(
      findSpawnManifest({
        taskRunsRoot: tempRoot,
        taskId: 'task-1',
        baselineRuns,
        correlation: {
          issueProvider: 'linear',
          issueId: 'issue-1',
          issueIdentifier: 'CO-1',
          issueUpdatedAt: '2026-03-20T00:00:00.000Z',
          providerControlHostTaskId: 'provider-host-task',
          providerControlHostRunId: 'provider-host-run'
        }
      })
    ).resolves.toEqual({
      runId: 'run-expected',
      manifestPath: expectedManifestPath
    });
  });

  it('matches the launched manifest by control-host locator before accepting same-issue collisions', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));

    const baselineRuns = await snapshotRunManifests(tempRoot);

    const expectedManifestPath = await writeManifest(tempRoot, 'run-expected', {
      run_id: 'run-expected',
      task_id: 'task-1',
      issue_provider: 'linear',
      issue_id: 'issue-1',
      issue_identifier: 'CO-1',
      issue_updated_at: '2026-03-20T00:00:00.000Z',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'provider-host-run'
    });
    const newerOtherManifestPath = await writeManifest(tempRoot, 'run-other', {
      run_id: 'run-other',
      task_id: 'task-1',
      issue_provider: 'linear',
      issue_id: 'issue-1',
      issue_identifier: 'CO-1',
      issue_updated_at: '2026-03-20T00:00:00.000Z',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'other-provider-host-run'
    });
    const laterTimestamp = new Date('2026-03-20T00:00:02.000Z');
    await utimes(newerOtherManifestPath, laterTimestamp, laterTimestamp);

    await expect(
      findSpawnManifest({
        taskRunsRoot: tempRoot,
        taskId: 'task-1',
        baselineRuns,
        correlation: {
          issueProvider: 'linear',
          issueId: 'issue-1',
          issueIdentifier: 'CO-1',
          issueUpdatedAt: '2026-03-20T00:00:00.000Z',
          providerControlHostTaskId: 'provider-host-task',
          providerControlHostRunId: 'provider-host-run'
        }
      })
    ).resolves.toEqual({
      runId: 'run-expected',
      manifestPath: expectedManifestPath
    });
  });

  it('resumes provider runs inside the manifest workspace while preserving main repo artifact roots', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        [REPO_CONFIG_PATH_ENV_KEY]: join(tempRoot, 'codex.orchestrator.json'),
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
        [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
        [PROVIDER_WORKER_HOST_ENV_KEY]: '',
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      },
      transport: {
        kind: 'local'
      }
    });
  });

  it('restores persisted Linear scope bindings for provider resumes and clears null fields', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        source_setup: {
          provider: 'linear',
          workspace_id: 'workspace-1',
          team_id: null,
          project_id: 'project-1'
        }
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        [REPO_CONFIG_PATH_ENV_KEY]: join(tempRoot, 'codex.orchestrator.json'),
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
        [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
        [PROVIDER_WORKER_HOST_ENV_KEY]: '',
        CO_LINEAR_WORKSPACE_ID: 'workspace-1',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: 'project-1'
      },
      transport: {
        kind: 'local'
      }
    });
  });

  it('rebuilds the deterministic per-issue workspace for legacy provider resumes without workspace metadata', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1'
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        [REPO_CONFIG_PATH_ENV_KEY]: join(tempRoot, 'codex.orchestrator.json'),
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
        [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
        [PROVIDER_WORKER_HOST_ENV_KEY]: '',
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      },
      transport: {
        kind: 'local'
      }
    });
  });

  it('derives legacy provider resume task ids from the resolved run path when manifest task_id is absent', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const legacyRunDir = join(env.runsRoot, 'linear-lin-issue-1', 'run-child');
    await mkdir(legacyRunDir, { recursive: true });
    await writeFile(
      join(legacyRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'run-child'
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        [REPO_CONFIG_PATH_ENV_KEY]: join(tempRoot, 'codex.orchestrator.json'),
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
        [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
        [PROVIDER_WORKER_HOST_ENV_KEY]: '',
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      },
      transport: {
        kind: 'local'
      }
    });
  });

  it('ignores manifest workspace paths outside the deterministic provider workspace root on resume', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        workspace_path: tempRoot
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        [REPO_CONFIG_PATH_ENV_KEY]: join(tempRoot, 'codex.orchestrator.json'),
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
        [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
        [PROVIDER_WORKER_HOST_ENV_KEY]: '',
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      },
      transport: {
        kind: 'local'
      }
    });
  });

  it('rejects invalid manifest task ids before recreating a provider resume workspace', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: '../escape'
      }),
      'utf8'
    );

    await expect(resolveProviderResumeLaunchSpec(env, 'run-child')).rejects.toThrow(
      'Invalid provider resume manifest task_id for run run-child'
    );
  });

  it('falls back to a fresh persisted proof worker_host when resume input omits a host override', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        started_at: '2026-03-30T01:15:00.000Z',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-30T01:15:00.000Z',
        worker_host: 'worker-host-01'
      }),
      'utf8'
    );
    await writeFile(
      join(tempRoot, 'codex.orchestrator.json'),
      JSON.stringify({
        defaultPipeline: 'provider-linear-worker',
        pipelines: [
          {
            id: 'provider-linear-worker',
            title: 'Provider worker',
            metadata: {
              worker_hosts: {
                hosts: [
                  {
                    name: 'worker-host-01',
                    ssh_destination: 'codex@worker-host-01',
                    max_concurrent_agents: 1
                  }
                ]
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const providerWorkflowConfigStore = createProviderWorkflowConfigStore({
      env,
      runDir: join(tempRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });
    await providerWorkflowConfigStore.bootstrap();

    const spec = await resolveProviderResumeLaunchSpec(
      env,
      'run-child',
      providerWorkflowConfigStore
    );

    expect(spec.transport).toEqual({
      kind: 'ssh',
      host: {
        name: 'worker-host-01',
        transport: 'ssh',
        ssh_destination: 'codex@worker-host-01',
        ssh_options: [],
        max_concurrent_agents: 1,
        node_path: null
      }
    });
    expect(spec.envOverrides[PROVIDER_WORKER_HOST_ENV_KEY]).toBe('worker-host-01');
  });

  it('treats an explicit null resume worker_host as a local override over fresh persisted proof', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        started_at: '2026-03-30T01:15:00.000Z',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-30T01:15:00.000Z',
        worker_host: 'worker-host-01'
      }),
      'utf8'
    );
    await writeFile(
      join(tempRoot, 'codex.orchestrator.json'),
      JSON.stringify({
        defaultPipeline: 'provider-linear-worker',
        pipelines: [
          {
            id: 'provider-linear-worker',
            title: 'Provider worker',
            metadata: {
              worker_hosts: {
                hosts: [
                  {
                    name: 'worker-host-01',
                    ssh_destination: 'codex@worker-host-01',
                    max_concurrent_agents: 1
                  }
                ]
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const providerWorkflowConfigStore = createProviderWorkflowConfigStore({
      env,
      runDir: join(tempRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });
    await providerWorkflowConfigStore.bootstrap();

    const spec = await resolveProviderResumeLaunchSpec(
      env,
      'run-child',
      providerWorkflowConfigStore,
      null
    );

    expect(spec.transport).toEqual({
      kind: 'local'
    });
    expect(spec.envOverrides[PROVIDER_WORKER_HOST_ENV_KEY]).toBe('');
  });

  it('falls back to a local resume when the persisted worker_host is no longer configured', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        worker_host: 'worker-host-01'
      }),
      'utf8'
    );
    await writeFile(
      join(tempRoot, 'codex.orchestrator.json'),
      JSON.stringify({
        defaultPipeline: 'provider-linear-worker',
        pipelines: [
          {
            id: 'provider-linear-worker',
            title: 'Provider worker',
            metadata: {
              worker_hosts: {
                hosts: [
                  {
                    name: 'worker-host-02',
                    ssh_destination: 'codex@worker-host-02',
                    max_concurrent_agents: 1
                  }
                ]
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const providerWorkflowConfigStore = createProviderWorkflowConfigStore({
      env,
      runDir: join(tempRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });
    await providerWorkflowConfigStore.bootstrap();

    const spec = await resolveProviderResumeLaunchSpec(
      env,
      'run-child',
      providerWorkflowConfigStore
    );

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        [REPO_CONFIG_PATH_ENV_KEY]:
          join(
            tempRoot,
            '.runs',
            'local-mcp',
            'cli',
            'control-host',
            'provider-workflow.last-known-good.json'
          ),
        [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
        [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
        [PROVIDER_WORKER_HOST_ENV_KEY]: '',
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      },
      transport: {
        kind: 'local'
      }
    });
  });

  it('fails closed when an admitted remote resume degrades to local at launch time', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        worker_host: 'worker-host-01'
      }),
      'utf8'
    );
    await writeFile(
      join(tempRoot, 'codex.orchestrator.json'),
      JSON.stringify({
        defaultPipeline: 'provider-linear-worker',
        pipelines: [
          {
            id: 'provider-linear-worker',
            title: 'Provider worker',
            metadata: {
              worker_hosts: {
                hosts: [
                  {
                    name: 'worker-host-02',
                    ssh_destination: 'codex@worker-host-02',
                    max_concurrent_agents: 1
                  }
                ]
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const providerWorkflowConfigStore = createProviderWorkflowConfigStore({
      env,
      runDir: join(tempRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });
    await providerWorkflowConfigStore.bootstrap();

    const spec = await resolveProviderResumeLaunchSpec(
      env,
      'run-child',
      providerWorkflowConfigStore,
      'worker-host-01'
    );

    expect(spec.transport).toEqual({
      kind: 'local'
    });
    expect(() => assertResumeLaunchSpecMatchesAdmittedWorkerHost('worker-host-01', spec)).toThrow(
      'Admitted provider resume host "worker-host-01" resolved to local at launch time; retry under refreshed admission so the local safety cap is reapplied.'
    );
  });

  it('ignores a stale persisted proof worker_host when resuming a newer attempt', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        started_at: '2026-03-30T01:15:00.000Z',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-30T01:00:00.000Z',
        worker_host: 'worker-host-01'
      }),
      'utf8'
    );
    await writeFile(
      join(tempRoot, 'codex.orchestrator.json'),
      JSON.stringify({
        defaultPipeline: 'provider-linear-worker',
        pipelines: [
          {
            id: 'provider-linear-worker',
            title: 'Provider worker',
            metadata: {
              worker_hosts: {
                hosts: [
                  {
                    name: 'worker-host-01',
                    ssh_destination: 'codex@worker-host-01',
                    max_concurrent_agents: 1
                  }
                ]
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const providerWorkflowConfigStore = createProviderWorkflowConfigStore({
      env,
      runDir: join(tempRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });
    await providerWorkflowConfigStore.bootstrap();

    const spec = await resolveProviderResumeLaunchSpec(
      env,
      'run-child',
      providerWorkflowConfigStore
    );

    expect(spec.transport).toEqual({
      kind: 'local'
    });
    expect(spec.envOverrides[PROVIDER_WORKER_HOST_ENV_KEY]).toBe('');
  });

  it('prefers the persisted claim worker_host when stale proof metadata is unavailable', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        started_at: '2026-03-30T01:15:00.000Z',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-30T01:00:00.000Z',
        worker_host: 'worker-host-stale'
      }),
      'utf8'
    );
    await writeFile(
      join(tempRoot, 'codex.orchestrator.json'),
      JSON.stringify({
        defaultPipeline: 'provider-linear-worker',
        pipelines: [
          {
            id: 'provider-linear-worker',
            title: 'Provider worker',
            metadata: {
              worker_hosts: {
                hosts: [
                  {
                    name: 'worker-host-01',
                    ssh_destination: 'codex@worker-host-01',
                    max_concurrent_agents: 1
                  }
                ]
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const providerWorkflowConfigStore = createProviderWorkflowConfigStore({
      env,
      runDir: join(tempRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });
    await providerWorkflowConfigStore.bootstrap();

    const spec = await resolveProviderResumeLaunchSpec(
      env,
      'run-child',
      providerWorkflowConfigStore,
      'worker-host-01'
    );

    expect(spec.transport).toEqual({
      kind: 'ssh',
      host: {
        name: 'worker-host-01',
        transport: 'ssh',
        ssh_destination: 'codex@worker-host-01',
        ssh_options: [],
        max_concurrent_agents: 1,
        node_path: null
      }
    });
    expect(spec.envOverrides[PROVIDER_WORKER_HOST_ENV_KEY]).toBe('worker-host-01');
  });

  it('keeps legacy proof updated_at freshness when attempt_started_at is absent', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        started_at: '2026-03-30T01:15:00.000Z',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        updated_at: '2026-03-30T01:16:00.000Z',
        worker_host: 'worker-host-01'
      }),
      'utf8'
    );
    await writeFile(
      join(tempRoot, 'codex.orchestrator.json'),
      JSON.stringify({
        defaultPipeline: 'provider-linear-worker',
        pipelines: [
          {
            id: 'provider-linear-worker',
            title: 'Provider worker',
            metadata: {
              worker_hosts: {
                hosts: [
                  {
                    name: 'worker-host-01',
                    ssh_destination: 'codex@worker-host-01',
                    max_concurrent_agents: 1
                  }
                ]
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const providerWorkflowConfigStore = createProviderWorkflowConfigStore({
      env,
      runDir: join(tempRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });
    await providerWorkflowConfigStore.bootstrap();

    const spec = await resolveProviderResumeLaunchSpec(
      env,
      'run-child',
      providerWorkflowConfigStore
    );

    expect(spec.transport).toEqual({
      kind: 'ssh',
      host: {
        name: 'worker-host-01',
        transport: 'ssh',
        ssh_destination: 'codex@worker-host-01',
        ssh_options: [],
        max_concurrent_agents: 1,
        node_path: null
      }
    });
    expect(spec.envOverrides[PROVIDER_WORKER_HOST_ENV_KEY]).toBe('worker-host-01');
  });
});

describe('controlHostCliShell startup provider handoff bootstrap', () => {
  it('runs an immediate provider rehydrate during control-host startup', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    } satisfies ProviderIssueHandoffService;

    await rehydrateProviderIssueHandoffOnStartup(providerIssueHandoff);

    expect(providerIssueHandoff.rehydrate).toHaveBeenCalledTimes(1);
  });

  it('keeps startup non-blocking when the immediate provider rehydrate fails', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {
        throw new Error('rehydrate unavailable');
      }),
      refresh: vi.fn(async () => undefined)
    } satisfies ProviderIssueHandoffService;

    await expect(rehydrateProviderIssueHandoffOnStartup(providerIssueHandoff)).resolves.toBeUndefined();
    expect(providerIssueHandoff.rehydrate).toHaveBeenCalledTimes(1);
  });

  it('starts the immediate provider refresh without waiting for it to finish before startup can continue', async () => {
    let resolveRefresh: (() => void) | null = null;
    const publish = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(),
      refresh: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveRefresh = resolve;
          })
      )
    } satisfies ProviderIssueHandoffService;

    const startupRefresh = beginProviderIssueHandoffStartupRefresh(providerIssueHandoff, publish);

    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    let settled = false;
    void startupRefresh.then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(settled).toBe(false);
    expect(publish).not.toHaveBeenCalled();

    resolveRefresh?.();
    await startupRefresh;

    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('runs an immediate provider refresh during control-host startup', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(),
      refresh: vi.fn(async () => undefined)
    } satisfies ProviderIssueHandoffService;

    await refreshProviderIssueHandoffOnStartup(providerIssueHandoff);

    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps startup non-blocking when the immediate provider refresh fails', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(),
      refresh: vi.fn(async () => {
        throw new Error('linear unavailable');
      })
    } satisfies ProviderIssueHandoffService;

    await expect(refreshProviderIssueHandoffOnStartup(providerIssueHandoff)).resolves.toBeUndefined();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps injected startup refresh callbacks on the catch/finally path when they throw synchronously', async () => {
    const publish = vi.fn();
    const refreshProviderIssueHandoff = vi.fn(() => {
      throw new Error('sync refresh failure');
    });

    await expect(
      beginProviderIssueHandoffStartupRefresh(undefined, publish, refreshProviderIssueHandoff)
    ).resolves.toBeUndefined();

    expect(refreshProviderIssueHandoff).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('cancels the lifecycle-owned startup trigger before the injected startup refresh takes over', async () => {
    vi.useFakeTimers();
    try {
      const publish = vi.fn();
      const refreshProviderIssueHandoff = vi.fn(async () => undefined);
      const startupTrigger = setTimeout(() => {
        throw new Error('startup trigger should have been cancelled');
      }, 0);

      await beginProviderIssueHandoffStartupRefresh(
        undefined,
        publish,
        refreshProviderIssueHandoff,
        startupTrigger
      );
      await vi.runAllTimersAsync();

      expect(refreshProviderIssueHandoff).toHaveBeenCalledTimes(1);
      expect(publish).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
