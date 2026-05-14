import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readDocsFreshnessMaintainRepoGate } from '../src/cli/control/docsFreshnessRepoGate.js';

const tempDirs: string[] = [];
const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR
};

afterEach(async () => {
  restoreEnv('CODEX_ORCHESTRATOR_ROOT', ORIGINAL_ENV.root);
  restoreEnv('CODEX_ORCHESTRATOR_OUT_DIR', ORIGINAL_ENV.out);
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe('readDocsFreshnessMaintainRepoGate', () => {
  it('reads the default maintenance report from CODEX_ORCHESTRATOR_OUT_DIR', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'artifacts', 'out');
    const reportPath = join(outRoot, 'docs-truthfulness-maintenance', 'docs-freshness-maintenance.json');
    await writeReport(reportPath, {
      generated_at: '2026-05-14T00:00:00.000Z',
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 320
    });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = outRoot;

    const gate = readDocsFreshnessMaintainRepoGate({ now: '2026-05-14T01:00:00.000Z' });

    expect(gate).toMatchObject({
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      owner: {
        issue: 'CO-522',
        action: 'update_existing',
        verified: true
      },
      generated_at: '2026-05-14T00:00:00.000Z',
      evidence_status: 'fresh',
      source_path: reportPath
    });
  });

  it('honors an injected env instead of process env', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'artifacts', 'out');
    const reportPath = join(outRoot, 'docs-truthfulness-maintenance', 'docs-freshness-maintenance.json');
    await writeReport(reportPath, {
      generated_at: '2026-05-14T00:00:00.000Z',
      severity: 'action_required',
      freshness_decision: 'block_terminal_lifecycle',
      action_required_count: 1,
      owner_issue: null,
      owner_action: 'create_required'
    });
    process.env.CODEX_ORCHESTRATOR_ROOT = '/missing/process/root';
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = 'missing-out';

    const gate = readDocsFreshnessMaintainRepoGate({
      env: {
        CODEX_ORCHESTRATOR_ROOT: repoRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: outRoot
      } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'action_required',
      freshness_decision: 'block_terminal_lifecycle',
      owner: {
        issue: null,
        action: 'create_required'
      },
      source_path: reportPath
    });
  });

  it('surfaces a fresh local report when the scheduled report is absent', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'out');
    const localReport = join(outRoot, 'local', 'docs-freshness-maintenance.json');
    await writeReport(localReport, {
      generated_at: '2026-05-14T00:30:00.000Z',
      severity: 'warning',
      freshness_decision: 'clean',
      action_required_count: 10
    });

    const gate = readDocsFreshnessMaintainRepoGate({
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'warning',
      freshness_decision: 'clean',
      source_path: localReport,
      generated_at: '2026-05-14T00:30:00.000Z',
      evidence_status: 'fresh'
    });
  });

  it('does not let a stale scheduled report mask fresher local blocking evidence', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'out');
    const scheduledReport = join(outRoot, 'docs-truthfulness-maintenance', 'docs-freshness-maintenance.json');
    const localReport = join(outRoot, 'local', 'docs-freshness-maintenance.json');
    await writeReport(scheduledReport, {
      generated_at: '2026-05-12T00:00:00.000Z',
      severity: 'warning',
      freshness_decision: 'clean',
      action_required_count: 0
    });
    await writeReport(localReport, {
      generated_at: '2026-05-14T00:45:00.000Z',
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 44
    });

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 44,
      source_path: localReport
    });
    expect(gate?.report_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: scheduledReport, status: 'stale' }),
        expect.objectContaining({ path: localReport, status: 'valid' })
      ])
    );
  });

  it('does not let stale scheduled blocking evidence mask fresher local clean evidence', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'out');
    const scheduledReport = join(outRoot, 'docs-truthfulness-maintenance', 'docs-freshness-maintenance.json');
    const localReport = join(outRoot, 'local', 'docs-freshness-maintenance.json');
    await writeReport(scheduledReport, {
      generated_at: '2026-05-12T00:00:00.000Z',
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 44
    });
    await writeReport(localReport, {
      generated_at: '2026-05-14T00:45:00.000Z',
      severity: 'warning',
      freshness_decision: 'clean',
      action_required_count: 10
    });

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'warning',
      freshness_decision: 'clean',
      action_required_count: 10,
      source_path: localReport
    });
  });

  it('selects the freshest supplied task-scoped report', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'out');
    const localReport = join(outRoot, 'local', 'docs-freshness-maintenance.json');
    const taskReport = join(outRoot, 'linear-123', 'docs-freshness-maintenance.json');
    await writeReport(localReport, {
      generated_at: '2026-05-14T00:30:00.000Z',
      severity: 'warning',
      freshness_decision: 'clean',
      action_required_count: 2
    });
    await writeReport(taskReport, {
      generated_at: '2026-05-14T00:55:00.000Z',
      severity: 'action_required',
      freshness_decision: 'block_terminal_lifecycle',
      action_required_count: 3
    });

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      taskIds: ['linear-123'],
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'action_required',
      freshness_decision: 'block_terminal_lifecycle',
      source_path: taskReport
    });
  });

  it('does not let unrelated task-scoped reports mask missing current evidence', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'out');
    const unrelatedReport = join(outRoot, 'linear-unrelated', 'docs-freshness-maintenance.json');
    await writeReport(unrelatedReport, {
      generated_at: '2026-05-14T00:59:00.000Z',
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 99
    });

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'degraded',
      freshness_decision: 'report_missing',
      evidence_status: 'missing'
    });
    expect(gate?.report_candidates).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: unrelatedReport })])
    );
  });

  it('rejects invalid task ids before joining report paths', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'out');
    const escapedReport = join(repoRoot, 'escaped-task', 'docs-freshness-maintenance.json');
    await writeReport(escapedReport, {
      generated_at: '2026-05-14T00:59:00.000Z',
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 99
    });

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: {
        CODEX_ORCHESTRATOR_ROOT: repoRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: outRoot,
        TASK: '../escaped-task'
      } as NodeJS.ProcessEnv,
      taskIds: ['../escaped-task'],
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'degraded',
      freshness_decision: 'report_missing',
      evidence_status: 'missing'
    });
    expect(gate?.source_path).not.toBe(escapedReport);
    expect(gate?.report_candidates).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: escapedReport })])
    );
  });

  it('emits degraded evidence when no candidate report exists', async () => {
    const repoRoot = await mkTempRoot();

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'degraded',
      freshness_decision: 'report_missing',
      evidence_status: 'missing',
      evidence_reason: 'report_missing',
      action_required_count: 1,
      blocks_handoff: true,
      provider_wip_impact: 'excluded_repo_gate'
    });
  });

  it('emits degraded evidence when the only report is invalid', async () => {
    const repoRoot = await mkTempRoot();
    const localReport = join(repoRoot, 'out', 'local', 'docs-freshness-maintenance.json');
    await mkdir(join(repoRoot, 'out', 'local'), { recursive: true });
    await writeFile(localReport, '{not-json', 'utf8');

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'degraded',
      freshness_decision: 'report_invalid',
      evidence_status: 'invalid',
      evidence_reason: 'json_parse_failed',
      source_path: localReport
    });
  });

  it('emits degraded evidence when repo_gate is schema-invalid', async () => {
    const repoRoot = await mkTempRoot();
    const localReport = join(repoRoot, 'out', 'local', 'docs-freshness-maintenance.json');
    await mkdir(join(repoRoot, 'out', 'local'), { recursive: true });
    await writeFile(
      localReport,
      JSON.stringify({
        generated_at: '2026-05-14T00:45:00.000Z',
        repo_gate: {}
      }),
      'utf8'
    );

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'degraded',
      freshness_decision: 'report_invalid',
      evidence_status: 'invalid',
      evidence_reason: 'repo_gate_missing_or_invalid',
      source_path: localReport
    });
  });

  it('prioritizes invalid current evidence over stale scheduled evidence', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'out');
    const scheduledReport = join(outRoot, 'docs-truthfulness-maintenance', 'docs-freshness-maintenance.json');
    const localReport = join(outRoot, 'local', 'docs-freshness-maintenance.json');
    await writeReport(scheduledReport, {
      generated_at: '2026-05-12T00:00:00.000Z',
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 44
    });
    await mkdir(join(outRoot, 'local'), { recursive: true });
    await writeFile(localReport, '{not-json', 'utf8');

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'degraded',
      freshness_decision: 'report_invalid',
      evidence_status: 'invalid',
      evidence_reason: 'json_parse_failed',
      source_path: localReport
    });
  });

  it('emits degraded evidence when generated_at is missing or invalid', async () => {
    const repoRoot = await mkTempRoot();
    const localReport = join(repoRoot, 'out', 'local', 'docs-freshness-maintenance.json');
    await writeReport(localReport, {
      generated_at: null,
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 44
    });

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'degraded',
      freshness_decision: 'report_invalid',
      evidence_status: 'invalid',
      evidence_reason: 'generated_at_missing_or_invalid',
      source_path: localReport
    });
  });

  it('emits degraded evidence when reports exist but are stale', async () => {
    const repoRoot = await mkTempRoot();
    const scheduledReport = join(repoRoot, 'out', 'docs-truthfulness-maintenance', 'docs-freshness-maintenance.json');
    const localReport = join(repoRoot, 'out', 'local', 'docs-freshness-maintenance.json');
    await writeReport(scheduledReport, { generated_at: '2026-05-11T00:00:00.000Z', severity: 'warning', freshness_decision: 'clean', action_required_count: 10 });
    await writeReport(localReport, {
      generated_at: '2026-05-12T00:00:00.000Z',
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 44
    });

    const gate = readDocsFreshnessMaintainRepoGate({
      repoRoot,
      env: { CODEX_ORCHESTRATOR_ROOT: repoRoot } as NodeJS.ProcessEnv,
      now: '2026-05-14T01:00:00.000Z'
    });

    expect(gate).toMatchObject({
      severity: 'degraded',
      freshness_decision: 'report_stale',
      evidence_status: 'stale',
      evidence_reason: 'report_stale',
      source_path: localReport,
      generated_at: '2026-05-12T00:00:00.000Z'
    });
  });
});

async function mkTempRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'docs-freshness-repo-gate-'));
  tempDirs.push(dir);
  return dir;
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

async function writeReport(
  reportPath: string,
  options: {
    generated_at: string | null;
    severity: string;
    freshness_decision: string;
    action_required_count: number;
    owner_issue?: string | null;
    owner_action?: string;
  }
): Promise<void> {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        generated_at: options.generated_at,
        repo_gate: {
          severity: options.severity,
          freshness_decision: options.freshness_decision,
          owner: {
            issue: options.owner_issue === undefined ? 'CO-522' : options.owner_issue,
            action: options.owner_action ?? 'update_existing',
            state: 'Blocked',
            state_type: 'started',
            verified: true
          },
          spec_guard: {
            status: 'succeeded',
            action_required_count: 0
          },
          capacity: {
            status: options.freshness_decision === 'clean' ? 'no_candidates' : 'over_budget'
          },
          next_expiry: null,
          action_required_count: options.action_required_count,
          blocks_unrelated_lanes: false,
          blocks_handoff: options.severity === 'blocking' || options.severity === 'action_required',
          provider_wip_impact: 'excluded_repo_gate'
        }
      },
      null,
      2
    ),
    'utf8'
  );
}
