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
const POST_EXIT_STDIO_DRAIN_GRACE_MS = 20;

function flushBufferedStream(
  stream: NodeJS.ReadableStream,
  forward: (chunk: Buffer | string) => void
): void {
  let chunk = stream.read();
  while (chunk !== null) {
    forward(chunk as Buffer | string);
    chunk = stream.read();
  }
}

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

  return await new Promise((resolve, reject) => {
    let settled = false;
    let exitResult: { exitCode: number | null; signal: NodeJS.Signals | null } | null = null;
    let stdoutClosed = false;
    let stderrClosed = false;
    let drainHandle: NodeJS.Timeout | null = null;

    const clearDrainHandle = () => {
      if (drainHandle) {
        clearTimeout(drainHandle);
        drainHandle = null;
      }
    };

    const finalize = () => {
      if (settled || !exitResult) {
        return;
      }
      settled = true;
      cleanup();
      resolve(exitResult);
    };

    const scheduleFinalize = () => {
      if (!exitResult || settled) {
        return;
      }
      if (stdoutClosed && stderrClosed) {
        finalize();
        return;
      }
      clearDrainHandle();
      // Allow one short quiet window after `exit` so buffered stdout/stderr
      // chunks can arrive without waiting indefinitely on background children
      // that inherited the same pipes.
      drainHandle = setTimeout(() => {
        drainHandle = null;
        finalize();
      }, POST_EXIT_STDIO_DRAIN_GRACE_MS);
      drainHandle.unref?.();
    };

    const handleError = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const handleStdoutData = (chunk: Buffer | string) => {
      if (exitResult) {
        return;
      }
      request.onStdout(chunk);
    };

    const handleStderrData = (chunk: Buffer | string) => {
      if (exitResult) {
        return;
      }
      request.onStderr(chunk);
    };

    const handleStdoutClose = () => {
      stdoutClosed = true;
      scheduleFinalize();
    };

    const handleStderrClose = () => {
      stderrClosed = true;
      scheduleFinalize();
    };

    const handleExit = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      exitResult = { exitCode, signal };
      child.stdout.off('data', handleStdoutData);
      child.stderr.off('data', handleStderrData);
      flushBufferedStream(child.stdout, request.onStdout);
      flushBufferedStream(child.stderr, request.onStderr);
      scheduleFinalize();
    };

    const cleanup = () => {
      clearDrainHandle();
      child.stdout.off('data', handleStdoutData);
      child.stdout.off('close', handleStdoutClose);
      child.stderr.off('data', handleStderrData);
      child.stderr.off('close', handleStderrClose);
      child.off('exit', handleExit);
      child.off('error', handleError);
      child.stdout.destroy();
      child.stderr.destroy();
    };

    child.stdout.on('data', handleStdoutData);
    child.stdout.once('close', handleStdoutClose);
    child.stderr.on('data', handleStderrData);
    child.stderr.once('close', handleStderrClose);
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
