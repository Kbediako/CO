#!/usr/bin/env node
import process from 'node:process';

import { CodexOrchestrator } from '../orchestrator/src/cli/orchestrator.js';
import { formatPlanPreview } from '../orchestrator/src/cli/utils/planFormatter.js';
import {
  executeExecCommand,
  type ExecOutputMode
} from '../orchestrator/src/cli/exec/command.js';
import { resolveEnvironment, sanitizeTaskId } from '../orchestrator/src/cli/run/environment.js';
import { RunEventEmitter } from '../orchestrator/src/cli/events/runEvents.js';
import type { HudController } from '../orchestrator/src/cli/ui/controller.js';
import { evaluateInteractiveGate } from '../orchestrator/src/cli/utils/interactive.js';

type ArgMap = Record<string, string | boolean>;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args.shift();
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const orchestrator = new CodexOrchestrator();

  try {
    switch (command) {
      case 'start':
        await handleStart(orchestrator, args);
        break;
      case 'plan':
        await handlePlan(orchestrator, args);
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

async function handleStart(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const pipelineId = positionals[0];
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
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
    const result = await orchestrator.start({
      pipelineId,
      taskId: typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined,
      parentRunId: typeof flags['parent-run'] === 'string' ? (flags['parent-run'] as string) : undefined,
      approvalPolicy: typeof flags['approval-policy'] === 'string' ? (flags['approval-policy'] as string) : undefined,
      targetStageId: resolveTargetStageId(flags),
      runEvents
    });
    hud?.stop();

    const payload = {
      run_id: result.manifest.run_id,
      status: result.manifest.status,
      artifact_root: result.manifest.artifact_root,
      manifest: `${result.manifest.artifact_root}/manifest.json`,
      log_path: result.manifest.log_path
    };
    if (format === 'json') {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(`Run started: ${payload.run_id}`);
      console.log(`Status: ${payload.status}`);
      console.log(`Manifest: ${payload.manifest}`);
      console.log(`Log: ${payload.log_path}`);
    }
  } finally {
    hud?.stop();
    runEvents.dispose();
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

async function handleResume(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const runId = (flags['run'] ?? positionals[0]) as string | undefined;
  if (!runId) {
    throw new Error('resume requires --run <run-id>.');
  }
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
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
    const result = await orchestrator.resume({
      runId,
      resumeToken: typeof flags['token'] === 'string' ? (flags['token'] as string) : undefined,
      actor: typeof flags['actor'] === 'string' ? (flags['actor'] as string) : undefined,
      reason: typeof flags['reason'] === 'string' ? (flags['reason'] as string) : undefined,
      targetStageId: resolveTargetStageId(flags),
      runEvents
    });
    hud?.stop();
    const payload = {
      run_id: result.manifest.run_id,
      status: result.manifest.status,
      artifact_root: result.manifest.artifact_root,
      manifest: `${result.manifest.artifact_root}/manifest.json`,
      log_path: result.manifest.log_path
    };
    if (format === 'json') {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(`Run resumed: ${payload.run_id}`);
      console.log(`Status: ${payload.status}`);
      console.log(`Manifest: ${payload.manifest}`);
      console.log(`Log: ${payload.log_path}`);
    }
  } finally {
    hud?.stop();
    runEvents.dispose();
  }
}

async function handleStatus(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
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

  const env = resolveEnvironment();
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
    commandTokens,
    notifyTargets,
    otelEndpoint,
    requestedMode,
    jsonPretty,
    cwd,
    taskId
  };
}

function printHelp(): void {
  console.log(`Usage: codex-orchestrator <command> [options]

Commands:
  start [pipeline]          Start a new run (default pipeline is diagnostics).
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

  help                      Show this message.
`);
}

void main();
