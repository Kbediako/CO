import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createWriteStream, mkdtempSync, type WriteStream } from 'node:fs';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { PassThrough } from 'node:stream';
import { tmpdir } from 'node:os';

import type { JsonlEvent, RunSummaryEvent, RunSummaryEventPayload } from '../../shared/events/types.js';

export interface ExecClientOptions {
  cliPath?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ExecCommandOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  notify?: string[];
  otelEndpoint?: string;
  taskId?: string;
}

export interface ExecRunResult {
  summary: RunSummaryEvent;
  events: JsonlEvent[];
  eventsPath: string;
  exitCode: number | null;
  status: 'succeeded' | 'failed';
  manifestPath: string;
  rawStderr: string[];
  stderrPath: string;
}

interface InternalExecOptions extends ExecCommandOptions {
  cliPath: string;
  spawnCwd: string;
  inheritedEnv: NodeJS.ProcessEnv;
}

export class ExecClient {
  private readonly cliPath: string;
  private readonly cwd: string;
  private readonly baseEnv: NodeJS.ProcessEnv;

  constructor(options: ExecClientOptions = {}) {
    this.cliPath = options.cliPath ?? 'codex-orchestrator';
    this.cwd = options.cwd ?? process.cwd();
    this.baseEnv = { ...process.env, ...options.env };
  }

  run(options: ExecCommandOptions): ExecRunHandle {
    if (!options.command) {
      throw new Error('Exec command requires a command to run.');
    }
    const internal = this.normalizeOptions(options);
    const child = spawn(internal.cliPath, buildCliArgs(internal), {
      cwd: internal.spawnCwd,
      env: internal.inheritedEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return new ExecRunHandle(this, internal, child);
  }

  private normalizeOptions(options: ExecCommandOptions): InternalExecOptions {
    const spawnCwd = this.cwd;
    const mergedEnv = { ...this.baseEnv, ...options.env };
    return {
      ...options,
      cliPath: this.cliPath,
      spawnCwd,
      inheritedEnv: mergedEnv
    };
  }
}

export class ExecRunHandle extends EventEmitter {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly eventsList: JsonlEvent[] = [];
  private readonly stderrLines: string[] = [];
  private readonly eventsStream: WriteStream;
  private readonly stderrStream: WriteStream;
  private readonly eventsFilePath: string;
  private readonly stderrFilePath: string;
  private readonly maxEventBuffer = 200;
  private readonly maxStderrBuffer = 200;
  private streamsClosed = false;
  private summaryEvent: RunSummaryEvent | null = null;
  private readonly resultPromise: Promise<ExecRunResult>;
  private resolveResult!: (value: ExecRunResult) => void;
  private rejectResult!: (reason: unknown) => void;

  constructor(
    private readonly client: ExecClient,
    private readonly baseOptions: InternalExecOptions,
    child: ChildProcessWithoutNullStreams
  ) {
    super();
    this.child = child;
    const artifactRoot = mkdtempSync(join(tmpdir(), 'codex-exec-'));
    this.eventsFilePath = join(artifactRoot, 'events.ndjson');
    this.stderrFilePath = join(artifactRoot, 'stderr.log');
    this.eventsStream = createWriteStream(this.eventsFilePath, { flags: 'a' });
    this.stderrStream = createWriteStream(this.stderrFilePath, { flags: 'a' });
    this.resultPromise = new Promise<ExecRunResult>((resolve, reject) => {
      this.resolveResult = resolve;
      this.rejectResult = reject;
    });

    const stdout = child.stdout ?? new PassThrough();
    const stderr = child.stderr ?? new PassThrough();

    const rl = createInterface({ input: stdout, crlfDelay: Infinity });
    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      let parsed: JsonlEvent;
      try {
        parsed = JSON.parse(trimmed) as JsonlEvent;
      } catch (error) {
        this.emit('warning', new Error(`Failed to parse JSONL line: ${trimmed}`));
        return;
      }
      this.eventsStream.write(`${JSON.stringify(parsed)}\n`);
      this.eventsList.push(parsed);
      if (this.eventsList.length > this.maxEventBuffer) {
        this.eventsList.shift();
      }
      this.emit('event', parsed);
      if (parsed.type === 'run:summary') {
        this.summaryEvent = parsed as RunSummaryEvent;
        this.resolveResult(this.buildResult());
        this.emit('summary', this.summaryEvent);
      }
    });

    stderr.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      this.stderrStream.write(text);
      if (this.stderrLines.length >= this.maxStderrBuffer) {
        this.stderrLines.shift();
      }
      this.stderrLines.push(text.trim());
      this.emit('stderr', text);
    });

    child.once('error', (error) => {
      this.closeStreams();
      this.emit('error', error);
      this.rejectResult(error);
    });

    child.once('close', (code, signal) => {
      this.closeStreams();
      this.emit('exit', { code, signal });
      if (!this.summaryEvent) {
        const error = new Error('Exec command exited without emitting a summary event.') as Error & {
          exitCode?: number | null;
          signal?: NodeJS.Signals | null;
        };
        error.exitCode = code ?? null;
        error.signal = signal ?? null;
        this.rejectResult(error);
      }
    });
  }

  get events(): readonly JsonlEvent[] {
    return this.eventsList;
  }

  get summary(): RunSummaryEvent | null {
    return this.summaryEvent;
  }

  get result(): Promise<ExecRunResult> {
    return this.resultPromise;
  }

  cancel(signal: NodeJS.Signals | number = 'SIGTERM'): void {
    if (!this.child.killed) {
      this.child.kill(signal);
    }
  }

  retry(overrides: Partial<ExecCommandOptions> = {}): ExecRunHandle {
    const merged: ExecCommandOptions = {
      ...this.baseOptions,
      ...overrides
    };
    delete (merged as Partial<InternalExecOptions>).cliPath;
    delete (merged as Partial<InternalExecOptions>).spawnCwd;
    delete (merged as Partial<InternalExecOptions>).inheritedEnv;
    return this.client.run(merged);
  }

  private buildResult(): ExecRunResult {
    if (!this.summaryEvent) {
      throw new Error('Summary not available');
    }
    const payload = this.summaryEvent.payload as RunSummaryEventPayload;
    return {
      summary: this.summaryEvent,
      events: [...this.eventsList],
      eventsPath: this.eventsFilePath,
      exitCode: payload.result.exitCode ?? null,
      status: payload.status,
      manifestPath: payload.run.manifest,
      rawStderr: [...this.stderrLines],
      stderrPath: this.stderrFilePath
    };
  }

  private closeStreams(): void {
    if (this.streamsClosed) {
      return;
    }
    this.streamsClosed = true;
    this.eventsStream.end();
    this.stderrStream.end();
  }
}

function buildCliArgs(options: InternalExecOptions): string[] {
  const args: string[] = ['exec', '--jsonl'];
  if (options.taskId) {
    args.push('--task', options.taskId);
  }
  if (options.cwd) {
    args.push('--cwd', options.cwd);
  }
  if (options.otelEndpoint) {
    args.push('--otel-endpoint', options.otelEndpoint);
  }
  if (options.notify) {
    for (const target of options.notify) {
      args.push('--notify', target);
    }
  }
  args.push('--');
  args.push(options.command, ...(options.args ?? []));
  return args;
}
