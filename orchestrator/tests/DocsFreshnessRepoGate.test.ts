import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
    await mkdir(join(outRoot, 'docs-truthfulness-maintenance'), { recursive: true });
    await writeFile(
      reportPath,
      JSON.stringify({
        repo_gate: {
          severity: 'blocking',
          freshness_decision: 'block_policy_over_budget',
          owner: {
            issue: 'CO-522',
            action: 'update_existing',
            state: 'Blocked',
            state_type: 'started',
            verified: true
          },
          spec_guard: {
            status: 'failed',
            action_required_count: 11
          },
          capacity: {
            status: 'over_budget'
          },
          next_expiry: '2026-05-16',
          action_required_count: 320,
          blocks_unrelated_lanes: false,
          blocks_handoff: true,
          provider_wip_impact: 'excluded_repo_gate'
        }
      }),
      'utf8'
    );
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = outRoot;

    const gate = readDocsFreshnessMaintainRepoGate();

    expect(gate).toMatchObject({
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      owner: {
        issue: 'CO-522',
        action: 'update_existing',
        verified: true
      },
      source_path: reportPath
    });
  });

  it('honors an injected env instead of process env', async () => {
    const repoRoot = await mkTempRoot();
    const outRoot = join(repoRoot, 'artifacts', 'out');
    const reportPath = join(outRoot, 'docs-truthfulness-maintenance', 'docs-freshness-maintenance.json');
    await mkdir(join(outRoot, 'docs-truthfulness-maintenance'), { recursive: true });
    await writeFile(
      reportPath,
      JSON.stringify({
        repo_gate: {
          severity: 'action_required',
          freshness_decision: 'block_terminal_lifecycle',
          owner: {
            issue: 'CO-522',
            action: 'update_existing',
            state: 'Blocked',
            state_type: 'started',
            verified: true
          },
          spec_guard: {
            status: 'succeeded',
            action_required_count: 0
          },
          capacity: {
            status: 'ok'
          },
          next_expiry: null,
          action_required_count: 1,
          blocks_unrelated_lanes: false,
          blocks_handoff: true,
          provider_wip_impact: 'excluded_repo_gate'
        }
      }),
      'utf8'
    );
    process.env.CODEX_ORCHESTRATOR_ROOT = '/missing/process/root';
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = 'missing-out';

    const gate = readDocsFreshnessMaintainRepoGate({
      env: {
        CODEX_ORCHESTRATOR_ROOT: repoRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: outRoot
      } as NodeJS.ProcessEnv
    });

    expect(gate).toMatchObject({
      severity: 'action_required',
      freshness_decision: 'block_terminal_lifecycle',
      source_path: reportPath
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
