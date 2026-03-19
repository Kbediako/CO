import { spawn, type ChildProcess, type StdioOptions } from 'node:child_process';
import { createWriteStream } from 'node:fs';

import type { ReviewScopeMode } from './review-prompt-context.js';
import {
  type ReviewTerminationBoundaryKind,
  type ReviewTerminationBoundaryRecord,
  type ReviewStartupAnchorMode,
  type ReviewStartupAnchorBoundaryState,
  type ReviewActiveCloseoutBundleRereadBoundaryState,
  type ReviewRelevantReinspectionDwellBoundaryState,
  type ReviewShellProbeBoundaryState,
  type ReviewVerdictStabilityState,
  ReviewExecutionState,
  type ReviewCommandIntentBoundaryState,
  type ReviewStartupLoopState
} from './review-execution-state.js';

const BENIGN_STDIO_ERROR_CODES = new Set(['EPIPE', 'ERR_STREAM_DESTROYED']);
const REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY = 'CODEX_REVIEW_ALLOW_HEAVY_COMMANDS';
const REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS';
const REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS';
const REVIEW_META_SURFACE_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS';
const REVIEW_TELEMETRY_DEBUG_ENV_KEY = 'CODEX_REVIEW_DEBUG_TELEMETRY';

export class CodexReviewError extends Error {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  outputPreview: string;
  reviewState: ReviewExecutionState | null;
  terminationBoundary: ReviewTerminationBoundaryRecord | null;

  constructor(
    message: string,
    options: {
      exitCode: number | null;
      signal: NodeJS.Signals | null;
      timedOut: boolean;
      outputPreview: string;
      reviewState?: ReviewExecutionState | null;
      terminationBoundary?: ReviewTerminationBoundaryRecord | null;
    }
  ) {
    super(message);
    this.name = 'CodexReviewError';
    this.exitCode = options.exitCode;
    this.signal = options.signal;
    this.timedOut = options.timedOut;
    this.outputPreview = options.outputPreview;
    this.reviewState = options.reviewState ?? null;
    this.terminationBoundary = options.terminationBoundary ?? null;
  }
}

export interface RunCodexReviewOptions {
  command: string;
  args: string[];
  env: Record<string, string | undefined>;
  stdio: StdioOptions;
  activeCloseoutBundleRoots?: string[];
  blockHeavyCommands: boolean;
  allowValidationCommandIntents: boolean;
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  startupLoopTimeoutMs: number | null;
  startupLoopMinEvents: number;
  monitorIntervalMs: number | null;
  lowSignalTimeoutMs: number | null;
  verdictStabilityTimeoutMs: number | null;
  metaSurfaceTimeoutMs: number | null;
  enforceStartupAnchorBoundary: boolean;
  enforceActiveCloseoutBundleRereadBoundary: boolean;
  enforceRelevantReinspectionDwellBoundary: boolean;
  allowedMetaSurfaceKinds: string[];
  scopeMode: ReviewScopeMode;
  startupAnchorMode: ReviewStartupAnchorMode | null;
  auditStartupAnchorPaths: string[];
  allowedMetaSurfacePaths: string[];
  auditStartupAnchorEnvVarPaths: Record<string, string>;
  allowedMetaSurfaceEnvVarPaths: Record<string, string>;
  repoRoot: string;
  touchedPaths: string[];
  outputLogPath: string;
}

function installSignalForwarders(child: ChildProcess, detached: boolean): () => void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  const handlers = new Map<NodeJS.Signals, () => void>();

  const uninstall = () => {
    for (const [signal, handler] of handlers.entries()) {
      process.removeListener(signal, handler);
    }
    handlers.clear();
  };

  for (const signal of signals) {
    const handler = () => {
      signalChildProcess(child, signal, detached);
      uninstall();
      try {
        process.kill(process.pid, signal);
      } catch {
        process.exitCode = signal === 'SIGINT' ? 130 : 143;
      }
    };
    handlers.set(signal, handler);
    process.once(signal, handler);
  }

  return uninstall;
}

