import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS,
  buildControlHostSupervisionConfig,
  buildInitialControlHostSupervisionState,
  buildControlHostSupervisionPlist,
  evaluateControlHostSupervisionHealthPayload,
  parseControlHostSupervisionCsv,
  resolveControlHostSupervisionPaths,
  resolveDefaultControlHostSupervisionEntrypoint
} from '../src/cli/control/controlHostSupervision.js';
import { __test__ as controlHostSupervisionShellTest } from '../src/cli/controlHostSupervisionCliShell.js';

const {
  assertControlHostSupervisionInstallPaths,
  assertStoredControlHostSupervisionConfig,
  bootstrapLaunchctlPlist,
  buildNextControlHostSupervisionState,
  buildControlHostSupervisionStatusPayload,
  classifyControlHostSupervisionRollout,
  captureExistingControlHostSupervisionInstall,
  createSleepWaiter,
  createControlHostSupervisionChildEventPromises,
  ensureTrackedProcessTreeExited,
  formatControlHostSupervisionStatus,
  inspectControlHostSupervisionLaunchAgent,
  isIgnorableLaunchctlBootoutFailure,
  isRetryableLaunchctlBootstrapError,
  loadBootstrapEnvironment,
  parseNulDelimitedEnv,
  probeControlHostHealth,
  readFormatFlag,
  readStringFlag,
  readIntegerFlag,
  removeInstalledControlHostSupervisionArtifacts,
  resolveReportedSupervisedChildPid,
  restoreExistingControlHostSupervisionInstall,
  restartExistingControlHostSupervision,
  isTrackedSupervisedProcessGroup,
  rollbackFailedControlHostSupervisionInstall,
  resolveControlHostSupervisionProbeTimeoutMs,
  resolveControlHostSupervisionServiceTarget,
  terminateChildProcess,
  waitForProcessGroupToExitWithinTimeout,
  writeRuntimeStateWithCleanup
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

  it('keeps the legacy launch agent label as the default for install continuity', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });

    expect(config.label).toBe('com.kbediako.co.control-host');
    expect(config.paths.plistPath).toBe(
      '/Users/tester/Library/LaunchAgents/com.kbediako.co.control-host.plist'
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

  it('pins installs to the packaged bootstrap entrypoint when running from source', () => {
    expect(
      resolveDefaultControlHostSupervisionEntrypoint(
        '/repo/bin/codex-orchestrator.ts',
        '/package/root'
      )
    ).toBe('/package/root/bin/codex-orchestrator.js');
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

  it('treats missing polling state as healthy until restart_required is explicit', () => {
    expect(evaluateControlHostSupervisionHealthPayload({})).toEqual({
      healthy: true,
      reason: 'ok',
      message: 'co-status payload omitted polling state; treating it as healthy.'
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

  it('rejects supervision labels whose derived slug would be dot-only', () => {
    expect(() =>
      resolveControlHostSupervisionPaths({
        homeDir: '/Users/tester',
        label: '..'
      })
    ).toThrow('control-host supervision label may not resolve to "." or "..".');
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
      },
      launchAgent: {
        exists: true,
        program_arguments: [
          config.nodePath,
          config.cliEntrypoint,
          'control-host',
          'supervise',
          'run',
          '--config',
          config.paths.configPath
        ],
        working_directory: config.repoRoot,
        detected_program: config.nodePath,
        classification: 'managed_supervision'
      }
    });

    expect(payload.service.loaded).toBe(true);
    expect(payload.service.summary).toBe(`${serviceTarget} = {`);
    expect(payload.rollout).toEqual({
      mode: 'managed_supervision',
      migration_required: false,
      summary: 'LaunchAgent matches the stored managed supervision config.'
    });

    const rendered = formatControlHostSupervisionStatus(payload);
    expect(rendered).toContain('Control-host supervision: installed');
    expect(rendered).toContain('Rollout: managed_supervision');
    expect(rendered).toContain(`Service target: ${serviceTarget}`);
    expect(rendered).toContain(`CLI entrypoint: ${config.cliEntrypoint}`);
    expect(rendered).toContain('Supervised child pid: none recorded');
    expect(rendered).toContain('Last restart reason: restart_required');
    expect(rendered).toContain(`launchctl: ${serviceTarget} = {`);
  });

  it('detects the legacy shim LaunchAgent and marks migration as required', () => {
    const launchAgent = inspectControlHostSupervisionLaunchAgent(
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.kbediako.co.control-host</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/tester/.local/bin/co-control-host-supervisor.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/tester/Code/CO</string>
</dict>
</plist>`,
      null
    );

    expect(launchAgent).toEqual({
      exists: true,
      program_arguments: ['/Users/tester/.local/bin/co-control-host-supervisor.sh'],
      working_directory: '/Users/tester/Code/CO',
      detected_program: '/Users/tester/.local/bin/co-control-host-supervisor.sh',
      classification: 'legacy_shim'
    });
    expect(
      classifyControlHostSupervisionRollout({
        config: null,
        launchAgent,
        serviceLoaded: false
      })
    ).toEqual({
      mode: 'legacy_shim',
      migration_required: true,
      summary: 'LaunchAgent still targets the legacy shim wrapper.'
    });
  });

  it('preserves literal encoded plist entities when decoding string fields', () => {
    const launchAgent = inspectControlHostSupervisionLaunchAgent(
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>ProgramArguments</key>
  <array>
    <string>/tmp/&amp;lt;literal&amp;gt;.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/tmp/&amp;lt;literal&amp;gt;</string>
</dict>
</plist>`,
      null
    );

    expect(launchAgent.detected_program).toBe('/tmp/&lt;literal&gt;.js');
    expect(launchAgent.working_directory).toBe('/tmp/&lt;literal&gt;');
  });

  it('does not report managed rollout when launchctl does not confirm the service is loaded', () => {
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
      state: null,
      launchctl: {
        exitCode: 113,
        stdout: '',
        stderr: `Could not find service ${serviceTarget} in domain gui/501.`
      },
      launchAgent: {
        exists: true,
        program_arguments: [
          config.nodePath,
          config.cliEntrypoint,
          'control-host',
          'supervise',
          'run',
          '--config',
          config.paths.configPath
        ],
        working_directory: config.repoRoot,
        detected_program: config.nodePath,
        classification: 'managed_supervision'
      }
    });

    expect(payload.service.loaded).toBe(false);
    expect(payload.rollout).toEqual({
      mode: 'mixed',
      migration_required: true,
      summary:
        'Managed LaunchAgent plist exists, but launchctl does not report the managed service target as loaded.'
    });

    const rendered = formatControlHostSupervisionStatus(payload);
    expect(rendered).toContain('Rollout: mixed');
    expect(rendered).toContain('Migration required: yes');
    expect(rendered).toContain('launchctl loaded: no');
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
      assertControlHostSupervisionInstallPaths(
        config,
        async (path) => path !== config.shellPath,
        async () => true,
        async () => true,
        async () => true
      )
    ).rejects.toThrow(
      `Shell executable not found: ${config.shellPath}`
    );
  });

  it('requires node and shell install paths to be executable regular files', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async (path) => path !== config.nodePath,
        async () => true,
        async () => true
      )
    ).rejects.toThrow(`Node executable is not executable: ${config.nodePath}`);

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async (path) => path !== config.shellPath,
        async () => true,
        async () => true
      )
    ).rejects.toThrow(`Shell executable is not executable: ${config.shellPath}`);

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async () => true,
        async () => true,
        async (path) => path !== config.nodePath
      )
    ).rejects.toThrow(`Node executable is not a regular file: ${config.nodePath}`);

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async () => true,
        async () => true,
        async (path) => path !== config.shellPath
      )
    ).rejects.toThrow(`Shell executable is not a regular file: ${config.shellPath}`);
  });

  it('requires the control-host supervision entrypoint to be a regular file', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async () => true,
        async () => true,
        async (path) => path !== config.cliEntrypoint
      )
    ).rejects.toThrow(
      `Control-host supervision entrypoint is not a regular file: ${config.cliEntrypoint}`
    );
  });

  it('requires repo root to be an existing directory during install validation', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async () => true,
        async (path) => path !== config.repoRoot
      )
    ).rejects.toThrow(`Control-host supervision repo root is not a directory: ${config.repoRoot}`);
  });

  it('rejects malformed stored config payloads before using label or path fields', () => {
    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/invalid-config.json', {
        version: 1,
        paths: {}
      })
    ).toThrow(
      'Invalid control-host supervision config at /tmp/invalid-config.json: missing label.'
    );
  });

  it('rejects stored configs whose explicit config path is not the managed config path', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/copied-config.json', config)
    ).toThrow(
      `Invalid control-host supervision config at /tmp/copied-config.json: config path must match the managed path ${config.paths.configPath}.`
    );
  });

  it('rejects stored configs whose managed directories do not match the stored home and label', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    expect(() =>
      assertStoredControlHostSupervisionConfig(config.paths.configPath, {
        ...config,
        paths: {
          ...config.paths,
          supportDir: '/tmp/unmanaged-support'
        }
      })
    ).toThrow(
      `Invalid control-host supervision config at ${config.paths.configPath}: paths.supportDir must match the managed path ${config.paths.supportDir}.`
    );
  });

  it('rejects stored config timer and threshold values that exceed the runtime contract', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/invalid-config.json', {
        ...config,
        healthIntervalSeconds: 0
      })
    ).toThrow(
      'Invalid control-host supervision config at /tmp/invalid-config.json: invalid healthIntervalSeconds.'
    );

    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/invalid-config.json', {
        ...config,
        unhealthyThreshold: 0
      })
    ).toThrow(
      'Invalid control-host supervision config at /tmp/invalid-config.json: invalid unhealthyThreshold.'
    );

    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/invalid-config.json', {
        ...config,
        killTimeoutSeconds: CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS + 1
      })
    ).toThrow(
      `Invalid control-host supervision config at /tmp/invalid-config.json: killTimeoutSeconds must be <= ${CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS}.`
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

  it('restores an existing install instead of deleting it after a failed reinstall', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-restore-'));
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
    const bootstraps: string[][] = [];

    try {
      await mkdir(join(tempRoot, 'LaunchAgents'), { recursive: true });
      await mkdir(paths.supportDir, { recursive: true });
      await writeFile(paths.plistPath, '<plist>old</plist>', 'utf8');
      await writeFile(paths.configPath, '{"version":1,"label":"old"}\n', 'utf8');
      await writeFile(paths.statePath, '{"status":"running"}\n', 'utf8');

      const snapshot = await captureExistingControlHostSupervisionInstall(paths);
      expect(snapshot).not.toBeNull();

      await writeFile(paths.plistPath, '<plist>new</plist>', 'utf8');
      await writeFile(paths.configPath, '{"version":1,"label":"new"}\n', 'utf8');
      await writeFile(paths.statePath, '{"status":"failed"}\n', 'utf8');

      await restoreExistingControlHostSupervisionInstall(snapshot!, serviceTarget, {
        bootout: async (target) => {
          bootouts.push(target);
        },
        bootstrap: async (args) => {
          bootstraps.push(args);
        }
      });

      expect(bootouts).toEqual([serviceTarget]);
      expect(bootstraps).toEqual([
        ['bootstrap', `gui/${process.getuid?.()}`, paths.plistPath]
      ]);
      await expect(readFile(paths.plistPath, 'utf8')).resolves.toBe('<plist>old</plist>');
      await expect(readFile(paths.configPath, 'utf8')).resolves.toBe(
        '{"version":1,"label":"old"}\n'
      );
      await expect(readFile(paths.statePath, 'utf8')).resolves.toBe(
        '{"status":"running"}\n'
      );
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
        {
          label: 'com.example.control-host',
          paths: managedPaths
        },
        {
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

  it('uninstall cleanup uses the resolved install paths instead of recomputing from HOME', async () => {
    const installedHome = await mkdtemp(join(tmpdir(), 'co-supervision-installed-home-'));
    const currentHome = await mkdtemp(join(tmpdir(), 'co-supervision-current-home-'));
    const bootouts: string[] = [];
    const installedPaths = resolveControlHostSupervisionPaths({
      homeDir: installedHome,
      label: 'com.example.control-host'
    });
    const currentHomePaths = resolveControlHostSupervisionPaths({
      homeDir: currentHome,
      label: 'com.example.control-host'
    });

    try {
      await mkdir(join(installedHome, 'Library', 'LaunchAgents'), { recursive: true });
      await mkdir(installedPaths.supportDir, { recursive: true });
      await mkdir(installedPaths.logsDir, { recursive: true });
      await writeFile(installedPaths.plistPath, '<plist/>', 'utf8');
      await writeFile(installedPaths.configPath, '{}', 'utf8');
      await writeFile(installedPaths.statePath, '{}', 'utf8');
      await writeFile(installedPaths.stdoutLogPath, '', 'utf8');
      await writeFile(installedPaths.stderrLogPath, '', 'utf8');

      await mkdir(join(currentHome, 'Library', 'LaunchAgents'), { recursive: true });
      await mkdir(currentHomePaths.supportDir, { recursive: true });
      await mkdir(currentHomePaths.logsDir, { recursive: true });
      await writeFile(currentHomePaths.plistPath, '<plist/>', 'utf8');
      await writeFile(currentHomePaths.configPath, '{}', 'utf8');
      await writeFile(currentHomePaths.statePath, '{}', 'utf8');
      await writeFile(currentHomePaths.stdoutLogPath, '', 'utf8');
      await writeFile(currentHomePaths.stderrLogPath, '', 'utf8');

      const removedPaths = await removeInstalledControlHostSupervisionArtifacts(
        {
          label: 'com.example.control-host',
          paths: installedPaths
        },
        {
          bootout: async (target) => {
            bootouts.push(target);
          }
        }
      );

      expect(removedPaths).toEqual(installedPaths);
      expect(bootouts).toEqual([
        resolveControlHostSupervisionServiceTarget('com.example.control-host')
      ]);
      await expect(stat(installedPaths.plistPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(installedPaths.supportDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(installedPaths.logsDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(currentHomePaths.plistPath)).resolves.toBeTruthy();
      await expect(stat(currentHomePaths.supportDir)).resolves.toBeTruthy();
      await expect(stat(currentHomePaths.logsDir)).resolves.toBeTruthy();
    } finally {
      await rm(installedHome, { recursive: true, force: true });
      await rm(currentHome, { recursive: true, force: true });
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

  it('bounds bootstrap env sourcing timeouts and surfaces timeout errors', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-bootstrap-timeout-'));
    const envFile = join(tempRoot, 'provider.env');
    await writeFile(envFile, 'CONTROL_HOST_MODE=managed\n', 'utf8');

    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      envFiles: [envFile],
      healthIntervalSeconds: 5
    });
    let observedTimeoutMs: number | undefined;

    try {
      await expect(
        loadBootstrapEnvironment(
          config,
          async (
            _command: string,
            _args: string[],
            options?: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
          ) => {
            observedTimeoutMs = options?.timeoutMs;
            return {
              exitCode: 1,
              stdout: Buffer.alloc(0),
              stderr: Buffer.from('command timed out after 5000ms', 'utf8'),
              timedOut: true
            };
          }
        )
      ).rejects.toThrow(
        'Timed out while sourcing control-host supervision env/bootstrap files after 5s.'
      );
      expect(observedTimeoutMs).toBe(resolveControlHostSupervisionProbeTimeoutMs(5));
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
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

  it('retries transient launchctl bootstrap input-output failures', async () => {
    const bootstrap = vi
      .fn(async () => undefined)
      .mockRejectedValueOnce(
        new Error(
          'launchctl bootstrap gui/501 /tmp/com.example.control-host.plist failed: Bootstrap failed: 5: Input/output error'
        )
      );
    const sleep = vi.fn(async () => undefined);

    await bootstrapLaunchctlPlist('/tmp/com.example.control-host.plist', {
      bootstrap,
      sleep
    });

    expect(bootstrap).toHaveBeenCalledTimes(2);
    expect(bootstrap).toHaveBeenNthCalledWith(1, [
      'bootstrap',
      `gui/${process.getuid?.()}`,
      '/tmp/com.example.control-host.plist'
    ]);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it('does not retry non-transient launchctl bootstrap failures', async () => {
    const bootstrapError = new Error(
      'launchctl bootstrap gui/501 /tmp/com.example.control-host.plist failed: Bootstrap failed: 37: Operation already in progress'
    );
    const bootstrap = vi.fn(async () => {
      throw bootstrapError;
    });
    const sleep = vi.fn(async () => undefined);

    await expect(
      bootstrapLaunchctlPlist('/tmp/com.example.control-host.plist', {
        bootstrap,
        sleep
      })
    ).rejects.toThrow(bootstrapError.message);

    expect(bootstrap).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(isRetryableLaunchctlBootstrapError(bootstrapError)).toBe(false);
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

  it('terminates the spawned child when post-spawn state persistence fails', async () => {
    const child = Object.assign(new EventEmitter(), {
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        queueMicrotask(() => {
          child.exitCode = signal === 'SIGTERM' ? 0 : child.exitCode;
          child.signalCode = signal;
          child.emit('exit', child.exitCode, signal);
        });
        return true;
      })
    });
    const writeError = new Error('state write failed');

    await expect(
      writeRuntimeStateWithCleanup(child as never, 1, async () => {
        throw writeError;
      })
    ).rejects.toBe(writeError);
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('waits for the prior supervised child pid before reporting restart success', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const priorState = buildInitialControlHostSupervisionState({
      config,
      serviceTarget,
      updatedAt: '2026-04-12T14:54:00.000Z'
    });
    priorState.child_pid = 4200;
    const nextState = {
      ...priorState,
      updated_at: '2026-04-12T14:54:10.000Z',
      child_pid: 4300
    };
    const readState = vi
      .fn<(_: string) => Promise<typeof priorState | null>>()
      .mockResolvedValueOnce(priorState)
      .mockResolvedValueOnce(nextState);
    const kickstart = vi.fn(async () => undefined);
    const readProcessCommand = vi.fn(async (pid: number) =>
      pid === 4300
        ? '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
        : null
    );
    const ensureTrackedProcessTreeExitedStub = vi.fn(async () => ({
      result: 'exited_after_kickstart' as const,
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    }));

    const restart = await restartExistingControlHostSupervision(
      {
        label: config.label,
        paths: config.paths,
        config
      },
      serviceTarget,
      {
        kickstart,
        readState,
        ensureTrackedProcessTreeExited: ensureTrackedProcessTreeExitedStub,
        readProcessCommand
      }
    );

    expect(kickstart).toHaveBeenCalledWith(serviceTarget);
    expect(ensureTrackedProcessTreeExitedStub).toHaveBeenCalledWith(
      4200,
      config.killTimeoutSeconds,
      expect.objectContaining({
        shouldForceKillTrackedProcessGroup: expect.any(Function)
      })
    );
    expect(readProcessCommand).toHaveBeenCalledWith(4300);
    expect(restart).toEqual({
      previousChildPid: 4200,
      childPid: 4300,
      cleanup: {
        result: 'exited_after_kickstart',
        orphanedProcessGroupPids: [],
        orphanedDescendantPids: []
      }
    });
  });

  it('force-cleans a previously tracked supervised child tree when it survives kickstart', async () => {
    const listProcessGroupPids = vi
      .fn()
      .mockResolvedValueOnce([4200, 4201, 4202])
      .mockResolvedValueOnce([4200, 4201, 4202])
      .mockResolvedValueOnce([]);
    const listDescendantPids = vi.fn().mockResolvedValue([4201, 4202]);
    const killProcessGroup = vi.fn();

    const cleanup = await ensureTrackedProcessTreeExited(4200, 0, {
      listProcessGroupPids,
      listDescendantPids,
      killProcessGroup
    });

    expect(cleanup).toEqual({
      result: 'force_killed',
      orphanedProcessGroupPids: [4200, 4201, 4202],
      orphanedDescendantPids: [4201, 4202]
    });
    expect(killProcessGroup).toHaveBeenCalledWith(4200, 'SIGKILL');
  });

  it('skips forced cleanup when the tracked pid no longer matches the supervised control-host identity', async () => {
    const listProcessGroupPids = vi.fn().mockResolvedValue([4200]);
    const shouldForceKillTrackedProcessGroup = vi.fn().mockResolvedValue(false);
    const killProcessGroup = vi.fn();

    const cleanup = await ensureTrackedProcessTreeExited(4200, 0, {
      listProcessGroupPids,
      shouldForceKillTrackedProcessGroup,
      killProcessGroup
    });

    expect(cleanup).toEqual({
      result: 'exited_after_kickstart',
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    });
    expect(shouldForceKillTrackedProcessGroup).toHaveBeenCalledWith(4200);
    expect(killProcessGroup).not.toHaveBeenCalled();
  });

  it('requires the expected supervised control-host command before allowing force cleanup', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline'
    });

    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        readProcessCommand: async () =>
          '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
      })
    ).resolves.toBe(true);
    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        readProcessCommand: async () => '/usr/bin/python3 unrelated.py'
      })
    ).resolves.toBe(false);
    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        readProcessCommand: async () => null
      })
    ).resolves.toBe(false);
  });

  it('does not report a new supervised child pid until the state advances to a verified process', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const previousState = buildInitialControlHostSupervisionState({
      config,
      serviceTarget,
      updatedAt: '2026-04-12T14:54:00.000Z'
    });
    previousState.child_pid = 4200;

    await expect(
      resolveReportedSupervisedChildPid(
        {
          ...previousState
        },
        previousState,
        config,
        {
          readProcessCommand: async () =>
            '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
        }
      )
    ).resolves.toBeNull();

    await expect(
      resolveReportedSupervisedChildPid(
        {
          ...previousState,
          updated_at: '2026-04-12T14:54:10.000Z',
          child_pid: 4300
        },
        previousState,
        config,
        {
          readProcessCommand: async () =>
            '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
        }
      )
    ).resolves.toBe(4300);
  });

  it('kills the detached process group before escalating the wrapper after a timeout', async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4200,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        if (signal === 'SIGKILL') {
          queueMicrotask(() => {
            child.signalCode = signal;
            child.emit('exit', null, signal);
          });
        }
        return true;
      })
    });
    const listProcessGroupPids = vi.fn().mockResolvedValue([4200, 4201, 4202]);
    const killProcessGroup = vi.fn();
    const listDescendantPids = vi.fn().mockResolvedValue([4201, 4202]);
    const killProcess = vi.fn();

    await terminateChildProcess(child as never, 0, {
      listProcessGroupPids,
      killProcessGroup,
      listDescendantPids,
      killProcess
    });

    expect(listProcessGroupPids).toHaveBeenCalledWith(4200);
    expect(killProcessGroup).toHaveBeenCalledWith(4200, 'SIGKILL');
    expect(listDescendantPids).toHaveBeenCalledWith(4200);
    expect(killProcess).toHaveBeenNthCalledWith(1, 4201, 'SIGKILL');
    expect(killProcess).toHaveBeenNthCalledWith(2, 4202, 'SIGKILL');
    expect(child.kill).toHaveBeenNthCalledWith(1, 'SIGTERM');
    expect(child.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');
  });

  it('stops polling detached process groups once timeout cleanup returns', async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4200,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        if (signal === 'SIGKILL') {
          queueMicrotask(() => {
            child.signalCode = signal;
            child.emit('exit', null, signal);
          });
        }
        return true;
      })
    });
    const listProcessGroupPids = vi.fn().mockResolvedValue([4200, 4201]);

    await terminateChildProcess(child as never, 0, {
      listProcessGroupPids,
      listDescendantPids: vi.fn().mockResolvedValue([])
    });

    expect(listProcessGroupPids).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(listProcessGroupPids).toHaveBeenCalledTimes(1);
  });

  it('kills the detached process group even when the wrapper exits before the timeout escalation', async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4200,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        if (signal === 'SIGTERM') {
          queueMicrotask(() => {
            child.exitCode = 0;
            child.signalCode = signal;
            child.emit('exit', 0, signal);
          });
        }
        return true;
      })
    });
    let processGroupKilled = false;
    const listProcessGroupPids = vi.fn(async () => (processGroupKilled ? [] : [4202]));
    const killProcessGroup = vi.fn(() => {
      processGroupKilled = true;
    });
    const listDescendantPids = vi.fn();

    await terminateChildProcess(child as never, 0, {
      listProcessGroupPids,
      killProcessGroup,
      listDescendantPids
    });

    expect(killProcessGroup).toHaveBeenCalledWith(4200, 'SIGKILL');
    expect(listDescendantPids).not.toHaveBeenCalled();
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('treats process-group lookup failures as pending until timeout escalation runs', async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4200,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        if (signal === 'SIGKILL') {
          queueMicrotask(() => {
            child.signalCode = signal;
            child.emit('exit', null, signal);
          });
        }
        return true;
      })
    });
    const listProcessGroupPids = vi.fn().mockRejectedValue(new Error('ps failed'));
    const killProcessGroup = vi.fn();

    await expect(
      terminateChildProcess(child as never, 0, {
        listProcessGroupPids,
        killProcessGroup,
        listDescendantPids: vi.fn().mockResolvedValue([])
      })
    ).resolves.toBeUndefined();

    expect(listProcessGroupPids).toHaveBeenCalledWith(4200);
    expect(killProcessGroup).toHaveBeenCalledWith(4200, 'SIGKILL');
    expect(child.kill).toHaveBeenNthCalledWith(1, 'SIGTERM');
    expect(child.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');
  });

  it('disposes sleep waiters before the tick fires', async () => {
    const waiter = createSleepWaiter(25);
    waiter.dispose();

    const outcome = await Promise.race([
      waiter.promise.then(() => 'tick'),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('pending'), 50);
      })
    ]);

    expect(outcome).toBe('pending');
  });

  it('treats process-group exit as complete when the group disappears before the timeout', async () => {
    const listProcessGroupPids = vi.fn().mockResolvedValue([]);

    await expect(
      waitForProcessGroupToExitWithinTimeout(4200, 0, {
        listProcessGroupPids
      })
    ).resolves.toBe(true);

    expect(listProcessGroupPids).toHaveBeenCalledWith(4200);
  });
});
