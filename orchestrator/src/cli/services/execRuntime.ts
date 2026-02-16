import { spawn } from 'node:child_process';

import {
  ExecSessionManager,
  UnifiedExecRunner,
  ToolOrchestrator,
  type ExecCommandExecutor,
  type ExecSessionHandle,
  RemoteExecHandleService
} from '../../../../packages/orchestrator/src/index.js';
import { PrivacyGuard } from '../../privacy/guard.js';
import { resolveEnforcementMode } from '../utils/enforcementMode.js';

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

const privacyGuard = new PrivacyGuard({ mode: resolvePrivacyGuardMode() });
const handleService = new RemoteExecHandleService({ guard: privacyGuard, now: () => new Date() });

const cliExecutor: ExecCommandExecutor<CliExecSessionHandle> = async (request) => {
  const hasExplicitArgs = Array.isArray(request.args);
  const child = spawn(request.command, request.args ?? [], {
    cwd: request.cwd,
    env: request.env,
    // Use shell mode only for string-style commands. When args are provided we
    // want argv semantics (`cmd arg1 arg2`) rather than `sh -c cmd` behavior.
    shell: !hasExplicitArgs,
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
  now: () => new Date(),
  handleService
});

export function getCliExecRunner(): UnifiedExecRunner<CliExecSessionHandle> {
  return runner;
}

export function getExecHandleService(): RemoteExecHandleService {
  return handleService;
}

export function getPrivacyGuard(): PrivacyGuard {
  return privacyGuard;
}

function resolvePrivacyGuardMode(): 'shadow' | 'enforce' {
  return resolveEnforcementMode(
    process.env.CODEX_PRIVACY_GUARD_MODE ?? null,
    process.env.CODEX_PRIVACY_GUARD_ENFORCE ?? null
  );
}
