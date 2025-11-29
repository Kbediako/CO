import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { CliManifest } from '../cli/types.js';
import { isoTimestamp } from '../cli/utils/time.js';
import { logger } from '../logger.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';
import {
  appendLearningAlert,
  ensureLearningSection,
  updateLearningValidation
} from './manifest.js';

export interface ExecutionHistoryEntry {
  command: string;
  exitCode?: number | null;
  timestamp?: string;
  cwd?: string | null;
}

export interface ScenarioSynthesisOptions {
  manifest: CliManifest;
  taskId: string;
  runId: string;
  runsRoot: string;
  prompt?: string | null;
  diff?: string | null;
  executionHistory?: ExecutionHistoryEntry[];
  templatePath?: string;
  maxAttempts?: number;
  grouping?: { id: string; members: string[]; window_hours?: number } | null;
  alertTargets?: { slack?: string; pagerduty?: string };
  pagerDutySeverity?: 'none' | 'p2' | 'p1';
}

export interface ScenarioSynthesisResult {
  manifest: CliManifest;
  scenarioPath: string | null;
  partialPath: string | null;
}

const DEFAULT_MANUAL_TEMPLATE = '.agent/task/templates/manual-scenario-template.md';

export async function synthesizeScenario(
  options: ScenarioSynthesisOptions
): Promise<ScenarioSynthesisResult> {
  const {
    manifest,
    taskId,
    runId,
    runsRoot,
    prompt = null,
    diff = null,
    executionHistory = [],
    templatePath = DEFAULT_MANUAL_TEMPLATE,
    maxAttempts = 2,
    grouping = null,
    alertTargets,
    pagerDutySeverity = 'none'
  } = options;

  const learning = ensureLearningSection(manifest);
  if (grouping && grouping.members.length > 0) {
    learning.validation = {
      mode: 'grouped',
      grouping,
      status: learning.validation?.status ?? 'pending'
    };
  } else if (!learning.validation) {
    learning.validation = { mode: 'per-task', grouping: null, status: 'pending' };
  }

  const safeTaskId = sanitizeTaskId(taskId);
  const runDir = join(runsRoot, safeTaskId, 'cli', sanitizeRunId(runId));
  const learningDir = join(runDir, 'learning');
  await mkdir(learningDir, { recursive: true });

  const attempts = (learning.scenario?.attempts ?? 0) + 1;
  const inferred = inferEntrypoint(executionHistory, prompt, diff, templatePath);

  if (inferred.command) {
    const scenarioPath = join(learningDir, 'scenario.json');
    const scenarioPayload = buildScenarioPayload(runId, inferred.command, {
      prompt,
      diff,
      executionHistory
    });
    await writeFile(scenarioPath, JSON.stringify(scenarioPayload, null, 2), 'utf8');

    learning.scenario = {
      path: relative(process.cwd(), scenarioPath),
      generated_at: isoTimestamp(),
      source: inferred.source,
      status: 'synthesized',
      attempts,
      partial_path: null,
      manual_template: null,
      approver: null,
      reason: null
    };
    if (learning.validation?.status === 'needs_manual_scenario') {
      updateLearningValidation(manifest, 'pending');
    }
    return { manifest, scenarioPath, partialPath: null };
  }

  if (attempts < maxAttempts) {
    learning.scenario = {
      path: null,
      generated_at: null,
      source: inferred.source,
      status: 'pending',
      attempts,
      partial_path: null,
      manual_template: null,
      approver: null,
      reason: 'insufficient signals; retrying heuristics'
    };
    logger.warn('[learning] scenario heuristics did not resolve entrypoint; will retry');
    return { manifest, scenarioPath: null, partialPath: null };
  }

  const partialScenario = {
    id: `learning-${sanitizeRunId(runId)}`,
    fallback_reason: inferred.reason ?? 'heuristics exhausted',
    prompt,
    diff,
    execution_history: executionHistory
  };
  const partialPath = join(learningDir, 'scenario.partial.json');
  await writeFile(partialPath, JSON.stringify(partialScenario, null, 2), 'utf8');

  learning.scenario = {
    path: null,
    generated_at: null,
    source: inferred.source,
    status: 'needs_manual_scenario',
    attempts,
    partial_path: relative(process.cwd(), partialPath),
    manual_template: templatePath,
    approver: null,
    reason: inferred.reason ?? 'Heuristic synthesis failed twice'
  };
  updateLearningValidation(manifest, 'needs_manual_scenario');
  appendLearningAlert(manifest, {
    type: 'needs_manual_scenario',
    channel: 'slack',
    target: alertTargets?.slack ?? '#learning-alerts',
    message: `Scenario synthesis needs manual input for ${taskId}/${runId}`
  });
  if (pagerDutySeverity && pagerDutySeverity !== 'none') {
    appendLearningAlert(manifest, {
      type: 'needs_manual_scenario',
      channel: 'pagerduty',
      target: alertTargets?.pagerduty ?? 'learning-pipeline',
      message: `Manual scenario required (${pagerDutySeverity}) for ${taskId}/${runId}`
    });
  }

  return { manifest, scenarioPath: null, partialPath: partialScenario ? partialPath : null };
}

