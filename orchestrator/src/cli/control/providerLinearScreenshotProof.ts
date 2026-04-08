import { execFile } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_SCREENSHOT_LABEL = 'Proof screenshot';
const DEFAULT_SCREENSHOT_MEDIA_TYPE = 'image/png';
const DEFAULT_PREVIEW_CLEANUP_DELAY_MS = 1_200;
const SUPPORTED_SCREENSHOT_MEDIA_TYPES = new Map<string, string>([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg']
]);

export type ProviderLinearScreenshotProofMode = 'display' | 'window';
export type ProviderLinearScreenshotProofCleanupStatus =
  | 'skipped'
  | 'succeeded'
  | 'failed'
  | 'automation-denied';

export interface ProviderLinearScreenshotProofError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface ProviderLinearScreenshotProofCommand {
  executable: string;
  args: string[];
}

export interface ProviderLinearScreenshotProofCleanup {
  attempted: boolean;
  status: ProviderLinearScreenshotProofCleanupStatus;
  summary: string;
  command: ProviderLinearScreenshotProofCommand | null;
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
}

export interface ProviderLinearScreenshotProofCapture {
  platform: 'darwin';
  mode: ProviderLinearScreenshotProofMode;
  display_id: string | null;
  window_id: string | null;
  open_preview: boolean;
  command: ProviderLinearScreenshotProofCommand;
  output_path: string;
  file_url: string;
  embed_markdown: string;
  bytes: number | null;
  media_type: string | null;
  cleanup: ProviderLinearScreenshotProofCleanup;
}

export interface ProviderLinearScreenshotProofResolutionSuccess {
  ok: true;
  capture: ProviderLinearScreenshotProofCapture;
}

export interface ProviderLinearScreenshotProofResolutionFailure {
  ok: false;
  capture: ProviderLinearScreenshotProofCapture | null;
  error: ProviderLinearScreenshotProofError;
}

export type ProviderLinearScreenshotProofResolution =
  | ProviderLinearScreenshotProofResolutionSuccess
  | ProviderLinearScreenshotProofResolutionFailure;

export interface ResolveProviderLinearScreenshotProofInput {
  cwd: string;
  outputPath?: string | null;
  displayId?: string | null;
  windowId?: string | null;
  openPreview?: boolean;
}

export interface ProviderLinearScreenshotProofCommandRequest {
  command: string;
  args: string[];
}

export interface ProviderLinearScreenshotProofCommandResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
  command_missing: boolean;
  error_message: string | null;
}

interface ProviderLinearScreenshotProofDependencies {
  platform: NodeJS.Platform;
  now: () => string;
  mkdir: typeof mkdir;
  stat: typeof stat;
  sleep: (ms: number) => Promise<void>;
  runCommand: (
    request: ProviderLinearScreenshotProofCommandRequest
  ) => Promise<ProviderLinearScreenshotProofCommandResult>;
}

type ProviderLinearPreviewProbe =
  | {
      kind: 'running' | 'not-running';
    }
  | {
      kind: 'failed';
      cleanup: ProviderLinearScreenshotProofCleanup;
    };

