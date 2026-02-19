#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { opendir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import process from 'node:process';

import { CodexOrchestrator } from '../orchestrator/src/cli/orchestrator.js';
import { formatPlanPreview } from '../orchestrator/src/cli/utils/planFormatter.js';
import {
  executeExecCommand,
  type ExecOutputMode
} from '../orchestrator/src/cli/exec/command.js';
import { resolveEnvironmentPaths } from '../scripts/lib/run-manifests.js';
import { runPrWatchMerge } from '../scripts/lib/pr-watch-merge.js';
import { normalizeEnvironmentPaths, sanitizeTaskId } from '../orchestrator/src/cli/run/environment.js';
import { RunEventEmitter } from '../orchestrator/src/cli/events/runEvents.js';
import type { HudController } from '../orchestrator/src/cli/ui/controller.js';
import { evaluateInteractiveGate } from '../orchestrator/src/cli/utils/interactive.js';
import { buildSelfCheckResult } from '../orchestrator/src/cli/selfCheck.js';
import { initCodexTemplates, formatInitSummary } from '../orchestrator/src/cli/init.js';
import {
  runDoctor,
  runDoctorCloudPreflight,
  formatDoctorSummary,
  formatDoctorCloudPreflightSummary
} from '../orchestrator/src/cli/doctor.js';
import { formatDoctorUsageSummary, runDoctorUsage } from '../orchestrator/src/cli/doctorUsage.js';
import { formatDevtoolsSetupSummary, runDevtoolsSetup } from '../orchestrator/src/cli/devtoolsSetup.js';
import { formatCodexCliSetupSummary, runCodexCliSetup } from '../orchestrator/src/cli/codexCliSetup.js';
import { formatDelegationSetupSummary, runDelegationSetup } from '../orchestrator/src/cli/delegationSetup.js';
import { formatSkillsInstallSummary, installSkills, listBundledSkills } from '../orchestrator/src/cli/skills.js';
import { loadPackageInfo } from '../orchestrator/src/cli/utils/packageInfo.js';
import { slugify } from '../orchestrator/src/cli/utils/strings.js';
import { serveMcp } from '../orchestrator/src/cli/mcp.js';
import { formatMcpEnableSummary, runMcpEnable } from '../orchestrator/src/cli/mcpEnable.js';
import { startDelegationServer } from '../orchestrator/src/cli/delegationServer.js';
import { splitDelegationConfigOverrides } from '../orchestrator/src/cli/config/delegationConfig.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';
type ExecutionModeOption = 'mcp' | 'cloud';

interface RunOutputPayload {
  run_id: string;
  status: string;
  artifact_root: string;
  manifest: string;
  log_path: string | null;
  summary: string | null;
  cloud_fallback_reason: string | null;
}

interface FlowOutputPayload {
  status: string;
  failed_stage: 'docs-review' | 'implementation-gate' | null;
  docs_review: RunOutputPayload;
  implementation_gate: RunOutputPayload | null;
}

interface SetupGuidancePayload {
  note: string;
  references: string[];
  recommended_commands: string[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args.shift();
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === '--version' || command === '-v') {
    printVersion();
    return;
  }

  const orchestrator = new CodexOrchestrator();

  try {
    switch (command) {
      case 'start':
        await handleStart(orchestrator, args);
        break;
      case 'frontend-test':
        await handleFrontendTest(orchestrator, args);
        break;
      case 'flow':
        await handleFlow(orchestrator, args);
        break;
      case 'plan':
        await handlePlan(orchestrator, args);
        break;
      case 'rlm':
        await handleRlm(orchestrator, args);
        break;
      case 'resume':
        await handleResume(orchestrator, args);
        break;
      case 'status':
        await handleStatus(orchestrator, args);
        break;
      case 'exec':
        await handleExec(args);
        break;
      case 'self-check':
        await handleSelfCheck(args);
        break;
      case 'init':
        await handleInit(args);
        break;
      case 'setup':
        await handleSetup(args);
        break;
      case 'doctor':
        await handleDoctor(args);
        break;
      case 'codex':
        await handleCodex(args);
        break;
      case 'devtools':
        await handleDevtools(args);
        break;
      case 'skills':
        await handleSkills(args);
        break;
      case 'mcp':
        await handleMcp(args);
        break;
      case 'pr':
        await handlePr(args);
        break;
      case 'delegate-server':
      case 'delegation-server':
        await handleDelegationServer(args);
        break;
      case 'delegation':
        await handleDelegation(args);
        break;
      case 'version':
        printVersion();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exitCode = 1;
    }
  } catch (error) {
    console.error((error as Error)?.message ?? String(error));
    process.exitCode = 1;
  }
}

function parseArgs(raw: string[]): { positionals: string[]; flags: ArgMap } {
  const positionals: string[] = [];
  const flags: ArgMap = {};
  const queue = [...raw];
  const booleanFlagKeys = new Set([
    'apply',
    'cloud',
    'cloud-preflight',
    'codex-cli',
    'codex-force',
    'collab',
    'devtools',
    'dry-run',
    'force',
    'help',
    'interactive',
    'multi-agent',
    'no-interactive',
    'refresh-skills',
    'ui',
    'usage',
    'watch',
    'yes'
  ]);
  const parseBooleanLiteral = (value: string): boolean | undefined => {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    return undefined;
  };
  const coerceFlagValue = (key: string, value: string): string | boolean => {
    if (!booleanFlagKeys.has(key)) {
      return value;
    }
    const parsed = parseBooleanLiteral(value);
    return parsed === undefined ? value : parsed;
  };
  while (queue.length > 0) {
    const token = queue.shift();
    if (!token) {
      break;
    }
    if (token === '--') {
      positionals.push(...queue);
      break;
    }
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    if (key.includes('=')) {
      const separatorIndex = key.indexOf('=');
      const flagKey = key.slice(0, separatorIndex);
      const inlineValue = key.slice(separatorIndex + 1);
      flags[flagKey] = coerceFlagValue(flagKey, inlineValue);
      continue;
    }
    if (queue[0] && !queue[0]!.startsWith('--')) {
      flags[key] = coerceFlagValue(key, queue.shift() as string);
    } else {
      flags[key] = true;
    }
  }
  return { positionals, flags };
}

function resolveTargetStageId(flags: ArgMap): string | undefined {
  const target = flags['target'];
  if (typeof target === 'string' && target.trim().length > 0) {
    return target.trim();
  }
  const alias = flags['target-stage'];
  if (typeof alias === 'string' && alias.trim().length > 0) {
    return alias.trim();
  }
  return undefined;
}

interface FlowTargetStageSelection {
  docsReviewTargetStageId?: string;
  implementationGateTargetStageId?: string;
}

interface FlowPlanItem {
  id: string;
  metadata?: Record<string, unknown>;
}

interface FlowPlanPreview {
  plan: {
    items: FlowPlanItem[];
  };
}

interface NormalizedFlowTargetToken {
  literal: string;
  literalLower: string;
  stageTokenLower: string;
  scopeLower: string | null;
  scoped: boolean;
}

const FLOW_TARGET_PIPELINE_SCOPES = new Set(['docs-review', 'implementation-gate']);

function isFlowTargetPipelineScope(scope: string): boolean {
  return FLOW_TARGET_PIPELINE_SCOPES.has(scope);
}

function normalizeFlowTargetToken(candidate: string): NormalizedFlowTargetToken | null {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }
  const tokens = trimmed.split(':');
  if (tokens.length > 1 && !(tokens[0] ?? '').trim()) {
    return null;
  }

  let scoped = false;
  let scopeToken: string | null = null;
  let suffixToken = trimmed;
  if (tokens.length > 1) {
    const candidateScope = (tokens[0] ?? '').trim().toLowerCase();
    if (isFlowTargetPipelineScope(candidateScope)) {
      scoped = true;
      scopeToken = candidateScope;
      suffixToken = (tokens[tokens.length - 1] ?? '').trim();
    }
  }

  if (!suffixToken) {
    return null;
  }
  return {
    literal: trimmed,
    literalLower: trimmed.toLowerCase(),
    stageTokenLower: suffixToken.toLowerCase(),
    scopeLower: scopeToken,
    scoped
  };
}

function flowPlanItemPipelineId(item: FlowPlanItem): string | null {
  const metadataPipelineId =
    item.metadata && typeof item.metadata['pipelineId'] === 'string'
      ? (item.metadata['pipelineId'] as string).trim().toLowerCase()
      : '';
  if (metadataPipelineId) {
    return metadataPipelineId;
  }
  const delimiterIndex = item.id.indexOf(':');
  if (delimiterIndex <= 0) {
    return null;
  }
  return item.id.slice(0, delimiterIndex).trim().toLowerCase() || null;
}

