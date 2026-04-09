import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildControlHostSupervisionConfig,
  buildControlHostSupervisionPlist,
  evaluateControlHostSupervisionHealthPayload,
  parseControlHostSupervisionCsv,
  resolveControlHostSupervisionPaths,
  resolveDefaultControlHostSupervisionEntrypoint
} from '../src/cli/control/controlHostSupervision.js';
import { __test__ as controlHostSupervisionShellTest } from '../src/cli/controlHostSupervisionCliShell.js';

const {
  assertControlHostSupervisionInstallPaths,
  buildNextControlHostSupervisionState,
  buildControlHostSupervisionStatusPayload,
  createControlHostSupervisionChildEventPromises,
  formatControlHostSupervisionStatus,
  isIgnorableLaunchctlBootoutFailure,
  parseNulDelimitedEnv,
  probeControlHostHealth,
  readFormatFlag,
  readStringFlag,
  readIntegerFlag,
  removeInstalledControlHostSupervisionArtifacts,
  rollbackFailedControlHostSupervisionInstall,
  resolveControlHostSupervisionProbeTimeoutMs,
  resolveControlHostSupervisionServiceTarget
} = controlHostSupervisionShellTest;

describe('controlHostSupervision helpers', () => {
  it('builds a configurable supervision config without host-local hard-coded paths', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline',
      healthIntervalSeconds: 45,
      unhealthyThreshold: 5,
      envFiles: ['/env/one', '/env/two'],
      shellPath: '/bin/zsh'
    });

    expect(config.label).toBe('com.example.control-host');
    expect(config.repoRoot).toBe('/repo/CO');
    expect(config.nodePath).toBe('/custom/node');
    expect(config.cliEntrypoint).toBe('/opt/codex-orchestrator.js');
    expect(config.taskId).toBe('custom-task');
    expect(config.runId).toBe('custom-run');
    expect(config.pipelineId).toBe('custom-pipeline');
    expect(config.healthIntervalSeconds).toBe(45);
    expect(config.unhealthyThreshold).toBe(5);
    expect(config.envFiles).toEqual(['/env/one', '/env/two']);
    expect(config.paths.plistPath).toBe(
      '/Users/tester/Library/LaunchAgents/com.example.control-host.plist'
    );
  });

  it('renders a launchd plist that runs the packaged supervise runner', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });

    const plist = buildControlHostSupervisionPlist(config);

    expect(plist).toContain('<key>ProgramArguments</key>');
    expect(plist).toContain('<string>/custom/node</string>');
    expect(plist).toContain('<string>/opt/codex-orchestrator.js</string>');
    expect(plist).toContain('<string>control-host</string>');
    expect(plist).toContain('<string>supervise</string>');
    expect(plist).toContain('<string>run</string>');
    expect(plist).toContain(`<string>${config.paths.configPath}</string>`);
    expect(plist).toContain('<key>ThrottleInterval</key>');
  });

  it('falls back to the package dist entrypoint when the current argv entry is not js', () => {
    expect(
      resolveDefaultControlHostSupervisionEntrypoint(
        '/repo/bin/codex-orchestrator.ts',
        '/package/root'
      )
    ).toBe('/package/root/dist/bin/codex-orchestrator.js');
  });

  it('treats restart_required health payloads as unhealthy', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload({
        polling: {
          restart_required: true
        }
      })
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('parses env file csv values and the none sentinel', () => {
    expect(parseControlHostSupervisionCsv('/env/one, /env/two')).toEqual([
      '/env/one',
      '/env/two'
    ]);
    expect(parseControlHostSupervisionCsv('none')).toEqual([]);
    expect(parseControlHostSupervisionCsv('-')).toEqual([]);
    expect(parseControlHostSupervisionCsv('   ')).toBeNull();
  });

  it('rejects supervision labels that contain path separators', () => {
    expect(() =>
      resolveControlHostSupervisionPaths({
        homeDir: '/Users/tester',
        label: '../../../tmp/agent'
      })
    ).toThrow(
      'control-host supervision label may only contain letters, numbers, dots, underscores, and hyphens.'
    );
  });

  it('rejects blank env file entries before resolving paths', () => {
    expect(() =>
      buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: '/repo/workspace',
        envFiles: ['   ']
      })
    ).toThrow('env file entry at index 0 must be non-empty.');
  });

  it('rejects timer-backed settings that exceed Node timeout limits', () => {
    const tooLarge = 2_147_484;

    expect(() =>
      buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: '/repo/workspace',
        healthIntervalSeconds: tooLarge
      })
    ).toThrow('health interval must be <= 2147483 seconds to stay within Node timer limits.');
    expect(() =>
      buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: '/repo/workspace',
        killTimeoutSeconds: tooLarge
      })
    ).toThrow('kill timeout must be <= 2147483 seconds to stay within Node timer limits.');
  });
});