const DEFAULT_DEPENDENCIES: ProviderLinearScreenshotProofDependencies = {
  platform: process.platform,
  now: () => new Date().toISOString(),
  mkdir,
  stat,
  sleep: async (ms: number) => {
    await sleep(ms);
  },
  runCommand: async (request: ProviderLinearScreenshotProofCommandRequest) => {
    try {
      const result = await execFileAsync(request.command, request.args, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
      return {
        exit_code: 0,
        stdout: normalizeExecOutput(result.stdout),
        stderr: normalizeExecOutput(result.stderr),
        signal: null,
        command_missing: false,
        error_message: null
      };
    } catch (error) {
      const commandError = error as {
        code?: string | number;
        signal?: NodeJS.Signals | null;
        message?: string;
        stdout?: string | Buffer;
        stderr?: string | Buffer;
      };
      return {
        exit_code: typeof commandError.code === 'number' ? commandError.code : 1,
        stdout: normalizeExecOutput(commandError.stdout),
        stderr: normalizeExecOutput(commandError.stderr),
        signal: commandError.signal ?? null,
        command_missing: commandError.code === 'ENOENT',
        error_message: normalizeOptionalString(commandError.message)
      };
    }
  }
};

export async function resolveProviderLinearScreenshotProof(
  input: ResolveProviderLinearScreenshotProofInput,
  overrides: Partial<ProviderLinearScreenshotProofDependencies> = {}
): Promise<ProviderLinearScreenshotProofResolution> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  if (dependencies.platform !== 'darwin') {
    return failure(
      'screenshot_proof_platform_unsupported',
      'linear screenshot-proof is only supported on macOS.',
      422
    );
  }

  const displayId = normalizeOptionalDigits(input.displayId ?? null);
  if (input.displayId != null && (displayId == null || displayId === '0')) {
    return failure(
      'screenshot_proof_display_id_invalid',
      '--display-id must be a positive integer when provided.',
      422
    );
  }

  const windowId = normalizeOptionalDigits(input.windowId ?? null);
  if (input.windowId != null && (windowId == null || windowId === '0')) {
    return failure(
      'screenshot_proof_window_id_invalid',
      '--window-id must be a positive integer when provided.',
      422
    );
  }

  if (displayId && windowId) {
    return failure(
      'screenshot_proof_target_conflict',
      'Use either --display-id or --window-id, not both.',
      422
    );
  }

  const openPreview = input.openPreview === true;
  const mode: ProviderLinearScreenshotProofMode = windowId ? 'window' : 'display';
  const previewProbe = openPreview ? await probePreviewRunning(dependencies) : null;
  const resolvedOutputPathResult = resolveScreenshotOutputPath(input.cwd, input.outputPath ?? null, dependencies.now());
  if (!resolvedOutputPathResult.ok) {
    return failure(
      resolvedOutputPathResult.error.code,
      resolvedOutputPathResult.error.message,
      resolvedOutputPathResult.error.status,
      resolvedOutputPathResult.error.details
    );
  }

  const outputPath = resolvedOutputPathResult.output_path;
  const outputDirectory = dirname(outputPath);
  const mediaType = resolvedOutputPathResult.media_type;
  const fileUrl = pathToFileURL(outputPath).toString();
  const embedMarkdown = buildScreenshotEmbedMarkdown(fileUrl);
  const captureCommand = buildCaptureCommand({
    outputPath,
    displayId,
    windowId,
    openPreview
  });
  const baseCapture = buildBaseCaptureRecord({
    mode,
    displayId,
    windowId,
    openPreview,
    outputPath,
    fileUrl,
    embedMarkdown,
    command: captureCommand,
    mediaType
  });

  try {
    await dependencies.mkdir(outputDirectory, { recursive: true });
  } catch (error) {
    const directoryError = error as NodeJS.ErrnoException;
    return failureWithCapture(
      baseCapture,
      buildSkippedCleanup('Capture cleanup was skipped because the screenshot output directory could not be prepared.'),
      'screenshot_proof_output_directory_prepare_failed',
      `Screenshot output directory "${outputDirectory}" could not be prepared before capture.`,
      422,
      {
        output_path: outputPath,
        output_directory: outputDirectory,
        error_code: directoryError.code ?? null,
        error_message: normalizeOptionalString(directoryError.message)
      }
    );
  }

  const captureResult = await dependencies.runCommand({
    command: captureCommand.executable,
    args: captureCommand.args
  });

  if (captureResult.command_missing) {
    return failureWithCapture(
      baseCapture,
      buildSkippedCleanup('Capture cleanup was skipped because `screencapture` never started.'),
      'screenshot_proof_capture_command_missing',
      'macOS `screencapture` is unavailable on this host.',
      503
    );
  }

  if (captureResult.exit_code !== 0) {
    const classifiedError = classifyScreencaptureFailure(captureResult, outputPath);
    return failureWithCapture(
      baseCapture,
      buildSkippedCleanup('Capture cleanup was skipped because the screenshot capture did not complete.'),
      classifiedError.code,
      classifiedError.message,
      classifiedError.status,
      classifiedError.details
    );
  }

  let fileStats;
  try {
    fileStats = await dependencies.stat(outputPath);
  } catch {
    return failureWithCapture(
      baseCapture,
      buildSkippedCleanup('Cleanup was skipped because the screenshot file could not be verified after capture.'),
      'screenshot_proof_output_unreadable',
      `Screenshot capture reported success, but "${outputPath}" is not readable.`,
      422,
      {
        output_path: outputPath
      }
    );
  }

  if (!fileStats.isFile() || fileStats.size <= 0) {
    return failureWithCapture(
      baseCapture,
      buildSkippedCleanup('Cleanup was skipped because the screenshot file was empty or not a regular file.'),
      'screenshot_proof_output_unreadable',
      `Screenshot capture must produce a non-empty file at "${outputPath}".`,
      422,
      {
        output_path: outputPath,
        bytes: fileStats.size
      }
    );
  }

  const successfulCapture: ProviderLinearScreenshotProofCapture = {
    ...baseCapture,
    bytes: fileStats.size
  };

  if (!openPreview) {
    return {
      ok: true,
      capture: {
        ...successfulCapture,
        cleanup: buildSkippedCleanup(
          'Cleanup skipped because the helper did not open a temporary Preview surface.'
        )
      }
    };
  }

  if (previewProbe?.kind === 'failed') {
    return failureWithCapture(
      successfulCapture,
      previewProbe.cleanup,
      'screenshot_proof_cleanup_failed',
      previewProbe.cleanup.summary,
      502,
      {
        output_path: outputPath,
        cleanup_status: previewProbe.cleanup.status
      }
    );
  }

  if (previewProbe?.kind === 'running') {
    return {
      ok: true,
      capture: {
        ...successfulCapture,
        cleanup: buildSkippedCleanup(
          'Cleanup skipped because Preview was already running before capture, so the helper would not close unrelated Preview documents.'
        )
      }
    };
  }

  await dependencies.sleep(DEFAULT_PREVIEW_CLEANUP_DELAY_MS);
  const cleanupResult = await resolvePreviewCleanup(dependencies);
  if (cleanupResult.status === 'failed' || cleanupResult.status === 'automation-denied') {
    return failureWithCapture(
      successfulCapture,
      cleanupResult,
      cleanupResult.status === 'automation-denied'
        ? 'screenshot_proof_cleanup_automation_denied'
        : 'screenshot_proof_cleanup_failed',
      cleanupResult.summary,
      cleanupResult.status === 'automation-denied' ? 422 : 502,
      {
        output_path: outputPath,
        cleanup_status: cleanupResult.status
      }
    );
  }

  return {
    ok: true,
    capture: {
      ...successfulCapture,
      cleanup: cleanupResult
    }
  };
}

