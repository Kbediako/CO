import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import process from 'node:process';

import { executeExecCommand } from '../src/cli/exec/command.js';
import { resolveEnvironment } from '../src/cli/run/environment.js';
import * as CommandRunner from '../src/cli/services/commandRunner.js';
import {
  computePromptPackStamp,
  type PromptPackSectionSource
} from '../../packages/orchestrator/src/instructions/promptPacks.js';
import { ToolInvocationFailedError } from '../../packages/orchestrator/src/index.js';
import type { ToolRunRecord } from '../../packages/shared/manifest/types.js';

type OnResultPayload = Parameters<NonNullable<CommandRunner.CommandRunHooks['onResult']>>[0];

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID,
  tfgrpoEpoch: process.env.TFGRPO_EPOCH,
  tfgrpoGroupId: process.env.TFGRPO_GROUP_ID,
  tfgrpoGroupSize: process.env.TFGRPO_GROUP_SIZE
};

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

async function seedPromptPack(root: string): Promise<void> {
  const promptDir = join(root, '.agent', 'prompts');
  await mkdir(promptDir, { recursive: true });
  const promptPath = join(promptDir, 'sample.md');
  const promptRel = '.agent/prompts/sample.md';
  const content = '# Prompt\nUse experiences.';
  await writeFile(promptPath, content, 'utf8');
  const sections: PromptPackSectionSource[] = [
    { section: 'system', path: promptRel, content },
    { section: 'inject', path: promptRel, content },
    { section: 'summarize', path: promptRel, content },
    { section: 'extract', path: promptRel, content },
    { section: 'optimize', path: promptRel, content }
  ];
  const stamp = computePromptPackStamp(sections);
  const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', 'tfgrpo');
  await mkdir(manifestDir, { recursive: true });
  await writeFile(
    join(manifestDir, 'manifest.json'),
    JSON.stringify(
      {
        id: 'tfgrpo-pack',
        domain: 'implementation',
        stamp,
        experienceSlots: 1,
        system: promptRel,
        inject: [promptRel],
        summarize: [promptRel],
        extract: [promptRel],
        optimize: [promptRel]
      },
      null,
      2
    ),
    'utf8'
  );
}

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'codex-exec-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'exec-test';
});

