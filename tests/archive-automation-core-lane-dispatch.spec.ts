import { readFile } from 'node:fs/promises';

import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

type WorkflowStep = {
  name?: string;
  run?: string;
};

type WorkflowJob = {
  steps?: WorkflowStep[];
};

type WorkflowFile = {
  jobs?: Record<string, WorkflowJob>;
};

type RunIdDiscovery =
  | {
      attempts: number;
      runId: string;
      sleeps: number;
      status: 'found';
    }
  | {
      attempts: number;
      exitCode: number;
      sleeps: number;
      status: 'ambiguous';
    }
  | {
      attempts: number;
      sleeps: number;
      status: 'not-found';
    };

async function readWorkflow(path: string): Promise<WorkflowFile> {
  const parsed = load(await readFile(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${path} must parse as a workflow object`);
  }
  return parsed as WorkflowFile;
}

async function readArchiveDispatchStep(): Promise<string> {
  const workflow = await readWorkflow('.github/workflows/archive-automation-base.yml');
  const step = workflow.jobs?.archive?.steps?.find(
    (candidate) => candidate.name === 'Dispatch Core Lane for archive PR'
  );

  if (!step?.run) {
    throw new Error('Missing archive workflow Core Lane dispatch step');
  }

  return step.run;
}

function findPostBaselineRunId(baselineRunIds: string[], visibleRunIds: string[]) {
  const baseline = new Set(baselineRunIds.filter(Boolean));
  const candidates = visibleRunIds.filter((runId) => runId && !baseline.has(runId));

  if (candidates.length > 1) {
    return {
      exitCode: 2 as const,
      status: 'ambiguous' as const
    };
  }

  if (candidates.length === 1) {
    return {
      runId: candidates[0],
      status: 'found' as const
    };
  }

  return {
    status: 'not-found' as const
  };
}

function pollForDispatchedRunId(options: {
  baselineRunIds: string[];
  maxAttempts?: number;
  visibleRunIdsByAttempt: string[][];
}): RunIdDiscovery {
  const maxAttempts = options.maxAttempts ?? 40;
  let sleeps = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const visibleRunIds =
      options.visibleRunIdsByAttempt[Math.min(attempt - 1, options.visibleRunIdsByAttempt.length - 1)] ??
      [];
    const discovery = findPostBaselineRunId(options.baselineRunIds, visibleRunIds);

    if (discovery.status === 'ambiguous') {
      return {
        attempts: attempt,
        exitCode: discovery.exitCode,
        sleeps,
        status: 'ambiguous'
      };
    }

    if (discovery.status === 'found') {
      return {
        attempts: attempt,
        runId: discovery.runId,
        sleeps,
        status: 'found'
      };
    }

    if (attempt < maxAttempts) {
      sleeps += 1;
    }
  }

  return {
    attempts: maxAttempts,
    sleeps,
    status: 'not-found'
  };
}

describe('archive automation Core Lane dispatch discovery', () => {
  it('exits discovery as soon as exactly one post-baseline run id is visible', async () => {
    const run = await readArchiveDispatchStep();
    const result = pollForDispatchedRunId({
      baselineRunIds: ['1001', '1002'],
      visibleRunIdsByAttempt: [
        ['1001', '1002'],
        ['1001', '1002', '2001'],
        ['1001', '1002', '2001'],
        ['1001', '1002', '2001']
      ]
    });

    expect(result).toEqual({
      attempts: 2,
      runId: '2001',
      sleeps: 1,
      status: 'found'
    });

    const runDiscovery = run.indexOf('CANDIDATE_RUN_ID="$(find_dispatched_run_id)"');
    const candidateCapture = run.indexOf('RUN_ID="${CANDIDATE_RUN_ID}"', runDiscovery);
    const afterDiscoveryLoop = run.indexOf('if [ -z "${RUN_ID}" ]; then', candidateCapture);
    const discoveryLoopAfterCandidate = run.slice(candidateCapture, afterDiscoveryLoop);
    const breakAfterCandidate = discoveryLoopAfterCandidate.indexOf('break');
    const sleepAfterCandidate = discoveryLoopAfterCandidate.indexOf('sleep 15');

    expect(runDiscovery).toBeGreaterThan(run.indexOf('gh workflow run core-lane.yml'));
    expect(candidateCapture).toBeGreaterThan(runDiscovery);
    expect(afterDiscoveryLoop).toBeGreaterThan(candidateCapture);
    expect(breakAfterCandidate).toBeGreaterThanOrEqual(0);
    if (sleepAfterCandidate !== -1) {
      expect(breakAfterCandidate).toBeLessThan(sleepAfterCandidate);
    }
  });

  it('keeps multiple post-baseline matching run ids as an ambiguity failure', async () => {
    const run = await readArchiveDispatchStep();
    const result = pollForDispatchedRunId({
      baselineRunIds: ['1001', '1002'],
      visibleRunIdsByAttempt: [['1001', '1002', '2001', '2002']]
    });

    expect(result).toEqual({
      attempts: 1,
      exitCode: 2,
      sleeps: 0,
      status: 'ambiguous'
    });

    const discoveryFunctionStart = run.indexOf('find_dispatched_run_id()');
    const nextSectionStart = run.indexOf('ACTIONS_URL=', discoveryFunctionStart);
    const discoveryFunction = run.slice(discoveryFunctionStart, nextSectionStart);
    const ambiguityMessage = discoveryFunction.indexOf(
      'Multiple new Core Lane workflow_dispatch runs matched'
    );
    const ambiguityExit = discoveryFunction.indexOf('return 2', ambiguityMessage);

    expect(discoveryFunctionStart).toBeGreaterThanOrEqual(0);
    expect(nextSectionStart).toBeGreaterThan(discoveryFunctionStart);
    expect(ambiguityMessage).toBeGreaterThanOrEqual(0);
    expect(ambiguityExit).toBeGreaterThan(ambiguityMessage);
  });
});
