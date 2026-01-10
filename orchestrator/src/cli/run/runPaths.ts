import { join, relative } from 'node:path';
import { sanitizeRunId } from '../../persistence/sanitizeRunId.js';
import type { EnvironmentPaths } from './environment.js';

export interface RunPaths {
  runDir: string;
  manifestPath: string;
  heartbeatPath: string;
  resumeTokenPath: string;
  logPath: string;
  eventsPath: string;
  controlPath: string;
  controlAuthPath: string;
  controlEndpointPath: string;
  confirmationsPath: string;
  questionsPath: string;
  delegationTokensPath: string;
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
  const eventsPath = join(runDir, 'events.jsonl');
  const controlPath = join(runDir, 'control.json');
  const controlAuthPath = join(runDir, 'control_auth.json');
  const controlEndpointPath = join(runDir, 'control_endpoint.json');
  const confirmationsPath = join(runDir, 'confirmations.json');
  const questionsPath = join(runDir, 'questions.json');
  const delegationTokensPath = join(runDir, 'delegation_tokens.json');
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
    eventsPath,
    controlPath,
    controlAuthPath,
    controlEndpointPath,
    confirmationsPath,
    questionsPath,
    delegationTokensPath,
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
