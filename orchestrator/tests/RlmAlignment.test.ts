import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  AlignmentChecker,
  AlignmentLedgerWriter,
  __test__ as alignmentTest,
  evaluateConsensus,
  scoreAlignment,
  shouldRunDeepAudit
} from '../src/cli/rlm/alignment.js';

const { incrementIntentVersion } = alignmentTest;

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('alignment scoring', () => {
  it('maps strong and weak signals to expected policy bands', () => {
    const strong = scoreAlignment({
      contradictions: 0,
      evidence_count: 5,
      verbosity_tokens: 180,
      intent: 'continue',
      risk_level: 'low',
      deep_audit: false
    });

    const weak = scoreAlignment({
      contradictions: 6,
      evidence_count: 0,
      verbosity_tokens: 2200,
      intent: 'fail',
      risk_level: 'high',
      deep_audit: false
    });

    expect(strong.score).toBeGreaterThanOrEqual(85);
    expect(strong.action).toBe('pass');
    expect(weak.score).toBeLessThan(50);
    expect(weak.action).toBe('block_escalate');
  });

  it('triggers deep audit from tuned contradiction and override thresholds', () => {
    const contradicted = shouldRunDeepAudit({
      contradictions: 2,
      override_streak: 0,
      risk_level: 'low',
      low_consensus_confidence: false
    });
    const overrideStreak = shouldRunDeepAudit({
      contradictions: 0,
      override_streak: 2,
      risk_level: 'low',
      low_consensus_confidence: false
    });

    expect(contradicted.triggered).toBe(true);
    expect(contradicted.reasons).toContain('contradictions');
    expect(overrideStreak.triggered).toBe(true);
    expect(overrideStreak.reasons).toContain('override_streak');
  });

  it('enforces consensus margin and confidence thresholds', () => {
    const accepted = evaluateConsensus([
      { evaluator_id: 'e1', action: 'replan', confidence: 0.9 },
      { evaluator_id: 'e2', action: 'replan', confidence: 0.82 },
      { evaluator_id: 'e3', action: 'nudge', confidence: 0.56 }
    ]);
    const rejected = evaluateConsensus([
      { evaluator_id: 'e1', action: 'replan', confidence: 0.72 },
      { evaluator_id: 'e2', action: 'replan', confidence: 0.71 },
      { evaluator_id: 'e3', action: 'nudge', confidence: 0.7 }
    ]);

    expect(accepted.accepted).toBe(true);
    expect(rejected.accepted).toBe(false);
    expect(rejected.reasons).toContain('low_margin');
  });

  it('increments intent version semantics by change level', () => {
    const base = { major: 1, minor: 2, patch: 3, label: '1.2.3' };
    const patch = incrementIntentVersion(base, 'patch');
    const minor = incrementIntentVersion(base, 'minor');
    const major = incrementIntentVersion(base, 'major');

    expect(patch).toEqual({ major: 1, minor: 2, patch: 4, label: '1.2.4' });
    expect(minor).toEqual({ major: 1, minor: 3, patch: 0, label: '1.3.0' });
    expect(major).toEqual({ major: 2, minor: 0, patch: 0, label: '2.0.0' });
  });
});

