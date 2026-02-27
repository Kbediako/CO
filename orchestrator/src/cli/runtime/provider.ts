import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { resolveCodexCliBin } from '../utils/codexCli.js';
import { isoTimestamp } from '../utils/time.js';
import type {
  RuntimeFallbackMetadata,
  RuntimeMode,
  RuntimeSelection,
  RuntimeSelectionOptions
} from './types.js';

const execFileAsync = promisify(execFile);
const APP_SERVER_HELP_TIMEOUT_MS = 8000;
const LOGIN_STATUS_TIMEOUT_MS = 8000;

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function allowRuntimeFallback(env: NodeJS.ProcessEnv, override: boolean | undefined): boolean {
  if (typeof override === 'boolean') {
    return override;
  }
  const raw = env.CODEX_ORCHESTRATOR_RUNTIME_FALLBACK;
  if (!raw) {
    return true;
  }
  const normalized = raw.trim().toLowerCase();
  return !['0', 'false', 'off', 'deny', 'disabled', 'never', 'strict'].includes(normalized);
}

function createNoFallback(now: () => string): RuntimeFallbackMetadata {
  return {
    occurred: false,
    code: null,
    reason: null,
    from_mode: null,
    to_mode: null,
    checked_at: now()
  };
}

function createFallback(params: {
  code: string;
  reason: string;
  fromMode: RuntimeMode;
  toMode: RuntimeMode;
  now: () => string;
}): RuntimeFallbackMetadata {
  return {
    occurred: true,
    code: params.code,
    reason: params.reason,
    from_mode: params.fromMode,
    to_mode: params.toMode,
    checked_at: params.now()
  };
}

function summarizePreflightFailures(issues: Array<{ code: string; message: string }>): string {
  const codes = issues.map((issue) => issue.code).join(', ');
  const messages = issues.map((issue) => issue.message).join(' ');
  return `Appserver preflight failed (${codes}). ${messages}`.trim();
}

async function runCodexProbe(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number
): Promise<{ ok: boolean; stdout: string; stderr: string; code: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      env,
      timeout: timeoutMs,
      maxBuffer: 256 * 1024
    });
    return {
      ok: true,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      code: 'ok'
    };
  } catch (error) {
    const typed = error as NodeJS.ErrnoException & {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      signal?: string;
      killed?: boolean;
    };
    const stdout = typeof typed.stdout === 'string' ? typed.stdout : typed.stdout?.toString() ?? '';
    const stderr = typeof typed.stderr === 'string' ? typed.stderr : typed.stderr?.toString() ?? '';
    const timeout = typed.signal === 'SIGTERM' || typed.killed === true;
    return {
      ok: false,
      stdout,
      stderr,
      code: timeout ? 'timeout' : typed.code ?? 'failed'
    };
  }
}

async function runAppserverPreflight(params: {
  repoRoot: string;
  env: NodeJS.ProcessEnv;
}): Promise<{ ok: boolean; issues: Array<{ code: string; message: string }> }> {
  const codexBin = resolveCodexCliBin(params.env);
  const issues: Array<{ code: string; message: string }> = [];

  if (envFlagEnabled(params.env.CODEX_ORCHESTRATOR_APPSERVER_FORCE_PRECHECK_FAIL)) {
    issues.push({
      code: 'forced-preflight-failure',
      message: 'Forced appserver preflight failure via CODEX_ORCHESTRATOR_APPSERVER_FORCE_PRECHECK_FAIL.'
    });
    return {
      ok: false,
      issues
    };
  }

  const appServerHelp = await runCodexProbe(
    codexBin,
    ['app-server', '--help'],
    params.repoRoot,
    params.env,
    APP_SERVER_HELP_TIMEOUT_MS
  );
  if (!appServerHelp.ok) {
    issues.push({
      code: 'appserver-command-unavailable',
      message:
        appServerHelp.code === 'timeout'
          ? 'Timed out probing `codex app-server --help`.'
          : 'Failed probing `codex app-server --help`.'
    });
  }

  if (!envFlagEnabled(params.env.CODEX_ORCHESTRATOR_APPSERVER_SKIP_LOGIN_CHECK)) {
    const loginStatus = await runCodexProbe(
      codexBin,
      ['login', 'status'],
      params.repoRoot,
      params.env,
      LOGIN_STATUS_TIMEOUT_MS
    );
    if (!loginStatus.ok) {
      issues.push({
        code: 'login-status-failed',
        message:
          loginStatus.code === 'timeout'
            ? 'Timed out probing `codex login status`.'
            : 'Failed probing `codex login status`.'
      });
    } else {
      const text = `${loginStatus.stdout}\n${loginStatus.stderr}`.toLowerCase();
      const loggedIn = text.includes('logged in');
      const loggedOut = text.includes('not logged') || text.includes('logged out');
      if (!loggedIn || loggedOut) {
        issues.push({
          code: 'login-required',
          message: '`codex login status` did not report an active ChatGPT login.'
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export async function resolveRuntimeSelection(
  options: RuntimeSelectionOptions
): Promise<RuntimeSelection> {
  const now = options.now ?? isoTimestamp;

  if (options.executionMode === 'cloud' && options.requestedMode === 'appserver') {
    throw new Error(
      'Unsupported mode combination: executionMode=cloud does not support runtimeMode=appserver. ' +
        'Use --runtime-mode cli or remove the runtime override for cloud execution.'
    );
  }

  if (options.requestedMode === 'cli') {
    return {
      requested_mode: 'cli',
      selected_mode: 'cli',
      source: options.source,
      provider: 'CliRuntimeProvider',
      env_overrides: {
        CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'cli',
        CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli',
        CODEX_RUNTIME_MODE: 'cli',
        CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID: ''
      },
      runtime_session_id: null,
      fallback: createNoFallback(now)
    };
  }

  const preflight = await runAppserverPreflight({
    repoRoot: options.repoRoot,
    env: options.env
  });

  if (preflight.ok) {
    const runtimeSessionId = `appserver-${options.runId}`;
    return {
      requested_mode: 'appserver',
      selected_mode: 'appserver',
      source: options.source,
      provider: 'AppServerRuntimeProvider',
      env_overrides: {
        CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'appserver',
        CODEX_ORCHESTRATOR_RUNTIME_MODE: 'appserver',
        CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID: runtimeSessionId,
        CODEX_RUNTIME_MODE: 'appserver'
      },
      runtime_session_id: runtimeSessionId,
      fallback: createNoFallback(now)
    };
  }

  const reason = summarizePreflightFailures(preflight.issues);
  const fallbackAllowed = allowRuntimeFallback(options.env, options.allowFallback);
  if (!fallbackAllowed) {
    throw new Error(
      `${reason} Runtime fallback is disabled by CODEX_ORCHESTRATOR_RUNTIME_FALLBACK.`
    );
  }

  return {
    requested_mode: 'appserver',
    selected_mode: 'cli',
    source: options.source,
    provider: 'CliRuntimeProvider',
    env_overrides: {
      CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'cli',
      CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli',
      CODEX_RUNTIME_MODE: 'cli',
      CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID: ''
    },
    runtime_session_id: null,
    fallback: createFallback({
      code: preflight.issues[0]?.code ?? 'appserver-preflight-failed',
      reason,
      fromMode: 'appserver',
      toMode: 'cli',
      now
    })
  };
}
