import { createWriteStream } from 'node:fs';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';

import type { CliManifest } from '../cli/types.js';
import type { RunPaths } from '../cli/run/runPaths.js';
import { saveManifest } from '../cli/run/manifest.js';
import { ensureLearningSection, updateLearningValidation } from './manifest.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { isoTimestamp } from '../cli/utils/time.js';
import { logger } from '../logger.js';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

interface ScenarioPayload {
  commands?: unknown;
  validation?: { requiresCleanFixture?: boolean } | null;
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ScenarioValidationOptions {
  manifest: CliManifest;
  repoRoot: string;
  runsRoot: string;
  taskId: string;
  runId: string;
  paths: RunPaths;
  scenarioPath?: string | null;
}

export async function runScenarioValidation(
  options: ScenarioValidationOptions
): Promise<{ manifest: CliManifest; logPath: string | null }> {
  const { manifest, repoRoot, runsRoot, taskId, runId, paths, scenarioPath } = options;
  const learning = ensureLearningSection(manifest);
  const scenarioLocation = scenarioPath ?? learning.scenario?.path ?? null;

  if (!scenarioLocation) {
    logger.debug('[learning] scenario validation skipped: no scenario path');
    return { manifest, logPath: null };
  }

  const resolvedScenarioPath = isAbsolute(scenarioLocation)
    ? scenarioLocation
    : join(repoRoot, scenarioLocation);

  let scenarioContents: string;
  try {
    scenarioContents = await readFile(resolvedScenarioPath, 'utf8');
  } catch (error) {
    logger.warn(
      `[learning] scenario validation skipped: unable to read scenario ${resolvedScenarioPath}: ${
        (error as Error)?.message ?? String(error)
      }`
    );
    return { manifest, logPath: null };
  }

  let scenario: ScenarioPayload;
  try {
    scenario = JSON.parse(scenarioContents) as ScenarioPayload;
  } catch (error) {
    const reason = `Invalid scenario JSON: ${(error as Error)?.message ?? String(error)}`;
    updateLearningValidation(manifest, 'snapshot_failed', { reason, last_error: reason });
    await saveManifest(paths, manifest);
    return { manifest, logPath: null };
  }

  const commands = Array.isArray(scenario.commands)
    ? (scenario.commands as unknown[]).filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
  if (commands.length === 0) {
    const reason = 'Scenario has no commands to validate';
    updateLearningValidation(manifest, 'snapshot_failed', { reason, last_error: reason });
    await saveManifest(paths, manifest);
    return { manifest, logPath: null };
  }

  const learningDir = join(runsRoot, sanitizeTaskId(taskId), 'cli', sanitizeRunId(runId), 'learning');
  await mkdir(learningDir, { recursive: true });
  const logPath = join(learningDir, 'scenario-validation.log');
  const relativeLogPath = relative(repoRoot, logPath);
  const logStream = createWriteStream(logPath, { flags: 'a' });
  const writeLog = (line: string) => logStream.write(`[${isoTimestamp()}] ${line}\n`);

  writeLog(`Scenario: ${resolvedScenarioPath}`);

  const requiresCleanFixture = Boolean(scenario.validation?.requiresCleanFixture);
  let gitStatusPath: string | null = null;
  let gitLogPath: string | null = null;

  try {
    if (requiresCleanFixture) {
      const gitState = await collectGitState(repoRoot);
      if (gitState.dirty) {
        gitStatusPath = join(learningDir, 'validation-git-status.txt');
        gitLogPath = join(learningDir, 'validation-git-log.txt');
        await Promise.all([
          writeFile(gitStatusPath, gitState.statusOutput, 'utf8'),
          writeFile(gitLogPath, gitState.logOutput, 'utf8')
        ]);
        const reason = gitState.reason ?? 'Validation requires a clean fixture';
        writeLog(reason);
        updateLearningValidation(manifest, 'stalled_snapshot', {
          reason,
          log_path: relativeLogPath,
          last_error: reason,
          git_status_path: relative(repoRoot, gitStatusPath),
          git_log_path: relative(repoRoot, gitLogPath)
        });
        await saveManifest(paths, manifest);
        return { manifest, logPath: relativeLogPath };
      }
    }

    for (const command of commands) {
      writeLog(`$ ${command}`);
      const result = await runCommand(command, repoRoot);
      if (result.stdout.trim()) {
        writeLog(result.stdout.trimEnd());
      }
      if (result.stderr.trim()) {
        writeLog(result.stderr.trimEnd());
      }
      if (result.exitCode !== 0) {
        const reason = `Command "${command}" exited with code ${result.exitCode}`;
        updateLearningValidation(manifest, 'snapshot_failed', {
          reason,
          log_path: relativeLogPath,
          last_error: result.stderr.trim() || reason
        });
        await saveManifest(paths, manifest);
        return { manifest, logPath: relativeLogPath };
      }
    }

    updateLearningValidation(manifest, 'validated', {
      reason: null,
      log_path: relativeLogPath,
      last_error: null,
      git_status_path: gitStatusPath ? relative(repoRoot, gitStatusPath) : null,
      git_log_path: gitLogPath ? relative(repoRoot, gitLogPath) : null
    });
    await saveManifest(paths, manifest);
    return { manifest, logPath: relativeLogPath };
  } finally {
    logStream.end();
  }
}

async function runCommand(command: string, cwd: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024
    });
    return { exitCode: 0, stdout: stdout ?? '', stderr: stderr ?? '' };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number | string };
    const exitCode = normalizeExitCode(execError.code);
    return { exitCode, stdout: execError.stdout ?? '', stderr: execError.stderr ?? '' };
  }
}

async function collectGitState(
  repoRoot: string
): Promise<{ dirty: boolean; statusOutput: string; logOutput: string; reason?: string }> {
  try {
    const [statusOutput, logOutput] = await Promise.all([
      execFileAsync('git', ['status', '--short'], { cwd: repoRoot }).then((result) => result.stdout),
      execFileAsync('git', ['log', '-5', '--oneline'], { cwd: repoRoot }).then((result) => result.stdout)
    ]);
    const dirty = statusOutput.trim().length > 0;
    return { dirty, statusOutput, logOutput };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      dirty: true,
      statusOutput: `git status failed: ${message}`,
      logOutput: `git log failed: ${message}`,
      reason: 'Validation requires git metadata but repository is unavailable'
    };
  }
}

function normalizeExitCode(code: number | string | undefined): number {
  if (typeof code === 'number' && Number.isInteger(code)) {
    return code;
  }
  if (typeof code === 'string') {
    const parsed = Number.parseInt(code, 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return 1;
}