function writeToStreamSafely(target: NodeJS.WriteStream, chunk: Buffer): void {
  if (target.destroyed || target.writableEnded) {
    return;
  }

  try {
    target.write(chunk, (error?: Error | null) => {
      if (!error) {
        return;
      }
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (typeof code === 'string' && BENIGN_STDIO_ERROR_CODES.has(code)) {
        return;
      }
      // Best effort only; stdout/stderr mirroring should not fail the run.
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (typeof code === 'string' && BENIGN_STDIO_ERROR_CODES.has(code)) {
      return;
    }
    throw error;
  }
}

export async function runCodexReview(
  options: RunCodexReviewOptions
): Promise<{ preview: string; state: ReviewExecutionState }> {
  const detached = process.platform !== 'win32';
  const child: ChildProcess = spawn(options.command, options.args, {
    stdio: options.stdio,
    env: options.env,
    cwd: options.repoRoot,
    detached
  });

  const outputStream = createWriteStream(options.outputLogPath, { flags: 'w' });
  const outputClosed = new Promise<void>((resolve) => {
    outputStream.once('close', () => resolve());
    outputStream.once('error', () => resolve());
  });
  const uninstallSignalForwarders = installSignalForwarders(child, detached);
  const executionState = new ReviewExecutionState({
    blockHeavyCommands: options.blockHeavyCommands,
    allowValidationCommandIntents: options.allowValidationCommandIntents,
    activeCloseoutBundleRoots: options.activeCloseoutBundleRoots,
    lowSignalTimeoutMs: options.lowSignalTimeoutMs,
    verdictStabilityTimeoutMs: options.verdictStabilityTimeoutMs,
    metaSurfaceTimeoutMs: options.metaSurfaceTimeoutMs,
    enforceStartupAnchorBoundary: options.enforceStartupAnchorBoundary,
    enforceActiveCloseoutBundleRereadBoundary: options.enforceActiveCloseoutBundleRereadBoundary,
    enforceRelevantReinspectionDwellBoundary: options.enforceRelevantReinspectionDwellBoundary,
    allowedMetaSurfaceKinds: options.allowedMetaSurfaceKinds,
    scopeMode: options.scopeMode,
    startupAnchorMode: options.startupAnchorMode,
    auditStartupAnchorPaths: options.auditStartupAnchorPaths,
    allowedMetaSurfacePaths: options.allowedMetaSurfacePaths,
    auditStartupAnchorEnvVarPaths: options.auditStartupAnchorEnvVarPaths,
    allowedMetaSurfaceEnvVarPaths: options.allowedMetaSurfaceEnvVarPaths,
    repoRoot: options.repoRoot,
    touchedPaths: options.touchedPaths
  });

  const capture = (chunk: Buffer, target: NodeJS.WriteStream, stream: 'stdout' | 'stderr') => {
    if (!outputStream.writableEnded && !outputStream.destroyed) {
      outputStream.write(chunk);
    }
    writeToStreamSafely(target, chunk);
    executionState.observeChunk(chunk, stream);
  };

  const onStdout = (chunk: Buffer) => capture(chunk, process.stdout, 'stdout');
  const onStderr = (chunk: Buffer) => capture(chunk, process.stderr, 'stderr');
  child.stdout?.on('data', onStdout);
  child.stderr?.on('data', onStderr);
  const outputDrainPromise = Promise.all([
    waitForReadableClosure(child.stdout),
    waitForReadableClosure(child.stderr)
  ]).then(() => undefined);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    uninstallSignalForwarders();
    child.stdout?.off('data', onStdout);
    child.stderr?.off('data', onStderr);
    try {
      outputStream.end();
    } catch {
      // ignore best-effort close
    }
  };

  try {
    await waitForChildExit(child, {
      timeoutMs: options.timeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
      startupLoopTimeoutMs: options.startupLoopTimeoutMs,
      startupLoopMinEvents: options.startupLoopMinEvents,
      monitorIntervalMs: options.monitorIntervalMs,
      lowSignalTimeoutMs: options.lowSignalTimeoutMs,
      verdictStabilityTimeoutMs: options.verdictStabilityTimeoutMs,
      metaSurfaceTimeoutMs: options.metaSurfaceTimeoutMs,
      enforceStartupAnchorBoundary: options.enforceStartupAnchorBoundary,
      enforceActiveCloseoutBundleRereadBoundary: options.enforceActiveCloseoutBundleRereadBoundary,
      enforceRelevantReinspectionDwellBoundary: options.enforceRelevantReinspectionDwellBoundary,
      blockHeavyCommands: options.blockHeavyCommands,
      getLastOutputAtMs: () => executionState.getLastOutputAtMs(),
      getStartupLoopState: () => executionState.getStartupLoopState(),
      getBlockedHeavyCommand: () => executionState.getBlockedHeavyCommand(),
      getLowSignalDriftReason: () => executionState.getLowSignalDriftState().reason,
      getVerdictStabilityState: () => executionState.getVerdictStabilityState(),
      getMetaSurfaceExpansionReason: () => executionState.getMetaSurfaceExpansionState().reason,
      getStartupAnchorBoundaryState: () => executionState.getStartupAnchorBoundaryState(),
      getActiveCloseoutBundleRereadBoundaryState: () =>
        executionState.getActiveCloseoutBundleRereadBoundaryState(),
      getRelevantReinspectionDwellBoundaryState: () =>
        executionState.getRelevantReinspectionDwellBoundaryState(),
      getCommandIntentBoundaryState: () => executionState.getCommandIntentBoundaryState(),
      getShellProbeBoundaryState: () => executionState.getShellProbeBoundaryState(),
      getTerminationBoundaryRecord: (kind) =>
        executionState.getTerminationBoundaryRecordForKind(kind),
      waitForOutputDrain: () => outputDrainPromise,
      formatCheckpoint: () => executionState.formatCheckpoint(),
      detached,
      onCleanup: cleanup
    });
    await outputClosed;
    return { preview: executionState.getPreview(), state: executionState };
  } catch (error) {
    cleanup();
    await outputClosed;
    if (error instanceof CodexReviewError) {
      error.outputPreview = executionState.getPreview() || error.outputPreview;
      error.reviewState = executionState;
      throw error;
    }
    const wrappedError = new CodexReviewError(
      error instanceof Error ? error.message : String(error),
      {
        exitCode: null,
        signal: null,
        timedOut: false,
        outputPreview: executionState.getPreview(),
        reviewState: executionState
      }
    );
    if (error instanceof Error && 'cause' in Error.prototype) {
      Object.defineProperty(wrappedError, 'cause', {
        value: error,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    throw wrappedError;
  }
}

function waitForReadableClosure(stream: NodeJS.ReadableStream | null | undefined): Promise<void> {
  if (!stream) {
    return Promise.resolve();
  }

  const readable = stream as NodeJS.ReadableStream & {
    readableEnded?: boolean;
    destroyed?: boolean;
  };
  if (readable.readableEnded || readable.destroyed) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const finish = () => {
      readable.off('end', finish);
      readable.off('close', finish);
      readable.off('error', finish);
      resolve();
    };
    readable.once('end', finish);
    readable.once('close', finish);
    readable.once('error', finish);
  });
}

async function waitForOutputSettlement(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function formatBoundedHeavyCommandFailure(blockedCommand: string): string {
  const guidance = `Set ${REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY}=1 to allow full validation commands.`;
  if (!envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY])) {
    return `codex review attempted heavy command in bounded mode. ${guidance}`;
  }
  return `codex review attempted heavy command in bounded mode: ${blockedCommand}. ${guidance}`;
}

function formatCommandIntentBoundaryFailure(boundaryState: ReviewCommandIntentBoundaryState): string {
  const guidance =
    'Bounded review should inspect and report, not launch explicit validation suites, direct validation runners, nested review flows, or mutating delegation control.';
  if (!boundaryState.violationKind) {
    return `codex review crossed the bounded command-intent boundary. ${guidance}`;
  }
  const kindLabel =
    boundaryState.violationKind === 'validation-suite'
      ? 'validation suite launch'
      : boundaryState.violationKind === 'validation-runner'
        ? 'direct validation runner launch'
        : boundaryState.violationKind === 'review-orchestration'
          ? 'nested review or pipeline launch'
          : 'delegation control activity';
  if (
    !envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]) ||
    !boundaryState.violationSample
  ) {
    return `codex review crossed the bounded command-intent boundary (${kindLabel}). ${guidance}`;
  }
  return `codex review crossed the bounded command-intent boundary (${kindLabel}): ${boundaryState.violationSample}. ${guidance}`;
}

