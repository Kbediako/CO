import { describe, expect, it } from 'vitest';

import {
  buildControlHostSupervisionConfig,
  buildControlHostSupervisionPlist,
  evaluateControlHostSupervisionHealthPayload,
  parseControlHostSupervisionCsv,
  resolveDefaultControlHostSupervisionEntrypoint
} from '../src/cli/control/controlHostSupervision.js';
import { __test__ as controlHostSupervisionShellTest } from '../src/cli/controlHostSupervisionCliShell.js';

const {
  buildControlHostSupervisionStatusPayload,
  formatControlHostSupervisionStatus,
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
});