function resolveScreenshotOutputPath(
  cwd: string,
  outputPath: string | null,
  now: string
):
  | {
      ok: true;
      output_path: string;
      media_type: string;
    }
  | {
      ok: false;
      error: ProviderLinearScreenshotProofError;
    } {
  const normalizedOutputPath = normalizeOptionalString(outputPath);
  const resolved =
    normalizedOutputPath != null
      ? resolve(cwd, normalizedOutputPath)
      : resolve(cwd, '.tmp', `linear-screenshot-proof-${sanitizeTimestamp(now)}.png`);
  const extension = extname(resolved).toLowerCase();
  const mediaType = SUPPORTED_SCREENSHOT_MEDIA_TYPES.get(extension);
  if (!mediaType) {
    return {
      ok: false,
      error: {
        code: 'screenshot_proof_output_extension_invalid',
        message: 'Screenshot output must end in .png, .jpg, or .jpeg so it remains compatible with Linear workpad image embedding.',
        status: 422,
        details: {
          output_path: resolved,
          supported_extensions: [...SUPPORTED_SCREENSHOT_MEDIA_TYPES.keys()]
        }
      }
    };
  }
  return {
    ok: true,
    output_path: resolved,
    media_type: mediaType
  };
}

function buildCaptureCommand(input: {
  outputPath: string;
  displayId: string | null;
  windowId: string | null;
  openPreview: boolean;
}): ProviderLinearScreenshotProofCommand {
  const args = ['-x'];
  if (input.openPreview) {
    args.push('-P');
  }
  if (input.displayId) {
    args.push('-D', input.displayId);
  }
  if (input.windowId) {
    args.push('-l', input.windowId);
  }
  args.push(input.outputPath);
  return {
    executable: 'screencapture',
    args
  };
}