function flowPlanItemMatchesTarget(item: FlowPlanItem, candidate: string): boolean {
  const normalized = normalizeFlowTargetToken(candidate);
  if (!normalized) {
    return false;
  }
  if (item.id.toLowerCase() === normalized.literalLower) {
    return true;
  }

  if (normalized.scoped && normalized.scopeLower) {
    const itemPipelineId = flowPlanItemPipelineId(item);
    if (itemPipelineId && itemPipelineId !== normalized.scopeLower) {
      return false;
    }
  }

  const metadataStageId =
    item.metadata && typeof item.metadata['stageId'] === 'string'
      ? (item.metadata['stageId'] as string).toLowerCase()
      : null;

  const aliases = Array.isArray(item.metadata?.['aliases'])
    ? (item.metadata?.['aliases'] as unknown[])
    : [];
  const aliasTokens = aliases.filter((alias): alias is string => typeof alias === 'string')
    .map((alias) => alias.toLowerCase());

  if (normalized.scoped) {
    if (
      metadataStageId
      && (metadataStageId === normalized.literalLower || metadataStageId === normalized.stageTokenLower)
    ) {
      return true;
    }
    return aliasTokens.some(
      (alias) => alias === normalized.literalLower || alias === normalized.stageTokenLower
    );
  }

  if (item.id.toLowerCase().endsWith(`:${normalized.stageTokenLower}`)) {
    return true;
  }

  if (
    metadataStageId
    && (
      metadataStageId === normalized.stageTokenLower
      || metadataStageId.endsWith(`:${normalized.stageTokenLower}`)
    )
  ) {
    return true;
  }

  return aliasTokens.some(
    (alias) => alias === normalized.stageTokenLower || alias.endsWith(`:${normalized.stageTokenLower}`)
  );
}

function planIncludesStageId(
  plan: FlowPlanPreview,
  stageId: string
): boolean {
  if (!stageId.trim()) {
    return false;
  }
  return plan.plan.items.some((item) => flowPlanItemMatchesTarget(item, stageId));
}

function resolveFlowTargetScope(stageId: string): string | null {
  const delimiterIndex = stageId.indexOf(':');
  if (delimiterIndex <= 0) {
    return null;
  }
  const scope = stageId.slice(0, delimiterIndex).trim().toLowerCase();
  if (!isFlowTargetPipelineScope(scope)) {
    return null;
  }
  return scope;
}

