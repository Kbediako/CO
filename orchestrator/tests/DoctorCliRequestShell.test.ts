import { afterEach, describe, expect, it, vi } from 'vitest';

import { runDoctorCliRequestShell } from '../src/cli/doctorCliRequestShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runDoctorCliRequestShell', () => {
  it('maps doctor request flags into the lower shell params', async () => {
    const runDoctorCliShellMock =
      vi.fn<typeof import('../src/cli/doctorCliShell.ts').runDoctorCliShell>().mockResolvedValue();
    const getCwd = vi.fn(() => '/tmp/repo-root');

    await runDoctorCliRequestShell(
      {
        flags: {
          format: 'text',
          usage: true,
          'cloud-preflight': true,
          'issue-log': true,
          'cloud-env-id': 'env-123',
          'cloud-branch': 'main',
          'issue-title': 'Title',
          'issue-notes': 'Notes',
          'issue-log-path': '/tmp/issue.md',
          apply: true,
          yes: true,
          'window-days': '7',
          task: 'task-1286'
        }
      },
      {
        runDoctorCliShell: runDoctorCliShellMock,
        getCwd
      }
    );

    expect(runDoctorCliShellMock).toHaveBeenCalledWith({
      format: 'text',
      includeUsage: true,
      includeCloudPreflight: true,
      includeIssueLog: true,
      cloudEnvIdOverride: 'env-123',
      cloudBranchOverride: 'main',
      issueTitle: 'Title',
      issueNotes: 'Notes',
      issueLogPath: '/tmp/issue.md',
      wantsApply: true,
      apply: true,
      windowDays: 7,
      taskFilter: 'task-1286',
      repoRoot: '/tmp/repo-root'
    });
  });

  it('rejects cloud override flags without cloud preflight', async () => {
    await expect(
      runDoctorCliRequestShell({
        flags: {
          'cloud-env-id': 'env-123'
        }
      })
    ).rejects.toThrow('--cloud-env-id/--cloud-branch require --cloud-preflight.');
  });

  it('rejects issue-log metadata flags without --issue-log', async () => {
    await expect(
      runDoctorCliRequestShell({
        flags: {
          'issue-title': 'Example issue'
        }
      })
    ).rejects.toThrow('--issue-title/--issue-notes/--issue-log-path require --issue-log.');
  });

  it('rejects doctor --apply with --format json', async () => {
    await expect(
      runDoctorCliRequestShell({
        flags: {
          apply: true,
          format: 'json'
        }
      })
    ).rejects.toThrow('doctor --apply does not support --format json.');
  });

  it('rejects invalid window-days values', async () => {
    await expect(
      runDoctorCliRequestShell({
        flags: {
          'window-days': '0'
        }
      })
    ).rejects.toThrow("Invalid --window-days value '0'. Expected a positive integer.");
  });
});