function buildBaseCaptureRecord(input: {
  mode: ProviderLinearScreenshotProofMode;
  displayId: string | null;
  windowId: string | null;
  openPreview: boolean;
  outputPath: string;
  fileUrl: string;
  embedMarkdown: string;
  command: ProviderLinearScreenshotProofCommand;
  mediaType: string;
}): ProviderLinearScreenshotProofCapture {
  return {
    platform: 'darwin',
    mode: input.mode,
    display_id: input.displayId,
    window_id: input.windowId,
    open_preview: input.openPreview,
    command: input.command,
    output_path: input.outputPath,
    file_url: input.fileUrl,
    embed_markdown: input.embedMarkdown,
    bytes: null,
    media_type: input.mediaType ?? DEFAULT_SCREENSHOT_MEDIA_TYPE,
    cleanup: buildSkippedCleanup('Cleanup status has not been resolved yet.')
  };
}

async function resolvePreviewCleanup(
  dependencies: ProviderLinearScreenshotProofDependencies
): Promise<ProviderLinearScreenshotProofCleanup> {
  const cleanupCommand: ProviderLinearScreenshotProofCommand = {
    executable: 'osascript',
    args: ['-e', buildPreviewCleanupScript()]
  };
  const cleanupResult = await dependencies.runCommand({
    command: cleanupCommand.executable,
    args: cleanupCommand.args
  });
  const stdout = normalizeOptionalString(cleanupResult.stdout);
  const stderr = normalizeOptionalString(cleanupResult.stderr) ?? cleanupResult.error_message;

  if (cleanupResult.command_missing) {
    return {
      attempted: true,
      status: 'failed',
      summary: 'Preview cleanup failed because `osascript` is unavailable on this host.',
      command: cleanupCommand,
      exit_code: cleanupResult.exit_code,
      stdout,
      stderr
    };
  }

  if (cleanupResult.exit_code !== 0) {
    if (isAutomationDenied(stderr)) {
      return {
        attempted: true,
        status: 'automation-denied',
        summary:
          'Preview cleanup was blocked by macOS Automation permission. Grant Apple Events access for this helper or rerun without `--open-preview`.',
        command: cleanupCommand,
        exit_code: cleanupResult.exit_code,
        stdout,
        stderr
      };
    }
    return {
      attempted: true,
      status: 'failed',
      summary: 'Preview cleanup failed after capture; inspect stderr for the AppleScript error.',
      command: cleanupCommand,
      exit_code: cleanupResult.exit_code,
      stdout,
      stderr
    };
  }

  if (stdout === 'closed') {
    return {
      attempted: true,
      status: 'succeeded',
      summary: 'Preview cleanup closed the temporary screenshot document after capture.',
      command: cleanupCommand,
      exit_code: 0,
      stdout,
      stderr
    };
  }

  if (stdout === 'not-running' || stdout === 'not-found') {
    return buildSkippedCleanup('Cleanup skipped because Preview was already closed before the AppleScript cleanup step.');
  }

  if (stdout === 'ambiguous') {
    return buildSkippedCleanup(
      'Cleanup skipped because Preview opened more than one document before the bounded cleanup step, so the helper would not guess which document to close.'
    );
  }

  return {
    attempted: true,
    status: 'failed',
    summary: 'Preview cleanup failed after capture; the AppleScript cleanup step returned an unexpected result.',
    command: cleanupCommand,
    exit_code: 0,
    stdout,
    stderr
  };
}