async function resolveFlowTargetStageSelection(
  orchestrator: CodexOrchestrator,
  taskId: string | undefined,
  requestedTargetStageId: string | undefined
): Promise<FlowTargetStageSelection> {
  if (!requestedTargetStageId) {
    return {};
  }

  const [docsPlan, implementationPlan] = (await Promise.all([
    orchestrator.plan({ pipelineId: 'docs-review', taskId }),
    orchestrator.plan({ pipelineId: 'implementation-gate', taskId })
  ])) as [FlowPlanPreview, FlowPlanPreview];

  const requestedScope = resolveFlowTargetScope(requestedTargetStageId);
  const docsScopeMatch = !requestedScope || requestedScope === 'docs-review';
  const implementationScopeMatch = !requestedScope || requestedScope === 'implementation-gate';

  const docsReviewTargetStageId = docsScopeMatch && planIncludesStageId(docsPlan, requestedTargetStageId)
    ? requestedTargetStageId
    : undefined;
  const implementationGateTargetStageId =
    implementationScopeMatch && planIncludesStageId(implementationPlan, requestedTargetStageId)
    ? requestedTargetStageId
    : undefined;

  if (!docsReviewTargetStageId && !implementationGateTargetStageId) {
    throw new Error(
      `Target stage "${requestedTargetStageId}" is not defined in docs-review or implementation-gate.`
    );
  }

  return { docsReviewTargetStageId, implementationGateTargetStageId };
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveExecutionModeFlag(flags: ArgMap): ExecutionModeOption | undefined {
  const cloudShortcut = flags['cloud'] === true;
  const rawMode = readStringFlag(flags, 'execution-mode');

  if (cloudShortcut) {
    if (rawMode && rawMode.toLowerCase() !== 'cloud') {
      throw new Error('Cannot combine --cloud with --execution-mode values other than cloud.');
    }
    return 'cloud';
  }

  if (!rawMode) {
    return undefined;
  }

  const normalized = rawMode.toLowerCase();
  if (normalized !== 'mcp' && normalized !== 'cloud') {
    throw new Error('Invalid --execution-mode value. Expected one of: mcp, cloud.');
  }
  return normalized;
}

type RlmMultiAgentFlagSource = 'multi-agent' | 'collab';

interface RlmMultiAgentFlagSelection {
  source: RlmMultiAgentFlagSource;
  raw: string | boolean;
}

function normalizeRlmMultiAgentValue(raw: string | boolean): 'enabled' | 'disabled' | 'invalid' {
  if (raw === true) {
    return 'enabled';
  }
  if (raw === false) {
    return 'disabled';
  }
  if (typeof raw !== 'string') {
    return 'invalid';
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'auto') {
    return 'enabled';
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return 'disabled';
  }
  return 'invalid';
}

function resolveRlmMultiAgentFlag(flags: ArgMap): RlmMultiAgentFlagSelection | null {
  const canonicalRaw = flags['multi-agent'];
  const legacyRaw = flags['collab'];
  if (canonicalRaw === undefined && legacyRaw === undefined) {
    return null;
  }

  if (canonicalRaw !== undefined && legacyRaw !== undefined) {
    const canonicalState = normalizeRlmMultiAgentValue(canonicalRaw);
    const legacyState = normalizeRlmMultiAgentValue(legacyRaw);
    if (canonicalState === 'invalid' || legacyState === 'invalid') {
      throw new Error(
        'Invalid --multi-agent/--collab value. Use --multi-agent (or legacy --collab) with auto|true|false.'
      );
    }
    if (canonicalState !== legacyState) {
      throw new Error(
        'Conflicting --multi-agent and --collab values. Use a single flag or provide matching values.'
      );
    }
    return { source: 'multi-agent', raw: canonicalRaw };
  }

  if (canonicalRaw !== undefined) {
    return { source: 'multi-agent', raw: canonicalRaw };
  }

  return { source: 'collab', raw: legacyRaw as string | boolean };
}

function shouldWarnLegacyMultiAgentEnv(flags: ArgMap, env: NodeJS.ProcessEnv): boolean {
  const explicitFlagUsed = flags['multi-agent'] !== undefined || flags['collab'] !== undefined;
  if (explicitFlagUsed) {
    return false;
  }
  return env.RLM_SYMBOLIC_MULTI_AGENT === undefined && env.RLM_SYMBOLIC_COLLAB !== undefined;
}

function applyRlmEnvOverrides(flags: ArgMap, goal?: string): void {
  if (goal) {
    process.env.RLM_GOAL = goal;
  }
  const multiAgentFlag = resolveRlmMultiAgentFlag(flags);
  if (multiAgentFlag) {
    const state = normalizeRlmMultiAgentValue(multiAgentFlag.raw);
    if (state === 'enabled') {
      // Keep canonical and legacy env keys in sync during the migration window.
      process.env.RLM_SYMBOLIC_MULTI_AGENT = '1';
      process.env.RLM_SYMBOLIC_COLLAB = '1';
      // Multi-agent subcalls are only used in the symbolic loop.
      if (!process.env.RLM_MODE) {
        process.env.RLM_MODE = 'symbolic';
      }
    } else if (state === 'disabled') {
      process.env.RLM_SYMBOLIC_MULTI_AGENT = '0';
      process.env.RLM_SYMBOLIC_COLLAB = '0';
    } else {
      throw new Error(
        'Invalid --multi-agent/--collab value. Use --multi-agent (or legacy --collab) with auto|true|false.'
      );
    }
    if (multiAgentFlag.source === 'collab') {
      console.warn('Warning: --collab is a legacy alias; prefer --multi-agent.');
    }
  }
  const validator = readStringFlag(flags, 'validator');
  if (validator) {
    process.env.RLM_VALIDATOR = validator;
  }
  const maxIterations = readStringFlag(flags, 'max-iterations');
  if (maxIterations) {
    process.env.RLM_MAX_ITERATIONS = maxIterations;
  }
  const maxMinutes = readStringFlag(flags, 'max-minutes');
  if (maxMinutes) {
    process.env.RLM_MAX_MINUTES = maxMinutes;
  }
  const roles = readStringFlag(flags, 'roles');
  if (roles) {
    process.env.RLM_ROLES = roles;
  }
}

function resolveRlmTaskId(taskFlag?: string): string {
  if (taskFlag) {
    return sanitizeTaskId(taskFlag);
  }
  const envTask = process.env.MCP_RUNNER_TASK_ID?.trim();
  if (envTask) {
    return sanitizeTaskId(envTask);
  }
  const { repoRoot } = resolveEnvironmentPaths();
  const repoName = basename(repoRoot);
  const slug = slugify(repoName, 'adhoc');
  return sanitizeTaskId(`rlm-${slug}`);
}

async function waitForManifestCompletion(manifestPath: string, intervalMs = 2000): Promise<any> {
  const terminal = new Set(['succeeded', 'failed', 'cancelled']);
  while (true) {
    const raw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    if (terminal.has(manifest.status)) {
      return manifest;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function readRlmState(statePath: string): Promise<{ exitCode: number; status: string } | null> {
  try {
    const raw = await readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.final) {
      return null;
    }
    return { exitCode: parsed.final.exitCode, status: parsed.final.status };
  } catch {
    return null;
  }
}

async function handleStart(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const pipelineId = positionals[0];
  const format: OutputFormat = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const executionMode = resolveExecutionModeFlag(flags);
  if (pipelineId === 'rlm') {
    const goal = readStringFlag(flags, 'goal');
    const warnLegacyEnvAlias = shouldWarnLegacyMultiAgentEnv(flags, process.env);
    applyRlmEnvOverrides(flags, goal);
    if (warnLegacyEnvAlias) {
      console.warn('Warning: RLM_SYMBOLIC_COLLAB is a legacy alias; prefer RLM_SYMBOLIC_MULTI_AGENT.');
    }
  }
  await withRunUi(flags, format, async (runEvents) => {
    let taskIdOverride = typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined;
    if (pipelineId === 'rlm') {
      taskIdOverride = resolveRlmTaskId(taskIdOverride);
      process.env.MCP_RUNNER_TASK_ID = taskIdOverride;
      if (format !== 'json') {
        console.log(`Task: ${taskIdOverride}`);
      }
    }
    const result = await orchestrator.start({
      pipelineId,
      taskId: taskIdOverride,
      parentRunId: typeof flags['parent-run'] === 'string' ? (flags['parent-run'] as string) : undefined,
      approvalPolicy: typeof flags['approval-policy'] === 'string' ? (flags['approval-policy'] as string) : undefined,
      targetStageId: resolveTargetStageId(flags),
      executionMode,
      runEvents
    });
    emitRunOutput(result, format, 'Run started');
  });
}

async function handleFrontendTest(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const format: OutputFormat = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const devtools = Boolean(flags['devtools']);
  if (positionals.length > 0) {
    console.error(`[frontend-test] ignoring extra arguments: ${positionals.join(' ')}`);
  }

  const originalDevtools = process.env.CODEX_REVIEW_DEVTOOLS;
  if (devtools) {
    process.env.CODEX_REVIEW_DEVTOOLS = '1';
  }

  try {
    await withRunUi(flags, format, async (runEvents) => {
      const result = await orchestrator.start({
        pipelineId: 'frontend-testing',
        taskId: typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined,
        parentRunId: typeof flags['parent-run'] === 'string' ? (flags['parent-run'] as string) : undefined,
        approvalPolicy: typeof flags['approval-policy'] === 'string' ? (flags['approval-policy'] as string) : undefined,
        targetStageId: resolveTargetStageId(flags),
        runEvents
      });
      emitRunOutput(result, format, 'Run started');
    });
  } finally {
    if (devtools) {
      if (originalDevtools === undefined) {
        delete process.env.CODEX_REVIEW_DEVTOOLS;
      } else {
        process.env.CODEX_REVIEW_DEVTOOLS = originalDevtools;
      }
    }
  }
}

async function handleFlow(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printFlowHelp();
    return;
  }
  if (positionals.length > 0) {
    throw new Error(`flow does not accept positional arguments: ${positionals.join(' ')}`);
  }

  const format: OutputFormat = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const executionMode = resolveExecutionModeFlag(flags);
  const taskId = typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined;
  const parentRunId = typeof flags['parent-run'] === 'string' ? (flags['parent-run'] as string) : undefined;
  const approvalPolicy = typeof flags['approval-policy'] === 'string' ? (flags['approval-policy'] as string) : undefined;
  const targetStageId = resolveTargetStageId(flags);
  const { docsReviewTargetStageId, implementationGateTargetStageId } =
    await resolveFlowTargetStageSelection(orchestrator, taskId, targetStageId);

  await withRunUi(flags, format, async (runEvents) => {
    const docsReviewResult = await orchestrator.start({
      pipelineId: 'docs-review',
      taskId,
      parentRunId,
      approvalPolicy,
      targetStageId: docsReviewTargetStageId,
      executionMode,
      runEvents
    });
    const docsPayload = toRunOutputPayload(docsReviewResult);
    if (format === 'text') {
      emitRunOutput(docsReviewResult, format, 'Docs-review run');
    }

    if (docsReviewResult.manifest.status !== 'succeeded') {
      process.exitCode = 1;
      if (format === 'json') {
        const payload: FlowOutputPayload = {
          status: docsReviewResult.manifest.status,
          failed_stage: 'docs-review',
          docs_review: docsPayload,
          implementation_gate: null
        };
        console.log(JSON.stringify(payload, null, 2));
      } else {
        console.log('Flow halted: docs-review failed.');
      }
      return;
    }

    const implementationGateResult = await orchestrator.start({
      pipelineId: 'implementation-gate',
      taskId,
      parentRunId: docsReviewResult.manifest.run_id,
      approvalPolicy,
      targetStageId: implementationGateTargetStageId,
      executionMode,
      runEvents
    });
    const implementationPayload = toRunOutputPayload(implementationGateResult);

    if (format === 'json') {
      const payload: FlowOutputPayload = {
        status: implementationGateResult.manifest.status,
        failed_stage: implementationGateResult.manifest.status === 'succeeded' ? null : 'implementation-gate',
        docs_review: docsPayload,
        implementation_gate: implementationPayload
      };
      console.log(JSON.stringify(payload, null, 2));
      if (implementationGateResult.manifest.status !== 'succeeded') {
        process.exitCode = 1;
      }
      return;
    }

    emitRunOutput(implementationGateResult, format, 'Implementation-gate run');
    if (implementationGateResult.manifest.status !== 'succeeded') {
      process.exitCode = 1;
      console.log('Flow halted: implementation-gate failed.');
      return;
    }
    console.log('Flow complete: docs-review -> implementation-gate.');
  });
}

async function handlePlan(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const pipelineId = positionals[0];
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const result = await orchestrator.plan({
    pipelineId,
    taskId: typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined,
    targetStageId: resolveTargetStageId(flags)
  });
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  process.stdout.write(`${formatPlanPreview(result)}\n`);
}

async function handleRlm(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printRlmHelp();
    return;
  }
  const goalFromArgs = positionals.length > 0 ? positionals.join(' ') : undefined;
  const goal = goalFromArgs ?? readStringFlag(flags, 'goal') ?? process.env.RLM_GOAL?.trim();
  if (!goal) {
    throw new Error('rlm requires a goal. Use: codex-orchestrator rlm \"<goal>\".');
  }

  const taskFlag = typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined;
  const taskId = resolveRlmTaskId(taskFlag);
  process.env.MCP_RUNNER_TASK_ID = taskId;
  const warnLegacyEnvAlias = shouldWarnLegacyMultiAgentEnv(flags, process.env);
  applyRlmEnvOverrides(flags, goal);
  if (warnLegacyEnvAlias) {
    console.warn('Warning: RLM_SYMBOLIC_COLLAB is a legacy alias; prefer RLM_SYMBOLIC_MULTI_AGENT.');
  }

  console.log(`Task: ${taskId}`);

  const collabUserChoice =
    flags['collab'] !== undefined ||
    flags['multi-agent'] !== undefined ||
    process.env.RLM_SYMBOLIC_COLLAB !== undefined ||
    process.env.RLM_SYMBOLIC_MULTI_AGENT !== undefined;
  if (!collabUserChoice) {
    const doctor = runDoctor();
    if (doctor.collab.status === 'ok') {
      console.log(
        'Tip: multi-agent collab is enabled. Try: codex-orchestrator rlm --multi-agent auto \"<goal>\" (legacy: --collab auto).'
      );
    } else if (doctor.collab.status === 'disabled') {
      console.log(
        'Tip: multi-agent collab is available but disabled. Enable with: codex features enable multi_agent (legacy alias: collab).'
      );
    }
  }

  let startResult: { manifest: { run_id: string; status: string; artifact_root: string; log_path: string | null } } | null = null;
  await withRunUi(flags, 'text', async (runEvents) => {
    startResult = await orchestrator.start({
      pipelineId: 'rlm',
      taskId,
      parentRunId: typeof flags['parent-run'] === 'string' ? (flags['parent-run'] as string) : undefined,
      approvalPolicy: typeof flags['approval-policy'] === 'string' ? (flags['approval-policy'] as string) : undefined,
      runEvents
    });
    emitRunOutput(startResult, 'text', 'Run started');
  });

  if (!startResult) {
    throw new Error('rlm run failed to start.');
  }

  const resolvedStart = startResult as {
    manifest: { run_id: string; status: string; artifact_root: string; log_path: string | null };
  };
  const { repoRoot } = resolveEnvironmentPaths();
  const manifestPath = join(repoRoot, resolvedStart.manifest.artifact_root, 'manifest.json');
  const manifest = await waitForManifestCompletion(manifestPath);
  const statePath = join(repoRoot, resolvedStart.manifest.artifact_root, 'rlm', 'state.json');
  const rlmState = await readRlmState(statePath);

  if (rlmState) {
    console.log(`RLM status: ${rlmState.status}`);
    process.exitCode = rlmState.exitCode;
    return;
  }

  console.log(`RLM status: ${manifest.status}`);
  console.error('RLM state file missing; treating as internal error.');
  process.exitCode = 10;
}

async function handleResume(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printResumeHelp();
    return;
  }
  const runId = (flags['run'] ?? positionals[0]) as string | undefined;
  if (!runId) {
    throw new Error('resume requires --run <run-id>.');
  }
  const format: OutputFormat = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  await withRunUi(flags, format, async (runEvents) => {
    const result = await orchestrator.resume({
      runId,
      resumeToken: typeof flags['token'] === 'string' ? (flags['token'] as string) : undefined,
      actor: typeof flags['actor'] === 'string' ? (flags['actor'] as string) : undefined,
      reason: typeof flags['reason'] === 'string' ? (flags['reason'] as string) : undefined,
      targetStageId: resolveTargetStageId(flags),
      runEvents
    });
    emitRunOutput(result, format, 'Run resumed');
  });
}

