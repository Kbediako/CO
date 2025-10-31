#!/usr/bin/env node
import process from 'node:process';

import { CodexOrchestrator } from '../orchestrator/src/cli/orchestrator.js';
import { formatPlanPreview } from '../orchestrator/src/cli/utils/planFormatter.js';

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

async function handleStart(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const pipelineId = positionals[0];
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const result = await orchestrator.start({
    pipelineId,
    taskId: typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined,
    parentRunId: typeof flags['parent-run'] === 'string' ? (flags['parent-run'] as string) : undefined,
    approvalPolicy: typeof flags['approval-policy'] === 'string' ? (flags['approval-policy'] as string) : undefined
  });
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
}

async function handlePlan(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  const pipelineId = positionals[0];
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const result = await orchestrator.plan({
    pipelineId,
    taskId: typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined
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
  const result = await orchestrator.resume({
    runId,
    resumeToken: typeof flags['token'] === 'string' ? (flags['token'] as string) : undefined,
    actor: typeof flags['actor'] === 'string' ? (flags['actor'] as string) : undefined,
    reason: typeof flags['reason'] === 'string' ? (flags['reason'] as string) : undefined
  });
  console.log(`Run resumed: ${result.manifest.run_id}`);
  console.log(`Status: ${result.manifest.status}`);
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

function printHelp(): void {
  console.log(`Usage: codex-orchestrator <command> [options]

Commands:
  start [pipeline]          Start a new run (default pipeline is diagnostics).
    --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
    --parent-run <id>       Link run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --format json           Emit machine-readable output.

  plan [pipeline]           Preview pipeline stages without executing.
    --task <id>             Override task identifier.
    --format json           Emit machine-readable output.

  resume --run <id> [options]
    --token <resume-token>  Verify the resume token before restarting.
    --actor <name>          Record who resumed the run.
    --reason <text>         Record why the run was resumed.

  status --run <id> [--watch] [--interval N] [--format json]

  help                      Show this message.
`);
}

void main();