async function probePreviewRunning(
  dependencies: ProviderLinearScreenshotProofDependencies
): Promise<ProviderLinearPreviewProbe> {
  const previewCheck = await dependencies.runCommand({
    command: 'pgrep',
    args: ['-x', 'Preview']
  });
  if (previewCheck.command_missing) {
    return {
      kind: 'failed',
      cleanup: {
        attempted: false,
        status: 'failed',
        summary: 'Preview cleanup preflight failed because `pgrep` is unavailable on this host.',
        command: null,
        exit_code: previewCheck.exit_code,
        stdout: normalizeOptionalString(previewCheck.stdout),
        stderr: normalizeOptionalString(previewCheck.stderr) ?? previewCheck.error_message
      }
    };
  }
  if (previewCheck.exit_code === 1) {
    return { kind: 'not-running' };
  }
  if (previewCheck.exit_code === 0) {
    return { kind: 'running' };
  }
  return {
    kind: 'failed',
    cleanup: {
      attempted: false,
      status: 'failed',
      summary: 'Preview cleanup preflight failed because Preview process discovery did not complete before capture.',
      command: null,
      exit_code: previewCheck.exit_code,
      stdout: normalizeOptionalString(previewCheck.stdout),
      stderr: normalizeOptionalString(previewCheck.stderr) ?? previewCheck.error_message
    }
  };
}

function buildPreviewCleanupScript(): string {
  return [
    'if application "Preview" is not running then return "not-running"',
    'tell application "Preview"',
    '  if (count of documents) is 0 then return "not-found"',
    '  if (count of documents) is not 1 then return "ambiguous"',
    '  close front document saving no',
    '  if (count of documents) is 0 then quit',
    'end tell',
    'return "closed"'
  ].join('\n');
}

function classifyScreencaptureFailure(
  result: ProviderLinearScreenshotProofCommandResult,
  outputPath: string
): ProviderLinearScreenshotProofError {
  const stderr = normalizeOptionalString(result.stderr) ?? result.error_message;
  if (isScreenRecordingDenied(stderr)) {
    return {
      code: 'screenshot_proof_screen_recording_denied',
      message:
        'macOS denied Screen Recording access for `screencapture`. Grant Screen Recording permission or use a machine where this helper is authorized.',
      status: 422,
      details: {
        output_path: outputPath,
        exit_code: result.exit_code,
        stderr
      }
    };
  }
  return {
    code: 'screenshot_proof_capture_failed',
    message: 'macOS `screencapture` did not produce a screenshot file.',
    status: 502,
    details: {
      output_path: outputPath,
      exit_code: result.exit_code,
      stderr
    }
  };
}

function buildScreenshotEmbedMarkdown(fileUrl: string): string {
  return /[()]/u.test(fileUrl)
    ? `![${DEFAULT_SCREENSHOT_LABEL}](<${fileUrl}>)`
    : `![${DEFAULT_SCREENSHOT_LABEL}](${fileUrl})`;
}

function buildSkippedCleanup(summary: string): ProviderLinearScreenshotProofCleanup {
  return {
    attempted: false,
    status: 'skipped',
    summary,
    command: null,
    exit_code: null,
    stdout: null,
    stderr: null
  };
}

function failure(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): ProviderLinearScreenshotProofResolutionFailure {
  return {
    ok: false,
    capture: null,
    error: {
      code,
      message,
      status,
      ...(details ? { details } : {})
    }
  };
}

function failureWithCapture(
  capture: ProviderLinearScreenshotProofCapture,
  cleanup: ProviderLinearScreenshotProofCleanup,
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): ProviderLinearScreenshotProofResolutionFailure {
  return {
    ok: false,
    capture: {
      ...capture,
      cleanup
    },
    error: {
      code,
      message,
      status,
      ...(details ? { details } : {})
    }
  };
}

function normalizeOptionalDigits(value: string | null): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  return /^\d+$/u.test(normalized) ? normalized : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeExecOutput(value: string | Buffer | undefined): string {
  if (typeof value === 'string') {
    return value;
  }
  return value ? value.toString('utf8') : '';
}

function sanitizeTimestamp(value: string): string {
  return value.replace(/[^0-9A-Za-z]+/gu, '');
}

function isScreenRecordingDenied(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return (
    normalized.includes('screen recording')
    || normalized.includes('not authorized')
    || normalized.includes('not permitted')
    || normalized.includes('windowserver')
  );
}

function isAutomationDenied(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return (
    normalized.includes('-1743')
    || normalized.includes('not authorized to send apple events')
    || normalized.includes('not permitted to send apple events')
    || normalized.includes('err aeeventnotpermitted')
  );
}