async function handleStatus(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printStatusHelp();
    return;
  }
  const runId = (flags['run'] ?? positionals[0]) as string | undefined;
  if (!runId) {
    throw new Error('status requires --run <run-id>.');
  }
  const watch = Boolean(flags['watch']);
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const interval = parseInt((flags['interval'] as string | undefined) ?? '10', 10);
  if (!watch) {
    await orchestrator.status({ runId, format });
    return;
  }
  const terminal = new Set(['succeeded', 'failed', 'cancelled']);
  while (true) {
    const manifest = await orchestrator.status({ runId, format });
    if (terminal.has(manifest.status)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }
}

async function maybeStartHud(
  gate: ReturnType<typeof evaluateInteractiveGate>,
  emitter: RunEventEmitter
): Promise<HudController | null> {
  if (!gate.enabled) {
    return null;
  }
  const { startHud } = await import('../orchestrator/src/cli/ui/controller.js');
  return startHud({ emitter, footerNote: 'interactive HUD (read-only)' });
}

async function withRunUi(
  flags: ArgMap,
  format: OutputFormat,
  action: (runEvents: RunEventEmitter) => Promise<void>
): Promise<void> {
  const interactiveRequested = Boolean(flags['interactive'] || flags['ui']);
  const interactiveDisabled = Boolean(flags['no-interactive']);
  const runEvents = new RunEventEmitter();
  const gate = evaluateInteractiveGate({
    requested: interactiveRequested,
    disabled: interactiveDisabled,
    format,
    stdoutIsTTY: process.stdout.isTTY === true,
    stderrIsTTY: process.stderr.isTTY === true,
    term: process.env.TERM ?? null
  });

  const hud = await maybeStartHud(gate, runEvents);
  if (!gate.enabled && interactiveRequested && !interactiveDisabled && gate.reason) {
    console.error(`[HUD disabled] ${gate.reason}`);
  }

  try {
    await action(runEvents);
  } finally {
    hud?.stop();
    runEvents.dispose();
  }
}

function emitRunOutput(
  result: {
    manifest: {
      run_id: string;
      status: string;
      artifact_root: string;
      log_path: string | null;
      summary?: string | null;
      cloud_fallback?: { reason: string } | null;
    };
  },
  format: OutputFormat,
  label: string
): void {
  const payload = toRunOutputPayload(result);
  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(`${label}: ${payload.run_id}`);
  console.log(`Status: ${payload.status}`);
  console.log(`Manifest: ${payload.manifest}`);
  console.log(`Log: ${payload.log_path}`);
  if (payload.cloud_fallback_reason) {
    console.log(`Cloud fallback: ${payload.cloud_fallback_reason}`);
  }
  if (payload.summary) {
    console.log('Summary:');
    for (const line of payload.summary.split(/\r?\n/u)) {
      console.log(`  ${line}`);
    }
  }
}

function toRunOutputPayload(
  result: {
    manifest: {
      run_id: string;
      status: string;
      artifact_root: string;
      log_path: string | null;
      summary?: string | null;
      cloud_fallback?: { reason: string } | null;
    };
  }
): RunOutputPayload {
  return {
    run_id: result.manifest.run_id,
    status: result.manifest.status,
    artifact_root: result.manifest.artifact_root,
    manifest: `${result.manifest.artifact_root}/manifest.json`,
    log_path: result.manifest.log_path,
    summary: result.manifest.summary ?? null,
    cloud_fallback_reason: result.manifest.cloud_fallback?.reason ?? null
  };
}

interface ParsedExecArgs {
  commandTokens: string[];
  notifyTargets: string[];
  otelEndpoint: string | null;
  requestedMode: ExecOutputMode | null;
  jsonPretty: boolean;
  cwd?: string;
  taskId?: string;
}

async function handleExec(rawArgs: string[]): Promise<void> {
  const parsed = parseExecArgs(rawArgs);
  if (parsed.commandTokens.length === 0) {
    throw new Error('exec requires a command to run.');
  }

  const isInteractive = process.stdout.isTTY === true && process.stderr.isTTY === true;
  const outputMode: ExecOutputMode =
    parsed.requestedMode ?? (isInteractive ? 'interactive' : 'jsonl');

  const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
  if (parsed.taskId) {
    env.taskId = sanitizeTaskId(parsed.taskId);
  }

  const context = {
    env,
    stdout: process.stdout,
    stderr: process.stderr
  };

  const invocation = {
    command: parsed.commandTokens[0]!,
    args: parsed.commandTokens.slice(1),
    cwd: parsed.cwd,
    outputMode,
    notifyTargets: parsed.notifyTargets,
    otelEndpoint: parsed.otelEndpoint,
    jsonPretty: parsed.jsonPretty
  };

  const result = await executeExecCommand(context, invocation);
  if (result.exitCode !== null) {
    process.exitCode = result.exitCode;
  } else if (result.status !== 'succeeded') {
    process.exitCode = 1;
  }

  if (outputMode === 'interactive') {
    await maybeEmitExecAdoptionHint(env.taskId);
  }
}

async function shouldScanExecAdoptionHint(taskFilter: string | undefined): Promise<boolean> {
  if (!taskFilter) {
    return false;
  }
  const env = resolveEnvironmentPaths();
  const taskCliRunsRoot = join(env.runsRoot, taskFilter, 'cli');
  let handle: Awaited<ReturnType<typeof opendir>> | null = null;
  try {
    handle = await opendir(taskCliRunsRoot);
    let runCount = 0;
    for await (const entry of handle) {
      if (!entry.isDirectory()) {
        continue;
      }
      runCount += 1;
      if (runCount > 150) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  } finally {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
  }
}

async function maybeEmitExecAdoptionHint(taskFilter: string | undefined): Promise<void> {
  try {
    if (!(await shouldScanExecAdoptionHint(taskFilter))) {
      return;
    }
    const usage = await runDoctorUsage({ windowDays: 7, taskFilter });
    const recommendation = usage.adoption.recommendations[0];
    if (!recommendation) {
      return;
    }
    console.log(`Adoption hint: ${recommendation}`);
  } catch {
    // Exec command behavior should not fail when usage telemetry cannot be read.
  }
}

async function handleSelfCheck(rawArgs: string[]): Promise<void> {
  const { flags } = parseArgs(rawArgs);
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const result = buildSelfCheckResult();
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`Status: ${result.status}`);
  console.log(`Name: ${result.name}`);
  console.log(`Version: ${result.version}`);
  console.log(`Node: ${result.node}`);
  console.log(`Timestamp: ${result.timestamp}`);
}

async function handleInit(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const template = positionals[0];
  if (!template) {
    throw new Error('init requires a template name (e.g. init codex).');
  }
  if (template !== 'codex') {
    throw new Error(`Unknown init template: ${template}`);
  }
  const cwd = typeof flags['cwd'] === 'string' ? (flags['cwd'] as string) : process.cwd();
  const force = Boolean(flags['force']);
  const result = await initCodexTemplates({ template, cwd, force });
  const summary = formatInitSummary(result, cwd);
  for (const line of summary) {
    console.log(line);
  }

  if (flags['codex-cli'] === true) {
    const apply = Boolean(flags['yes']);
    const source = readStringFlag(flags, 'codex-source');
    const ref = readStringFlag(flags, 'codex-ref');
    const downloadUrl = readStringFlag(flags, 'codex-download-url');
    const downloadSha256 = readStringFlag(flags, 'codex-download-sha256');
    const cliForce = Boolean(flags['codex-force']);
    const setupResult = await runCodexCliSetup({
      apply,
      force: cliForce,
      source,
      ref,
      downloadUrl,
      downloadSha256
    });
    for (const line of formatCodexCliSetupSummary(setupResult)) {
      console.log(line);
    }
  }
}

