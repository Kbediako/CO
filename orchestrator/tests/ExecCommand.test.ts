import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import process from 'node:process';

import { executeExecCommand } from '../src/cli/exec/command.js';
import { resolveEnvironment } from '../src/cli/run/environment.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'codex-exec-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'exec-test';
});

afterEach(async () => {
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('executeExecCommand', () => {
  it('emits JSON summary output in --json mode', async () => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    let output = '';
    stdout.setEncoding('utf8');
    stdout.on('data', (chunk) => {
      output += chunk;
    });

    const env = resolveEnvironment();

    const result = await executeExecCommand(
      {
        env,
        stdout,
        stderr,
        runIdFactory: () => 'run-json'
      },
      {
        command: process.execPath,
        args: ['-e', "process.stdout.write('hello-json')"],
        outputMode: 'json',
        jsonPretty: false,
        notifyTargets: [],
        otelEndpoint: null
      }
    );

    expect(result.status).toBe('succeeded');
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(output.trim());
    expect(parsed.type).toBe('run:summary');
    expect(parsed.payload.outputs.stdout).toContain('hello-json');
    const manifestPath = join(workspaceRoot, result.manifestPath);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    expect(manifest.status).toBe('succeeded');
  });

  it('streams JSONL events when requested', async () => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const lines: string[] = [];
    stdout.setEncoding('utf8');
    stdout.on('data', (chunk) => {
      lines.push(...chunk.split('\n').filter(Boolean));
    });

    const env = resolveEnvironment();

    const result = await executeExecCommand(
      {
        env,
        stdout,
        stderr,
        runIdFactory: () => 'run-jsonl'
      },
      {
        command: process.execPath,
        args: ['-e', "process.stdout.write('hello-jsonl')"],
        outputMode: 'jsonl',
        jsonPretty: false,
        notifyTargets: [],
        otelEndpoint: null
      }
    );

    expect(result.status).toBe('succeeded');
    expect(lines.length).toBeGreaterThan(1);
    const first = JSON.parse(lines[0]!);
    expect(first.type).toBe('exec:begin');
    const last = JSON.parse(lines[lines.length - 1]!);
    expect(last.type).toBe('run:summary');
    expect(last.payload.outputs.stdout).toContain('hello-jsonl');
  });
});
