import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { resolveCodexCliBin } from '../utils/codexCli.js';
import { isoTimestamp } from '../utils/time.js';
import {
  describeFallbackTarget,
  resolveRuntimeFallbackPolicy,
  type RuntimeFallbackPolicyResolution
} from './fallbackPolicy.js';
import type {
  RuntimeFallbackExpiryMetadata,
  RuntimeFallbackMetadata,
  RuntimeMode,
  RuntimeSelection,
  RuntimeSelectionOptions
} from './types.js';

const execFileAsync = promisify(execFile);
const APP_SERVER_HELP_TIMEOUT_MS = 8000;
const LOGIN_STATUS_TIMEOUT_MS = 8000;
const RUNTIME_FALLBACK_ENV_KEY = 'CODEX_ORCHESTRATOR_RUNTIME_FALLBACK';
const APPSERVER_PREFLIGHT_RUNTIME_FALLBACK_EXPIRY: RuntimeFallbackExpiryMetadata = {
  owner: 'CO-396',
  trigger: 'Requested or default runtimeMode=appserver cannot pass appserver preflight and runtime fallback policy is auto.',
  introduced_date: '2026-02-27',
  review_date: '2026-05-10',
  maximum_lifetime: '2026-05-26',
  removal_condition:
    'Appserver default/runtime contract succeeds directly, or callers choose explicit runtimeMode=cli or strict policy before launch.',
  validation: 'orchestrator/tests/RuntimeProvider.test.ts and scripts/runtime-mode-canary.mjs forced fallback checks.'
};
const CLOUD_DEFAULT_APPSERVER_RUNTIME_FALLBACK_EXPIRY: RuntimeFallbackExpiryMetadata = {
  owner: 'CO-396',
  trigger:
    'executionMode=cloud receives default or manifest-derived runtimeMode=appserver while cloud appserver runtime remains unsupported and runtime fallback policy is auto.',
  introduced_date: '2026-04-26',
  review_date: '2026-05-10',
  maximum_lifetime: '2026-05-26',
  removal_condition:
    'Cloud route selects runtimeMode=cli before runtime selection, or fails fast with equivalent actionable metadata instead of relying on implicit runtime fallback.',
  validation: 'orchestrator/tests/RuntimeProvider.test.ts cloud default/manifest fallback coverage and cloud-mode docs checks.'
};

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function createNoFallback(
  now: () => string,
  policyResolution: RuntimeFallbackPolicyResolution
): RuntimeFallbackMetadata {
  return {
    occurred: false,
    policy: policyResolution.policy,
    policy_source: policyResolution.source,
    code: null,
    reason: null,
    from_mode: null,
    to_mode: null,
    original_target: null,
    fallback_target: null,
    blocking_reason: null,
    expiry: null,
    checked_at: now()
  };
}

function createFallback(params: {
  code: string;
  reason: string;
  fromMode: RuntimeMode;
  toMode: RuntimeMode;
  originalTarget: string;
  fallbackTarget: string;
  policyResolution: RuntimeFallbackPolicyResolution;
  expiry: RuntimeFallbackExpiryMetadata;
  now: () => string;
}): RuntimeFallbackMetadata {
  return {
    occurred: true,
    policy: params.policyResolution.policy,
    policy_source: params.policyResolution.source,
    code: params.code,
    reason: params.reason,
    from_mode: params.fromMode,
    to_mode: params.toMode,
    original_target: params.originalTarget,
    fallback_target: params.fallbackTarget,
    blocking_reason: params.reason,
    expiry: params.expiry,
    checked_at: params.now()
  };
}

function createBlockedFallback(params: {
  code: string;
  reason: string;
  fromMode: RuntimeMode;
  toMode: RuntimeMode | null;
  originalTarget: string;
  fallbackTarget: string | null;
  policyResolution: RuntimeFallbackPolicyResolution;
  now: () => string;
}): RuntimeFallbackMetadata {
  return {
    occurred: false,
    policy: params.policyResolution.policy,
    policy_source: params.policyResolution.source,
    code: params.code,
    reason: params.reason,
    from_mode: params.fromMode,
    to_mode: params.toMode,
    original_target: params.originalTarget,
    fallback_target: params.fallbackTarget,
    blocking_reason: params.reason,
    expiry: null,
    checked_at: params.now()
  };
}

export class RuntimeSelectionFailure extends Error {
  readonly runtimeFallback: RuntimeFallbackMetadata;

  constructor(message: string, runtimeFallback: RuntimeFallbackMetadata) {
    super(message);
    this.name = 'RuntimeSelectionFailure';
    this.runtimeFallback = runtimeFallback;
  }
}

export function getRuntimeSelectionFailureMetadata(error: unknown): RuntimeFallbackMetadata | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const candidate = (error as { runtimeFallback?: unknown }).runtimeFallback;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  return candidate as RuntimeFallbackMetadata;
}