async function handleSetup(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    console.log(`Usage: codex-orchestrator setup [--yes] [--refresh-skills] [--format json]

One-shot bootstrap for downstream users. Installs bundled skills and configures
delegation + DevTools MCP wiring.

Options:
  --yes                 Apply setup (otherwise plan only).
  --refresh-skills      Overwrite bundled skills in $CODEX_HOME/skills during setup.
  --repo <path>         Repo root for delegation wiring (default cwd).
  --format json         Emit machine-readable output (dry-run only).
`);
    return;
  }

  const format: OutputFormat = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const apply = Boolean(flags['yes']);
  const refreshSkills = Boolean(flags['refresh-skills']);
  if (format === 'json' && apply) {
    throw new Error('setup does not support --format json with --yes.');
  }

  const repoFlag = readStringFlag(flags, 'repo');
  const repoRoot = repoFlag ?? process.cwd();
  const repoFlagValue = repoFlag ? (/\s/u.test(repoFlag) ? JSON.stringify(repoFlag) : repoFlag) : null;
  const delegationRepoArg = repoFlagValue ? ` --repo ${repoFlagValue}` : '';
  const bundledSkills = await listBundledSkills();
  if (bundledSkills.length === 0) {
    throw new Error('No bundled skills detected; cannot run setup.');
  }
  const guidance = buildSetupGuidance();

  if (!apply) {
    const installCommand = `codex-orchestrator skills install ${refreshSkills ? '--force ' : ''}--only ${bundledSkills.join(',')}`;
    const skillsNote = refreshSkills
      ? 'Installs bundled skills into $CODEX_HOME/skills with overwrite enabled via --refresh-skills.'
      : 'Installs bundled skills into $CODEX_HOME/skills without overwriting existing files by default. Add --refresh-skills to force overwrite.';

    const delegation = await runDelegationSetup({ repoRoot });
    const devtools = await runDevtoolsSetup();
    const payload = {
      status: 'planned' as const,
      steps: {
        skills: {
          commandLines: [installCommand],
          note: skillsNote
        },
        delegation,
        devtools,
        guidance
      }
    };

    if (format === 'json') {
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    console.log('Setup plan:');
    console.log('- Skills:');
    for (const commandLine of payload.steps.skills.commandLines) {
      console.log(`  - ${commandLine}`);
    }
    console.log(`- Delegation: codex-orchestrator delegation setup --yes${delegationRepoArg}`);
    console.log('- DevTools: codex-orchestrator devtools setup --yes');
    for (const line of formatSetupGuidanceSummary(guidance)) {
      console.log(line);
    }
    console.log('Run with --yes to apply this setup.');
    return;
  }

  const skills = await installSkills({ force: refreshSkills, only: bundledSkills });
  const delegation = await runDelegationSetup({ apply: true, repoRoot });
  const devtools = await runDevtoolsSetup({ apply: true });

  for (const line of formatSkillsInstallSummary(skills)) {
    console.log(line);
  }
  for (const line of formatDelegationSetupSummary(delegation)) {
    console.log(line);
  }
  for (const line of formatDevtoolsSetupSummary(devtools)) {
    console.log(line);
  }
  for (const line of formatSetupGuidanceSummary(guidance)) {
    console.log(line);
  }
  console.log('Next: codex-orchestrator doctor --usage');
}

function buildSetupGuidance(): SetupGuidancePayload {
  return {
    note: 'Agent-first default: run docs-review before implementation and implementation-gate before handoff.',
    references: [
      'https://github.com/Kbediako/CO#downstream-usage-cheatsheet-agent-first',
      'https://github.com/Kbediako/CO/blob/main/docs/AGENTS.md',
      'https://github.com/Kbediako/CO/blob/main/docs/guides/collab-vs-mcp.md',
      'https://github.com/Kbediako/CO/blob/main/docs/guides/rlm-recursion-v2.md'
    ],
    recommended_commands: [
      'codex-orchestrator flow --task <task-id>',
      'codex-orchestrator doctor --usage',
      'codex-orchestrator rlm --multi-agent auto "<goal>"',
      'codex-orchestrator mcp enable --servers delegation --yes'
    ]
  };
}

function formatSetupGuidanceSummary(guidance: SetupGuidancePayload): string[] {
  const lines: string[] = ['Setup guidance:', `- ${guidance.note}`];
  if (guidance.recommended_commands.length > 0) {
    lines.push('- Recommended commands:');
    for (const command of guidance.recommended_commands) {
      lines.push(`  - ${command}`);
    }
  }
  if (guidance.references.length > 0) {
    lines.push('- References:');
    for (const reference of guidance.references) {
      lines.push(`  - ${reference}`);
    }
  }
  return lines;
}