describe('alignment persistence', () => {
  it('writes hash-chained ledger events and enforces idempotency', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-'));
    const writer = new AlignmentLedgerWriter({
      repoRoot: tempDir,
      runDir: join(tempDir, 'rlm')
    });

    const first = await writer.append({
      thread_id: 't1',
      task_id: 'task',
      run_id: 'run',
      agent_id: 'agent',
      event_type: 'sentinel',
      intent_version: '1.0.1',
      payload: { turn: 1 },
      score_metadata: { action: 'pass', score: 92, confidence: 0.98 },
      provenance: { source: 'test', route_strategy: 'sentinel', route_model: 'gpt-5.3-spark' },
      idempotency_key: 'event:1'
    });
    const duplicate = await writer.append({
      thread_id: 't1',
      task_id: 'task',
      run_id: 'run',
      agent_id: 'agent',
      event_type: 'sentinel',
      intent_version: '1.0.1',
      payload: { turn: 1 },
      score_metadata: { action: 'pass', score: 92, confidence: 0.98 },
      provenance: { source: 'test', route_strategy: 'sentinel', route_model: 'gpt-5.3-spark' },
      idempotency_key: 'event:1'
    });
    const second = await writer.append({
      thread_id: 't1',
      task_id: 'task',
      run_id: 'run',
      agent_id: 'agent',
      event_type: 'deep_audit',
      intent_version: '1.0.2',
      payload: { turn: 2 },
      score_metadata: { action: 'replan', score: 63, confidence: 0.82 },
      provenance: { source: 'test', route_strategy: 'deep_audit', route_model: 'gpt-5.3-codex' },
      idempotency_key: 'event:2'
    });

    expect(first).toBeTruthy();
    expect(duplicate).toBeNull();
    expect(second).toBeTruthy();
    expect(second?.prev_hash).toBe(first?.hash);

    const summary = writer.summary();
    expect(summary.events).toBe(2);

    const ledgerPath = join(tempDir, summary.ledger_path);
    const projectionPath = join(tempDir, summary.projection_path);
    const ledgerRaw = await readFile(ledgerPath, 'utf8');
    const projectionRaw = await readFile(projectionPath, 'utf8');

    const lines = ledgerRaw.trim().split(/\r?\n/u);
    expect(lines.length).toBe(2);
    expect(projectionRaw).toContain('"events": 2');
  });
});

