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
const POST_EXIT_STDIO_DRAIN_TIMEOUT_MS = 500;

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
    let settled = false;
    let exited = false;
    let exitCode: number | null = null;
    let signal: NodeJS.Signals | null = null;
    let stdoutEnded = false;
    let stderrEnded = false;
    let drainTimeout: NodeJS.Timeout | null = null;

    const finalize = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve({ exitCode, signal });
    };

    const setExitState = (nextExitCode: number | null, nextSignal: NodeJS.Signals | null) => {
      if (exited) {
        return;
      }
      exited = true;
      exitCode = nextExitCode;
      signal = nextSignal;
    };

    const maybeFinalizeAfterExit = () => {
      if (!exited || !stdoutEnded || !stderrEnded) {
        return;
      }
      finalize();
    };

    const armDrainTimeout = () => {
      if (drainTimeout) {
        return;
      }
      drainTimeout = setTimeout(() => {
        finalize();
      }, POST_EXIT_STDIO_DRAIN_TIMEOUT_MS);
      drainTimeout.unref?.();
    };

    const handleExit = (nextExitCode: number | null, nextSignal: NodeJS.Signals | null) => {
      setExitState(nextExitCode, nextSignal);
      if (stdoutEnded && stderrEnded) {
        finalize();
        return;
      }
      armDrainTimeout();
    };

    const handleClose = (nextExitCode: number | null, nextSignal: NodeJS.Signals | null) => {
      setExitState(nextExitCode, nextSignal);
      finalize();
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const handleStdoutEnd = () => {
      stdoutEnded = true;
      maybeFinalizeAfterExit();
    };

    const handleStderrEnd = () => {
      stderrEnded = true;
      maybeFinalizeAfterExit();
    };

    const cleanup = () => {
      child.stdout.off('end', handleStdoutEnd);
      child.stderr.off('end', handleStderrEnd);
      child.off('exit', handleExit);
      child.off('close', handleClose);
      child.off('error', handleError);
      if (drainTimeout) {
        clearTimeout(drainTimeout);
        drainTimeout = null;
      }
    };

    child.stdout.once('end', handleStdoutEnd);
    child.stderr.once('end', handleStderrEnd);
    child.once('exit', handleExit);
    child.once('close', handleClose);
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