interface WaitForChildExitOptions {
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  startupLoopTimeoutMs: number | null;
  startupLoopMinEvents: number;
  monitorIntervalMs: number | null;
  lowSignalTimeoutMs: number | null;
  verdictStabilityTimeoutMs: number | null;
  metaSurfaceTimeoutMs: number | null;
  enforceStartupAnchorBoundary: boolean;
  enforceActiveCloseoutBundleRereadBoundary: boolean;
  enforceRelevantReinspectionDwellBoundary: boolean;
  blockHeavyCommands: boolean;
  getLastOutputAtMs: () => number;
  getStartupLoopState: () => ReviewStartupLoopState;
  getBlockedHeavyCommand: () => string | null;
  getLowSignalDriftReason: () => string | null;
  getVerdictStabilityState: () => ReviewVerdictStabilityState;
  getMetaSurfaceExpansionReason: () => string | null;
  getStartupAnchorBoundaryState: () => ReviewStartupAnchorBoundaryState;
  getActiveCloseoutBundleRereadBoundaryState: () => ReviewActiveCloseoutBundleRereadBoundaryState;
  getRelevantReinspectionDwellBoundaryState: () => ReviewRelevantReinspectionDwellBoundaryState;
  getCommandIntentBoundaryState: () => ReviewCommandIntentBoundaryState;
  getShellProbeBoundaryState: () => ReviewShellProbeBoundaryState;
  getTerminationBoundaryRecord: (kind: ReviewTerminationBoundaryKind) => ReviewTerminationBoundaryRecord | null;
  waitForOutputDrain: () => Promise<void>;
  formatCheckpoint: () => string;
  detached: boolean;
  onCleanup?: () => void;
}

