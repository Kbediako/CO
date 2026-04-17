import * as childProcess from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cleanupStaleDelegateServerProcesses,
  classifyDelegationTransport,
  formatDelegateServerCleanupSummary,
  inspectDelegateServerProcesses
} from '../src/cli/utils/delegationMcpHealth.js';

describe('delegationMcpHealth', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('node:child_process');
    vi.doUnmock('../src/cli/utils/packageInfo.js');
    vi.doUnmock('../src/cli/utils/packageProgramResolver.js');
  });

  it('classifies direct-dist and wrapper delegation transports distinctly', () => {
    expect(
      classifyDelegationTransport({
        source: 'fallback',
        command: '/opt/homebrew/bin/node',
        args: ['/repo/dist/bin/codex-orchestrator.js', 'delegate-server'],
        envVars: {},
        pinnedRepo: '/repo',
        commandLine: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
      })
    ).toMatchObject({ status: 'safe', kind: 'direct-dist' });

    expect(
      classifyDelegationTransport({
        source: 'fallback',
        command: 'codex-orchestrator',
        args: ['delegate-server'],
        envVars: {},
        pinnedRepo: null,
        commandLine: 'codex-orchestrator delegate-server'
      })
    ).toMatchObject({ status: 'unsafe', kind: 'wrapper' });
  });

  it('detects active vs stale delegate-server processes from a process snapshot', () => {
    const snapshot = [
      '101     1 00:20  10240 codex exec --model gpt-5.4 "task"',
      '202   101 00:10   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '303     1 15:00  65536 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '404     1 00:05   2048 zsh -lc codex mcp add delegation -- codex-orchestrator delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({ snapshot });
    expect(result.activeCount).toBe(1);
    expect(result.activePids).toEqual([202]);
    expect(result.staleCount).toBe(1);
    expect(result.stalePids).toEqual([303]);
  });

  it('does not misclassify codex exec prompt text as a delegate-server process', () => {
    const snapshot = [
      '101     1 00:20  10240 node /opt/homebrew/bin/codex exec --json "review delegate-server health against /repo/dist/bin/codex-orchestrator.js"',
      '202     1 00:10   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({ snapshot });
    expect(result.activeCount).toBe(0);
    expect(result.activePids).toEqual([]);
    expect(result.details).toMatchObject([
      {
        pid: 202,
        classification: 'idle-orphan'
      }
    ]);
  });

  it('classifies older unassociated siblings under one codex parent as stale parent-session children', () => {
    const snapshot = [
      '101     1 00:40  10240 codex resume 019-parent',
      '202   101 00:30   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '303   101 15:00   8192 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '404     1 00:50  10240 codex exec --model gpt-5.4 "task"',
      '505   404 20:00   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({
      snapshot,
      staleThresholdSeconds: 600,
      processCwdLookup: {
        101: '/repo',
        202: '/repo',
        303: '/repo',
        404: '/repo/.workspaces/linear-210',
        505: '/repo/.workspaces/linear-210'
      },
      manifestCatalog: [
        {
          manifestPath: '/repo/.workspaces/linear-210/.runs/linear-210/cli/run-1/manifest.json',
          workspacePath: '/repo/.workspaces/linear-210',
          status: 'in_progress',
          pipelineId: 'provider-linear-worker',
          taskId: 'linear-210',
          runId: 'run-1',
          issueId: 'issue-210',
          issueIdentifier: 'CO-210',
          proofPid: null
        }
      ]
    });

    expect(result.activePids).toEqual([202, 505]);
    expect(result.stalePids).toEqual([303]);
    expect(result.details.find((detail) => detail.pid === 303)).toMatchObject({
      classification: 'stale-parent-session',
      rootCodexParentPid: 101,
      rootCodexParentCwd: '/repo'
    });
    expect(result.details.find((detail) => detail.pid === 505)).toMatchObject({
      classification: 'active-associated',
      manifestAssociation: {
        manifestPath: '/repo/.workspaces/linear-210/.runs/linear-210/cli/run-1/manifest.json',
        issueIdentifier: 'CO-210'
      }
    });
  });

  it('loads shared-root manifests when inspection starts from an issue workspace root and the worker proof pid matches the ancestry', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'delegation-mcp-health-'));
    try {
      const sharedRoot = join(tempRoot, 'CO');
      const workspaceRoot = join(sharedRoot, '.workspaces', 'linear-210');
      const manifestPath = join(sharedRoot, '.runs', 'linear-210', 'cli', 'run-1', 'manifest.json');
      const proofPath = join(sharedRoot, '.runs', 'linear-210', 'cli', 'run-1', 'provider-linear-worker-proof.json');
      mkdirSync(join(sharedRoot, '.runs', 'linear-210', 'cli', 'run-1'), { recursive: true });
      mkdirSync(workspaceRoot, { recursive: true });
      writeFileSync(
        manifestPath,
        JSON.stringify({
          workspace_path: sharedRoot,
          status: 'in_progress',
          pipeline_id: 'provider-linear-worker',
          task_id: 'linear-210',
          run_id: 'run-1',
          issue_id: 'issue-210',
          issue_identifier: 'CO-210'
        })
      );
      writeFileSync(
        proofPath,
        JSON.stringify({
          pid: '77'
        })
      );

      const snapshot = [
        '77      1 00:50  10240 node worker.js',
        '101    77 00:40  10240 codex resume 019-parent',
        `202   101 00:30   4096 /opt/homebrew/bin/node ${sharedRoot}/dist/bin/codex-orchestrator.js delegate-server`
      ].join('\n');

      const result = inspectDelegateServerProcesses({
        snapshot,
        repoRoot: workspaceRoot,
        processCwdLookup: {
          77: sharedRoot,
          101: sharedRoot,
          202: sharedRoot
        }
      });

      expect(result.activePids).toEqual([202]);
      expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
        classification: 'active-associated',
        manifestAssociation: {
          manifestPath,
          issueIdentifier: 'CO-210',
          workspacePath: sharedRoot,
          proofPid: 77
        }
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('loads nested child-lane manifests when inspection starts from the issue workspace root', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'delegation-mcp-health-'));
    try {
      const sharedRoot = join(tempRoot, 'CO');
      const workspaceRoot = join(sharedRoot, '.workspaces', 'linear-212');
      const childLaneRoot = join(workspaceRoot, '.child-lanes', 'docs-lane');
      const manifestPath = join(
        childLaneRoot,
        '.runs',
        'linear-212-docs',
        'cli',
        'child-run-1',
        'manifest.json'
      );
      mkdirSync(join(childLaneRoot, '.runs', 'linear-212-docs', 'cli', 'child-run-1'), { recursive: true });
      writeFileSync(
        manifestPath,
        JSON.stringify({
          workspace_path: childLaneRoot,
          status: 'in_progress',
          pipeline_id: 'provider-linear-child-lane',
          task_id: 'linear-212-docs',
          run_id: 'child-run-1',
          issue_id: 'issue-212',
          issue_identifier: 'CO-212'
        })
      );

      const snapshot = [
        '101     1 00:40  10240 codex resume 019-parent',
        `202   101 00:30   4096 /opt/homebrew/bin/node ${sharedRoot}/dist/bin/codex-orchestrator.js delegate-server`
      ].join('\n');

      const result = inspectDelegateServerProcesses({
        snapshot,
        repoRoot: workspaceRoot,
        processCwdLookup: {
          101: childLaneRoot,
          202: childLaneRoot
        }
      });

      expect(result.activePids).toEqual([202]);
      expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
        classification: 'active-associated',
        manifestAssociation: {
          manifestPath,
          workspacePath: childLaneRoot,
          issueIdentifier: 'CO-212'
        }
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('loads shared-root manifests from a configured runs dir when inspection starts from an issue workspace', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'delegation-mcp-health-'));
    const previousRunsDirEnv = process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
    try {
      const sharedRoot = join(tempRoot, 'CO');
      const workspaceRoot = join(sharedRoot, '.workspaces', 'linear-210');
      const sharedRunsRoot = join(sharedRoot, 'artifacts', 'runs');
      const manifestPath = join(sharedRunsRoot, 'linear-210', 'cli', 'run-1', 'manifest.json');
      const proofPath = join(sharedRunsRoot, 'linear-210', 'cli', 'run-1', 'provider-linear-worker-proof.json');
      mkdirSync(join(sharedRunsRoot, 'linear-210', 'cli', 'run-1'), { recursive: true });
      mkdirSync(workspaceRoot, { recursive: true });
      writeFileSync(
        manifestPath,
        JSON.stringify({
          workspace_path: sharedRoot,
          status: 'in_progress',
          pipeline_id: 'provider-linear-worker',
          task_id: 'linear-210',
          run_id: 'run-1',
          issue_id: 'issue-210',
          issue_identifier: 'CO-210'
        })
      );
      writeFileSync(
        proofPath,
        JSON.stringify({
          pid: '77'
        })
      );
      process.env.CODEX_ORCHESTRATOR_RUNS_DIR = 'artifacts/runs';

      const snapshot = [
        '77      1 00:50  10240 node worker.js',
        '101    77 00:40  10240 codex resume 019-parent',
        `202   101 00:30   4096 /opt/homebrew/bin/node ${sharedRoot}/dist/bin/codex-orchestrator.js delegate-server`
      ].join('\n');

      const result = inspectDelegateServerProcesses({
        snapshot,
        repoRoot: workspaceRoot,
        processCwdLookup: {
          77: sharedRoot,
          101: sharedRoot,
          202: sharedRoot
        }
      });

      expect(result.activePids).toEqual([202]);
      expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
        classification: 'active-associated',
        manifestAssociation: {
          manifestPath,
          workspacePath: sharedRoot,
          proofPid: 77
        }
      });
    } finally {
      if (previousRunsDirEnv === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_RUNS_DIR = previousRunsDirEnv;
      }
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('loads workspace-scoped child-lane manifests from a configured runs dir', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'delegation-mcp-health-'));
    const previousRunsDirEnv = process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
    try {
      const sharedRoot = join(tempRoot, 'CO');
      const workspaceRoot = join(sharedRoot, '.workspaces', 'linear-212');
      const childLaneRoot = join(workspaceRoot, '.child-lanes', 'docs-lane');
      const childRunsRoot = join(childLaneRoot, 'artifacts', 'runs');
      const manifestPath = join(childRunsRoot, 'linear-212-docs', 'cli', 'child-run-1', 'manifest.json');
      mkdirSync(join(childRunsRoot, 'linear-212-docs', 'cli', 'child-run-1'), { recursive: true });
      writeFileSync(
        manifestPath,
        JSON.stringify({
          workspace_path: childLaneRoot,
          status: 'in_progress',
          pipeline_id: 'provider-linear-child-lane',
          task_id: 'linear-212-docs',
          run_id: 'child-run-1',
          issue_id: 'issue-212',
          issue_identifier: 'CO-212'
        })
      );
      process.env.CODEX_ORCHESTRATOR_RUNS_DIR = 'artifacts/runs';

      const snapshot = [
        '101     1 00:40  10240 codex resume 019-parent',
        `202   101 00:30   4096 /opt/homebrew/bin/node ${sharedRoot}/dist/bin/codex-orchestrator.js delegate-server`
      ].join('\n');

      const result = inspectDelegateServerProcesses({
        snapshot,
        repoRoot: workspaceRoot,
        processCwdLookup: {
          101: childLaneRoot,
          202: childLaneRoot
        }
      });

      expect(result.activePids).toEqual([202]);
      expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
        classification: 'active-associated',
        manifestAssociation: {
          manifestPath,
          workspacePath: childLaneRoot,
          issueIdentifier: 'CO-212'
        }
      });
    } finally {
      if (previousRunsDirEnv === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_RUNS_DIR = previousRunsDirEnv;
      }
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('associates workspace manifests when the live codex session runs from a nested subdirectory', () => {
    const workspaceRoot = '/repo/.workspaces/linear-210';
    const nestedWorkspaceCwd = '/repo/.workspaces/linear-210/packages/worker';
    const snapshot = [
      '101     1 00:40  10240 codex resume 019-parent',
      '202   101 00:30   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({
      snapshot,
      processCwdLookup: {
        101: nestedWorkspaceCwd,
        202: nestedWorkspaceCwd
      },
      manifestCatalog: [
        {
          manifestPath: `${workspaceRoot}/.runs/linear-210/cli/run-1/manifest.json`,
          workspacePath: workspaceRoot,
          status: 'in_progress',
          pipelineId: 'provider-linear-worker',
          taskId: 'linear-210',
          runId: 'run-1',
          issueId: 'issue-210',
          issueIdentifier: 'CO-210',
          proofPid: null
        }
      ]
    });

    expect(result.activePids).toEqual([202]);
    expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
      classification: 'active-associated',
      manifestAssociation: {
        manifestPath: `${workspaceRoot}/.runs/linear-210/cli/run-1/manifest.json`,
        workspacePath: workspaceRoot,
        issueIdentifier: 'CO-210'
      }
    });
  });

  it('requires proof-pid ancestry before matching shared-root manifests and leaves older parent-session siblings visible', () => {
    const snapshot = [
      '77      1 00:55  10240 node worker.js',
      '101    77 00:40  10240 codex exec --json "provider worker"',
      '202   101 00:30   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '303     1 00:40  10240 codex resume 019-parent',
      '404   303 15:00   8192 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '505   303 00:05   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({
      snapshot,
      staleThresholdSeconds: 600,
      processCwdLookup: {
        77: '/repo',
        101: '/repo',
        202: '/repo',
        303: '/repo',
        404: '/repo',
        505: '/repo'
      },
      manifestCatalog: [
        {
          manifestPath: '/repo/.runs/linear-210/cli/run-1/manifest.json',
          workspacePath: '/repo',
          status: 'in_progress',
          pipelineId: 'provider-linear-worker',
          taskId: 'linear-210',
          runId: 'run-1',
          issueId: 'issue-210',
          issueIdentifier: 'CO-210',
          proofPid: 77
        }
      ]
    });

    expect(result.activePids).toEqual([202, 505]);
    expect(result.stalePids).toEqual([404]);
    expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
      classification: 'active-associated',
      manifestAssociation: {
        manifestPath: '/repo/.runs/linear-210/cli/run-1/manifest.json',
        proofPid: 77
      }
    });
    expect(result.details.find((detail) => detail.pid === 404)).toMatchObject({
      classification: 'stale-parent-session',
      manifestAssociation: null,
      rootCodexParentPid: 303
    });
    expect(result.details.find((detail) => detail.pid === 505)).toMatchObject({
      classification: 'active-unassociated',
      manifestAssociation: null,
      rootCodexParentPid: 303
    });
  });

  it('keeps the freshest unassociated parent-session child idle once it exceeds the threshold', () => {
    const snapshot = [
      '303     1 20:00  10240 codex resume 019-parent',
      '505   303 15:00   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({
      snapshot,
      staleThresholdSeconds: 600,
      processCwdLookup: {
        303: '/repo',
        505: '/repo'
      }
    });

    expect(result.activePids).toEqual([]);
    expect(result.stalePids).toEqual([]);
    expect(result.details.find((detail) => detail.pid === 505)).toMatchObject({
      classification: 'idle-parent-session',
      manifestAssociation: null,
      rootCodexParentPid: 303
    });
  });

  it('keeps parent-session siblings active when cwd lookup is unavailable', () => {
    const snapshot = [
      '303     1 20:00  10240 codex resume 019-parent',
      '404   303 15:00   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '505   303 02:00   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({
      snapshot,
      staleThresholdSeconds: 600,
      processCwdLookup: {
        303: null,
        404: null,
        505: null
      }
    });

    expect(result.activePids).toEqual([404, 505]);
    expect(result.stalePids).toEqual([]);
    expect(result.details.find((detail) => detail.pid === 404)).toMatchObject({
      classification: 'active-unassociated',
      manifestAssociation: null,
      rootCodexParentPid: 303
    });
    expect(result.details.find((detail) => detail.pid === 505)).toMatchObject({
      classification: 'active-unassociated',
      manifestAssociation: null,
      rootCodexParentPid: 303
    });
  });

  it('falls back to the newest terminal scoped manifest when live scoped candidates are proof-backed but ancestry does not match', () => {
    const workspaceRoot = '/repo/.workspaces/linear-210';
    const snapshot = [
      '101     1 20:00  10240 codex resume 019-parent',
      '202   101 15:00   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({
      snapshot,
      staleThresholdSeconds: 600,
      processCwdLookup: {
        101: workspaceRoot,
        202: workspaceRoot
      },
      manifestCatalog: [
        {
          manifestPath: `${workspaceRoot}/.runs/linear-210/cli/run-1/manifest.json`,
          workspacePath: workspaceRoot,
          status: 'succeeded',
          pipelineId: 'provider-linear-worker',
          taskId: 'linear-210',
          runId: 'run-1',
          issueId: 'issue-210',
          issueIdentifier: 'CO-210',
          proofPid: 77
        },
        {
          manifestPath: `${workspaceRoot}/.runs/linear-210/cli/run-2/manifest.json`,
          workspacePath: workspaceRoot,
          status: 'in_progress',
          pipelineId: 'provider-linear-worker',
          taskId: 'linear-210',
          runId: 'run-2',
          issueId: 'issue-210',
          issueIdentifier: 'CO-210',
          proofPid: 88
        }
      ]
    });

    expect(result.activePids).toEqual([]);
    expect(result.stalePids).toEqual([202]);
    expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
      classification: 'stale-parent-session',
      manifestAssociation: {
        manifestPath: `${workspaceRoot}/.runs/linear-210/cli/run-1/manifest.json`,
        status: 'succeeded',
        proofPid: 77
      }
    });
  });

  it('treats Windows issue workspaces as scoped when only a terminal manifest is available', () => {
    const workspaceRoot = String.raw`C:\repo\.workspaces\linear-210`;
    const snapshot = [
      '101     1 20:00  10240 codex resume 019-parent',
      String.raw`202   101 15:00   4096 "C:\nodejs\node.exe" "C:\repo\dist\bin\codex-orchestrator.js" delegate-server`
    ].join('\n');

    const result = inspectDelegateServerProcesses({
      snapshot,
      staleThresholdSeconds: 600,
      processCwdLookup: {
        101: workspaceRoot,
        202: workspaceRoot
      },
      manifestCatalog: [
        {
          manifestPath: String.raw`C:\repo\.workspaces\linear-210\.runs\linear-210\cli\run-1\manifest.json`,
          workspacePath: workspaceRoot,
          status: 'succeeded',
          pipelineId: 'provider-linear-worker',
          taskId: 'linear-210',
          runId: 'run-1',
          issueId: 'issue-210',
          issueIdentifier: 'CO-210',
          proofPid: 77
        }
      ]
    });

    expect(result.activePids).toEqual([]);
    expect(result.stalePids).toEqual([202]);
    expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
      classification: 'stale-parent-session',
      manifestAssociation: {
        manifestPath: String.raw`C:\repo\.workspaces\linear-210\.runs\linear-210\cli\run-1\manifest.json`,
        workspacePath: workspaceRoot
      }
    });
  });

  it('treats Windows child-lane workspaces as scoped when the live manifest has no proof pid', () => {
    const childLaneRoot = String.raw`C:\repo\.workspaces\linear-212\.child-lanes\docs-lane`;
    const snapshot = [
      '101     1 00:40  10240 codex resume 019-parent',
      String.raw`202   101 00:30   4096 "C:\nodejs\node.exe" "C:\repo\dist\bin\codex-orchestrator.js" delegate-server`
    ].join('\n');

    const result = inspectDelegateServerProcesses({
      snapshot,
      processCwdLookup: {
        101: childLaneRoot,
        202: childLaneRoot
      },
      manifestCatalog: [
        {
          manifestPath: String.raw`C:\repo\.workspaces\linear-212\.child-lanes\docs-lane\.runs\linear-212-docs\cli\child-run-1\manifest.json`,
          workspacePath: childLaneRoot,
          status: 'in_progress',
          pipelineId: 'provider-linear-child-lane',
          taskId: 'linear-212-docs',
          runId: 'child-run-1',
          issueId: 'issue-212',
          issueIdentifier: 'CO-212',
          proofPid: null
        }
      ]
    });

    expect(result.activePids).toEqual([202]);
    expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
      classification: 'active-associated',
      manifestAssociation: {
        manifestPath: String.raw`C:\repo\.workspaces\linear-212\.child-lanes\docs-lane\.runs\linear-212-docs\cli\child-run-1\manifest.json`,
        workspacePath: childLaneRoot,
        issueIdentifier: 'CO-212',
        proofPid: null
      }
    });
  });

  it('prefers the active repo root inferred from cwd when repoRoot is omitted', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'delegation-mcp-health-'));
    const previousRepoRootEnv = process.env.CODEX_ORCHESTRATOR_ROOT;
    let cwdSpy: ReturnType<typeof vi.spyOn> | null = null;
    try {
      const repoRoot = join(tempRoot, 'repo');
      const nestedDir = join(repoRoot, 'packages', 'worker');
      const manifestPath = join(repoRoot, '.runs', 'linear-210', 'cli', 'run-1', 'manifest.json');
      const proofPath = join(repoRoot, '.runs', 'linear-210', 'cli', 'run-1', 'provider-linear-worker-proof.json');
      mkdirSync(join(repoRoot, 'tasks'), { recursive: true });
      mkdirSync(join(repoRoot, '.runs', 'linear-210', 'cli', 'run-1'), { recursive: true });
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(join(repoRoot, 'tasks', 'index.json'), JSON.stringify({ items: [] }));
      writeFileSync(
        manifestPath,
        JSON.stringify({
          workspace_path: repoRoot,
          status: 'in_progress',
          pipeline_id: 'provider-linear-worker',
          task_id: 'linear-210',
          run_id: 'run-1',
          issue_id: 'issue-210',
          issue_identifier: 'CO-210'
        })
      );
      writeFileSync(
        proofPath,
        JSON.stringify({
          pid: '77'
        })
      );

      const snapshot = [
        '77      1 00:55  10240 node worker.js',
        '101    77 00:40  10240 codex resume 019-parent',
        `202   101 00:30   4096 /opt/homebrew/bin/node ${repoRoot}/dist/bin/codex-orchestrator.js delegate-server`
      ].join('\n');

      delete process.env.CODEX_ORCHESTRATOR_ROOT;
      cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(nestedDir);

      const result = inspectDelegateServerProcesses({
        snapshot,
        processCwdLookup: {
          77: repoRoot,
          101: repoRoot,
          202: repoRoot
        }
      });

      expect(result.activePids).toEqual([202]);
      expect(result.details.find((detail) => detail.pid === 202)).toMatchObject({
        classification: 'active-associated',
        manifestAssociation: {
          manifestPath,
          issueIdentifier: 'CO-210',
          proofPid: 77
        }
      });
    } finally {
      cwdSpy?.mockRestore();
      if (previousRepoRootEnv === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_ROOT;
      } else {
        process.env.CODEX_ORCHESTRATOR_ROOT = previousRepoRootEnv;
      }
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('falls back to per-pid cwd lookup when batched lsof preload misses a live delegate-server pid', async () => {
    vi.resetModules();
    const actualChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    const spawnSyncMock = vi.fn((command: string, args?: string[], options?: childProcess.SpawnSyncOptions) => {
      if (command === 'lsof' && Array.isArray(args) && args[2] === 'cwd' && args[3] === '-Fpfn') {
        return {
          stdout: `p${process.ppid}\nn${process.cwd()}\n`,
          stderr: '',
          status: 0,
          signal: null,
          output: [null, `p${process.ppid}\nn${process.cwd()}\n`, ''],
          pid: 0
        } as any;
      }
      if (
        command === 'lsof'
        && Array.isArray(args)
        && args[2] === 'cwd'
        && args[3] === '-Fn'
        && args[5] === String(process.pid)
      ) {
        return {
          stdout: `p${process.pid}\nn${process.cwd()}\n`,
          stderr: '',
          status: 0,
          signal: null,
          output: [null, `p${process.pid}\nn${process.cwd()}\n`, ''],
          pid: 0
        } as any;
      }
      return actualChildProcess.spawnSync(command as never, args as never, options as never) as any;
    });
    vi.doMock('node:child_process', () => ({
      ...actualChildProcess,
      spawnSync: spawnSyncMock
    }));
    const health = await import('../src/cli/utils/delegationMcpHealth.js');
    const snapshot = [
      `${process.ppid}     1 20:00  10240 codex resume 019-parent`,
      `${process.pid}   ${process.ppid} 00:05   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server`,
      '999999     1 00:01   1024 helper'
    ].join('\n');

    const result = health.inspectDelegateServerProcesses({ snapshot });
    expect(result.details.find((detail) => detail.pid === process.pid)).toMatchObject({
      cwd: process.cwd(),
      rootCodexParentCwd: process.cwd()
    });
    expect(spawnSyncMock).toHaveBeenCalledWith(
      'lsof',
      ['-a', '-d', 'cwd', '-Fn', '-p', String(process.pid)],
      expect.objectContaining({ encoding: 'utf8' })
    );
  });

  it('keeps delegate-server children active when the codex parent argv mentions codex-orchestrator text', () => {
    const snapshot = [
      '101     1 00:20  10240 codex exec --model gpt-5.4 "debug codex-orchestrator startup"',
      '202   101 00:10   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({ snapshot });
    expect(result.activeCount).toBe(1);
    expect(result.activePids).toEqual([202]);
    expect(result.staleCount).toBe(0);
    expect(result.stalePids).toEqual([]);
  });

  it('recognizes delegate-server processes when node runtime flags precede the script path', () => {
    const snapshot = [
      '101     1 00:20  10240 codex resume 019-parent',
      '202   101 00:10   4096 /opt/homebrew/bin/node --enable-source-maps /repo/dist/bin/codex-orchestrator.js delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({ snapshot });
    expect(result.activeCount).toBe(1);
    expect(result.activePids).toEqual([202]);
    expect(result.staleCount).toBe(0);
    expect(result.stalePids).toEqual([]);
  });

  it('keeps delegate-server children active when the parent uses a configured non-default codex binary', () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    process.env.CODEX_CLI_BIN = '/tmp/fake-codex';
    try {
      const snapshot = [
        '101     1 00:20  10240 /tmp/fake-codex exec --model gpt-5.4 "task"',
        '202   101 00:10   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
      ].join('\n');

      const result = inspectDelegateServerProcesses({ snapshot });
      expect(result.activeCount).toBe(1);
      expect(result.activePids).toEqual([202]);
      expect(result.staleCount).toBe(0);
      expect(result.stalePids).toEqual([]);
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
    }
  });

  it('formats unavailable cleanup results without claiming a successful apply', () => {
    const lines = formatDelegateServerCleanupSummary({
      status: 'unavailable',
      activeCount: 0,
      staleCount: 0,
      activePids: [],
      stalePids: [],
      staleRssKb: 0,
      thresholdSeconds: 600,
      detail: 'ps failed',
      details: [],
      dryRun: false,
      replacedPids: [],
      terminatedPids: [],
      forcedPids: [],
      remainingPids: []
    });

    expect(lines[0]).toBe('Delegation cleanup: unavailable');
    expect(lines.join('\n')).not.toContain('Run with --yes');
  });

  it('revalidates stale pids and returns partial cleanup results without throwing', async () => {
    const processTable = new Map<number, { ppid: number; elapsedSeconds: number; command: string }>([
      [606, { ppid: 9, elapsedSeconds: 60, command: '/usr/bin/python other-service.py' }],
      [
        505,
        {
          ppid: 1,
          elapsedSeconds: 900,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ],
      [
        404,
        {
          ppid: 1,
          elapsedSeconds: 850,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ],
      [
        303,
        {
          ppid: 1,
          elapsedSeconds: 800,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ],
      [
        202,
        {
          ppid: 1,
          elapsedSeconds: 700,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ]
    ]);
    const signalLog: Array<{ pid: number; signal: string }> = [];
    let waitCount = 0;

    const result = await cleanupStaleDelegateServerProcesses(
      { apply: true },
      {
        inspect: () => ({
          inspection: {
            status: 'stale',
            activeCount: 0,
            staleCount: 5,
            activePids: [],
            stalePids: [606, 505, 404, 303, 202],
            staleRssKb: 0,
            thresholdSeconds: 600,
            detail: 'Detected stale delegate-server processes.',
            details: []
          },
          staleRecords: [
            {
              pid: 606,
              ppid: 1,
              elapsedSeconds: 950,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            },
            {
              pid: 505,
              ppid: 1,
              elapsedSeconds: 900,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            },
            {
              pid: 404,
              ppid: 1,
              elapsedSeconds: 850,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            },
            {
              pid: 303,
              ppid: 1,
              elapsedSeconds: 800,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            },
            {
              pid: 202,
              ppid: 1,
              elapsedSeconds: 700,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            }
          ]
        }),
        readProcessRecord: (pid) => {
          const record = processTable.get(pid);
          if (!record) {
            return null;
          }
          return { pid, rssKb: 0, ...record };
        },
        isProcessAlive: (pid) => processTable.has(pid),
        tryKillProcess: (pid, signal) => {
          signalLog.push({ pid, signal });
          if (signal === 'SIGTERM') {
            if (pid === 303) {
              processTable.delete(pid);
            }
            return { status: 'signaled' };
          }
          if (pid === 404) {
            return { status: 'blocked', code: 'EPERM', detail: 'blocked by permissions' };
          }
          if (pid === 202) {
            processTable.delete(pid);
          }
          return { status: 'signaled' };
        },
        waitForMs: async () => {
          waitCount += 1;
          if (waitCount === 1) {
            processTable.set(404, {
              ppid: 77,
              elapsedSeconds: 900,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            });
            processTable.set(505, {
              ppid: 77,
              elapsedSeconds: 10,
              command: '/usr/bin/python other-service.py'
            });
          }
        }
      }
    );

    expect(signalLog).toEqual([
      { pid: 505, signal: 'SIGTERM' },
      { pid: 404, signal: 'SIGTERM' },
      { pid: 303, signal: 'SIGTERM' },
      { pid: 202, signal: 'SIGTERM' },
      { pid: 404, signal: 'SIGKILL' },
      { pid: 202, signal: 'SIGKILL' }
    ]);
    expect(result.replacedPids).toEqual([606, 505]);
    expect(result.terminatedPids).toEqual([303]);
    expect(result.forcedPids).toEqual([202]);
    expect(result.remainingPids).toEqual([404]);
  });

  it('rechecks blocked stale pids before reporting them as remaining', async () => {
    const processTable = new Map<number, { ppid: number; elapsedSeconds: number; command: string }>([
      [
        404,
        {
          ppid: 1,
          elapsedSeconds: 850,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ]
    ]);
    const signalLog: Array<{ pid: number; signal: string }> = [];
    let waitCount = 0;

    const result = await cleanupStaleDelegateServerProcesses(
      { apply: true },
      {
        inspect: () => ({
          inspection: {
            status: 'stale',
            activeCount: 0,
            staleCount: 1,
            activePids: [],
            stalePids: [404],
            staleRssKb: 0,
            thresholdSeconds: 600,
            detail: 'Detected stale delegate-server processes.',
            details: []
          },
          staleRecords: [
            {
              pid: 404,
              ppid: 1,
              elapsedSeconds: 850,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            }
          ]
        }),
        readProcessRecord: (pid) => {
          const record = processTable.get(pid);
          if (!record) {
            return null;
          }
          return { pid, rssKb: 0, ...record };
        },
        isProcessAlive: (pid) => processTable.has(pid),
        tryKillProcess: (pid, signal) => {
          signalLog.push({ pid, signal });
          return { status: 'blocked', code: 'EPERM', detail: 'blocked by permissions' };
        },
        waitForMs: async () => {
          waitCount += 1;
          if (waitCount === 1) {
            processTable.delete(404);
          }
        }
      }
    );

    expect(signalLog).toEqual([{ pid: 404, signal: 'SIGTERM' }]);
    expect(result.replacedPids).toEqual([]);
    expect(result.terminatedPids).toEqual([404]);
    expect(result.forcedPids).toEqual([]);
    expect(result.remainingPids).toEqual([]);
  });

  it('keeps plan-only delegation preview available when bootstrap resolution cannot use ts-node and dist is missing', async () => {
    vi.resetModules();
    vi.doMock('../src/cli/utils/packageInfo.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/cli/utils/packageInfo.js')>();
      return {
        ...actual,
        findPackageRoot: () => '/tmp/local-checkout'
      };
    });
    vi.doMock('../src/cli/utils/packageProgramResolver.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/cli/utils/packageProgramResolver.js')>();
      return {
        ...actual,
        resolveCodexOrchestratorBootstrapInvocation: () => {
          throw new Error(
            'Unable to run /tmp/local-checkout/bin/codex-orchestrator.ts because ts-node/esm is unavailable, and fallback dist artifact /tmp/local-checkout/dist/bin/codex-orchestrator.js is missing.'
          );
        }
      };
    });

    const { resolveDelegationServerInvocation } = await import('../src/cli/utils/delegationMcpHealth.js');
    const invocation = resolveDelegationServerInvocation({
      allowMissingDist: true,
      execPath: '/usr/bin/node'
    });

    expect(invocation.distPath).toBe('/tmp/local-checkout/dist/bin/codex-orchestrator.js');
    expect(invocation.commandLine).toBe('/usr/bin/node /tmp/local-checkout/dist/bin/codex-orchestrator.js delegate-server');
  });

  it('keeps plan-only delegation preview available when bootstrap resolution uses Windows path separators', async () => {
    vi.resetModules();
    vi.doMock('../src/cli/utils/packageInfo.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/cli/utils/packageInfo.js')>();
      return {
        ...actual,
        findPackageRoot: () => 'C:\\tmp\\local-checkout'
      };
    });
    vi.doMock('../src/cli/utils/packageProgramResolver.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/cli/utils/packageProgramResolver.js')>();
      return {
        ...actual,
        resolveCodexOrchestratorBootstrapInvocation: () => {
          throw new Error(
            'Unable to run C:\\tmp\\local-checkout\\bin\\codex-orchestrator.ts because ts-node/esm is unavailable, and fallback dist artifact C:\\tmp\\local-checkout\\dist\\bin\\codex-orchestrator.js is missing.'
          );
        }
      };
    });

    const { resolveDelegationServerInvocation } = await import('../src/cli/utils/delegationMcpHealth.js');
    const invocation = resolveDelegationServerInvocation({
      allowMissingDist: true,
      execPath: 'C:\\Program Files\\nodejs\\node.exe'
    });

    expect(invocation.distPath).toBe('C:\\tmp\\local-checkout/dist/bin/codex-orchestrator.js');
    expect(invocation.commandLine).toBe(
      "'C:\\Program Files\\nodejs\\node.exe' 'C:\\tmp\\local-checkout/dist/bin/codex-orchestrator.js' delegate-server"
    );
  });

  it('does not synthesize a preview dist path when bootstrap resolution cannot locate any packaged entrypoint', async () => {
    vi.resetModules();
    vi.doMock('../src/cli/utils/packageProgramResolver.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/cli/utils/packageProgramResolver.js')>();
      return {
        ...actual,
        resolveCodexOrchestratorBootstrapInvocation: () => {
          throw new Error('Unable to locate packaged program. Expected /tmp/local-checkout/dist/bin/codex-orchestrator.js.');
        }
      };
    });

    const { resolveDelegationServerInvocation } = await import('../src/cli/utils/delegationMcpHealth.js');

    expect(() =>
      resolveDelegationServerInvocation({
        allowMissingDist: true,
        execPath: '/usr/bin/node'
      })
    ).toThrowError(
      'Unable to locate packaged program. Expected /tmp/local-checkout/dist/bin/codex-orchestrator.js.'
    );
  });
});
