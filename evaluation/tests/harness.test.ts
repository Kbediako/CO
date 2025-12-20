import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { applyRewarders, loadScenarios, runAllScenarios, runLearningSchedule, runScenario } from '../harness/index.js';
import type { EvaluationScenario, EvaluationScenarioResult, ScenarioGoalResult } from '../harness/types.js';
import type { AdapterGoal } from '../../adapters/types.js';

const tempDirs: string[] = [];

afterAll(async () => {
  for (const dir of tempDirs) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe('evaluation harness', () => {
  it('loads registered scenarios from disk', async () => {
    const scenarios = await loadScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(2);
    expect(scenarios.map((s) => s.id)).toContain('typescript-smoke');
  });

  it('runs the TypeScript smoke scenario successfully', async () => {
    const result = await runScenario('typescript-smoke', { mode: 'mcp' });
    const goalStatuses = result.goals.map((goal) => goal.status);
    expect(goalStatuses.every((status) => status === 'passed')).toBe(true);
  });

  it('runs backend-api-opt with diff-match assertions', async () => {
    const result = await runScenario('backend-api-opt', { mode: 'mcp' });
    expect(result.goals.map((goal) => goal.status)).toEqual(['passed']);
    expect(result.patternAssertions.length).toBeGreaterThan(0);
    expect(result.patternAssertions[0]?.assertion.type).toBe('diff-match');
    expect(result.patternAssertions[0]?.status).toBe('passed');
  }, 60000);

  it('writes results when outputDir is provided', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-eval-test-'));
    tempDirs.push(outputDir);

    const results = await runAllScenarios({ outputDir, mode: 'mcp' });
    expect(results.length).toBeGreaterThanOrEqual(2);

    for (const scenario of results) {
      const artifactPath = path.join(outputDir, `${scenario.scenario.id}.json`);
      const exists = await fs.access(artifactPath).then(
        () => true,
        () => false
      );
      expect(exists).toBe(true);
    }
  }, 60000);

  it('marks goals failed on timeout without crashing', async () => {
    const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-eval-timeout-'));
    tempDirs.push(fixtureDir);

    const scenario: EvaluationScenario = {
      id: 'timeout-inline',
      title: 'Timeout Inline Scenario',
      adapterId: 'typescript-default',
      goals: ['build'],
      fixture: { path: fixtureDir },
      overrides: {
        build: {
          command: process.execPath,
          args: ['-e', 'setTimeout(()=>{}, 1000)'],
          timeoutMs: 50
        }
      }
    };

    const result = await runScenario(scenario, { mode: 'mcp' });
    expect(result.goals[0]?.status).toBe('failed');
    expect(result.goals[0]?.error).toMatch(/timed out/i);
  });

  it('fails loudly on unknown pattern assertion types', async () => {
    const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-eval-unknown-assertion-'));
    tempDirs.push(fixtureDir);

    const scenario = {
      id: 'unknown-assertion-inline',
      title: 'Unknown Assertion Inline Scenario',
      adapterId: 'typescript-default',
      goals: ['build'],
      fixture: { path: fixtureDir },
      overrides: {
        build: {
          command: process.execPath,
          args: ['-e', 'process.exit(0)'],
          timeoutMs: 5000
        }
      },
      patternAssertions: [
        {
          type: 'unknown-assertion',
          scope: 'fixture',
          path: 'README.md'
        }
      ]
    };

    await expect(runScenario(scenario as unknown as EvaluationScenario, { mode: 'mcp' })).rejects.toThrow(
      /Unknown pattern assertion type/i
    );
  });

  it('avoids mutating source fixtures when agentTask is present', async () => {
    const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-eval-agenttask-source-'));
    tempDirs.push(fixtureDir);

    await fs.writeFile(path.join(fixtureDir, 'hello.txt'), 'baseline', 'utf8');

    const scenario: EvaluationScenario = {
      id: 'agenttask-copy-inline',
      title: 'AgentTask Copy Inline Scenario',
      adapterId: 'typescript-default',
      goals: ['build'],
      fixture: { path: fixtureDir },
      agentTask: {
        instruction: 'WRITE|hello.txt|mutated'
      },
      overrides: {
        build: {
          command: process.execPath,
          args: ['-e', 'process.exit(0)'],
          timeoutMs: 5000,
          requiresCleanFixture: false,
          useEvaluationDefaults: false
        }
      }
    };

    const result = await runScenario(scenario, { mode: 'mcp' });
    expect(result.fixturePath).not.toBe(fixtureDir);

    const persisted = await fs.readFile(path.join(fixtureDir, 'hello.txt'), 'utf8');
    expect(persisted).toBe('baseline');
  });

  it('derives exact-match GT scores via rewarders', () => {
    const passing = createScenarioResult('reward-pass', ['passed', 'passed'], [10, 12]);
    const failing = createScenarioResult('reward-fail', ['passed', 'failed'], [5, 8]);

    applyRewarders([passing, failing], ['gt']);

    expect(passing.reward?.gtScore).toBe(1);
    expect(failing.reward?.gtScore).toBeCloseTo(0.5, 3);
    expect(failing.reward?.scores[0]?.evidence).toContain('passed 1/2');
  });

  it('computes relative ranking rewarder scores across a cohort', () => {
    const fast = createScenarioResult('reward-fast', ['passed', 'passed'], [5, 6]);
    fast.tfgrpo = {
      epoch: 1,
      sampleIndex: 0,
      sampleSize: 2,
      temperatureMode: 'train',
      temperature: 0.7,
      scenarioId: fast.scenario.id
    };

    const slow = createScenarioResult('reward-slow', ['passed', 'failed'], [12, 30]);
    slow.tfgrpo = {
      epoch: 1,
      sampleIndex: 1,
      sampleSize: 2,
      temperatureMode: 'train',
      temperature: 0.7,
      scenarioId: slow.scenario.id
    };

    applyRewarders([fast, slow], ['gt', 'relative']);

    expect(fast.reward?.relativeRank).toBe(1);
    expect(slow.reward?.relativeRank).toBe(0);
    expect(fast.reward?.scores.find((score) => score.rewarderId === 'relative')?.evidence).toContain('rank 1/2');
  });

  it('executes the TF-GRPO learning schedule loop with temperature metadata', async () => {
    const schedule = await runLearningSchedule({
      epochs: 3,
      sampleSize: 1,
      rewarders: ['gt'],
      scenarioIds: ['typescript-smoke'],
      rngSeed: 42
    });

    expect(schedule.config.epochs).toBe(3);
    expect(schedule.config.sampleSize).toBe(1);
    expect(schedule.epochs).toHaveLength(3);
    expect(schedule.epochs[2]?.temperatureMode).toBe('eval');

    for (const epoch of schedule.epochs) {
      expect(epoch.samples).toHaveLength(1);
      const sample = epoch.samples[0]!;
      expect(sample.tfgrpo?.epoch).toBe(epoch.epoch);
      expect(sample.tfgrpo?.temperatureMode).toBe(epoch.temperatureMode);
      expect(sample.reward?.gtScore).toBeGreaterThanOrEqual(0);
    }
  }, 90000);
});

function createScenarioResult(
  id: string,
  statuses: Array<'passed' | 'failed'>,
  durations: number[]
): EvaluationScenarioResult {
  const now = new Date().toISOString();
  const goals: ScenarioGoalResult[] = statuses.map((status, index) => {
    const goalId = GOAL_SEQUENCE[index % GOAL_SEQUENCE.length];
    return {
      goal: goalId,
      command: {
        id: goalId,
        title: `Goal ${index}`,
        command: 'echo',
        args: [] as string[],
        description: 'stub',
        env: {} as Record<string, string>,
        cwd: '/tmp',
        requiresCleanFixture: false,
        supportsParallel: true
      },
      status,
      exitCode: status === 'passed' ? 0 : 1,
      stdout: '',
      stderr: '',
      durationMs: durations[index] ?? 0
    } satisfies ScenarioGoalResult;
  });

  return {
    scenario: { id, title: id, adapterId: 'test-adapter' },
    mode: 'mcp',
    fixturePath: `/tmp/${id}`,
    startedAt: now,
    completedAt: now,
    goals,
    patternAssertions: []
  };
}

const GOAL_SEQUENCE: AdapterGoal[] = ['build', 'test', 'lint'];