async function waitForChildExit(
  child: ChildProcess,
  options: WaitForChildExitOptions
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let handlesCleared = false;
    let cleanupCompleted = false;
    let pendingTermination: CodexReviewError | null = null;
    let timeoutHandle: NodeJS.Timeout | undefined;
    let stallHandle: NodeJS.Timeout | undefined;
    let startupLoopHandle: NodeJS.Timeout | undefined;
    let monitorHandle: NodeJS.Timeout | undefined;
    let lowSignalHandle: NodeJS.Timeout | undefined;
    let verdictStabilityHandle: NodeJS.Timeout | undefined;
    let metaSurfaceHandle: NodeJS.Timeout | undefined;
    let startupAnchorHandle: NodeJS.Timeout | undefined;
    let activeCloseoutBundleHandle: NodeJS.Timeout | undefined;
    let relevantReinspectionHandle: NodeJS.Timeout | undefined;
    let commandIntentHandle: NodeJS.Timeout | undefined;
    let shellProbeHandle: NodeJS.Timeout | undefined;
    let heavyCommandHandle: NodeJS.Timeout | undefined;
    let killHandle: NodeJS.Timeout | undefined;
    let hardKillArmed = false;
    const startMs = Date.now();

    const clearHandles = () => {
      if (handlesCleared) {
        return;
      }
      handlesCleared = true;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (stallHandle) {
        clearInterval(stallHandle);
      }
      if (startupLoopHandle) {
        clearInterval(startupLoopHandle);
      }
      if (monitorHandle) {
        clearInterval(monitorHandle);
      }
      if (lowSignalHandle) {
        clearInterval(lowSignalHandle);
      }
      if (verdictStabilityHandle) {
        clearInterval(verdictStabilityHandle);
      }
      if (metaSurfaceHandle) {
        clearInterval(metaSurfaceHandle);
      }
      if (startupAnchorHandle) {
        clearInterval(startupAnchorHandle);
      }
      if (activeCloseoutBundleHandle) {
        clearInterval(activeCloseoutBundleHandle);
      }
      if (relevantReinspectionHandle) {
        clearInterval(relevantReinspectionHandle);
      }
      if (commandIntentHandle) {
        clearInterval(commandIntentHandle);
      }
      if (shellProbeHandle) {
        clearInterval(shellProbeHandle);
      }
      if (heavyCommandHandle) {
        clearInterval(heavyCommandHandle);
      }
      if (killHandle && !hardKillArmed) {
        clearTimeout(killHandle);
      }
      child.removeListener('error', onError);
      child.removeListener('close', onClose);
    };

    const cleanup = () => {
      if (cleanupCompleted) {
        return;
      }
      cleanupCompleted = true;
      clearHandles();
      options.onCleanup?.();
    };

    const settleWithError = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const onError = (error: Error) => {
      settleWithError(error instanceof Error ? error : new Error(String(error)));
    };

    const onClose = (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearHandles();
      void (async () => {
        try {
          await options.waitForOutputDrain();
        } catch {
          // Best-effort drain only; fall through to current runtime state.
        }
        await waitForOutputSettlement();
        cleanup();
        if (pendingTermination) {
          reject(pendingTermination);
          return;
        }
        const commandIntentBoundaryState = options.getCommandIntentBoundaryState();
        if (commandIntentBoundaryState.triggered) {
          reject(
            new CodexReviewError(formatCommandIntentBoundaryFailure(commandIntentBoundaryState), {
              exitCode: typeof code === 'number' && code > 0 ? code : 1,
              signal,
              timedOut: false,
              outputPreview: '',
              terminationBoundary: options.getTerminationBoundaryRecord('command-intent')
            })
          );
          return;
        }
        const startupAnchorBoundaryState = options.getStartupAnchorBoundaryState();
        if (startupAnchorBoundaryState.triggered) {
          reject(
            new CodexReviewError(
              startupAnchorBoundaryState.reason ?? 'bounded review startup-anchor boundary violated',
              {
                exitCode: typeof code === 'number' && code > 0 ? code : 1,
                signal,
                timedOut: false,
                outputPreview: '',
                terminationBoundary: options.getTerminationBoundaryRecord('startup-anchor')
              }
            )
          );
          return;
        }
        if (options.enforceActiveCloseoutBundleRereadBoundary) {
          const activeCloseoutBundleBoundaryState =
            options.getActiveCloseoutBundleRereadBoundaryState();
          if (activeCloseoutBundleBoundaryState.triggered) {
            reject(
              new CodexReviewError(
                activeCloseoutBundleBoundaryState.reason ??
                  'bounded review active-closeout-bundle reread boundary violated',
                {
                  exitCode: typeof code === 'number' && code > 0 ? code : 1,
                  signal,
                  timedOut: false,
                  outputPreview: '',
                  terminationBoundary: options.getTerminationBoundaryRecord(
                    'active-closeout-bundle-reread'
                  )
                }
              )
            );
            return;
          }
        }
        if (options.enforceRelevantReinspectionDwellBoundary) {
          const relevantReinspectionBoundaryState =
            options.getRelevantReinspectionDwellBoundaryState();
          if (relevantReinspectionBoundaryState.triggered) {
            reject(
              new CodexReviewError(
                relevantReinspectionBoundaryState.reason ??
                  'bounded review relevant-reinspection dwell boundary violated',
                {
                  exitCode: typeof code === 'number' && code > 0 ? code : 1,
                  signal,
                  timedOut: false,
                  outputPreview: '',
                  terminationBoundary:
                    options.getTerminationBoundaryRecord('relevant-reinspection-dwell')
                }
              )
            );
            return;
          }
        }
        const verdictStabilityState = options.getVerdictStabilityState();
        if (verdictStabilityState.triggered) {
          reject(
            new CodexReviewError(
              verdictStabilityState.reason ?? 'bounded review verdict-stability drift detected',
              {
                exitCode: typeof code === 'number' && code > 0 ? code : 1,
                signal,
                timedOut: false,
                outputPreview: '',
                terminationBoundary: options.getTerminationBoundaryRecord('verdict-stability')
              }
            )
          );
          return;
        }
        const shellProbeBoundaryState = options.getShellProbeBoundaryState();
        if (shellProbeBoundaryState.triggered) {
          reject(
            new CodexReviewError(
              shellProbeBoundaryState.reason ?? 'bounded review shell-probe boundary violated',
              {
                exitCode: typeof code === 'number' && code > 0 ? code : 1,
                signal,
                timedOut: false,
                outputPreview: '',
                terminationBoundary: options.getTerminationBoundaryRecord('shell-probe')
              }
            )
          );
          return;
        }
        const blockedCommand = options.getBlockedHeavyCommand();
        if (code === 0 && options.blockHeavyCommands && blockedCommand) {
          reject(
            new CodexReviewError(formatBoundedHeavyCommandFailure(blockedCommand), {
              exitCode: 1,
              signal: null,
              timedOut: false,
              outputPreview: ''
            })
          );
          return;
        }
        if (code === 0) {
          resolve();
          return;
        }
        const suffix = signal ? ` (signal ${signal})` : '';
        reject(
          new CodexReviewError(`codex review exited with code ${code}${suffix}`, {
            exitCode: code,
            signal,
            timedOut: false,
            outputPreview: ''
          })
        );
      })();
    };

    child.once('error', onError);
    child.once('close', onClose);

    const requestTermination = (
      message: string,
      timedOut = true,
      terminationBoundary: ReviewTerminationBoundaryRecord | null = null
    ) => {
      if (settled || pendingTermination || child.exitCode !== null) {
        return;
      }

      pendingTermination = new CodexReviewError(message, {
        exitCode: 1,
        signal: null,
        timedOut,
        outputPreview: '',
        terminationBoundary
      });
      signalChildProcess(child, 'SIGTERM', options.detached);
      hardKillArmed = true;
      killHandle = setTimeout(() => {
        if (child.exitCode === null) {
          signalChildProcess(child, 'SIGKILL', options.detached);
        }
      }, 5000);
      killHandle.unref();
    };

    const timeoutMs = options.timeoutMs;
    if (timeoutMs !== null) {
      timeoutHandle = setTimeout(() => {
        const message = `codex review timed out after ${Math.round(
          timeoutMs / 1000
        )}s (set CODEX_REVIEW_TIMEOUT_SECONDS=0 to disable).`;
        requestTermination(message, true, {
          kind: 'timeout',
          provenance: 'review-timeout',
          reason: message,
          sample: null
        });
      }, timeoutMs);
      timeoutHandle.unref();
    }

    const stallTimeoutMs = options.stallTimeoutMs;
    if (stallTimeoutMs !== null) {
      const checkIntervalMs = Math.min(5000, Math.max(1000, Math.round(stallTimeoutMs / 4)));
      stallHandle = setInterval(() => {
        const idleMs = Date.now() - options.getLastOutputAtMs();
        if (idleMs < stallTimeoutMs) {
          return;
        }
        const message = `codex review stalled with no output for ${Math.round(
          stallTimeoutMs / 1000
        )}s (set CODEX_REVIEW_STALL_TIMEOUT_SECONDS=0 to disable).`;
        requestTermination(message, true, {
          kind: 'stall',
          provenance: 'output-stall',
          reason: message,
          sample: null
        });
      }, checkIntervalMs);
      stallHandle.unref();
    }

    const startupLoopTimeoutMs = options.startupLoopTimeoutMs;
    if (startupLoopTimeoutMs !== null && options.startupLoopMinEvents > 0) {
      const loopCheckIntervalMs = Math.min(5000, Math.max(1000, Math.round(startupLoopTimeoutMs / 6)));
      startupLoopHandle = setInterval(() => {
        if (Date.now() - startMs < startupLoopTimeoutMs) {
          return;
        }
        const state = options.getStartupLoopState();
        if (state.reviewProgressObserved || state.startupEvents < options.startupLoopMinEvents) {
          return;
        }
        const message = `codex review appears stuck in delegation startup loop after ${Math.round(
          startupLoopTimeoutMs / 1000
        )}s (${state.startupEvents} startup events, no review progress). Set CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS=0 to disable.`;
        requestTermination(message, true, {
          kind: 'startup-loop',
          provenance: 'delegation-startup-loop',
          reason: message,
          sample: null
        });
      }, loopCheckIntervalMs);
      startupLoopHandle.unref();
    }

    if (options.blockHeavyCommands) {
      heavyCommandHandle = setInterval(() => {
        const blockedCommand = options.getBlockedHeavyCommand();
        if (!blockedCommand) {
          return;
        }
        requestTermination(formatBoundedHeavyCommandFailure(blockedCommand), false);
      }, 250);
      heavyCommandHandle.unref();
    }

    if (options.lowSignalTimeoutMs !== null) {
      lowSignalHandle = setInterval(() => {
        const lowSignalReason = options.getLowSignalDriftReason();
        if (!lowSignalReason) {
          return;
        }
        requestTermination(
          `${lowSignalReason} (set ${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0 to disable).`,
          false
        );
      }, 1000);
      lowSignalHandle.unref();
    }

    if (options.verdictStabilityTimeoutMs !== null) {
      verdictStabilityHandle = setInterval(() => {
        const verdictStabilityState = options.getVerdictStabilityState();
        if (!verdictStabilityState.triggered) {
          return;
        }
        requestTermination(
          `${verdictStabilityState.reason ?? 'bounded review verdict-stability drift detected'} (set ${REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY}=0 to disable).`,
          false,
          options.getTerminationBoundaryRecord('verdict-stability')
        );
      }, 1000);
      verdictStabilityHandle.unref();
    }

    if (options.metaSurfaceTimeoutMs !== null) {
      metaSurfaceHandle = setInterval(() => {
        const metaSurfaceReason = options.getMetaSurfaceExpansionReason();
        if (!metaSurfaceReason) {
          return;
        }
        requestTermination(
          `${metaSurfaceReason} (set ${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0 to disable).`,
          false,
          options.getTerminationBoundaryRecord('meta-surface-expansion')
        );
      }, 1000);
      metaSurfaceHandle.unref();
    }

    if (options.enforceStartupAnchorBoundary) {
      startupAnchorHandle = setInterval(() => {
        const boundaryState = options.getStartupAnchorBoundaryState();
        if (!boundaryState.triggered) {
          return;
        }
        requestTermination(
          boundaryState.reason ?? 'bounded review startup-anchor boundary violated',
          false,
          options.getTerminationBoundaryRecord('startup-anchor')
        );
      }, 250);
      startupAnchorHandle.unref();
    }

    if (options.enforceActiveCloseoutBundleRereadBoundary) {
      activeCloseoutBundleHandle = setInterval(() => {
        const boundaryState = options.getActiveCloseoutBundleRereadBoundaryState();
        if (!boundaryState.triggered) {
          return;
        }
        requestTermination(
          boundaryState.reason ?? 'bounded review active-closeout-bundle reread boundary violated',
          false,
          options.getTerminationBoundaryRecord('active-closeout-bundle-reread')
        );
      }, 250);
      activeCloseoutBundleHandle.unref();
    }

    if (options.enforceRelevantReinspectionDwellBoundary) {
      relevantReinspectionHandle = setInterval(() => {
        const boundaryState = options.getRelevantReinspectionDwellBoundaryState();
        if (!boundaryState.triggered) {
          return;
        }
        requestTermination(
          `${boundaryState.reason ?? 'bounded review relevant-reinspection dwell boundary violated'} (set ${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0 to disable).`,
          false,
          options.getTerminationBoundaryRecord('relevant-reinspection-dwell')
        );
      }, 250);
      relevantReinspectionHandle.unref();
    }

    commandIntentHandle = setInterval(() => {
      const boundaryState = options.getCommandIntentBoundaryState();
      if (!boundaryState.triggered) {
        return;
      }
      requestTermination(
        formatCommandIntentBoundaryFailure(boundaryState),
        false,
        options.getTerminationBoundaryRecord('command-intent')
      );
    }, 250);
    commandIntentHandle.unref();

    shellProbeHandle = setInterval(() => {
      const boundaryState = options.getShellProbeBoundaryState();
      if (!boundaryState.triggered) {
        return;
      }
      requestTermination(
        boundaryState.reason ?? 'bounded review shell-probe boundary violated',
        false,
        options.getTerminationBoundaryRecord('shell-probe')
      );
    }, 250);
    shellProbeHandle.unref();

    const monitorIntervalMs = options.monitorIntervalMs;
    if (monitorIntervalMs !== null) {
      const checkpointIntervalMs = Math.max(1000, monitorIntervalMs);
      monitorHandle = setInterval(() => {
        console.log(options.formatCheckpoint());
      }, checkpointIntervalMs);
      monitorHandle.unref();
    }
  });
}

export function signalChildProcess(
  child: ChildProcess,
  signal: NodeJS.Signals,
  detached: boolean
): void {
  if (detached && typeof child.pid === 'number' && child.pid > 0) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fallback to direct child signal below.
    }
  }
  try {
    child.kill(signal);
  } catch {
    // Best effort only.
  }
}