function inferEntrypoint(
  executionHistory: ExecutionHistoryEntry[],
  prompt: string | null,
  diff: string | null,
  templatePath: string
): { source: 'execution_history' | 'prompt' | 'diff' | 'template'; command: string | null; reason?: string } {
  const recentSuccess = [...executionHistory].reverse().find((entry) => entry.exitCode === 0 && entry.command);
  if (recentSuccess?.command) {
    return { source: 'execution_history', command: recentSuccess.command };
  }

  const promptCommand = extractCommandFromPrompt(prompt);
  if (promptCommand) {
    return { source: 'prompt', command: promptCommand };
  }

  const diffCommand = extractCommandFromDiff(diff);
  if (diffCommand) {
    return { source: 'diff', command: diffCommand };
  }

  return {
    source: 'template',
    command: null,
    reason: `No command inferred; manual template (${templatePath}) required`
  };
}

function extractCommandFromPrompt(prompt: string | null): string | null {
  if (!prompt) return null;
  const fenced = /`{3,}[^`]*\n([^`]+)\n`{3,}/m.exec(prompt);
  if (fenced?.[1]) {
    const candidate = fenced[1].trim().split('\n').find((line) => line.trim().length > 0);
    if (candidate) return candidate.trim();
  }
  const inline = /`([^`]+)`/.exec(prompt);
  if (inline?.[1]) {
    return inline[1].trim();
  }
  const dollar = /^\s*\$ ([^\n]+)/m.exec(prompt);
  if (dollar?.[1]) {
    return dollar[1].trim();
  }
  return null;
}

function extractCommandFromDiff(diff: string | null): string | null {
  if (!diff) return null;
  const match = /[+-]{3}\s+[ab]\/([^\n\r]+)/.exec(diff);
  const path = match?.[1];
  if (!path) return null;
  const normalized = path.trim();
  const isTest =
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.includes('__tests__') ||
    normalized.endsWith('.snap');
  if (isTest) {
    return `npm test ${normalized}`;
  }
  if (normalized.endsWith('.ts') || normalized.endsWith('.js')) {
    return `npm test -- ${normalized}`;
  }
  return null;
}

function buildScenarioPayload(
  runId: string,
  command: string,
  context: { prompt: string | null; diff: string | null; executionHistory: ExecutionHistoryEntry[] }
): Record<string, unknown> {
  return {
    id: `learning-${sanitizeRunId(runId)}`,
    entrypoint: command,
    commands: [command],
    validation: {
      requiresCleanFixture: true
    },
    context: {
      prompt: context.prompt,
      diff: context.diff,
      execution_history: context.executionHistory
    },
    generated_at: isoTimestamp()
  };
}