afterEach(async () => {
  restoreEnv('CODEX_ORCHESTRATOR_ROOT', ORIGINAL_ENV.root);
  restoreEnv('CODEX_ORCHESTRATOR_RUNS_DIR', ORIGINAL_ENV.runs);
  restoreEnv('CODEX_ORCHESTRATOR_OUT_DIR', ORIGINAL_ENV.out);
  restoreEnv('MCP_RUNNER_TASK_ID', ORIGINAL_ENV.task);
  restoreEnv('TFGRPO_EPOCH', ORIGINAL_ENV.tfgrpoEpoch);
  restoreEnv('TFGRPO_GROUP_ID', ORIGINAL_ENV.tfgrpoGroupId);
  restoreEnv('TFGRPO_GROUP_SIZE', ORIGINAL_ENV.tfgrpoGroupSize);
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

  it('finalizes manifest entries when the command runner throws', async () => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    stdout.resume();
    stderr.resume();

    const env = resolveEnvironment();
    const failureRecord: ToolRunRecord = {
      id: 'tool-run-failure',
      tool: 'cli:command',
      approvalSource: 'not-required',
      retryCount: 0,
      sandboxState: 'sandboxed',
      status: 'failed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      attemptCount: 1,
      metadata: {
        exec: {
          command: process.execPath,
          args: ['-e', 'process.exit(9)'],
          cwd: env.repoRoot,
          sessionId: 'session-failure',
          persisted: false,
          correlationId: 'corr-error',
          exitCode: 9,
          signal: null,
          sandboxState: 'sandboxed'
        }
      },
      events: []
    };
    const failure = new ToolInvocationFailedError('simulated failure', failureRecord, new Error('exec failed'));

    const runSpy = vi
      .spyOn(CommandRunner, 'runCommandStage')
      .mockImplementationOnce(async (_context, hooks) => {
        hooks?.onError?.(failure);
        throw failure;
      });

    try {
      const result = await executeExecCommand(
        {
          env,
          stdout,
          stderr,
          runIdFactory: () => 'run-error'
        },
        {
          command: process.execPath,
          args: ['-e', 'process.exit(9)'],
          outputMode: 'json',
          jsonPretty: false,
          notifyTargets: [],
          otelEndpoint: null
        }
      );

      const manifestPath = join(workspaceRoot, result.manifestPath);
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        commands: Array<{
          status: string;
          exit_code: number | null;
          summary: string | null;
          error_file: string | null;
          completed_at: string | null;
        }>;
      };
      const entry = manifest.commands[0]!;
      expect(entry.status).toBe('failed');
      expect(entry.exit_code).toBe(9);
      expect(entry.summary).toMatch(/simulated failure/i);
      expect(entry.completed_at).toBeTruthy();
      expect(entry.error_file).toBeTruthy();

      const errorFile = join(workspaceRoot, entry.error_file as string);
      const errorDetails = JSON.parse(
        await readFile(errorFile, 'utf8')
      ) as { details: { exit_code: number | null } };
      expect(errorDetails.details.exit_code).toBe(9);

      expect(result.status).toBe('failed');
      expect(result.summaryEvent.payload.result.exitCode).toBe(9);
    } finally {
      runSpy.mockRestore();
    }
  });

  it('propagates signals from execution results', async () => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    stdout.resume();
    stderr.resume();

    const env = resolveEnvironment();
    const signalRecord: ToolRunRecord = {
      id: 'tool-run-signal',
      tool: 'cli:command',
      approvalSource: 'prompt',
      retryCount: 0,
      sandboxState: 'sandboxed',
      status: 'failed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      attemptCount: 1,
      metadata: {
        exec: {
          command: process.execPath,
          args: ['-e', 'process.exit(0)'],
          cwd: env.repoRoot,
          sessionId: 'session-signal',
          persisted: false,
          correlationId: 'corr-signal',
          exitCode: null,
          signal: 'SIGTERM',
          sandboxState: 'sandboxed'
        }
      },
      events: []
    };

    const runSpy = vi
      .spyOn(CommandRunner, 'runCommandStage')
      .mockImplementationOnce(async (_context, hooks) => {
        hooks?.onResult?.({
          correlationId: 'corr-signal',
          stdout: '',
          stderr: '',
          exitCode: null,
          signal: 'SIGTERM',
          durationMs: 25,
          status: 'failed',
          sandboxState: 'sandboxed',
          record: signalRecord
        } as OnResultPayload);
        return { exitCode: 143, summary: 'terminated' };
      });

    try {
      const result = await executeExecCommand(
        {
          env,
          stdout,
          stderr,
          runIdFactory: () => 'run-signal'
        },
        {
          command: process.execPath,
          args: ['-e', 'process.exit(0)'],
          outputMode: 'json',
          jsonPretty: false,
          notifyTargets: [],
          otelEndpoint: null
        }
      );

      expect(result.signal).toBe('SIGTERM');
      expect(result.exitCode).toBeNull();
      const manifestPath = join(workspaceRoot, result.manifestPath);
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { status: string };
      expect(manifest.status).toBe('failed');
    } finally {
      runSpy.mockRestore();
    }
  });

  it('throws when MCP_RUNNER_TASK_ID is invalid', () => {
    process.env.MCP_RUNNER_TASK_ID = '../bad';
    expect(() => resolveEnvironment()).toThrow(/Invalid MCP_RUNNER_TASK_ID/);
  });

  it('records tfgrpo metrics in manifests and summary events', async () => {
    process.env.TFGRPO_EPOCH = '2';
    process.env.TFGRPO_GROUP_ID = 'group-a';
    process.env.TFGRPO_GROUP_SIZE = '3';

    const stdout = new PassThrough();
    const stderr = new PassThrough();
    stdout.resume();
    stderr.resume();

    const env = resolveEnvironment();
    const result = await executeExecCommand(
      {
        env,
        stdout,
        stderr,
        runIdFactory: () => 'run-metrics'
      },
      {
        command: process.execPath,
        args: ['-e', "process.stdout.write('tfgrpo metrics sample output')"],
        outputMode: 'json',
        jsonPretty: false,
        notifyTargets: [],
        otelEndpoint: null
      }
    );

    const manifestPath = join(workspaceRoot, result.manifestPath);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      tfgrpo: {
        epoch: number | null;
        group_id: string | null;
        group_size: number | null;
        tool_metrics: {
          tool_calls: number;
          per_tool: Array<{ tool: string; tokens: number }>;
        };
      };
    };
    expect(manifest.tfgrpo.epoch).toBe(2);
    expect(manifest.tfgrpo.group_id).toBe('group-a');
    expect(manifest.tfgrpo.group_size).toBe(3);
    expect(manifest.tfgrpo.tool_metrics.tool_calls).toBeGreaterThanOrEqual(1);
    expect(manifest.tfgrpo.tool_metrics.per_tool[0]?.tool).toBe('cli:command');

    expect(result.summaryEvent.payload.metrics?.tfgrpo?.epoch).toBe(2);
    expect(result.summaryEvent.payload.metrics?.perTool[0]?.tokens).toBeGreaterThan(0);
  });

  it('persists experiences when prompt packs are available', async () => {
    await seedPromptPack(workspaceRoot);
    process.env.TFGRPO_EPOCH = '1';
    process.env.TFGRPO_GROUP_SIZE = '2';

    const stdout = new PassThrough();
    const stderr = new PassThrough();
    stdout.resume();
    stderr.resume();

    const env = resolveEnvironment();
    const result = await executeExecCommand(
      {
        env,
        stdout,
        stderr,
        runIdFactory: () => 'run-exp'
      },
      {
        command: process.execPath,
        args: ['-e', "process.stdout.write('experience persistence output')"],
        outputMode: 'json',
        jsonPretty: false,
        notifyTargets: [],
        otelEndpoint: null
      }
    );

    const experiencesPath = join(
      workspaceRoot,
      'out',
      env.taskId,
      'experiences.jsonl'
    );
    const serialized = await readFile(experiencesPath, 'utf8');
    const lines = serialized.trim().split('\n');
    expect(lines).toHaveLength(1);
    const stored = JSON.parse(lines[0] as string) as {
      toolStats: Array<{ tool: string }>;
    };
    expect(stored.toolStats[0]?.tool).toBe('cli:command');

    const manifestPath = join(workspaceRoot, result.manifestPath);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      tfgrpo: { experiences: { ids: string[] } };
    };
    expect(manifest.tfgrpo.experiences.ids).toHaveLength(1);
  });
});
