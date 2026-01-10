import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { once } from 'node:events';

import type { RunEvent, RunEventEmitter } from './runEvents.js';
import type { RunPaths } from '../run/runPaths.js';
import { isoTimestamp } from '../utils/time.js';

const SCHEMA_VERSION = 1;

export interface RunEventStreamEntry {
  schema_version: number;
  seq: number;
  timestamp: string;
  task_id: string;
  run_id: string;
  event: string;
  actor: string;
  payload: Record<string, unknown> | null;
}

export interface RunEventStreamOptions {
  paths: RunPaths;
  taskId: string;
  runId: string;
  pipelineId: string;
  pipelineTitle: string;
  now?: () => string;
}

export class RunEventStream {
  private seq: number;
  private readonly stream: ReturnType<typeof createWriteStream>;
  private readonly now: () => string;
  private readonly taskId: string;
  private readonly runId: string;
  private writeQueue: Promise<void> = Promise.resolve();

  private constructor(
    stream: ReturnType<typeof createWriteStream>,
    options: { taskId: string; runId: string; now: () => string; initialSeq: number }
  ) {
    this.stream = stream;
    this.taskId = options.taskId;
    this.runId = options.runId;
    this.now = options.now;
    this.seq = options.initialSeq;
  }

  static async create(options: RunEventStreamOptions): Promise<RunEventStream> {
    await mkdir(options.paths.runDir, { recursive: true });
    const initialSeq = await readLastSeq(options.paths.eventsPath);
    const stream = createWriteStream(options.paths.eventsPath, { flags: 'a' });
    return new RunEventStream(stream, {
      taskId: options.taskId,
      runId: options.runId,
      now: options.now ?? isoTimestamp,
      initialSeq
    });
  }

  async append(input: {
    event: string;
    actor?: string;
    payload?: Record<string, unknown> | null;
    timestamp?: string;
  }): Promise<RunEventStreamEntry> {
    const entry: RunEventStreamEntry = {
      schema_version: SCHEMA_VERSION,
      seq: this.nextSeq(),
      timestamp: input.timestamp ?? this.now(),
      task_id: this.taskId,
      run_id: this.runId,
      event: input.event,
      actor: input.actor ?? 'runner',
      payload: input.payload ?? null
    };
    const line = `${JSON.stringify(entry)}\n`;
    this.writeQueue = this.writeQueue.then(
      () =>
        new Promise<void>((resolve, reject) => {
          this.stream.write(line, (error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    );
    await this.writeQueue;
    return entry;
  }

  async close(): Promise<void> {
    await this.writeQueue;
    this.stream.end();
    await once(this.stream, 'finish');
  }

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }
}

export function attachRunEventAdapter(
  emitter: RunEventEmitter,
  stream: RunEventStream,
  onEntry?: (entry: RunEventStreamEntry) => void,
  onError?: (error: Error, payload: { event: string; actor: string; payload: Record<string, unknown> }) => void
): () => void {
  return emitter.on('*', (event) => {
    const mapped = mapRunEvent(event);
    if (!mapped) {
      return;
    }
    void stream
      .append(mapped)
      .then((entry) => {
        onEntry?.(entry);
      })
      .catch((error) => {
        onError?.(error as Error, mapped);
      });
  });
}

function mapRunEvent(event: RunEvent): { event: string; actor: string; payload: Record<string, unknown> } | null {
  // The public event stream uses "step_*" naming for pipeline stages to match UI terminology.
  switch (event.type) {
    case 'run:started':
      return {
        event: 'run_started',
        actor: 'runner',
        payload: {
          pipeline_id: event.pipelineId,
          pipeline_title: event.pipelineTitle,
          status: event.status,
          manifest_path: event.manifestPath,
          log_path: event.logPath
        }
      };
    case 'stage:started':
      return {
        event: 'step_started',
        actor: 'runner',
        payload: {
          stage_id: event.stageId,
          stage_index: event.stageIndex,
          title: event.title,
          kind: event.kind,
          status: event.status,
          log_path: event.logPath
        }
      };
    case 'stage:completed':
      return {
        event: event.status === 'failed' ? 'step_failed' : 'step_completed',
        actor: 'runner',
        payload: {
          stage_id: event.stageId,
          stage_index: event.stageIndex,
          title: event.title,
          kind: event.kind,
          status: event.status,
          exit_code: event.exitCode,
          summary: event.summary,
          log_path: event.logPath,
          sub_run_id: event.subRunId ?? null
        }
      };
    case 'run:completed':
      return {
        event: 'run_completed',
        actor: 'runner',
        payload: {
          pipeline_id: event.pipelineId,
          status: event.status,
          manifest_path: event.manifestPath,
          run_summary_path: event.runSummaryPath,
          metrics_path: event.metricsPath,
          summary: event.summary
        }
      };
    case 'run:error':
      return {
        event: 'run_failed',
        actor: 'runner',
        payload: {
          pipeline_id: event.pipelineId,
          message: event.message,
          stage_id: event.stageId ?? null
        }
      };
    case 'log':
      return {
        event: 'agent_message',
        actor: 'runner',
        payload: {
          message: event.message,
          level: event.level,
          stage_id: event.stageId ?? null,
          stage_index: event.stageIndex ?? null,
          source: event.source ?? null
        }
      };
    case 'tool:call':
      return {
        event: 'tool_called',
        actor: 'runner',
        payload: {
          tool_name: event.toolName,
          status: event.status,
          message: event.message ?? null,
          attempt: event.attempt ?? null,
          stage_id: event.stageId ?? null,
          stage_index: event.stageIndex ?? null
        }
      };
    default:
      return null;
  }
}

async function readLastSeq(pathname: string): Promise<number> {
  try {
    const raw = await readFile(pathname, 'utf8');
    if (!raw.trim()) {
      return 0;
    }
    const lines = raw.split('\n');
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index]?.trim();
      if (!line) {
        continue;
      }
      try {
        const parsed = JSON.parse(line) as { seq?: number };
        if (typeof parsed.seq === 'number' && Number.isFinite(parsed.seq)) {
          return parsed.seq;
        }
      } catch {
        continue;
      }
    }
    return 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
}
