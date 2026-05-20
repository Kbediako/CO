import { writeFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  acquireControlHostOwnership,
  readControlHostOwnerMetadata,
  readControlHostOwnershipOperatorHint,
  resolveControlHostSourceFreshnessPolicy,
  type ControlHostOwnershipPollingPayload,
  type ControlHostOwnerMetadata
} from '../src/cli/control/controlHostOwnership.js';
import {
  CONTROL_HOST_DUPLICATE_OWNER_FILE,
  CONTROL_HOST_OWNER_FILE,
  CONTROL_HOST_OWNER_LOCK_DIR,
  CONTROL_HOST_STALE_OWNER_FILE
} from '../src/cli/control/controlPersistenceFiles.js';

const TEST_HOST = 'test-host.local';

describe('control host ownership', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  async function createRunDir(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'control-host-ownership-'));
    roots.push(root);
    return join(root, 'runs', 'local-mcp', 'cli', 'control-host');
  }

  it('records source-root freshness on owner metadata and polling summaries', async () => {
    const runDir = await createRunDir();
    const handle = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 123,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['node', '/repo/bin/codex-orchestrator.ts', 'control-host'],
      commandPath: '/repo/bin/codex-orchestrator.ts',
      packageRoot: '/repo',
      now: () => '2026-04-11T00:00:00.000Z'
    });

    expect(handle.metadata.source_root_freshness).toMatchObject({
      schema_version: 1,
      command_path: '/repo/bin/codex-orchestrator.ts',
      package_root: '/repo',
      source_root: '/repo'
    });
    expect(handle.polling.owner?.source_root_freshness).toMatchObject({
      command_path: '/repo/bin/codex-orchestrator.ts',
      package_root: '/repo'
    });

    await handle.release();
  });

  it('rejects duplicate same-task startup while preserving the active owner lock', async () => {
    const runDir = await createRunDir();
    const first = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 123,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['codex-orchestrator', 'control-host'],
      now: () => '2026-04-11T00:00:00.000Z',
      isProcessAlive: () => true
    });

    await expect(
      acquireControlHostOwnership({
        paths: { runDir },
        runId: 'control-host',
        repoRoot: '/repo',
        taskId: 'local-mcp',
        pipelineId: 'provider-linear-worker',
        processId: 456,
        parentProcessId: 1,
        host: TEST_HOST,
        cwd: '/repo',
        argv: ['codex-orchestrator', 'control-host'],
        now: () => '2026-04-11T00:00:05.000Z',
        isProcessAlive: (pid) => pid === 123
      })
    ).rejects.toMatchObject({
      code: 'duplicate_control_host_owner',
      reason: 'duplicate_control_host_owner'
    });

    const owner = await readControlHostOwnerMetadata(runDir);
    expect(owner).toMatchObject({
      owner_token: first.metadata.owner_token,
      pid: 123,
      task_id: 'local-mcp',
      run_id: 'control-host',
      pipeline_id: 'provider-linear-worker'
    });
    const duplicate = JSON.parse(
      await readFile(join(runDir, CONTROL_HOST_DUPLICATE_OWNER_FILE), 'utf8')
    ) as {
      reason?: string;
      existing_owner?: { pid?: number };
      attempted_owner?: { pid?: number };
    };
    expect(duplicate).toMatchObject({
      reason: 'duplicate_control_host_owner',
      existing_owner: { pid: 123 },
      attempted_owner: { pid: 456 }
    });
    await expect(readControlHostOwnershipOperatorHint(runDir)).resolves.toContain(
      'duplicate_control_host_owner'
    );

    await first.release();
  });

  it('reclaims a stale owner only after liveness proves the recorded pid is inactive', async () => {
    const runDir = await createRunDir();
    const stale = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 123,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['codex-orchestrator', 'control-host'],
      now: () => '2026-04-11T00:00:00.000Z'
    });

    const current = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 456,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['codex-orchestrator', 'control-host'],
      now: () => '2026-04-11T00:00:10.000Z',
      isProcessAlive: (pid) => pid !== 123
    });

    expect((await readControlHostOwnerMetadata(runDir))?.owner_token).toBe(
      current.metadata.owner_token
    );
    const staleDiagnostic = JSON.parse(
      await readFile(join(runDir, CONTROL_HOST_STALE_OWNER_FILE), 'utf8')
    ) as {
      reason?: string;
      existing_owner?: { owner_token?: string; pid?: number };
      attempted_owner?: { owner_token?: string; pid?: number };
    };
    expect(staleDiagnostic).toMatchObject({
      reason: 'stale_control_host_owner',
      existing_owner: {
        owner_token: stale.metadata.owner_token,
        pid: 123
      },
      attempted_owner: {
        owner_token: current.metadata.owner_token,
        pid: 456
      }
    });

    await stale.release();
    expect((await readControlHostOwnerMetadata(runDir))?.owner_token).toBe(
      current.metadata.owner_token
    );

    await current.release();
  });

  it('does not remove a changed owner while attempting stale reclaim', async () => {
    const runDir = await createRunDir();
    const stale = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 123,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['codex-orchestrator', 'control-host'],
      now: () => '2026-04-11T00:00:00.000Z'
    });
    const replacement: ControlHostOwnerMetadata = {
      ...stale.metadata,
      owner_token: 'replacement-owner-token',
      pid: 789,
      acquired_at: '2026-04-11T00:00:05.000Z',
      updated_at: '2026-04-11T00:00:05.000Z'
    };
    let ownerChangedAfterFirstRead = false;

    await expect(
      acquireControlHostOwnership({
        paths: { runDir },
        runId: 'control-host',
        repoRoot: '/repo',
        taskId: 'local-mcp',
        pipelineId: 'provider-linear-worker',
        processId: 456,
        parentProcessId: 1,
        host: TEST_HOST,
        cwd: '/repo',
        argv: ['codex-orchestrator', 'control-host'],
        now: () => '2026-04-11T00:00:10.000Z',
        isProcessAlive: (pid) => {
          if (pid === 123 && !ownerChangedAfterFirstRead) {
            ownerChangedAfterFirstRead = true;
            const serialized = `${JSON.stringify(replacement, null, 2)}\n`;
            writeFileSync(
              join(runDir, CONTROL_HOST_OWNER_LOCK_DIR, 'owner.json'),
              serialized,
              'utf8'
            );
            writeFileSync(join(runDir, CONTROL_HOST_OWNER_FILE), serialized, 'utf8');
            return false;
          }
          return pid === 789;
        }
      })
    ).rejects.toMatchObject({
      code: 'duplicate_control_host_owner',
      reason: 'duplicate_control_host_owner'
    });

    expect(ownerChangedAfterFirstRead).toBe(true);
    const lockOwner = JSON.parse(
      await readFile(join(runDir, CONTROL_HOST_OWNER_LOCK_DIR, 'owner.json'), 'utf8')
    ) as { owner_token?: string; pid?: number };
    expect(lockOwner).toMatchObject({
      owner_token: 'replacement-owner-token',
      pid: 789
    });
    expect((await readControlHostOwnerMetadata(runDir))?.owner_token).toBe(
      'replacement-owner-token'
    );
  });

  it('clears prior stale diagnostics on a later clean acquisition', async () => {
    const runDir = await createRunDir();
    const stale = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 123,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['codex-orchestrator', 'control-host'],
      now: () => '2026-04-11T00:00:00.000Z'
    });
    const reclaimed = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 456,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['codex-orchestrator', 'control-host'],
      now: () => '2026-04-11T00:00:10.000Z',
      isProcessAlive: (pid) => pid !== 123
    });
    await expect(readFile(join(runDir, CONTROL_HOST_STALE_OWNER_FILE), 'utf8')).resolves.toContain(
      'stale_control_host_owner'
    );

    await stale.release();
    await reclaimed.release();
    const clean = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 789,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['codex-orchestrator', 'control-host'],
      now: () => '2026-04-11T00:00:20.000Z'
    });

    await expect(readFile(join(runDir, CONTROL_HOST_STALE_OWNER_FILE), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT'
    });
    await clean.release();
  });

  it('prefers attempted owner freshness after stale owner reclamation', () => {
    const staleReclaimedPayload = {
      status: 'stale_reclaimed',
      reason: 'stale_control_host_owner',
      updated_at: '2026-05-18T23:08:00.000Z',
      diagnostic_path: null,
      lock_dir: '/repo/.runs/control-host-owner.lock',
      owner_path: '/repo/.runs/control-host-owner.json',
      owner: {
        owner_token: 'stale-owner-token',
        status: 'owned',
        pid: 123,
        ppid: 1,
        hostname: TEST_HOST,
        acquired_at: '2026-05-18T22:55:00.000Z',
        updated_at: '2026-05-18T23:00:00.000Z',
        released_at: null,
        repo_root: '/repo',
        task_id: 'local-mcp',
        run_id: 'control-host',
        run_dir: '/repo/.runs/local-mcp/cli/control-host',
        pipeline_id: 'provider-linear-worker',
        source_root_freshness: {
          status: 'warning',
          observed_at: '2026-05-18T23:00:00.000Z',
          drift_classes: ['supervised_source_root_drift'],
          source_checkout: {
            status: 'stale',
            dirty: { status: 'clean' }
          },
          intended_checkout: {
            status: 'current',
            dirty: { status: 'clean' }
          },
          detail: 'stale source'
        },
        lock_dir: '/repo/.runs/control-host-owner.lock',
        owner_path: '/repo/.runs/control-host-owner.json'
      },
      attempted_owner: {
        owner_token: 'current-owner-token',
        status: 'owned',
        pid: 456,
        ppid: 1,
        hostname: TEST_HOST,
        acquired_at: '2026-05-18T23:08:00.000Z',
        updated_at: '2026-05-18T23:08:00.000Z',
        released_at: null,
        repo_root: '/repo',
        task_id: 'local-mcp',
        run_id: 'control-host',
        run_dir: '/repo/.runs/local-mcp/cli/control-host',
        pipeline_id: 'provider-linear-worker',
        source_root_freshness: {
          status: 'current',
          observed_at: '2026-05-18T23:08:00.000Z',
          drift_classes: [],
          source_checkout: {
            status: 'current',
            dirty: { status: 'clean' }
          },
          intended_checkout: {
            status: 'current',
            dirty: { status: 'clean' }
          },
          detail: 'current source'
        },
        lock_dir: '/repo/.runs/control-host-owner.lock',
        owner_path: '/repo/.runs/control-host-owner.json'
      }
    } as ControlHostOwnershipPollingPayload;

    expect(resolveControlHostSourceFreshnessPolicy(staleReclaimedPayload)).toBeNull();
  });

  it('does not release a lock that changed owners after acquisition', async () => {
    const runDir = await createRunDir();
    const handle = await acquireControlHostOwnership({
      paths: { runDir },
      runId: 'control-host',
      repoRoot: '/repo',
      taskId: 'local-mcp',
      pipelineId: 'provider-linear-worker',
      processId: 123,
      parentProcessId: 1,
      host: TEST_HOST,
      cwd: '/repo',
      argv: ['codex-orchestrator', 'control-host'],
      now: () => '2026-04-11T00:00:00.000Z'
    });
    const replacement: ControlHostOwnerMetadata = {
      ...handle.metadata,
      owner_token: 'replacement-owner-token',
      pid: 789,
      updated_at: '2026-04-11T00:00:20.000Z'
    };
    await writeFile(
      join(runDir, CONTROL_HOST_OWNER_LOCK_DIR, 'owner.json'),
      `${JSON.stringify(replacement, null, 2)}\n`,
      'utf8'
    );

    await handle.release();

    const lockOwner = JSON.parse(
      await readFile(join(runDir, CONTROL_HOST_OWNER_LOCK_DIR, 'owner.json'), 'utf8')
    ) as { owner_token?: string; pid?: number };
    expect(lockOwner).toMatchObject({
      owner_token: 'replacement-owner-token',
      pid: 789
    });
    const publicOwner = JSON.parse(
      await readFile(join(runDir, CONTROL_HOST_OWNER_FILE), 'utf8')
    ) as { owner_token?: string; pid?: number; status?: string };
    expect(publicOwner).toMatchObject({
      owner_token: handle.metadata.owner_token,
      pid: 123,
      status: 'owned'
    });
  });
});
