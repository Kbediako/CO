import process from 'node:process';

import type { EnvironmentPaths } from '../run/environment.js';
import { bootstrapManifest } from '../run/manifest.js';
import type { CommandStage, CliManifest, PipelineDefinition } from '../types.js';
import { generateRunId } from '../utils/runId.js';
import type { RunPaths } from '../run/runPaths.js';
import { ExperienceStore } from '../../persistence/ExperienceStore.js';
import type { ExecEvent, JsonlEvent } from '../../../../packages/shared/events/types.js';
import { EnvUtils } from '../../../../packages/shared/config/index.js';
import {
  createTelemetrySink,
  type ExecTelemetrySink
} from '../../../../packages/orchestrator/src/telemetry/otel-exporter.js';
import {
  createNotificationSink,
  type ExecNotificationSink
} from '../../../../packages/orchestrator/src/notifications/index.js';
import { ManifestPersister, persistManifest } from '../run/manifestPersister.js';

export type ExecOutputMode = 'interactive' | 'json' | 'jsonl';

export interface ExecCommandInvocation {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  outputMode: ExecOutputMode;
  notifyTargets?: string[];
  otelEndpoint?: string | null;
  jsonPretty?: boolean;
  session?: {
    id?: string;
    reuse?: boolean;
    persist?: boolean;
  };
  approvalRequired?: boolean;
  approvalKey?: string;
  description?: string;
}

export interface ExecCommandContext {
  env: EnvironmentPaths;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
  runIdFactory?: () => string;
  telemetrySink?: ExecTelemetrySink;
  notificationSink?: ExecNotificationSink;
}

export interface ExecRunContext {
  env: EnvironmentPaths;
  invocation: ExecCommandInvocation;
  argv: string[];
  shellCommand: string;
  outputMode: ExecOutputMode;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  runId: string;
  pipeline: PipelineDefinition;
  stage: CommandStage;
  manifest: CliManifest;
  paths: RunPaths;
  persister: ManifestPersister;
  telemetrySink: ExecTelemetrySink;
  notificationSink: ExecNotificationSink;
  jsonlWriter: JsonlWriter | null;
  experienceStore: ExperienceStore;
  execEvents: ExecEvent[];
  telemetryTasks: Array<Promise<void>>;
}

type JsonlWriter = (event: JsonlEvent<unknown>) => void;

const MAX_TELEMETRY_EVENTS = EnvUtils.getInt('CODEX_ORCHESTRATOR_TELEMETRY_MAX_EVENTS', 1000);

export async function bootstrapExecContext(
  context: ExecCommandContext,
  invocation: ExecCommandInvocation
): Promise<ExecRunContext> {
  const argv = [invocation.command, ...(invocation.args ?? [])];
  const shellCommand = buildShellCommand(argv);
  const stdout = context.stdout ?? process.stdout;
  const stderr = context.stderr ?? process.stderr;
  const outputMode = invocation.outputMode;

  if (outputMode === 'interactive') {
    stdout.write(`$ ${shellCommand}\n`);
  }

  const runIdFactory = context.runIdFactory ?? generateRunId;
  const env = context.env;
  const experienceStore = new ExperienceStore({
    outDir: env.outRoot,
    runsDir: env.runsRoot
  });
  const runId = runIdFactory();
  const pipeline = createPipeline(shellCommand, invocation, env);
  const stage = pipeline.stages[0] as CommandStage;
  const { manifest, paths } = await bootstrapManifest(runId, {
    env,
    pipeline,
    taskSlug: null,
    approvalPolicy: null
  });

  const persister = new ManifestPersister({
    manifest,
    paths,
    persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
  });
  manifest.status = 'in_progress';
  await persistManifest(paths, manifest, persister, { force: true });

  const telemetrySink = context.telemetrySink ?? createTelemetrySink({
    endpoint: invocation.otelEndpoint,
    enabled: Boolean(invocation.otelEndpoint),
    maxQueueSize: MAX_TELEMETRY_EVENTS
  });
  const envNotifications = parseNotificationEnv(process.env.CODEX_ORCHESTRATOR_NOTIFY);
  const notificationSink =
    context.notificationSink ??
    createNotificationSink({
      targets: invocation.notifyTargets,
      envTargets: envNotifications
    });

  const jsonlWriter =
    outputMode === 'jsonl'
      ? (event: JsonlEvent<unknown>) => {
          stdout.write(`${JSON.stringify(event)}\n`);
        }
      : null;

  return {
    env,
    invocation,
    argv,
    shellCommand,
    outputMode,
    stdout,
    stderr,
    runId,
    pipeline,
    stage,
    manifest,
    paths,
    persister,
    telemetrySink,
    notificationSink,
    jsonlWriter,
    experienceStore,
    execEvents: [],
    telemetryTasks: []
  };
}

export function createPipeline(
  shellCommand: string,
  invocation: ExecCommandInvocation,
  env: EnvironmentPaths
): PipelineDefinition {
  const stage: CommandStage = {
    kind: 'command',
    id: 'exec',
    title: invocation.description ?? `Execute ${shellCommand}`,
    command: shellCommand,
    cwd: invocation.cwd ?? env.repoRoot,
    env: invocation.env,
    session: invocation.session
  };

  return {
    id: 'exec',
    title: 'CLI Exec Command',
    stages: [stage],
    guardrailsRequired: false
  };
}

export function buildShellCommand(argv: string[]): string {
  return argv.map(shellEscape).join(' ');
}

export function parseNotificationEnv(value: string | undefined): string[] | null {
  if (!value) {
    return null;
  }
  const tokens = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return tokens.length ? tokens : null;
}

function shellEscape(value: string): string {
  if (value === '') {
    return "''";
  }
  if (/^[A-Za-z0-9_/.:=-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
