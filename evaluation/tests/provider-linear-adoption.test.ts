import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';

import {
  buildProviderLinearAdoptionEvalReport,
  validateProviderLinearAdoptionEvalReport
} from '../../scripts/provider-linear-adoption-eval.mjs';

const fixtureRoot = path.join(process.cwd(), 'evaluation', 'fixtures', 'provider-linear-adoption');
const tempDirs: string[] = [];
const execFileAsync = promisify(execFile);

afterAll(async () => {
  for (const dir of tempDirs) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function copyFixture(fixtureName: string): Promise<{ root: string; fixtureDir: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'provider-linear-adoption-'));
  tempDirs.push(root);
  const fixtureDir = path.join(root, fixtureName);
  await fs.cp(path.join(fixtureRoot, fixtureName), fixtureDir, { recursive: true });
  return { root, fixtureDir };
}

async function mutateJson(
  filePath: string,
  mutate: (value: Record<string, unknown>) => void
): Promise<void> {
  const value = JSON.parse(await fs.readFile(filePath, 'utf8')) as Record<string, unknown>;
  mutate(value);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('provider-linear adoption eval', () => {
  it('passes the sanitized golden provider adoption fixtures', async () => {
    const report = await buildProviderLinearAdoptionEvalReport({
      fixtureRoot,
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-176'
    });

    expect(validateProviderLinearAdoptionEvalReport(report)).toEqual({
      ok: true,
      failures: []
    });
    expect(report.summary).toMatchObject({
      ok: true,
      total_runs: 5,
      source_0_adopting_runs: 5,
      prompt_pack_adopting_runs: 5,
      prior_experience_runs: 4,
      missing_experience_reason_runs: 1,
      child_lane_launch_count: 2,
      accepted_child_lane_count: 1,
      traceable_follow_up_runs: 1
    });
    expect(report.summary.parallelization_decision_counts).toEqual({
      parallelize_now: 2,
      stay_serial: 3,
      forbid_parallel: 0,
      missing: 0
    });
    const parallelRun = report.runs.find((run) => run.id === 'parallel-child-lane-accepted');
    expect(parallelRun?.metrics.parallelization.child_lane_acceptance_states).toContain('accepted');
    expect(parallelRun?.metrics.parallelization.successful_same_turn_child_lane_count).toBe(1);
    const co184Run = report.runs.find((run) => run.id === 'co184-helper-preflight-smooth-path');
    expect(co184Run?.metrics.helper_constraints.required).toBe(true);
    expect(co184Run?.metrics.helper_constraints.zero_byte_advisory_evidence).toBe(true);
    expect(co184Run?.metrics.helper_constraints.zero_byte_advisory_lane_count).toBe(1);
    expect(co184Run?.metrics.parallelization.child_lane_acceptance_states).toContain('rejected');
  });

  it('fails when stay_serial is used while a safe child-lane candidate remains', async () => {
    const { root, fixtureDir } = await copyFixture('justified-serial-review-run');
    await mutateJson(path.join(fixtureDir, 'prompt-artifacts.json'), (value) => {
      const evalConfig = value.eval as Record<string, unknown>;
      const parallelization = evalConfig.parallelization as Record<string, unknown>;
      parallelization.safe_independent_child_lane_candidates = 1;
    });

    const report = await buildProviderLinearAdoptionEvalReport({
      fixtureRoot: root,
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-176-bad-serial'
    });

    expect(report.summary.ok).toBe(false);
    expect(report.summary.failures).toContain(
      'justified-serial-review-run: stay_serial used while safe independent child-lane candidates remain'
    );
  });

  it('fails when parallelize_now lacks same-turn successful child-lane proof', async () => {
    const { root, fixtureDir } = await copyFixture('parallel-child-lane-accepted');
    await mutateJson(path.join(fixtureDir, 'provider-linear-worker-proof.json'), (value) => {
      value.child_lanes = [];
      const parallelization = value.parallelization as Record<string, unknown>;
      parallelization.child_lane_count = 0;
    });

    const report = await buildProviderLinearAdoptionEvalReport({
      fixtureRoot: root,
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-176-no-child-lane'
    });

    expect(report.summary.ok).toBe(false);
    expect(report.summary.failures).toEqual(
      expect.arrayContaining([
        'parallel-child-lane-accepted: parallelize_now lacks successful same-turn child-lane proof',
        'parallel-child-lane-accepted: parallelize_now lacks accepted child-lane proof'
      ])
    );
  });

  it('fails when parallelize_now only has stale accepted child-lane proof', async () => {
    const { root, fixtureDir } = await copyFixture('parallel-child-lane-accepted');
    await mutateJson(path.join(fixtureDir, 'provider-linear-worker-proof.json'), (value) => {
      const [acceptedLane] = value.child_lanes as Array<Record<string, unknown>>;
      value.child_lanes = [
        {
          ...acceptedLane,
          launched_at: '2026-04-14T00:40:00.000Z',
          decision_at: '2026-04-14T00:40:30.000Z'
        },
        {
          ...acceptedLane,
          stream: 'fixture-eval-tests-current-turn',
          launched_at: '2026-04-14T00:42:00.000Z',
          decision: 'pending',
          decision_at: null
        }
      ];
      const parallelization = value.parallelization as Record<string, unknown>;
      parallelization.child_lane_count = 2;
    });

    const report = await buildProviderLinearAdoptionEvalReport({
      fixtureRoot: root,
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-176-stale-accepted-child-lane'
    });

    const parallelRun = report.runs.find((run) => run.id === 'parallel-child-lane-accepted');
    expect(parallelRun?.metrics.parallelization.successful_same_turn_child_lane_count).toBe(1);
    expect(parallelRun?.metrics.parallelization.accepted_child_lane_count).toBe(0);
    expect(parallelRun?.metrics.parallelization.historical_accepted_child_lane_count).toBe(1);
    expect(report.summary.failures).toContain(
      'parallel-child-lane-accepted: parallelize_now lacks accepted child-lane proof'
    );
  });

  it('fails when zero-byte advisory evidence is self-reported without proof-backed lane state', async () => {
    const { root, fixtureDir } = await copyFixture('co184-helper-preflight-smooth-path');
    await mutateJson(path.join(fixtureDir, 'provider-linear-worker-proof.json'), (value) => {
      const [advisoryLane] = value.child_lanes as Array<Record<string, unknown>>;
      value.child_lanes = [
        {
          ...advisoryLane,
          decision: 'pending',
          decision_at: null,
          decision_reason: null
        }
      ];
    });

    const report = await buildProviderLinearAdoptionEvalReport({
      fixtureRoot: root,
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-185-unproven-zero-byte-advisory'
    });

    expect(report.summary.ok).toBe(false);
    expect(report.summary.failures).toContain(
      'co184-helper-preflight-smooth-path: helper constraints do not classify zero-byte child lanes as advisory evidence'
    );
  });

  it('fails when source-0 prompt adoption artifacts disappear', async () => {
    const { root, fixtureDir } = await copyFixture('memory-adopting-run');
    await mutateJson(path.join(fixtureDir, 'prompt-artifacts.json'), (value) => {
      const source0 = value.source_0 as Record<string, unknown>;
      source0.included_in_provider_prompt = false;
    });

    const report = await buildProviderLinearAdoptionEvalReport({
      fixtureRoot: root,
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-176-no-memory'
    });

    expect(report.summary.ok).toBe(false);
    expect(report.summary.failures).toContain(
      'memory-adopting-run: source_0 prompt artifact metadata is missing or not included'
    );
  });

  it('fails when source_0 prompt source_path does not match the manifest', async () => {
    const { root, fixtureDir } = await copyFixture('memory-adopting-run');
    await mutateJson(path.join(fixtureDir, 'prompt-artifacts.json'), (value) => {
      const source0 = value.source_0 as Record<string, unknown>;
      source0.source_path = '.runs/linear-memory-adopting-run/cli/wrong/source-0/source.txt';
    });

    const report = await buildProviderLinearAdoptionEvalReport({
      fixtureRoot: root,
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-176-wrong-source-path'
    });

    expect(report.summary.ok).toBe(false);
    expect(report.summary.source_0_adopting_runs).toBe(0);
    expect(report.summary.failures).toContain(
      'memory-adopting-run: source_0 prompt metadata does not match manifest descriptor'
    );
  });

  it('runs directly when the script path contains spaces', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'provider adoption eval-'));
    tempDirs.push(root);
    const scriptPath = path.join(root, 'provider adoption eval.mjs');
    const outputPath = path.join(root, 'report.json');
    await fs.copyFile(
      path.join(process.cwd(), 'scripts', 'provider-linear-adoption-eval.mjs'),
      scriptPath
    );

    const { stdout } = await execFileAsync(process.execPath, [
      scriptPath,
      '--fixtures',
      fixtureRoot,
      '--output',
      outputPath
    ]);

    expect(stdout).toContain('Provider-linear adoption eval passed.');
    const report = JSON.parse(await fs.readFile(outputPath, 'utf8')) as {
      summary: { ok: boolean; total_runs: number };
    };
    expect(report.summary).toMatchObject({ ok: true, total_runs: 5 });
  });

  it('fails when required follow-up shaping and related-link traceability disappear', async () => {
    const { root, fixtureDir } = await copyFixture('guarded-follow-up-creation');
    await mutateJson(path.join(fixtureDir, 'prompt-artifacts.json'), (value) => {
      const followUpTrace = value.follow_up_trace as Record<string, unknown>;
      followUpTrace.related_link_present = false;
      followUpTrace.intent_checksum = false;
    });

    const report = await buildProviderLinearAdoptionEvalReport({
      fixtureRoot: root,
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-176-bad-follow-up'
    });

    expect(report.summary.ok).toBe(false);
    expect(report.summary.failures).toEqual(
      expect.arrayContaining([
        'guarded-follow-up-creation: follow-up trace lacks related link evidence',
        'guarded-follow-up-creation: follow-up trace missing issue-shaping fields intent_checksum'
      ])
    );
  });
});
