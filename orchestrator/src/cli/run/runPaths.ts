import { join, relative } from 'node:path';
import { sanitizeRunId } from '../../persistence/sanitizeRunId.js';
import type { EnvironmentPaths } from './environment.js';

export interface RunPaths {
  runDir: string;
  manifestPath: string;
  heartbeatPath: string;
  resumeTokenPath: string;
  logPath: string;
  commandsDir: string;
  errorsDir: string;
  compatDir: string;
  compatManifestPath: string;
  localCompatDir: string;
}

export function resolveRunPaths(env: EnvironmentPaths, runId: string): RunPaths {
  const safeRunId = sanitizeRunId(runId);
  const runDir = join(env.runsRoot, env.taskId, 'cli', safeRunId);
  const manifestPath = join(runDir, 'manifest.json');
  const heartbeatPath = join(runDir, '.heartbeat');
  const resumeTokenPath = join(runDir, '.resume-token');
  const logPath = join(runDir, 'runner.ndjson');
  const commandsDir = join(runDir, 'commands');
  const errorsDir = join(runDir, 'errors');
  const compatDir = join(env.runsRoot, env.taskId, 'mcp', safeRunId);
  const compatManifestPath = join(compatDir, 'manifest.json');
  const localCompatDir = join(env.runsRoot, 'local-mcp', safeRunId);

  return {
    runDir,
    manifestPath,
    heartbeatPath,
    resumeTokenPath,
    logPath,
    commandsDir,
    errorsDir,
    compatDir,
    compatManifestPath,
    localCompatDir
  };
}

export function relativeToRepo(env: EnvironmentPaths, targetPath: string): string {
  return relative(env.repoRoot, targetPath);
}
