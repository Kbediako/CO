import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';

import type { CommandStage } from '../types.js';
import type { CliManifest } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import { relativeToRepo } from '../run/runPaths.js';
import {
  appendCommandError,
  updateCommandStatus,
  saveManifest
} from '../run/manifest.js';
import { slugify } from '../utils/strings.js';
import { isoTimestamp } from '../utils/time.js';

export interface CommandRunnerContext {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  stage: CommandStage;
  index: number;
}

interface CommandRunResult {
  exitCode: number;
  summary: string;
}

export async function runCommandStage(context: CommandRunnerContext): Promise<CommandRunResult> {
  const { env, paths, manifest, stage, index } = context;
  const entryIndex = index - 1;
  const entry = updateCommandStatus(manifest, entryIndex, {
    status: 'running',
    started_at: isoTimestamp(),
    exit_code: null,
    summary: null
  });

  const logFile = join(paths.commandsDir, `${String(index).padStart(2, '0')}-${slugify(stage.id)}.ndjson`);
  entry.log_path = relativeToRepo(env, logFile);
  await saveManifest(paths, manifest);

  const runnerLog = createWriteStream(paths.logPath, { flags: 'a' });
  const commandLog = createWriteStream(logFile, { flags: 'a' });

  const writeEvent = (message: Record<string, unknown>) => {
    const payload = `${JSON.stringify({ ...message, timestamp: isoTimestamp(), index })}\n`;
    runnerLog.write(payload);
    commandLog.write(payload);
  };

  writeEvent({ type: 'command:start', command: stage.command });

  const child = spawn(stage.command, {
    shell: true,
    cwd: stage.cwd ?? env.repoRoot,
    env: { ...process.env, ...stage.env }
  });

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');

  child.stdout?.on('data', (chunk: string) => {
    stdoutChunks.push(chunk);
    writeEvent({ type: 'command:stdout', data: chunk });
  });

  child.stderr?.on('data', (chunk: string) => {
    stderrChunks.push(chunk);
    writeEvent({ type: 'command:stderr', data: chunk });
  });

  const exitCode: number = await new Promise((resolve, reject) => {
    child.on('error', (error) => {
      reject(error);
    });
    child.on('close', (code) => {
      resolve(code ?? 0);
    });
  });

  writeEvent({ type: 'command:end', exit_code: exitCode });

  runnerLog.end();
  commandLog.end();

  const stdoutText = stdoutChunks.join('').trim();
  const stderrText = stderrChunks.join('').trim();
  const summary = buildSummary(stage, exitCode, stdoutText, stderrText);

  entry.completed_at = isoTimestamp();
  entry.exit_code = exitCode;
  entry.summary = summary;
  entry.status = exitCode === 0 ? 'succeeded' : stage.allowFailure ? 'skipped' : 'failed';

  if (entry.status === 'failed') {
    entry.error_file = await appendCommandError(env, paths, manifest, entry, 'command-failed', {
      exit_code: exitCode,
      stderr: stderrText
    });
  }

  await saveManifest(paths, manifest);

  return { exitCode, summary };
}

function buildSummary(stage: CommandStage, exitCode: number, stdout: string, stderr: string): string {
  if (stage.summaryHint) {
    return stage.summaryHint;
  }
  if (exitCode !== 0) {
    return `Exited with code ${exitCode}${stderr ? ` — ${truncate(stderr)}` : ''}`;
  }
  if (stdout) {
    return truncate(stdout);
  }
  if (stderr) {
    return truncate(stderr);
  }
  return `Command completed with code ${exitCode}`;
}

function truncate(value: string, length = 240): string {
  if (value.length <= length) {
    return value;
  }
  return `${value.slice(0, length)}…`;
}
