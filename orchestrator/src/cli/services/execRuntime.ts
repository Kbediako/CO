import { spawn } from 'node:child_process';

import {
  ExecSessionManager,
  UnifiedExecRunner,
  ToolOrchestrator,
  type ExecCommandExecutor,
  type ExecSessionHandle
} from '../../../../packages/orchestrator/src/index.js';

class CliExecSessionHandle implements ExecSessionHandle {
  constructor(public readonly id: string) {}
  async dispose(): Promise<void> {
    // CLI commands currently spawn per-invocation processes so there is no persistent resource to release.
  }
}

const orchestrator = new ToolOrchestrator();

const sessionManager = new ExecSessionManager<CliExecSessionHandle>({
  baseEnv: process.env,
  factory: async ({ id }) => new CliExecSessionHandle(id)
});

const cliExecutor: ExecCommandExecutor<CliExecSessionHandle> = async (request) => {
  const child = spawn(request.command, {
    cwd: request.cwd,
    env: request.env,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (!child.stdout || !child.stderr) {
    throw new Error('CLI exec commands require stdout/stderr streams.');
  }

  child.stdout.on('data', request.onStdout);
  child.stderr.on('data', request.onStderr);

  return await new Promise((resolve, reject) => {
    const handleExit = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      resolve({ exitCode, signal });
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      child.off('exit', handleExit);
      child.off('error', handleError);
    };

    child.once('exit', handleExit);
    child.once('error', handleError);
  });
};

const runner = new UnifiedExecRunner<CliExecSessionHandle>({
  orchestrator,
  sessionManager,
  executor: cliExecutor,
  now: () => new Date()
});

export function getCliExecRunner(): UnifiedExecRunner<CliExecSessionHandle> {
  return runner;
}

export function getCliSessionManager(): ExecSessionManager<CliExecSessionHandle> {
  return sessionManager;
}