async function handleDoctor(rawArgs: string[]): Promise<void> {
  const { flags } = parseArgs(rawArgs);
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const includeUsage = Boolean(flags['usage']);
  const includeCloudPreflight = Boolean(flags['cloud-preflight']);
  const cloudEnvIdOverride = readStringFlag(flags, 'cloud-env-id');
  const cloudBranchOverride = readStringFlag(flags, 'cloud-branch');
  if (!includeCloudPreflight && (cloudEnvIdOverride || cloudBranchOverride)) {
    throw new Error('--cloud-env-id/--cloud-branch require --cloud-preflight.');
  }
  const wantsApply = Boolean(flags['apply']);
  const apply = Boolean(flags['yes']);
  if (wantsApply && format === 'json') {
    throw new Error('doctor --apply does not support --format json.');
  }
  const windowDaysRaw = readStringFlag(flags, 'window-days');
  let windowDays: number | undefined = undefined;
  if (windowDaysRaw) {
    if (!/^\d+$/u.test(windowDaysRaw)) {
      throw new Error(`Invalid --window-days value '${windowDaysRaw}'. Expected a positive integer.`);
    }
    const parsed = Number(windowDaysRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid --window-days value '${windowDaysRaw}'. Expected a positive integer.`);
    }
    windowDays = parsed;
  }
  const taskFilter = readStringFlag(flags, 'task') ?? null;

  const doctorResult = runDoctor();
  const usageResult = includeUsage ? await runDoctorUsage({ windowDays, taskFilter }) : null;
  const cloudPreflightResult = includeCloudPreflight
    ? await runDoctorCloudPreflight({
        cwd: process.cwd(),
        environmentId: cloudEnvIdOverride,
        branch: cloudBranchOverride,
        taskId: taskFilter
      })
    : null;

  if (format === 'json') {
    const payload: Record<string, unknown> = { ...doctorResult };
    if (usageResult) {
      payload.usage = usageResult;
    }
    if (cloudPreflightResult) {
      payload.cloud_preflight = cloudPreflightResult;
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  for (const line of formatDoctorSummary(doctorResult)) {
    console.log(line);
  }
  if (usageResult) {
    for (const line of formatDoctorUsageSummary(usageResult)) {
      console.log(line);
    }
  }
  if (cloudPreflightResult) {
    for (const line of formatDoctorCloudPreflightSummary(cloudPreflightResult)) {
      console.log(line);
    }
  }

  if (!wantsApply) {
    return;
  }

  const repoRoot = process.cwd();
  const delegationPlan = await runDelegationSetup({ repoRoot });
  const devtoolsPlan = await runDevtoolsSetup();
  const needsDelegation = !delegationPlan.readiness.configured;
  const needsDevtoolsSkill = devtoolsPlan.readiness.skill.status !== 'ok';
  const devtoolsConfigStatus = devtoolsPlan.readiness.config.status;
  const needsDevtoolsConfig = devtoolsConfigStatus === 'missing';
  const hasInvalidDevtoolsConfig = devtoolsConfigStatus === 'invalid';

  if (!needsDelegation && !needsDevtoolsSkill && !needsDevtoolsConfig && !hasInvalidDevtoolsConfig) {
    console.log('Doctor apply: nothing to do.');
    return;
  }

  console.log('Doctor apply plan:');
  if (needsDevtoolsSkill) {
    console.log('- Install skill: chrome-devtools (codex-orchestrator skills install --only chrome-devtools)');
  }
  if (hasInvalidDevtoolsConfig) {
    console.log(
      `- DevTools MCP config is invalid: ${devtoolsPlan.readiness.config.path} (fix config.toml then rerun doctor --apply)`
    );
  }
  if (needsDevtoolsConfig) {
    console.log('- Configure DevTools MCP: codex-orchestrator devtools setup --yes');
  }
  if (needsDelegation) {
    console.log('- Configure delegation MCP: codex-orchestrator delegation setup --yes');
  }

  if (!apply) {
    console.log('Run with --apply --yes to apply these fixes.');
    return;
  }

  if (needsDevtoolsSkill) {
    const skills = await installSkills({ only: ['chrome-devtools'] });
    for (const line of formatSkillsInstallSummary(skills)) {
      console.log(line);
    }
  }
  if (needsDelegation) {
    const delegation = await runDelegationSetup({ apply: true, repoRoot });
    for (const line of formatDelegationSetupSummary(delegation)) {
      console.log(line);
    }
  }
  if (hasInvalidDevtoolsConfig) {
    console.log(
      `DevTools setup: skipped (config.toml is invalid: ${devtoolsPlan.readiness.config.path}). Fix it and rerun doctor --apply --yes.`
    );
  } else if (needsDevtoolsConfig) {
    const devtools = await runDevtoolsSetup({ apply: true });
    for (const line of formatDevtoolsSetupSummary(devtools)) {
      console.log(line);
    }
  }

  const doctorAfter = runDoctor();
  for (const line of formatDoctorSummary(doctorAfter)) {
    console.log(line);
  }
}

async function handleDevtools(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const subcommand = positionals.shift();
  if (!subcommand) {
    throw new Error('devtools requires a subcommand (setup).');
  }
  if (subcommand !== 'setup') {
    throw new Error(`Unknown devtools subcommand: ${subcommand}`);
  }
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const apply = Boolean(flags['yes']);
  if (format === 'json' && apply) {
    throw new Error('devtools setup does not support --format json with --yes.');
  }
  const result = await runDevtoolsSetup({ apply });
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const summary = formatDevtoolsSetupSummary(result);
  for (const line of summary) {
    console.log(line);
  }
}

async function handleDelegation(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const subcommand = positionals.shift();
  if (!subcommand) {
    throw new Error('delegation requires a subcommand (setup).');
  }
  if (subcommand !== 'setup') {
    throw new Error(`Unknown delegation subcommand: ${subcommand}`);
  }

  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const apply = Boolean(flags['yes']);
  if (format === 'json' && apply) {
    throw new Error('delegation setup does not support --format json with --yes.');
  }

  const repoRoot = readStringFlag(flags, 'repo') ?? process.cwd();
  const result = await runDelegationSetup({ apply, repoRoot });

  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  for (const line of formatDelegationSetupSummary(result)) {
    console.log(line);
  }
}

async function handleCodex(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const subcommand = positionals.shift();
  if (!subcommand) {
    throw new Error('codex requires a subcommand (setup).');
  }
  if (subcommand !== 'setup') {
    throw new Error(`Unknown codex subcommand: ${subcommand}`);
  }
  const format: OutputFormat = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const apply = Boolean(flags['yes']);
  const source = readStringFlag(flags, 'source');
  const ref = readStringFlag(flags, 'ref');
  const downloadUrl = readStringFlag(flags, 'download-url');
  const downloadSha256 = readStringFlag(flags, 'download-sha256');
  const force = Boolean(flags['force']);
  const result = await runCodexCliSetup({
    apply,
    force,
    source,
    ref,
    downloadUrl,
    downloadSha256
  });
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const summary = formatCodexCliSetupSummary(result);
  for (const line of summary) {
    console.log(line);
  }
}

async function handleSkills(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const subcommand = positionals[0];
  const wantsHelp = flags['help'] === true || subcommand === 'help' || subcommand === '--help';
  if (!subcommand || wantsHelp) {
    printSkillsHelp();
    return;
  }

  switch (subcommand) {
    case 'install': {
      const format: OutputFormat = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
      const force = flags['force'] === true;
      const codexHome = readStringFlag(flags, 'codex-home');
      const onlyRaw = flags['only'];
      let only: string[] | undefined;
      if (onlyRaw !== undefined) {
        if (typeof onlyRaw !== 'string') {
          throw new Error('--only requires a comma-separated list of skill names.');
        }
        only = onlyRaw.split(',').map((entry) => entry.trim()).filter(Boolean);
      }
      const result = await installSkills({ force, codexHome, only });
      if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatSkillsInstallSummary(result).join('\n'));
      }
      return;
    }
    default:
      throw new Error(`Unknown skills command: ${subcommand}`);
  }
}

async function handleMcp(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printMcpHelp();
    return;
  }
  const subcommand = positionals.shift();
  if (!subcommand) {
    throw new Error('mcp requires a subcommand (serve|enable).');
  }
  if (subcommand === 'serve') {
    const repoRoot = typeof flags['repo'] === 'string' ? (flags['repo'] as string) : undefined;
    const dryRun = Boolean(flags['dry-run']);
    await serveMcp({ repoRoot, dryRun, extraArgs: positionals });
    return;
  }
  if (subcommand === 'enable') {
    const allowedEnableFlags = new Set(['yes', 'format', 'servers']);
    let yesFlag: string | boolean | undefined;
    let formatFlag: string | boolean | undefined;
    let serversFlag: string | boolean | undefined;
    const unexpectedPositionals: string[] = [];
    const enableTokens = rawArgs.slice(1);

    for (let index = 0; index < enableTokens.length; index += 1) {
      const token = enableTokens[index];
      if (!token) {
        continue;
      }
      if (token === '--') {
        unexpectedPositionals.push(...enableTokens.slice(index + 1));
        break;
      }
      if (!token.startsWith('--')) {
        unexpectedPositionals.push(token);
        continue;
      }
      const [key, inlineValue] = token.slice(2).split('=', 2);
      if (!allowedEnableFlags.has(key)) {
        throw new Error(`Unknown mcp enable flag: --${key}`);
      }
      let resolvedValue: string | boolean = true;
      if (inlineValue !== undefined) {
        resolvedValue = inlineValue;
      } else {
        const nextToken = enableTokens[index + 1];
        if (nextToken && !nextToken.startsWith('--')) {
          resolvedValue = nextToken;
          index += 1;
        }
      }
      if (key === 'yes') {
        if (yesFlag !== undefined) {
          throw new Error('--yes specified multiple times.');
        }
        yesFlag = resolvedValue;
        continue;
      }
      if (key === 'format') {
        if (formatFlag !== undefined) {
          throw new Error('--format specified multiple times.');
        }
        formatFlag = resolvedValue;
        continue;
      }
      if (serversFlag !== undefined) {
        throw new Error('--servers specified multiple times.');
      }
      serversFlag = resolvedValue;
    }
    if (positionals.length > 0 || unexpectedPositionals.length > 0) {
      throw new Error(
        `mcp enable does not accept positional arguments: ${[...positionals, ...unexpectedPositionals].join(' ')}`
      );
    }

    let apply = false;
    if (yesFlag === true) {
      apply = true;
    } else if (typeof yesFlag === 'string') {
      const normalizedYes = yesFlag.trim().toLowerCase();
      if (normalizedYes === 'true' || normalizedYes === '1' || normalizedYes === 'yes' || normalizedYes === 'on') {
        apply = true;
      } else if (
        normalizedYes === 'false'
        || normalizedYes === '0'
        || normalizedYes === 'no'
        || normalizedYes === 'off'
      ) {
        apply = false;
      } else {
        throw new Error('--yes expects true/false when provided as --yes=<value>.');
      }
    }

    let format: OutputFormat = 'text';
    if (formatFlag !== undefined) {
      if (formatFlag === true) {
        throw new Error('--format requires a value of "text" or "json".');
      }
      if (formatFlag === 'json') {
        format = 'json';
      } else if (formatFlag === 'text') {
        format = 'text';
      } else {
        throw new Error('--format must be "text" or "json".');
      }
    }

    let serverNames: string[] | undefined;
    if (serversFlag !== undefined) {
      if (typeof serversFlag !== 'string') {
        throw new Error('--servers must include a comma-separated list of MCP server names.');
      }
      serverNames = serversFlag
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      if (serverNames.length === 0) {
        throw new Error('--servers must include a comma-separated list of MCP server names.');
      }
    }
    const result = await runMcpEnable({ apply, serverNames });
    const hasApplyFailures = apply
      && result.actions.some((action) => action.status !== 'enabled' && action.status !== 'already_enabled');
    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      for (const line of formatMcpEnableSummary(result)) {
        console.log(line);
      }
    }
    if (hasApplyFailures) {
      process.exitCode = 1;
    }
    return;
  }
  throw new Error(`Unknown mcp subcommand: ${subcommand}`);
}

async function handlePr(rawArgs: string[]): Promise<void> {
  if (rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h' || rawArgs[0] === 'help') {
    printPrHelp();
    return;
  }
  const [subcommand, ...subcommandArgs] = rawArgs;
  if (subcommand !== 'watch-merge') {
    throw new Error(`Unknown pr subcommand: ${subcommand}`);
  }
  const exitCode = await runPrWatchMerge(subcommandArgs, { usage: 'codex-orchestrator pr watch-merge' });
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

async function handleDelegationServer(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printDelegationServerHelp();
    return;
  }
  const repoRoot = typeof flags['repo'] === 'string' ? (flags['repo'] as string) : process.cwd();
  const modeFlag = typeof flags['mode'] === 'string' ? (flags['mode'] as string) : undefined;
  const overrideFlag =
    typeof flags['config'] === 'string'
      ? (flags['config'] as string)
      : typeof flags['config-override'] === 'string'
        ? (flags['config-override'] as string)
        : undefined;
  const envMode = process.env.CODEX_DELEGATE_MODE?.trim();
  const resolvedMode = modeFlag ?? envMode;
  let mode: 'full' | 'question_only' | undefined;
  if (resolvedMode) {
    if (resolvedMode === 'full' || resolvedMode === 'question_only') {
      mode = resolvedMode;
    } else {
      console.warn(`Invalid delegate mode "${resolvedMode}". Falling back to config default.`);
    }
  }
  const configOverrides = overrideFlag
    ? splitDelegationConfigOverrides(overrideFlag).map((value) => ({
        source: 'cli' as const,
        value
      }))
    : [];
  await startDelegationServer({ repoRoot, mode, configOverrides });
}

function parseExecArgs(rawArgs: string[]): ParsedExecArgs {
  const notifyTargets: string[] = [];
  let otelEndpoint: string | null = null;
  let requestedMode: ExecOutputMode | null = null;
  let jsonPretty = true;
  let cwd: string | undefined;
  let taskId: string | undefined;
  const commandTokens: string[] = [];
  let afterDoubleDash = false;

  const readValue = (currentIndex: number, inlineValue: string | undefined): { value: string | null; nextIndex: number } => {
    if (typeof inlineValue === 'string') {
      return { value: inlineValue, nextIndex: currentIndex };
    }
    const nextToken = rawArgs[currentIndex + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      return { value: nextToken, nextIndex: currentIndex + 1 };
    }
    return { value: null, nextIndex: currentIndex };
  };

  for (let i = 0; i < rawArgs.length; i += 1) {
    const token = rawArgs[i]!;
    if (afterDoubleDash) {
      commandTokens.push(token);
      continue;
    }
    if (token === '--') {
      afterDoubleDash = true;
      continue;
    }
    if (!token.startsWith('--')) {
      commandTokens.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    switch (rawKey) {
      case 'json': {
        if (requestedMode && requestedMode !== 'json') {
          throw new Error('Cannot combine --json with other output modes.');
        }
        requestedMode = 'json';
        let modeValue = inlineValue;
        if (!modeValue) {
          const probe = rawArgs[i + 1];
          if (probe === 'compact' || probe === 'pretty') {
            modeValue = probe;
            i += 1;
          }
        }
        jsonPretty = modeValue === 'compact' ? false : true;
        break;
      }
      case 'jsonl':
        if (requestedMode && requestedMode !== 'jsonl') {
          throw new Error('Cannot combine --jsonl with other output modes.');
        }
        requestedMode = 'jsonl';
        break;
      case 'notify': {
        const { value, nextIndex } = readValue(i, inlineValue);
        if (!value) {
          throw new Error('--notify requires a target URI.');
        }
        i = nextIndex;
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
          .forEach((entry) => notifyTargets.push(entry));
        break;
      }
      case 'otel-endpoint': {
        const { value, nextIndex } = readValue(i, inlineValue);
        if (!value) {
          throw new Error('--otel-endpoint requires a URL.');
        }
        i = nextIndex;
        otelEndpoint = value;
        break;
      }
      case 'cwd': {
        const { value, nextIndex } = readValue(i, inlineValue);
        if (!value) {
          throw new Error('--cwd requires a path.');
        }
        i = nextIndex;
        cwd = value;
        break;
      }
      case 'task': {
        const { value, nextIndex } = readValue(i, inlineValue);
        if (!value) {
          throw new Error('--task requires an identifier.');
        }
        i = nextIndex;
        taskId = value;
        break;
      }
      default:
        throw new Error(`Unknown exec option: --${rawKey}`);
    }
  }

  return {
    commandTokens: normalizeExecCommandTokens(commandTokens, cwd),
    notifyTargets,
    otelEndpoint,
    requestedMode,
    jsonPretty,
    cwd,
    taskId
  };
}

function normalizeExecCommandTokens(commandTokens: string[], cwd?: string): string[] {
  if (commandTokens.length !== 1) {
    return commandTokens;
  }
  const token = commandTokens[0]!.trim();
  if (token.length === 0 || !/\s/.test(token) || looksLikeExistingPath(token, cwd)) {
    return commandTokens;
  }
  const parsed = splitShellLikeCommand(token);
  return parsed.length > 0 ? parsed : commandTokens;
}

function looksLikeExistingPath(token: string, cwd?: string): boolean {
  const probes = [token];
  if (cwd) {
    probes.push(join(cwd, token));
  }
  for (const probe of probes) {
    if (existsSync(probe)) {
      return true;
    }
  }
  return false;
}

function splitShellLikeCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i += 1) {
    const char = command[i]!;
    if (char === '\\' && quote !== null) {
      const next = command[i + 1];
      if (next === quote || next === '\\') {
        current += next;
        i += 1;
        continue;
      }
    }
    if (char === '"' || char === "'") {
      if (quote === char) {
        quote = null;
      } else if (quote === null) {
        quote = char;
      } else {
        current += char;
      }
      continue;
    }
    if (quote === null && /\s/u.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

function isHelpRequest(positionals: string[], flags: ArgMap): boolean {
  // Treat any `--help` presence as a help request, even if a user accidentally
  // supplies a value (our minimal argv parser would otherwise treat it as `--help <value>`).
  if (flags['help'] !== undefined) {
    return true;
  }
  const first = positionals[0];
  return first === 'help' || first === '--help' || first === '-h';
}

function printHelp(): void {
  console.log(`Usage: codex-orchestrator <command> [options]

Commands:
  start [pipeline]          Start a new run (default pipeline is diagnostics).
    --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
    --parent-run <id>       Link run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --format json           Emit machine-readable output.
    --execution-mode <mcp|cloud>  Force execution mode for this run and child subpipelines.
    --cloud                 Shortcut for --execution-mode cloud.
    --target <stage-id>     Focus plan/build metadata on a specific stage (alias: --target-stage).
    --goal "<goal>"         When pipeline is rlm, set the RLM goal.
    --multi-agent [auto|true|false]  Preferred alias for multi-agent collab subagents (implies symbolic mode).
    --collab [auto|true|false]  Legacy alias for --multi-agent.
    --validator <cmd|none>  When pipeline is rlm, set the validator command.
    --max-iterations <n>    When pipeline is rlm, override max iterations.
    --max-minutes <n>       When pipeline is rlm, override max minutes.
    --roles <single|triad>  When pipeline is rlm, set role split.
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  rlm "<goal>"              Run RLM loop until validator passes.
    --task <id>             Override task identifier.
    --multi-agent [auto|true|false]  Preferred alias for multi-agent collab subagents (implies symbolic mode).
    --collab [auto|true|false]  Legacy alias for --multi-agent.
    --validator <cmd|none>  Set validator command or disable validation.
    --max-iterations <n>    Override max iterations (0 = unlimited with validator).
    --max-minutes <n>       Optional time-based guardrail in minutes.
    --roles <single|triad>  Choose single or triad role split.
    --parent-run <id>       Link run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  frontend-test             Run frontend testing pipeline.
    --devtools             Enable Chrome DevTools MCP for this run.
    --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
    --parent-run <id>       Link run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --format json           Emit machine-readable output.
    --target <stage-id>     Focus plan/build metadata on a specific stage (alias: --target-stage).
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  flow                      Run docs-review then implementation-gate sequentially.
    --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
    --parent-run <id>       Link docs-review run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --format json           Emit machine-readable output summary for both runs.
    --execution-mode <mcp|cloud>  Force execution mode for both runs.
    --cloud                 Shortcut for --execution-mode cloud.
    --target <stage-id>     Focus plan/build metadata on a specific stage (alias: --target-stage).
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  plan [pipeline]           Preview pipeline stages without executing.
    --task <id>             Override task identifier.
    --format json           Emit machine-readable output.
    --target <stage-id>     Highlight the stage chosen for orchestration (alias: --target-stage).

  exec [command]            Run a one-off command with unified exec runtime.
    --json [compact]        Emit final JSON summary (optional compact mode).
    --jsonl                 Stream JSONL events (default when STDIN is non-interactive).
    --notify <uri>          Send run summary notifications (repeatable, comma-separated supported).
    --otel-endpoint <url>   Forward events to OTEL collector endpoint.
    --cwd <path>            Override working directory for the command.
    --task <id>             Override task identifier for manifest routing.

  resume --run <id> [options]
    --token <resume-token>  Verify the resume token before restarting.
    --actor <name>          Record who resumed the run.
    --reason <text>         Record why the run was resumed.
    --target <stage-id>     Override stage selection before resuming (alias: --target-stage).
    --format json           Emit machine-readable output.
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  status --run <id> [--watch] [--interval N] [--format json]

  self-check [--format json]
  init codex [--cwd <path>] [--force]
    --codex-cli            Also run CO-managed Codex CLI setup (plan unless --yes; activate with CODEX_CLI_USE_MANAGED=1).
    --codex-source <path>  Build from local Codex repo (or git URL).
    --codex-ref <ref>      Git ref (branch/tag/sha) when building from repo.
    --codex-download-url <url>  Download a prebuilt codex binary.
    --codex-download-sha256 <sha>  Expected SHA256 for the prebuilt download.
    --codex-force          Overwrite existing CO-managed codex binary.
    --yes                  Apply codex CLI setup (otherwise plan only).
  setup [--yes] [--refresh-skills] [--format json]
    --yes                 Apply setup (otherwise plan only).
    --refresh-skills      Overwrite bundled skills in $CODEX_HOME/skills during setup.
    --repo <path>         Repo root for delegation wiring (default cwd).
    --format json         Emit machine-readable output (dry-run only).
  doctor [--format json] [--usage] [--window-days <n>] [--task <id>] [--cloud-preflight] [--apply]
    --usage               Include a local usage snapshot (scans .runs/).
    --window-days <n>     Window for --usage (default 30).
    --task <id>           Limit --usage scan to a specific task directory.
    --cloud-preflight     Run cloud readiness preflight checks (env/codex/git/branch).
    --cloud-env-id <id>   Override env id for --cloud-preflight (default: CODEX_CLOUD_ENV_ID).
    --cloud-branch <name> Override branch for --cloud-preflight (default: CODEX_CLOUD_BRANCH).
    --apply               Plan/apply quick fixes for DevTools + delegation wiring (use with --yes).
    --yes                 Apply fixes when --apply is set.
    --format json         Emit machine-readable output (not supported with --apply).
  codex setup
    --source <path>        Build from local Codex repo (or git URL).
    --ref <ref>            Git ref (branch/tag/sha) when building from repo.
    --download-url <url>   Download a prebuilt codex binary.
    --download-sha256 <sha>  Expected SHA256 for the prebuilt download.
    --force                Overwrite existing CO-managed codex binary.
    --yes                  Apply setup (otherwise plan only; stock codex remains default until CODEX_CLI_USE_MANAGED=1).
    --format json          Emit machine-readable output.
  devtools setup          Print DevTools MCP setup instructions.
    --yes                 Apply setup by running "codex mcp add ...".
    --format json         Emit machine-readable output (dry-run only).
  delegation setup        Configure delegation MCP server wiring.
    --repo <path>         Repo root for delegation server (default cwd).
    --yes                 Apply setup by running "codex mcp add ...".
    --format json         Emit machine-readable output (dry-run only).
  skills install          Install bundled skills into $CODEX_HOME/skills.
    --force               Overwrite existing skill files.
    --only <skills>       Install only selected skills (comma-separated).
    --codex-home <path>   Override the target Codex home directory.
    --format json         Emit machine-readable output.
  mcp serve [--repo <path>] [--dry-run] [-- <extra args>]
  mcp enable [--servers <csv>] [--yes] [--format json]
    --servers <csv>       Comma-separated MCP server names to enable (default: all disabled).
    --yes                 Apply changes (default is plan mode).
    --format json         Emit machine-readable output.
  pr watch-merge [options]
    Monitor PR checks/reviews with polling and optional auto-merge after a quiet window.
    Use \`codex-orchestrator pr watch-merge --help\` for full options.
  delegate-server         Run the delegation MCP server (stdio).
    --repo <path>         Repo root for config + manifests (default cwd).
    --mode <full|question_only>  Limit tool surface for child runs.
    --config "<key>=<value>[;...]"  Apply config overrides (repeat via separators).
  version | --version

  help                      Show this message.

Notes:
  RLM recursion guidance: docs/guides/rlm-recursion-v2.md
  Cloud-mode preflight/fallback guide: docs/guides/cloud-mode-preflight.md
  Review artifacts guide: docs/guides/review-artifacts.md
`);
}

void main();

function printVersion(): void {
  const pkg = loadPackageInfo();
  console.log(pkg.version ?? 'unknown');
}

function printSkillsHelp(): void {
  console.log(`Usage: codex-orchestrator skills <command> [options]

Commands:
  install                   Install bundled skills into $CODEX_HOME/skills.
    --force                 Overwrite existing skill files.
    --only <skills>         Install only selected skills (comma-separated).
    --codex-home <path>     Override the target Codex home directory.
    --format json           Emit machine-readable output.
`);
}

function printStatusHelp(): void {
  console.log(`Usage: codex-orchestrator status --run <id> [--watch] [--interval N] [--format json]

Options:
  --run <id>         Run id to inspect.
  --watch            Poll until run reaches a terminal state.
  --interval <sec>   Poll interval when --watch is enabled (default 10).
  --format json      Emit machine-readable status output.
`);
}

function printResumeHelp(): void {
  console.log(`Usage: codex-orchestrator resume --run <id> [options]

Options:
  --run <id>            Run id to resume.
  --token <resume-token>  Verify the resume token before restarting.
  --actor <name>        Record who resumed the run.
  --reason <text>       Record why the run was resumed.
  --target <stage-id>   Override stage selection before resuming.
  --format json         Emit machine-readable output.
  --interactive | --ui  Enable read-only HUD when running in a TTY.
  --no-interactive      Force disable HUD.
`);
}

function printDelegationServerHelp(): void {
  console.log(`Usage: codex-orchestrator delegate-server [options]

Options:
  --repo <path>                    Repo root for config + manifests (default cwd).
  --mode <full|question_only>      Limit tool surface for child runs.
  --config "<key>=<value>[;...]"   Apply config overrides.
  --help                           Show this message.
`);
}

function printMcpHelp(): void {
  console.log(`Usage: codex-orchestrator mcp <subcommand> [options]

Subcommands:
  serve [--repo <path>] [--dry-run] [-- <extra args>]
    Proxy Codex MCP server mode through the selected Codex binary.

  enable [--servers <csv>] [--yes] [--format json]
    Enable disabled MCP servers using the existing Codex MCP definitions.
    --servers <csv>    Comma-separated server names (default: all disabled servers).
    --yes              Apply changes (default: plan only).
    --format json      Emit machine-readable output.
`);
}

function printPrHelp(): void {
  console.log(`Usage: codex-orchestrator pr <subcommand> [options]

Subcommands:
  watch-merge             Monitor PR checks/reviews with polling and optional auto-merge.
                          Supports PR_MONITOR_* env vars and standard flags (see: pr watch-merge --help).

Examples:
  codex-orchestrator pr watch-merge --pr 211 --dry-run --quiet-minutes 10
  codex-orchestrator pr watch-merge --pr 211 --auto-merge --merge-method squash

Guide:
  Review artifacts (prompt + output log paths): docs/guides/review-artifacts.md
`);
}

function printRlmHelp(): void {
  console.log(`Usage: codex-orchestrator rlm "<goal>" [options]

Options:
  --goal "<goal>"         Alternate way to set the goal (positional is preferred).
  --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
  --multi-agent [auto|true|false]  Preferred alias for multi-agent collab subagents (implies symbolic mode).
  --collab [auto|true|false]  Legacy alias for --multi-agent.
  --validator <cmd|none>  Set validator command or disable validation.
  --max-iterations <n>    Override max iterations (0 = unlimited with validator).
  --max-minutes <n>       Optional time-based guardrail in minutes.
  --roles <single|triad>  Choose single or triad role split.
  --parent-run <id>       Link run to parent run id.
  --approval-policy <p>   Record approval policy metadata.
  --interactive | --ui    Enable read-only HUD when running in a TTY.
  --no-interactive        Force disable HUD.
  --help                  Show this message.

Examples:
  codex-orchestrator rlm "stabilize failing test lane"
  codex-orchestrator rlm --multi-agent auto "resolve conflicting product requirements"

Tips:
  - Use --multi-agent auto for ambiguous/long-horizon work.
  - Ensure multi-agent is enabled in Codex: codex features enable multi_agent (legacy alias: collab).
`);
}

function printFlowHelp(): void {
  console.log(`Usage: codex-orchestrator flow [options]

Runs docs-review first, then implementation-gate. Stops on the first failure.

Options:
  --task <id>               Override task identifier.
  --parent-run <id>         Link docs-review run to parent run id.
  --approval-policy <p>     Record approval policy metadata.
  --format json             Emit machine-readable output for both runs.
  --execution-mode <mcp|cloud>  Force execution mode for both runs.
  --cloud                   Shortcut for --execution-mode cloud.
  --target <stage-id>       Focus plan/build metadata (applies where the stage exists).
  --interactive | --ui      Enable read-only HUD when running in a TTY.
  --no-interactive          Force disable HUD.
`);
}
