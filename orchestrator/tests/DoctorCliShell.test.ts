import { afterEach, describe, expect, it, vi } from 'vitest';

import { runDoctorCliShell } from '../src/cli/doctorCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runDoctorCliShell', () => {
  it('emits the merged doctor payload in json mode', async () => {
    const log = vi.fn();
    const runDoctorMock = vi.fn<typeof import('../src/cli/doctor.js').runDoctor>().mockReturnValue({
      status: 'ok'
    } as never);
    const runDoctorUsageMock = vi.fn<typeof import('../src/cli/doctorUsage.js').runDoctorUsage>().mockResolvedValue({
      sampled_runs: 2
    } as never);
    const runDoctorCloudPreflightMock =
      vi.fn<typeof import('../src/cli/doctor.js').runDoctorCloudPreflight>().mockResolvedValue({
        ok: false,
        issues: [{ code: 'missing_environment' }]
      } as never);
    const writeDoctorIssueLogMock =
      vi.fn<typeof import('../src/cli/doctorIssueLog.js').writeDoctorIssueLog>().mockResolvedValue({
        issue_log_path: '/tmp/doctor-issue.md'
      } as never);

    await runDoctorCliShell(
      {
        format: 'json',
        includeUsage: true,
        includeCloudPreflight: true,
        includeIssueLog: true,
        cloudEnvIdOverride: 'env_123',
        cloudBranchOverride: 'main',
        issueTitle: 'Doctor issue',
        issueNotes: 'Collected during tests.',
        issueLogPath: '/tmp/doctor-issue.md',
        wantsApply: false,
        apply: false,
        windowDays: 30,
        taskFilter: 'task-1251',
        repoRoot: '/tmp/repo'
      },
      {
        runDoctor: runDoctorMock,
        runDoctorUsage: runDoctorUsageMock,
        runDoctorCloudPreflight: runDoctorCloudPreflightMock,
        writeDoctorIssueLog: writeDoctorIssueLogMock,
        log
      }
    );

    expect(runDoctorMock).toHaveBeenCalledWith('/tmp/repo');
    expect(runDoctorUsageMock).toHaveBeenCalledWith({ windowDays: 30, taskFilter: 'task-1251' });
    expect(runDoctorCloudPreflightMock).toHaveBeenCalledWith({
      cwd: '/tmp/repo',
      environmentId: 'env_123',
      branch: 'main',
      taskId: 'task-1251'
    });
    expect(writeDoctorIssueLogMock).toHaveBeenCalledWith({
      doctor: { status: 'ok' },
      usage: { sampled_runs: 2 },
      cloudPreflight: { ok: false, issues: [{ code: 'missing_environment' }] },
      issueTitle: 'Doctor issue',
      issueNotes: 'Collected during tests.',
      issueLogPath: '/tmp/doctor-issue.md',
      taskFilter: 'task-1251'
    });

    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      status?: string;
      usage?: { sampled_runs?: number };
      cloud_preflight?: { ok?: boolean };
      issue_log?: { issue_log_path?: string };
    };
    expect(payload.status).toBe('ok');
    expect(payload.usage?.sampled_runs).toBe(2);
    expect(payload.cloud_preflight?.ok).toBe(false);
    expect(payload.issue_log?.issue_log_path).toBe('/tmp/doctor-issue.md');
  });

  it('applies the needed fixes, skips invalid devtools config apply, and reruns doctor', async () => {
    const log = vi.fn();
    const runDoctorMock = vi.fn<typeof import('../src/cli/doctor.js').runDoctor>();
    runDoctorMock
      .mockReturnValueOnce({ phase: 'before' } as never)
      .mockReturnValueOnce({ phase: 'after' } as never);
    const runDelegationSetupMock = vi.fn<typeof import('../src/cli/delegationSetup.js').runDelegationSetup>();
    runDelegationSetupMock
      .mockResolvedValueOnce({ readiness: { configured: false } } as never)
      .mockResolvedValueOnce({ status: 'applied' } as never);
    const runDevtoolsSetupMock = vi.fn<typeof import('../src/cli/devtoolsSetup.js').runDevtoolsSetup>().mockResolvedValue({
      readiness: {
        skill: { status: 'missing' },
        config: { status: 'invalid', path: '/tmp/config.toml' }
      }
    } as never);
    const installSkillsMock = vi.fn<typeof import('../src/cli/skills.js').installSkills>().mockResolvedValue({
      written: ['chrome-devtools']
    } as never);
    const formatDoctorSummaryMock =
      vi.fn<typeof import('../src/cli/doctor.js').formatDoctorSummary>().mockImplementation((result) =>
        (result as { phase?: string }).phase === 'after' ? ['Doctor after'] : ['Doctor before']
      );
    const formatSkillsInstallSummaryMock =
      vi.fn<typeof import('../src/cli/skills.js').formatSkillsInstallSummary>().mockReturnValue(['Skills installed']);
    const formatDelegationSetupSummaryMock =
      vi.fn<typeof import('../src/cli/delegationSetup.js').formatDelegationSetupSummary>().mockReturnValue([
        'Delegation applied'
      ]);

    await runDoctorCliShell(
      {
        format: 'text',
        includeUsage: false,
        includeCloudPreflight: false,
        includeIssueLog: false,
        wantsApply: true,
        apply: true,
        taskFilter: null,
        repoRoot: '/tmp/repo'
      },
      {
        runDoctor: runDoctorMock,
        runDelegationSetup: runDelegationSetupMock,
        runDevtoolsSetup: runDevtoolsSetupMock,
        installSkills: installSkillsMock,
        formatDoctorSummary: formatDoctorSummaryMock,
        formatSkillsInstallSummary: formatSkillsInstallSummaryMock,
        formatDelegationSetupSummary: formatDelegationSetupSummaryMock,
        log
      }
    );

    expect(runDoctorMock).toHaveBeenNthCalledWith(1, '/tmp/repo');
    expect(runDoctorMock).toHaveBeenNthCalledWith(2, '/tmp/repo');
    expect(runDelegationSetupMock).toHaveBeenNthCalledWith(1, { repoRoot: '/tmp/repo' });
    expect(runDelegationSetupMock).toHaveBeenNthCalledWith(2, { apply: true, repoRoot: '/tmp/repo' });
    expect(runDevtoolsSetupMock).toHaveBeenCalledTimes(1);
    expect(installSkillsMock).toHaveBeenCalledWith({ only: ['chrome-devtools'] });
    expect(installSkillsMock.mock.invocationCallOrder[0]).toBeLessThan(runDelegationSetupMock.mock.invocationCallOrder[1]!);

    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'Doctor before',
      'Doctor apply plan:',
      '- Install skill: chrome-devtools (codex-orchestrator skills install --only chrome-devtools)',
      '- DevTools MCP config is invalid: /tmp/config.toml (fix config.toml then rerun doctor --apply)',
      '- Configure delegation MCP: codex-orchestrator delegation setup --yes',
      'Skills installed',
      'Delegation applied',
      'DevTools setup: skipped (config.toml is invalid: /tmp/config.toml). Fix it and rerun doctor --apply --yes.',
      'Doctor after'
    ]);
  });
});
