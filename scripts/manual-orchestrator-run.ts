#!/usr/bin/env ts-node
/**
 * Ad-hoc harness that executes the Codex orchestrator against the local repo
 * so we can inspect real run artifacts (lint + tests) when evaluating improvements.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exec as execCallback } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  TaskManager,
  FunctionalPlannerAgent,
  FunctionalBuilderAgent,
  FunctionalTesterAgent,
  FunctionalReviewerAgent,
  EventBus,
  stageArtifacts,
  type TaskContext,
  type PlanResult,
  type BuildResult,
  type TestResult
} from '../orchestrator/src/index.js';

const execAsync = promisify(execCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = process.cwd();
const manualRunsDir = path.join(repoRoot, '.runs', 'manual-orchestrator');

async function ensureDir(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
}

async function runCommand(command: string, args: string[], logName: string) {
  await ensureDir(manualRunsDir);
  const logPath = path.join(manualRunsDir, logName);
  try {
    const { stdout, stderr } = await execAsync([command, ...args].join(' '), {
      cwd: repoRoot,
      maxBuffer: 20 * 1024 * 1024,
      env: process.env
    });
    await fs.writeFile(logPath, `${stdout}\n${stderr}`, 'utf8');
    return {
      ok: true as const,
      logPath
    };
  } catch (error: any) {
    const stdout = error?.stdout ?? '';
    const stderr = error?.stderr ?? '';
    await fs.writeFile(logPath, `${stdout}\n${stderr}`, 'utf8');
    return {
      ok: false as const,
      logPath,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

async function main(): Promise<void> {
  const task: TaskContext = {
    id: 'repo-improvement-review',
    title: 'Evaluate repository health for improvement opportunities',
    description: 'Run lint/test via orchestrator to collect diagnostics before proposing improvements.'
  };

  const planner = new FunctionalPlannerAgent(async (): Promise<PlanResult> => ({
    items: [
      {
        id: 'lint-and-test',
        description: 'Run npm lint and test suites to surface issues before review'
      }
    ],
    notes: 'Single pass pipeline exercising lint and tests.'
  }));

  const builder = new FunctionalBuilderAgent(async ({ target, mode, runId, task }): Promise<BuildResult> => {
    const lintResult = await runCommand('npm', ['run', 'lint'], 'lint.log');
    const notes: string[] = [];
    if (lintResult.ok) {
      notes.push('npm run lint succeeded');
    } else {
      notes.push(`npm run lint failed: ${lintResult.error?.message ?? 'unknown error'}`);
    }

    const artifacts = await stageArtifacts({
      taskId: task.id,
      runId,
      artifacts: [
        {
          path: path.relative(repoRoot, lintResult.logPath),
          description: 'npm run lint output'
        }
      ]
    });

    return {
      subtaskId: target.id,
      artifacts,
      mode,
      notes: notes.join('\n'),
      success: lintResult.ok,
      runId
    };
  });

  const tester = new FunctionalTesterAgent(async ({ build, mode, runId, task }): Promise<TestResult> => {
    const testResult = await runCommand('npm', ['run', 'test'], 'test.log');
    const [stagedTestLog] = await stageArtifacts({
      taskId: task.id,
      runId,
      artifacts: [
        {
          path: path.relative(repoRoot, testResult.logPath),
          description: 'npm run test output'
        }
      ]
    });
    return {
      subtaskId: build.subtaskId,
      success: testResult.ok,
      reports: [
        {
          name: 'npm run test',
          status: testResult.ok ? 'passed' : 'failed',
          details: `See ${stagedTestLog.path}`
        }
      ],
      runId
    };
  });

  const reviewer = new FunctionalReviewerAgent(async ({ build, test }): Promise<{
    summary: string;
    decision: { approved: boolean; feedback?: string };
  }> => {
    const lintSucceeded = build.notes?.includes('npm run lint succeeded') ?? false;
    const summaryLines = [
      `Target subtask: ${build.subtaskId}`,
      build.notes ?? 'No builder notes recorded.',
      `Test status: ${test.success ? 'passed' : 'failed'}`
    ];
    const feedback: string[] = [];
    if (!lintSucceeded) {
      feedback.push('Lint run reported issues — inspect lint log artifact.');
    }
    if (!test.success) {
      feedback.push('Tests failed — inspect test log artifact.');
    }
    return {
      summary: summaryLines.join('\n'),
      decision: {
        approved: lintSucceeded && test.success,
        feedback: feedback.length > 0 ? feedback.join(' ') : undefined
      }
    };
  });

  const eventBus = new EventBus();
  eventBus.on('plan:completed', (event) => {
    console.log('[orchestrator] plan completed:', event.payload.plan.items.map((item) => item.id).join(', '));
  });
  eventBus.on('build:completed', (event) => {
    console.log('[orchestrator] build completed:', event.payload.build.notes ?? '<no notes>');
  });
  eventBus.on('test:completed', (event) => {
    console.log('[orchestrator] test completed:', event.payload.test.success ? 'success' : 'failure');
  });
  eventBus.on('review:completed', (event) => {
    console.log('[orchestrator] review summary:\n', event.payload.review.summary);
  });

  const manager = new TaskManager({
    planner,
    builder,
    tester,
    reviewer,
    eventBus,
    persistence: {
      autoStart: true
    }
  });

  const runSummary = await manager.execute(task);
  console.log('\nFinal run summary:');
  console.log(JSON.stringify(runSummary, null, 2));
  manager.dispose();

  console.log(`\nArtifacts written under: ${path.relative(repoRoot, manualRunsDir)}`);
}

main().catch((error) => {
  console.error('[manual orchestrator run] failed:', error);
  process.exitCode = 1;
});