describe('controlHostSupervision shell helpers', () => {
  it('formats status output with launchctl summary and restart reason', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const payload = buildControlHostSupervisionStatusPayload({
      resolved: {
        label: config.label,
        paths: config.paths,
        config
      },
      serviceTarget,
      state: {
        version: 1,
        status: 'restart_required',
        updated_at: '2026-04-09T09:00:00.000Z',
        label: config.label,
        repo_root: config.repoRoot,
        service_target: serviceTarget,
        child_pid: null,
        last_started_at: '2026-04-09T08:30:00.000Z',
        last_exit_at: '2026-04-09T09:00:00.000Z',
        last_exit_code: 75,
        last_signal: null,
        last_health_check_at: '2026-04-09T08:59:30.000Z',
        last_health_status: 'restart_required',
        consecutive_unhealthy_samples: 3,
        restart_count: 2,
        unhealthy_threshold: 3,
        health_interval_seconds: 30,
        last_restart_reason: 'restart_required',
        last_restart_requested_at: '2026-04-09T09:00:00.000Z',
        message: 'launchd restart requested'
      },
      launchctl: {
        exitCode: 0,
        stdout: `${serviceTarget} = {\n\tactive count = 1\n}\n`,
        stderr: ''
      }
    });

    expect(payload.service.loaded).toBe(true);
    expect(payload.service.summary).toBe(`${serviceTarget} = {`);

    const rendered = formatControlHostSupervisionStatus(payload);
    expect(rendered).toContain('Control-host supervision: installed');
    expect(rendered).toContain(`Service target: ${serviceTarget}`);
    expect(rendered).toContain('Last restart reason: restart_required');
    expect(rendered).toContain(`launchctl: ${serviceTarget} = {`);
  });

  it('rejects integer flags with non-numeric suffixes', () => {
    expect(() => readIntegerFlag({ 'health-interval': '30s' }, 'health-interval')).toThrow(
      '--health-interval must be an integer.'
    );
    expect(() => readIntegerFlag({ 'kill-timeout': '1.5' }, 'kill-timeout')).toThrow(
      '--kill-timeout must be an integer.'
    );
    expect(() => readIntegerFlag({ 'health-interval': true }, 'health-interval')).toThrow(
      '--health-interval requires a value.'
    );
    expect(readIntegerFlag({ 'unhealthy-threshold': '30' }, 'unhealthy-threshold')).toBe(30);
  });

  it('rejects unsupported format values', () => {
    expect(readFormatFlag({ format: 'json' })).toBe('json');
    expect(readFormatFlag({ format: 'text' })).toBe('text');
    expect(() => readFormatFlag({ format: 'yaml' })).toThrow(
      '--format must be either "text" or "json".'
    );
  });

  it('rejects valueless string flags instead of silently falling back to defaults', () => {
    expect(() => readStringFlag({ label: true }, 'label')).toThrow('--label requires a value.');
    expect(() => readStringFlag({ label: '   ' }, 'label')).toThrow(
      '--label requires a value.'
    );
  });

  it('validates the configured shell path during install-time path checks', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/missing/shell'
    });

    await expect(
      assertControlHostSupervisionInstallPaths(config, async (path) => path !== config.shellPath)
    ).rejects.toThrow(
      `Shell executable not found: ${config.shellPath}`
    );
  });

  it('rolls back generated install artifacts when launchd registration fails', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-rollback-'));
    const paths = {
      supportDir: join(tempRoot, 'support'),
      configPath: join(tempRoot, 'support', 'config.json'),
      statePath: join(tempRoot, 'support', 'state.json'),
      plistPath: join(tempRoot, 'LaunchAgents', 'com.example.control-host.plist'),
      logsDir: join(tempRoot, 'logs'),
      stdoutLogPath: join(tempRoot, 'logs', 'stdout.log'),
      stderrLogPath: join(tempRoot, 'logs', 'stderr.log')
    };
    const serviceTarget = resolveControlHostSupervisionServiceTarget(
      'com.example.control-host'
    );
    const bootouts: string[] = [];

    try {
      await mkdir(join(tempRoot, 'LaunchAgents'), { recursive: true });
      await mkdir(paths.supportDir, { recursive: true });
      await mkdir(paths.logsDir, { recursive: true });
      await writeFile(paths.plistPath, '<plist/>', 'utf8');
      await writeFile(paths.configPath, '{}', 'utf8');
      await writeFile(paths.statePath, '{}', 'utf8');
      await writeFile(paths.stdoutLogPath, '', 'utf8');
      await writeFile(paths.stderrLogPath, '', 'utf8');

      await rollbackFailedControlHostSupervisionInstall(paths, serviceTarget, {
        bootout: async (target) => {
          bootouts.push(target);
        }
      });

      expect(bootouts).toEqual([serviceTarget]);
      await expect(stat(paths.plistPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(paths.supportDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(paths.logsDir)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uninstall cleanup only removes managed supervision directories for the current home', async () => {
    const homeDir = await mkdtemp(join(tmpdir(), 'co-supervision-managed-home-'));
    const managedPaths = resolveControlHostSupervisionPaths({
      homeDir,
      label: 'com.example.control-host'
    });
    const tamperedRoot = await mkdtemp(join(tmpdir(), 'co-supervision-tampered-'));
    const tamperedPath = join(tamperedRoot, 'keep-me');
    const bootouts: string[] = [];

    try {
      await mkdir(join(homeDir, 'Library', 'LaunchAgents'), { recursive: true });
      await mkdir(managedPaths.supportDir, { recursive: true });
      await mkdir(managedPaths.logsDir, { recursive: true });
      await writeFile(managedPaths.plistPath, '<plist/>', 'utf8');
      await writeFile(managedPaths.configPath, '{}', 'utf8');
      await writeFile(managedPaths.statePath, '{}', 'utf8');
      await writeFile(managedPaths.stdoutLogPath, '', 'utf8');
      await writeFile(managedPaths.stderrLogPath, '', 'utf8');

      await mkdir(tamperedPath, { recursive: true });
      await writeFile(join(tamperedPath, 'sentinel.txt'), 'keep', 'utf8');

      const removedPaths = await removeInstalledControlHostSupervisionArtifacts(
        'com.example.control-host',
        {
          homeDir,
          bootout: async (target) => {
            bootouts.push(target);
          }
        }
      );

      expect(removedPaths).toEqual(managedPaths);
      expect(bootouts).toEqual([
        resolveControlHostSupervisionServiceTarget('com.example.control-host')
      ]);
      await expect(stat(managedPaths.plistPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(managedPaths.supportDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(managedPaths.logsDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(tamperedPath)).resolves.toBeTruthy();
    } finally {
      await rm(homeDir, { recursive: true, force: true });
      await rm(tamperedRoot, { recursive: true, force: true });
    }
  });

  it('bounds co-status probe timeouts and surfaces timeout health state', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      healthIntervalSeconds: 5
    });
    let observedTimeoutMs: number | undefined;

    const result = await probeControlHostHealth(
      config,
      {},
      async (
        _command: string,
        _args: string[],
        options?: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
      ) => {
        observedTimeoutMs = options?.timeoutMs;
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        };
      }
    );

    expect(observedTimeoutMs).toBe(resolveControlHostSupervisionProbeTimeoutMs(5));
    expect(result).toEqual({
      healthy: false,
      reason: 'probe_timeout',
      message: 'co-status probe timed out after 5s.'
    });
  });

  it('ignores only missing-service launchctl bootout failures', () => {
    expect(
      isIgnorableLaunchctlBootoutFailure({
        exitCode: 3,
        stdout: '',
        stderr: 'Boot-out failed: 3: No such process'
      })
    ).toBe(true);
    expect(
      isIgnorableLaunchctlBootoutFailure({
        exitCode: 113,
        stdout: '',
        stderr: 'Could not find service "gui/501/com.example.control-host" in domain for system'
      })
    ).toBe(true);
    expect(
      isIgnorableLaunchctlBootoutFailure({
        exitCode: 1,
        stdout: '',
        stderr: 'Boot-out failed: 1: Operation not permitted'
      })
    ).toBe(false);
  });

  it('clears stale exit and health fields when a new child run starts', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);

    const nextState = buildNextControlHostSupervisionState({
      priorState: {
        version: 1,
        status: 'restart_required',
        updated_at: '2026-04-09T09:00:00.000Z',
        label: config.label,
        repo_root: config.repoRoot,
        service_target: serviceTarget,
        child_pid: null,
        last_started_at: '2026-04-09T08:30:00.000Z',
        last_exit_at: '2026-04-09T09:00:00.000Z',
        last_exit_code: 75,
        last_signal: 'SIGTERM',
        last_health_check_at: '2026-04-09T08:59:30.000Z',
        last_health_status: 'restart_required',
        consecutive_unhealthy_samples: 3,
        restart_count: 2,
        unhealthy_threshold: 3,
        health_interval_seconds: 30,
        last_restart_reason: 'restart_required',
        last_restart_requested_at: '2026-04-09T09:00:00.000Z',
        message: 'launchd restart requested'
      },
      update: {
        status: 'running',
        updated_at: '2026-04-09T09:01:00.000Z',
        child_pid: 1234,
        last_started_at: '2026-04-09T09:01:00.000Z',
        message: 'control-host supervision runner started.'
      },
      config,
      serviceTarget
    });

    expect(nextState.status).toBe('running');
    expect(nextState.child_pid).toBe(1234);
    expect(nextState.last_exit_at).toBeNull();
    expect(nextState.last_exit_code).toBeNull();
    expect(nextState.last_signal).toBeNull();
    expect(nextState.last_health_check_at).toBeNull();
    expect(nextState.last_health_status).toBeNull();
    expect(nextState.consecutive_unhealthy_samples).toBe(0);
    expect(nextState.last_restart_reason).toBe('restart_required');
  });

  it('parses shell env output without restoring variables that were unset during bootstrap', () => {
    const parsed = parseNulDelimitedEnv(
      Buffer.from('HOME=/Users/tester\u0000PATH=/usr/bin\u0000CONTROL_HOST_MODE=managed\u0000', 'utf8')
    );

    expect(parsed).toEqual({
      HOME: '/Users/tester',
      PATH: '/usr/bin',
      CONTROL_HOST_MODE: 'managed'
    });
    expect(parsed.OPENAI_API_KEY).toBeUndefined();
  });

  it('keeps child error handling reachable when spawn fails before exit', async () => {
    const child = new EventEmitter();
    const spawnError = new Error('spawn failed');
    const { childExitPromise, childErrorPromise } =
      createControlHostSupervisionChildEventPromises(child);

    child.emit('error', spawnError);

    const exitOutcome = await Promise.race([
      childExitPromise.then(
        () => 'exit',
        (error) => `rejected:${(error as Error).message}`
      ),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('pending'), 0);
      })
    ]);

    expect(exitOutcome).toBe('pending');
    await expect(childErrorPromise).resolves.toEqual({
      type: 'child_error',
      error: spawnError
    });
  });
});
