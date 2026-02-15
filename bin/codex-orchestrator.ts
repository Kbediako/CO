#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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
import { runDoctor, formatDoctorSummary } from '../orchestrator/src/cli/doctor.js';
import { formatDevtoolsSetupSummary, runDevtoolsSetup } from '../orchestrator/src/cli/devtoolsSetup.js';
import { formatCodexCliSetupSummary, runCodexCliSetup } from '../orchestrator/src/cli/codexCliSetup.js';
import { formatSkillsInstallSummary, installSkills } from '../orchestrator/src/cli/skills.js';
import { loadPackageInfo } from '../orchestrator/src/cli/utils/packageInfo.js';
import { slugify } from '../orchestrator/src/cli/utils/strings.js';
import { serveMcp } from '../orchestrator/src/cli/mcp.js';
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
    if (queue[0] && !queue[0]!.startsWith('--')) {
      flags[key] = queue.shift() as string;
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

function applyRlmEnvOverrides(flags: ArgMap, goal?: string): void {
  if (goal) {
    process.env.RLM_GOAL = goal;
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
    applyRlmEnvOverrides(flags, goal);
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
  const goalFromArgs = positionals.length > 0 ? positionals.join(' ') : undefined;
  const goal = goalFromArgs ?? readStringFlag(flags, 'goal') ?? process.env.RLM_GOAL?.trim();
  if (!goal) {
    throw new Error('rlm requires a goal. Use: codex-orchestrator rlm \"<goal>\".');
  }

  const taskFlag = typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined;
  const taskId = resolveRlmTaskId(taskFlag);
  process.env.MCP_RUNNER_TASK_ID = taskId;
  applyRlmEnvOverrides(flags, goal);

  console.log(`Task: ${taskId}`);

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

function emitRunOutput(result: { manifest: { run_id: string; status: string; artifact_root: string; log_path: string | null } }, format: OutputFormat, label: string): void {
  const payload: RunOutputPayload = {
    run_id: result.manifest.run_id,
    status: result.manifest.status,
    artifact_root: result.manifest.artifact_root,
    manifest: `${result.manifest.artifact_root}/manifest.json`,
    log_path: result.manifest.log_path
  };
  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(`${label}: ${payload.run_id}`);
  console.log(`Status: ${payload.status}`);
  console.log(`Manifest: ${payload.manifest}`);
  console.log(`Log: ${payload.log_path}`);
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

async function handleDoctor(rawArgs: string[]): Promise<void> {
  const { flags } = parseArgs(rawArgs);
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const result = runDoctor();
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const summary = formatDoctorSummary(result);
  for (const line of summary) {
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
      const onlyFlag = readStringFlag(flags, 'only');
      const only = onlyFlag ? onlyFlag.split(',').map((entry) => entry.trim()).filter(Boolean) : undefined;
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
  const subcommand = positionals.shift();
  if (!subcommand) {
    throw new Error('mcp requires a subcommand (serve).');
  }
  if (subcommand !== 'serve') {
    throw new Error(`Unknown mcp subcommand: ${subcommand}`);
  }
  const repoRoot = typeof flags['repo'] === 'string' ? (flags['repo'] as string) : undefined;
  const dryRun = Boolean(flags['dry-run']);
  await serveMcp({ repoRoot, dryRun, extraArgs: positionals });
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
  if (flags['help'] === true) {
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
    --validator <cmd|none>  When pipeline is rlm, set the validator command.
    --max-iterations <n>    When pipeline is rlm, override max iterations.
    --max-minutes <n>       When pipeline is rlm, override max minutes.
    --roles <single|triad>  When pipeline is rlm, set role split.
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  rlm "<goal>"              Run RLM loop until validator passes.
    --task <id>             Override task identifier.
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
    --codex-cli            Also run CO-managed Codex CLI setup (plan unless --yes).
    --codex-source <path>  Build from local Codex repo (or git URL).
    --codex-ref <ref>      Git ref (branch/tag/sha) when building from repo.
    --codex-download-url <url>  Download a prebuilt codex binary.
    --codex-download-sha256 <sha>  Expected SHA256 for the prebuilt download.
    --codex-force          Overwrite existing CO-managed codex binary.
    --yes                  Apply codex CLI setup (otherwise plan only).
  doctor [--format json]
  codex setup
    --source <path>        Build from local Codex repo (or git URL).
    --ref <ref>            Git ref (branch/tag/sha) when building from repo.
    --download-url <url>   Download a prebuilt codex binary.
    --download-sha256 <sha>  Expected SHA256 for the prebuilt download.
    --force                Overwrite existing CO-managed codex binary.
    --yes                  Apply setup (otherwise plan only).
    --format json          Emit machine-readable output.
  devtools setup          Print DevTools MCP setup instructions.
    --yes                 Apply setup by running "codex mcp add ...".
    --format json         Emit machine-readable output (dry-run only).
  skills install          Install bundled skills into $CODEX_HOME/skills.
    --force               Overwrite existing skill files.
    --only <skills>       Install only selected skills (comma-separated).
    --codex-home <path>   Override the target Codex home directory.
    --format json         Emit machine-readable output.
  mcp serve [--repo <path>] [--dry-run] [-- <extra args>]
  pr watch-merge [options]
    Monitor PR checks/reviews with polling and optional auto-merge after a quiet window.
    Use \`codex-orchestrator pr watch-merge --help\` for full options.
  delegate-server         Run the delegation MCP server (stdio).
    --repo <path>         Repo root for config + manifests (default cwd).
    --mode <full|question_only>  Limit tool surface for child runs.
    --config "<key>=<value>[;...]"  Apply config overrides (repeat via separators).
  version | --version

  help                      Show this message.
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

function printPrHelp(): void {
  console.log(`Usage: codex-orchestrator pr <subcommand> [options]

Subcommands:
  watch-merge             Monitor PR checks/reviews with polling and optional auto-merge.
                          Supports PR_MONITOR_* env vars and standard flags (see: pr watch-merge --help).

Examples:
  codex-orchestrator pr watch-merge --pr 211 --dry-run --quiet-minutes 10
  codex-orchestrator pr watch-merge --pr 211 --auto-merge --merge-method squash
`);
}