describe('alignment checker fallback policy', () => {
  it('requires confirmation and blocks in enforce mode when high reasoning is unavailable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-checker-'));
    const checker = new AlignmentChecker({
      enabled: true,
      enforce: true,
      repo_root: tempDir,
      run_dir: join(tempDir, 'rlm'),
      task_id: 'task-1',
      run_id: 'run-1',
      thread_id: 'thread-1',
      agent_id: 'agent-1',
      goal: 'verify policy',
      policy: {
        route: {
          high_reasoning_available: false
        }
      }
    });

    const evaluation = await checker.evaluateTurn({
      turn: 1,
      intent: 'final',
      planner_prompt_bytes: 2048,
      planner_errors: [],
      read_count: 1,
      search_count: 1,
      subcall_count: 1,
      risk_level: 'high',
      evidence_refs: ['ctx:obj#chunk:1']
    });

    expect(evaluation).toBeTruthy();
    expect(evaluation?.decision.requires_confirmation).toBe(true);
    expect(evaluation?.enforce_block).toBe(true);

    const finalSummary = await checker.finalize();
    expect(finalSummary?.enabled).toBe(true);
    expect(finalSummary?.requires_confirmation_count).toBe(1);
  });

  it('triggers deep audit on the turn that reaches the override streak threshold', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-checker-'));
    const checker = new AlignmentChecker({
      enabled: true,
      enforce: false,
      repo_root: tempDir,
      run_dir: join(tempDir, 'rlm'),
      task_id: 'task-override-streak',
      run_id: 'run-override-streak',
      thread_id: 'thread-override-streak',
      agent_id: 'agent-override-streak',
      goal: 'override streak trigger'
    });

    const turn1 = await checker.evaluateTurn({
      turn: 1,
      intent: 'continue',
      planner_prompt_bytes: 1200,
      planner_errors: ['minor contradiction'],
      read_count: 0,
      search_count: 0,
      subcall_count: 0,
      risk_level: 'medium',
      evidence_refs: ['ctx:obj#chunk:override-1']
    });
    const turn2 = await checker.evaluateTurn({
      turn: 2,
      intent: 'continue',
      planner_prompt_bytes: 1200,
      planner_errors: ['minor contradiction'],
      read_count: 0,
      search_count: 0,
      subcall_count: 0,
      risk_level: 'medium',
      evidence_refs: ['ctx:obj#chunk:override-2']
    });

    expect(turn1?.decision.action).not.toBe('pass');
    expect(turn1?.decision.deep_audit).toBe(false);
    expect(turn2?.decision.deep_audit).toBe(true);
    expect(turn2?.decision.deep_audit_reasons).toContain('override_streak');
  });

  it('records a 20-turn consensus snapshot', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-checker-'));
    const checker = new AlignmentChecker({
      enabled: true,
      enforce: false,
      repo_root: tempDir,
      run_dir: join(tempDir, 'rlm'),
      task_id: 'task-2',
      run_id: 'run-2',
      thread_id: 'thread-2',
      agent_id: 'agent-2',
      goal: 'run snapshot'
    });

    const evaluation = await checker.evaluateTurn({
      turn: 20,
      intent: 'continue',
      planner_prompt_bytes: 800,
      planner_errors: [],
      read_count: 1,
      search_count: 1,
      subcall_count: 1,
      risk_level: 'low',
      evidence_refs: ['ctx:obj#chunk:2']
    });

    expect(evaluation?.decision.consensus_snapshot).toBeDefined();
    expect(evaluation?.decision.consensus_snapshot?.turn).toBe(20);
  });

  it('keeps confirmation required after failed consensus until a later accepted snapshot', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-checker-'));
    const checker = new AlignmentChecker({
      enabled: true,
      enforce: false,
      repo_root: tempDir,
      run_dir: join(tempDir, 'rlm'),
      task_id: 'task-consensus-lock',
      run_id: 'run-consensus-lock',
      thread_id: 'thread-consensus-lock',
      agent_id: 'agent-consensus-lock',
      goal: 'confirmation lock behavior'
    });

    const failedConsensus = await checker.evaluateTurn({
      turn: 20,
      intent: 'continue',
      planner_prompt_bytes: 8000,
      planner_errors: Array.from({ length: 6 }, (_, index) => `contradiction-${index + 1}`),
      read_count: 0,
      search_count: 0,
      subcall_count: 0,
      risk_level: 'low',
      evidence_refs: ['ctx:obj#chunk:consensus-20']
    });
    expect(failedConsensus?.decision.consensus_snapshot?.accepted).toBe(false);
    expect(failedConsensus?.decision.requires_confirmation).toBe(true);

    const turn21 = await checker.evaluateTurn({
      turn: 21,
      intent: 'continue',
      planner_prompt_bytes: 500,
      planner_errors: [],
      read_count: 2,
      search_count: 1,
      subcall_count: 1,
      risk_level: 'low',
      evidence_refs: ['ctx:obj#chunk:consensus-21']
    });
    expect(turn21?.decision.requires_confirmation).toBe(true);
    expect(turn21?.decision.confidence_gate_passed).toBe(false);

    const acceptedConsensus = await checker.evaluateTurn({
      turn: 40,
      intent: 'continue',
      planner_prompt_bytes: 500,
      planner_errors: [],
      read_count: 2,
      search_count: 1,
      subcall_count: 1,
      risk_level: 'low',
      evidence_refs: ['ctx:obj#chunk:consensus-40']
    });
    expect(acceptedConsensus?.decision.consensus_snapshot?.accepted).toBe(true);

    const turn41 = await checker.evaluateTurn({
      turn: 41,
      intent: 'continue',
      planner_prompt_bytes: 500,
      planner_errors: [],
      read_count: 2,
      search_count: 1,
      subcall_count: 1,
      risk_level: 'low',
      evidence_refs: ['ctx:obj#chunk:consensus-41']
    });
    expect(turn41?.decision.requires_confirmation).toBe(false);
    expect(turn41?.decision.confidence_gate_passed).toBe(true);
  });

  it('keeps projection action totals aligned with turn-level decisions', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-checker-'));
    const checker = new AlignmentChecker({
      enabled: true,
      enforce: false,
      repo_root: tempDir,
      run_dir: join(tempDir, 'rlm'),
      task_id: 'task-3',
      run_id: 'run-3',
      thread_id: 'thread-3',
      agent_id: 'agent-3',
      goal: 'projection consistency'
    });

    await checker.evaluateTurn({
      turn: 1,
      intent: 'continue',
      planner_prompt_bytes: 600,
      planner_errors: [],
      read_count: 1,
      search_count: 1,
      subcall_count: 1,
      risk_level: 'low',
      evidence_refs: ['ctx:obj#chunk:3']
    });
    await checker.evaluateTurn({
      turn: 2,
      intent: 'final',
      planner_prompt_bytes: 900,
      planner_errors: [],
      read_count: 1,
      search_count: 0,
      subcall_count: 1,
      risk_level: 'high',
      evidence_refs: ['ctx:obj#chunk:4']
    });

    const summary = await checker.finalize();
    const projection = JSON.parse(
      await readFile(join(tempDir, 'rlm', 'alignment', 'projection.json'), 'utf8')
    ) as {
      totals: {
        actions: Record<'pass' | 'nudge' | 'replan' | 'block_escalate', number>;
        confirmations: number;
      };
    };

    expect(projection.totals.actions).toEqual(summary?.action_counts);
    expect(projection.totals.confirmations).toBe(summary?.requires_confirmation_count);
  });

  it('does not suppress new runs when the same run directory is reused', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-checker-'));
    const runDir = join(tempDir, 'rlm');

    const execute = async () => {
      const checker = new AlignmentChecker({
        enabled: true,
        enforce: false,
        repo_root: tempDir ?? '',
        run_dir: runDir,
        task_id: 'task-4',
        run_id: 'rlm-adhoc',
        thread_id: 'thread-4',
        agent_id: 'agent-4',
        goal: 'reuse run dir'
      });
      await checker.evaluateTurn({
        turn: 1,
        intent: 'continue',
        planner_prompt_bytes: 400,
        planner_errors: [],
        read_count: 1,
        search_count: 0,
        subcall_count: 0,
        risk_level: 'low',
        evidence_refs: ['ctx:obj#chunk:5']
      });
      await checker.finalize();
    };

    await execute();
    const firstLedger = await readFile(join(runDir, 'alignment', 'ledger.jsonl'), 'utf8');
    const firstCount = firstLedger.trim().split(/\r?\n/u).length;

    await execute();
    const secondLedger = await readFile(join(runDir, 'alignment', 'ledger.jsonl'), 'utf8');
    const secondCount = secondLedger.trim().split(/\r?\n/u).length;

    expect(firstCount).toBeGreaterThan(0);
    expect(secondCount).toBeGreaterThan(firstCount);
  });

  it('deduplicates replayed turns for the same unfinished run', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-checker-'));
    const runDir = join(tempDir, 'rlm');

    const evaluateTurnOne = async () => {
      const checker = new AlignmentChecker({
        enabled: true,
        enforce: false,
        repo_root: tempDir ?? '',
        run_dir: runDir,
        task_id: 'task-5',
        run_id: 'rlm-retry',
        thread_id: 'thread-5',
        agent_id: 'agent-5',
        goal: 'retry idempotency'
      });
      await checker.evaluateTurn({
        turn: 1,
        intent: 'continue',
        planner_prompt_bytes: 420,
        planner_errors: [],
        read_count: 1,
        search_count: 0,
        subcall_count: 0,
        risk_level: 'low',
        evidence_refs: ['ctx:obj#chunk:retry']
      });
    };

    await evaluateTurnOne();
    const firstLedger = await readFile(join(runDir, 'alignment', 'ledger.jsonl'), 'utf8');
    const firstCount = firstLedger.trim().split(/\r?\n/u).length;

    await evaluateTurnOne();
    const secondLedger = await readFile(join(runDir, 'alignment', 'ledger.jsonl'), 'utf8');
    const secondCount = secondLedger.trim().split(/\r?\n/u).length;

    expect(firstCount).toBeGreaterThan(0);
    expect(secondCount).toBe(firstCount);
  });

  it('reports zero consensus acceptance when no consensus snapshots run', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-alignment-checker-'));
    const checker = new AlignmentChecker({
      enabled: true,
      enforce: false,
      repo_root: tempDir,
      run_dir: join(tempDir, 'rlm'),
      task_id: 'task-6',
      run_id: 'run-6',
      thread_id: 'thread-6',
      agent_id: 'agent-6',
      goal: 'consensus baseline'
    });

    await checker.evaluateTurn({
      turn: 1,
      intent: 'continue',
      planner_prompt_bytes: 420,
      planner_errors: [],
      read_count: 2,
      search_count: 1,
      subcall_count: 0,
      risk_level: 'low',
      evidence_refs: ['ctx:obj#chunk:consensus-baseline']
    });

    const summary = await checker.finalize();
    expect(summary?.consensus_acceptance_rate).toBe(0);
    expect(summary?.rollback_recommended).toBe(false);
  });
});