function buildFallbackPolicyFailureMessage(params: {
  policyResolution: RuntimeFallbackPolicyResolution;
  originalTarget: string;
  fallbackTarget: string | null;
  blockingReason: string;
}): string {
  return (
    `Runtime fallback policy=${params.policyResolution.policy} ` +
    `original_target=${params.originalTarget} ` +
    `fallback_target=${describeFallbackTarget(params.fallbackTarget)} ` +
    `blocking_reason=${params.blockingReason}`
  );
}

function summarizePreflightFailures(issues: Array<{ code: string; message: string }>): string {
  const codes = issues.map((issue) => issue.code).join(', ');
  const messages = issues.map((issue) => issue.message).join(' ');
  return `Appserver preflight failed (${codes}). ${messages}`.trim();
}

function buildCodexCommandUnavailableIssue(codexBin: string): { code: string; message: string } {
  return {
    code: 'codex-command-unavailable',
    message: `Could not resolve the Codex CLI executable (${codexBin}) under the current runtime.`
  };
}

function buildRuntimeWorkspaceUnavailableIssue(repoRoot: string): { code: string; message: string } {
  return {
    code: 'runtime-workspace-unavailable',
    message: `Could not probe the Codex runtime because the selected repo root is unavailable (${repoRoot}).`
  };
}

function buildEnoentProbeIssue(params: {
  codexBin: string;
  repoRoot: string;
}): { code: string; message: string } {
  if (!existsSync(params.repoRoot)) {
    return buildRuntimeWorkspaceUnavailableIssue(params.repoRoot);
  }
  return buildCodexCommandUnavailableIssue(params.codexBin);
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
    if (appServerHelp.code === 'ENOENT') {
      issues.push(
        buildEnoentProbeIssue({
          codexBin,
          repoRoot: params.repoRoot
        })
      );
      return {
        ok: false,
        issues
      };
    }
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
      const enoentIssue =
        loginStatus.code === 'ENOENT'
          ? buildEnoentProbeIssue({
              codexBin,
              repoRoot: params.repoRoot
            })
          : null;
      issues.push({
        code: enoentIssue?.code ?? 'login-status-failed',
        message:
          loginStatus.code === 'timeout'
            ? 'Timed out probing `codex login status`.'
            : loginStatus.code === 'ENOENT'
              ? (enoentIssue?.message ?? 'Failed probing `codex login status`.')
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
  const requestedMode = options.requestedMode;
  const policyResolution = resolveRuntimeFallbackPolicy({
    env: options.env,
    envKey: RUNTIME_FALLBACK_ENV_KEY,
    override: options.allowFallback
  });

  if (options.executionMode === 'cloud' && requestedMode === 'appserver') {
    const blockingReason =
      'Unsupported mode combination: executionMode=cloud does not support runtimeMode=appserver.';
    const explicitSource = options.source === 'flag' || options.source === 'env' || options.source === 'config';
    if (explicitSource || policyResolution.policy === 'strict') {
      const fallbackTarget = 'execution:cloud/runtime:cli';
      const fallback = createBlockedFallback({
        code: 'cloud-appserver-unsupported',
        reason: blockingReason,
        fromMode: 'appserver',
        toMode: 'cli',
        originalTarget: 'execution:cloud/runtime:appserver',
        fallbackTarget,
        policyResolution,
        now
      });
      throw new RuntimeSelectionFailure(
        `${blockingReason} ${buildFallbackPolicyFailureMessage({
          policyResolution,
          originalTarget: fallback.original_target ?? 'execution:cloud/runtime:appserver',
          fallbackTarget: fallback.fallback_target,
          blockingReason
        })} Use --runtime-mode cli or remove the runtime override for cloud execution.`,
        fallback
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
        code: 'cloud-appserver-unsupported',
        reason: blockingReason,
        fromMode: 'appserver',
        toMode: 'cli',
        originalTarget: 'execution:cloud/runtime:appserver',
        fallbackTarget: 'execution:cloud/runtime:cli',
        policyResolution,
        expiry: CLOUD_DEFAULT_APPSERVER_RUNTIME_FALLBACK_EXPIRY,
        now
      })
    };
  }

  if (requestedMode === 'cli') {
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
      fallback: createNoFallback(now, policyResolution)
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
      fallback: createNoFallback(now, policyResolution)
    };
  }

  const reason = summarizePreflightFailures(preflight.issues);
  if (policyResolution.policy === 'strict') {
    const fallback = createBlockedFallback({
      code: preflight.issues[0]?.code ?? 'appserver-preflight-failed',
      reason,
      fromMode: 'appserver',
      toMode: 'cli',
      originalTarget: 'runtime:appserver',
      fallbackTarget: 'runtime:cli',
      policyResolution,
      now
    });
    throw new RuntimeSelectionFailure(
      `${reason} ${buildFallbackPolicyFailureMessage({
        policyResolution,
        originalTarget: fallback.original_target ?? 'runtime:appserver',
        fallbackTarget: fallback.fallback_target,
        blockingReason: reason
      })}`,
      fallback
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
      originalTarget: 'runtime:appserver',
      fallbackTarget: 'runtime:cli',
      policyResolution,
      expiry: APPSERVER_PREFLIGHT_RUNTIME_FALLBACK_EXPIRY,
      now
    })
  };
}
