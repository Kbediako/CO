import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { release as osRelease } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import {
  buildDevtoolsSetupPlan,
  DEVTOOLS_SKILL_NAME,
  resolveDevtoolsReadiness,
  type DevtoolsReadiness
} from './utils/devtools.js';
import {
  isManagedCodexCliEnabled,
  resolveCodexCliBin,
  resolveCodexCliReadiness,
  type CodexCliReadiness
} from './utils/codexCli.js';
import {
  codexFeatureProbeDisablesMultiAgentV2,
  codexFeatureProbeRejectsAgentMaxThreads,
  readCodexFeatureProbe,
  type CodexFeatureProbeResult
} from './utils/codexFeatures.js';
import { formatCheckoutPostureSummary, inspectCheckoutPosture, type CheckoutPostureInspection } from './utils/checkoutPosture.js';
import { resolveCodexHome } from './utils/codexPaths.js';
import {
  formatSourceRootFreshnessSummary,
  inspectSourceRootFreshness,
  type SourceRootFreshnessInspection
} from './utils/sourceRootFreshness.js';
import { resolveOptionalDependency, type OptionalResolutionSource } from './utils/optionalDeps.js';
import {
  buildCloudPreflightAuthProvenance,
  buildCloudPreflightRequest,
  runCloudPreflight,
  type CloudPreflightAuthProvenance,
  type CloudPreflightIssue
} from './utils/cloudPreflight.js';
import {
  classifyDelegationTransport,
  formatDelegateServerProcessSummary,
  inspectDelegateServerProcesses,
  inspectDelegationMcpConfig,
  probeDelegationInitialize,
  resolveDelegationServerInvocation,
  type DelegateServerProcessClassification,
  type DelegationTransportKind
} from './utils/delegationMcpHealth.js';
import { sanitizeProviderOverrideEnv } from './utils/providerOverrideEnv.js';
import {
  hasLinearApiCredentials,
  hasLinearSourceBinding,
  resolveLinearSourceSetup
} from './control/linearDispatchSource.js';
import { normalizeDispatchSourceProvider } from './control/trackerDispatchPilot.js';
import {
  BASELINE_AGENTS,
  BASELINE_MODEL,
  BASELINE_REVIEW_MODEL,
  BASELINE_REASONING_MINIMUM,
  formatModelDefaultExpectation,
  isLocalModelOptIn
} from './codexDefaultsSetup.js';
import { CommandPlanner } from './adapters/CommandPlanner.js';
import { PipelineResolver } from './services/pipelineResolver.js';
import { resolveCloudFallbackPolicy as resolveSharedCloudFallbackPolicy } from './services/orchestratorCloudRouteFallbackContract.js';
import { isRepoConfigRequired } from './config/repoConfigPolicy.js';
import type { EnvironmentPaths } from './run/environment.js';
import type { TaskContext } from '../types.js';

const require = createRequire(import.meta.url);
let tomlParser: { parse: (source: string) => unknown } | null | undefined;

const OPTIONAL_DEPENDENCIES = [
  {
    name: 'playwright',
    install: 'npm install --save-dev playwright && npx playwright install'
  },
  { name: 'pngjs', install: 'npm install --save-dev pngjs' },
  { name: 'pixelmatch', install: 'npm install --save-dev pixelmatch' },
  { name: 'cheerio', install: 'npm install --save-dev cheerio' }
];

const PROVIDER_ROOT_RELATIVE_PATH = '.codex/providers';
const CODEX_DEBUG_MODELS_JSON_ENV = 'CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON';

interface DoctorCodexModelAccess {
  status: 'ok' | 'unavailable';
  models: ReadonlySet<string>;
  detail: string;
}

export interface DoctorDependencyStatus {
  name: string;
  status: 'ok' | 'missing';
  source: OptionalResolutionSource;
  install?: string;
}

export interface DoctorDevtoolsStatus {
  status: DevtoolsReadiness['status'];
  skill: {
    name: string;
    status: 'ok' | 'missing';
    path: string;
    install?: string[];
  };
  config: {
    status: 'ok' | 'missing' | 'invalid';
    path: string;
    detail?: string;
    error?: string;
    install?: string[];
  };
  enablement: string[];
}

export interface DoctorCodexDefaultsAdvisory {
  status: 'ok' | 'advisory';
  config: {
    path: string;
    status: 'ok' | 'missing' | 'invalid';
    detail?: string;
  };
  checks: {
    model: {
      status: 'ok' | 'advisory';
      expected: string;
      actual: string | null;
    };
    review_model: {
      status: 'ok' | 'advisory';
      expected: string;
      actual: string | null;
    };
    model_reasoning_effort: {
      status: 'ok' | 'advisory';
      expected_minimum: string;
      actual: string | null;
    };
    max_threads: {
      status: 'ok' | 'advisory' | 'skipped';
      expected_minimum: number;
      actual: number | null;
      detail?: string;
    };
    max_depth: {
      status: 'ok' | 'advisory';
      expected_minimum: number;
      actual: number | null;
    };
  };
  legacy_max_spawn_depth?: {
    present: boolean;
    status: 'ok' | 'advisory';
    actual: number | null;
    detail: string;
  } | null;
  guidance: string[];
}

export interface DoctorResult {
  status: 'ok' | 'warning';
  missing: string[];
  dependencies: DoctorDependencyStatus[];
  devtools: DoctorDevtoolsStatus;
  codex_cli: {
    active: {
      command: string;
      managed_opt_in: boolean;
    };
    managed: CodexCliReadiness;
  };
  codex_defaults: DoctorCodexDefaultsAdvisory;
  checkout_posture: CheckoutPostureInspection;
  source_root_freshness: SourceRootFreshnessInspection;
  collab: {
    status: 'ok' | 'disabled' | 'unavailable';
    enabled: boolean | null;
    feature_key: 'multi_agent' | 'collab' | null;
    enablement: string[];
  };
  cloud: {
    status: 'ok' | 'not_configured' | 'unavailable' | 'invalid_policy';
    env_id_configured: boolean;
    branch: string | null;
    fallback_policy: 'auto' | 'strict' | 'invalid';
    fallback_policy_source: 'default' | 'env' | 'override' | 'invalid';
    fallback_policy_raw: string | null;
    fallback_policy_error: string | null;
    enablement: string[];
  };
  delegation: {
    status: 'ok' | 'warning' | 'missing-config' | 'unavailable';
    config: {
      status: 'ok' | 'missing';
      path: string;
      detail?: string;
      source?: 'codex-cli' | 'fallback';
      pinned_repo?: string | null;
    };
    transport: {
      status: 'safe' | 'unsafe' | 'missing';
      kind: DelegationTransportKind;
      command_line: string | null;
      detail: string;
    };
    startup: {
      status: 'ok' | 'slow' | 'failed' | 'skipped';
      latency_ms: number | null;
      threshold_ms: number;
      detail: string;
    };
    processes: {
      status: 'ok' | 'stale' | 'unavailable';
      active_count: number;
      stale_count: number;
      active_pids: number[];
      stale_pids: number[];
      stale_rss_mb: number;
      threshold_minutes: number;
      detail: string;
      details: Array<{
        pid: number;
        ppid: number;
        elapsed_seconds: number | null;
        rss_mb: number;
        cwd: string | null;
        parent_pid: number | null;
        parent_cwd: string | null;
        root_codex_parent_pid: number | null;
        root_codex_parent_cwd: string | null;
        classification: DelegateServerProcessClassification;
        classification_detail: string;
        manifest_path: string | null;
        issue_identifier: string | null;
        pipeline_id: string | null;
        task_id: string | null;
        run_id: string | null;
        status: string | null;
      }>;
    };
    enablement: string[];
  };
  providers: {
    status: 'ok' | 'advisory';
    repo_examples: {
      status: 'ok' | 'missing';
      root: string;
      paths: {
        readme: string;
        env_example: string;
        control_example: string;
      };
      missing: string[];
    };
    control_policy: {
      status: 'ok' | 'missing' | 'invalid';
      path: string;
      detail?: string;
      dispatch_pilot_enabled: boolean | null;
      dispatch_pilot_provider: string | null;
      dispatch_pilot_source_setup: {
        workspace_id: string | null;
        team_id: string | null;
        project_id: string | null;
      } | null;
      transport_mutating_enabled: boolean | null;
      telegram_transport_allowed: boolean | null;
    };
    linear: {
      status: 'ready' | 'incomplete';
      credentials_present: boolean;
      binding_present: boolean;
      webhook_secret_present: boolean;
      dispatch_pilot_enabled: boolean | null;
      dispatch_pilot_provider: string | null;
    };
    telegram: {
      status: 'ready' | 'incomplete';
      polling_enabled: boolean;
      bot_token_present: boolean;
      allowed_chat_ids: number;
      mutations_enabled: boolean;
      push_enabled: boolean;
      telegram_transport_allowed: boolean | null;
    };
    guidance: string[];
  };
}

export interface DoctorCloudPreflightResult {
  ok: boolean;
  details: {
    codex_bin: string;
    environment_id: string | null;
    branch: string | null;
    auth_provenance: {
      provider_kind: CloudPreflightAuthProvenance['providerKind'];
      active_profile_fingerprint: string | null;
      active_account_fingerprint: string | null;
      cloud_env_id: string | null;
      cloud_branch: string | null;
      credential_source: string | null;
      auth_freshness: CloudPreflightAuthProvenance['authFreshness'];
    };
  };
  issues: CloudPreflightIssue[];
  security_advisories: DoctorSandboxSecurityAdvisory[];
  guidance: string[];
}

export interface DoctorSandboxSecurityAdvisory {
  code: 'codex_config_danger_full_access' | 'wsl1_bubblewrap_unsupported';
  scope: 'local-only';
  severity: 'warning';
  message: string;
  guidance: string;
  details?: {
    path?: string;
    platform?: string;
    os_release?: string;
    sandbox_mode?: string;
  };
}

export function runDoctor(cwd: string = process.cwd()): DoctorResult {
  const dependencies: DoctorDependencyStatus[] = OPTIONAL_DEPENDENCIES.map((entry) => {
    const resolved = resolveOptionalDependency(entry.name, cwd);
    if (resolved.path) {
      return { name: entry.name, status: 'ok', source: resolved.source };
    }
    return {
      name: entry.name,
      status: 'missing',
      source: null,
      install: entry.install
    };
  });

  const readiness = resolveDevtoolsReadiness();
  const setupPlan = buildDevtoolsSetupPlan();
  const devtools: DoctorDevtoolsStatus = {
    status: readiness.status,
    skill: {
      name: DEVTOOLS_SKILL_NAME,
      status: readiness.skill.status,
      path: readiness.skill.path,
      install:
        readiness.skill.status === 'ok'
          ? undefined
          : [
              `Copy the ${DEVTOOLS_SKILL_NAME} skill into ${setupPlan.codexHome}/skills/${DEVTOOLS_SKILL_NAME}`,
              `Expected file: ${readiness.skill.path}`
            ]
    },
    config: {
      status: readiness.config.status,
      path: readiness.config.path,
      detail: readiness.config.detail,
      error: readiness.config.error,
      install:
        readiness.config.status === 'ok'
          ? undefined
          : [
              'Quick fix: codex-orchestrator doctor --apply --yes',
              'Run: codex-orchestrator devtools setup',
              `Run: ${setupPlan.commandLine}`,
              `Config path: ${setupPlan.configPath}`,
              'Config snippet:',
              ...setupPlan.configSnippet.split('\n')
            ]
    },
    enablement: [
      'Enable DevTools for a run with CODEX_REVIEW_DEVTOOLS=1',
      "Or run Codex with: codex -c 'mcp_servers.chrome-devtools.enabled=true' ..."
    ]
  };

  const missing = dependencies.filter((dep) => dep.status === 'missing').map((dep) => dep.name);
  if (readiness.skill.status === 'missing') {
    missing.push(DEVTOOLS_SKILL_NAME);
  }
  if (readiness.config.status !== 'ok') {
    missing.push(`${DEVTOOLS_SKILL_NAME}-config`);
  }
  const codexBin = resolveCodexCliBin(process.env);
  const managedOptIn = isManagedCodexCliEnabled(process.env);
  const managedCodex = resolveCodexCliReadiness(process.env);
  const featureProbe = readCodexFeatureProbe(codexBin, process.env);
  const features = featureProbe.flags;
  const codexDefaults = inspectCodexDefaultsAdvisory(process.env, codexBin, featureProbe);
  const collabFeatureKey: DoctorResult['collab']['feature_key'] =
    features === null
      ? null
      : Object.prototype.hasOwnProperty.call(features, 'multi_agent')
        ? 'multi_agent'
        : Object.prototype.hasOwnProperty.call(features, 'collab')
          ? 'collab'
          : null;
  const collabEnabled =
    collabFeatureKey === 'multi_agent'
      ? features?.multi_agent ?? null
      : collabFeatureKey === 'collab'
        ? features?.collab ?? null
        : null;
  const collabStatus: DoctorResult['collab']['status'] =
    features === null ? 'unavailable' : collabEnabled ? 'ok' : 'disabled';

  const cloudCmdAvailable = canRunCommand(codexBin, ['cloud', '--help']);
  const cloudEnvIdConfigured =
    typeof process.env.CODEX_CLOUD_ENV_ID === 'string' && process.env.CODEX_CLOUD_ENV_ID.trim().length > 0;
  const cloudBranch =
    typeof process.env.CODEX_CLOUD_BRANCH === 'string' && process.env.CODEX_CLOUD_BRANCH.trim().length > 0
      ? process.env.CODEX_CLOUD_BRANCH.trim().replace(/^refs\/heads\//u, '')
      : null;
  const cloudFallbackPolicy = resolveCloudFallbackPolicyDiagnostic(process.env);
  const cloudStatus: DoctorResult['cloud']['status'] =
    cloudFallbackPolicy.policy === 'invalid'
      ? 'invalid_policy'
      : !cloudCmdAvailable
        ? 'unavailable'
        : cloudEnvIdConfigured
          ? 'ok'
          : 'not_configured';
  const repoRoot = resolveDoctorRepoRoot(cwd);
  const checkoutPosture = inspectCheckoutPosture(repoRoot);
  const sourceRootFreshness = inspectSourceRootFreshness({
    intendedRepoRoot: repoRoot,
    argv: process.argv.slice(),
    cwd,
    packageRoot:
      normalizeOptionalString(process.env.CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT)
      ?? normalizeOptionalString(process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT)
  });

  const delegationSnapshot = inspectDelegationMcpConfig(process.env);
  const delegationTransport = classifyDelegationTransport(delegationSnapshot.entry);
  const delegationStartup = probeDelegationInitialize(delegationSnapshot.entry, { env: process.env });
  const delegationProcesses = inspectDelegateServerProcesses({ repoRoot });
  const delegationStatus: DoctorResult['delegation']['status'] =
    delegationSnapshot.status !== 'ok'
      ? 'missing-config'
      : delegationTransport.status !== 'safe'
        || delegationStartup.status === 'slow'
        || delegationStartup.status === 'failed'
        || delegationProcesses.status === 'stale'
        ? 'warning'
        : delegationProcesses.status === 'unavailable'
          ? 'unavailable'
          : 'ok';
  const delegationBlocksOverallStatus = delegationStatus === 'missing-config';
  const providers = inspectProviderReadiness(repoRoot, process.env);
  const checkoutPostureBlocksOverallStatus = checkoutPostureBlocksDoctorStatus(checkoutPosture);

  return {
    status:
      missing.length === 0 &&
      codexDefaults.status === 'ok' &&
      providers.status === 'ok' &&
      !checkoutPostureBlocksOverallStatus &&
      cloudStatus !== 'invalid_policy' &&
      !delegationBlocksOverallStatus
        ? 'ok'
        : 'warning',
    missing,
    dependencies,
    devtools,
    codex_cli: {
      active: { command: codexBin, managed_opt_in: managedOptIn },
      managed: managedCodex
    },
    codex_defaults: codexDefaults,
    checkout_posture: checkoutPosture,
    source_root_freshness: sourceRootFreshness,
    collab: {
      status: collabStatus,
      enabled: collabEnabled,
      feature_key: collabFeatureKey,
      enablement: [
        'Enable collab for symbolic RLM runs with: codex-orchestrator rlm --multi-agent auto "<goal>" (legacy: --collab auto).',
        'Or set: RLM_SYMBOLIC_MULTI_AGENT=1 (legacy alias: RLM_SYMBOLIC_COLLAB=1).',
        'If multi-agent is disabled in codex features: codex features enable multi_agent (legacy alias: collab)'
      ]
    },
    cloud: {
      status: cloudStatus,
      env_id_configured: cloudEnvIdConfigured,
      branch: cloudBranch,
      fallback_policy: cloudFallbackPolicy.policy,
      fallback_policy_source: cloudFallbackPolicy.source,
      fallback_policy_raw: cloudFallbackPolicy.raw_value,
      fallback_policy_error: cloudFallbackPolicy.error,
      enablement: [
        ...(cloudFallbackPolicy.error
          ? [`Invalid CODEX_ORCHESTRATOR_CLOUD_FALLBACK value: ${cloudFallbackPolicy.error}`]
          : []),
        'Set CODEX_CLOUD_ENV_ID to a valid Codex Cloud environment id.',
        'Optional: set CODEX_CLOUD_BRANCH (must exist on origin).',
        'Then run a pipeline stage in cloud mode with: codex-orchestrator start <pipeline> --cloud --target <stage-id>',
        'Set CODEX_ORCHESTRATOR_CLOUD_FALLBACK=auto for governed cloud-to-mcp reroute evidence, or strict to fail closed.',
        'When auto reroutes after cloud preflight failure, CO records policy, original target, fallback target, and blocking reason in manifest.cloud_fallback and start output.'
      ]
    },
    delegation: {
      status: delegationStatus,
      config: {
        status: delegationSnapshot.status,
        path: delegationSnapshot.path,
        detail: delegationSnapshot.detail,
        source: delegationSnapshot.entry?.source,
        pinned_repo: delegationSnapshot.entry?.pinnedRepo ?? null
      },
      transport: {
        status: delegationTransport.status,
        kind: delegationTransport.kind,
        command_line: delegationTransport.commandLine,
        detail: delegationTransport.detail
      },
      startup: {
        status: delegationStartup.status,
        latency_ms: delegationStartup.latencyMs,
        threshold_ms: delegationStartup.thresholdMs,
        detail: delegationStartup.detail
      },
      processes: {
        status: delegationProcesses.status,
        active_count: delegationProcesses.activeCount,
        active_pids: delegationProcesses.activePids,
        stale_count: delegationProcesses.staleCount,
        stale_pids: delegationProcesses.stalePids,
        stale_rss_mb: Number((delegationProcesses.staleRssKb / 1024).toFixed(1)),
        threshold_minutes: delegationProcesses.thresholdSeconds / 60,
        detail: delegationProcesses.detail,
        details: delegationProcesses.details.map((detail) => ({
          pid: detail.pid,
          ppid: detail.ppid,
          elapsed_seconds: detail.elapsedSeconds,
          rss_mb: Number((detail.rssKb / 1024).toFixed(1)),
          cwd: detail.cwd,
          parent_pid: detail.parentPid,
          parent_cwd: detail.parentCwd,
          root_codex_parent_pid: detail.rootCodexParentPid,
          root_codex_parent_cwd: detail.rootCodexParentCwd,
          classification: detail.classification,
          classification_detail: detail.classificationDetail,
          manifest_path: detail.manifestAssociation?.manifestPath ?? null,
          issue_identifier: detail.manifestAssociation?.issueIdentifier ?? null,
          pipeline_id: detail.manifestAssociation?.pipelineId ?? null,
          task_id: detail.manifestAssociation?.taskId ?? null,
          run_id: detail.manifestAssociation?.runId ?? null,
          status: detail.manifestAssociation?.status ?? null
        }))
      },
      enablement: buildDelegationEnablementGuidance({
        configStatus: delegationSnapshot.status,
        transportStatus: delegationTransport.status,
        directTransportGuidance: buildDelegationDirectTransportGuidance()
      })
    },
    providers
  };
}

export function checkoutPostureBlocksDoctorStatus(
  checkoutPosture: Pick<CheckoutPostureInspection, 'inside_git_worktree' | 'stale_docs_may_be' | 'status'>
): boolean {
  return checkoutPosture.stale_docs_may_be
    || (checkoutPosture.status === 'unavailable' && checkoutPosture.inside_git_worktree);
}

export async function runDoctorCloudPreflight(options: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  environmentId?: string | null;
  branch?: string | null;
  taskId?: string | null;
} = {}): Promise<DoctorCloudPreflightResult> {
  const env = sanitizeProviderOverrideEnv(options.env ?? process.env);
  const explicitCwd = normalizeOptionalString(options.cwd);
  const cwd = explicitCwd ? resolve(explicitCwd) : process.cwd();
  // An explicit cwd is the caller's repo hint; only fall back to the ambient root override when cwd is implicit.
  const configuredRoot = explicitCwd ? null : normalizeOptionalString(env.CODEX_ORCHESTRATOR_ROOT);
  const rootHint = configuredRoot ? resolve(cwd, configuredRoot) : cwd;
  const repoRoot = resolveDoctorRepoRoot(rootHint);
  const taskId =
    normalizeOptionalString(options.taskId)
    ?? normalizeOptionalString(env.MCP_RUNNER_TASK_ID)
    ?? normalizeOptionalString(env.TASK)
    ?? normalizeOptionalString(env.CODEX_ORCHESTRATOR_TASK_ID);
  const explicitEnvironmentId = normalizeOptionalString(options.environmentId);
  const strictRepoConfigRequired = isRepoConfigRequired(env);
  let planMetadataEnvironmentId: string | null = null;
  let planMetadataIssue: CloudPreflightIssue | null = null;
  if (!explicitEnvironmentId || strictRepoConfigRequired) {
    try {
      planMetadataEnvironmentId = await resolvePlanMetadataCloudEnvironmentId(repoRoot, taskId, env);
    } catch (error) {
      if (strictRepoConfigRequired) {
        const detail = error instanceof Error ? error.message : String(error);
        planMetadataIssue = {
          code: 'pipeline_resolution_failed',
          message: `Pipeline resolution failed during doctor cloud preflight: ${detail}`
        };
      }
    }
  }
  const environmentId =
    explicitEnvironmentId
    ?? planMetadataEnvironmentId
    ?? normalizeOptionalString(env.CODEX_CLOUD_ENV_ID)
    ?? resolveTaskMetadataCloudEnvironmentId(repoRoot, taskId);

  const preflight = await runCloudPreflight(buildCloudPreflightRequest({
    repoRoot,
    environmentId,
    branch: options.branch,
    env
  }));
  const authProvenance =
    preflight.details.authProvenance ??
    buildCloudPreflightAuthProvenance({
      env,
      environmentId: preflight.details.environmentId,
      branch: preflight.details.branch
    });
  const issues = planMetadataIssue ? [planMetadataIssue, ...preflight.issues] : preflight.issues;
  const securityAdvisories = inspectCodexSandboxSecurityAdvisories({ env });
  const guidance = buildCloudPreflightGuidance(issues);

  return {
    ok: preflight.ok && planMetadataIssue === null,
    details: {
      codex_bin: preflight.details.codexBin,
      environment_id: preflight.details.environmentId,
      branch: preflight.details.branch,
      auth_provenance: {
        provider_kind: authProvenance.providerKind,
        active_profile_fingerprint: authProvenance.activeProfileFingerprint,
        active_account_fingerprint: authProvenance.activeAccountFingerprint,
        cloud_env_id: authProvenance.cloudEnvId,
        cloud_branch: authProvenance.cloudBranch,
        credential_source: authProvenance.credentialSource,
        auth_freshness: authProvenance.authFreshness
      }
    },
    issues,
    security_advisories: securityAdvisories,
    guidance
  };
}

export function inspectCodexSandboxSecurityAdvisories(options: {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  osRelease?: string | null;
} = {}): DoctorSandboxSecurityAdvisory[] {
  const env = options.env ?? process.env;
  const advisories: DoctorSandboxSecurityAdvisory[] = [];
  const configPath = join(resolveCodexHome(env), 'config.toml');

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf8');
      const parsed = getTomlParser().parse(raw);
      if (isRecord(parsed)) {
        const sandboxMode = normalizeOptionalString(readStringValue(parsed.sandbox_mode));
        if (sandboxMode === 'danger-full-access') {
          advisories.push({
            code: 'codex_config_danger_full_access',
            scope: 'local-only',
            severity: 'warning',
            message: 'Codex config sets top-level sandbox_mode to danger-full-access.',
            guidance:
              'Treat this as a local-only advisory; do not use it to satisfy cloud readiness or weaken CO sandbox defaults.',
            details: {
              path: configPath,
              sandbox_mode: sandboxMode
            }
          });
        }
      }
    } catch {
      // Existing Codex defaults checks already report invalid TOML; keep this advisory focused on security posture.
    }
  }

  const platform = options.platform ?? process.platform;
  const releaseText = normalizeOptionalString(options.osRelease ?? osRelease());
  if (isWsl1Release(platform, releaseText)) {
    advisories.push({
      code: 'wsl1_bubblewrap_unsupported',
      scope: 'local-only',
      severity: 'warning',
      message: 'WSL1 detected; Codex bubblewrap sandbox behavior is unsupported for this local platform.',
      guidance:
        'Run local Codex sandbox checks on WSL2/Linux/macOS, or keep this as a local-only limitation; it is not cloud canary evidence.',
      details: {
        platform,
        os_release: releaseText ?? undefined
      }
    });
  }

  return advisories;
}

function isWsl1Release(platform: NodeJS.Platform, releaseText: string | null): boolean {
  if (platform !== 'linux' || !releaseText) {
    return false;
  }
  const normalized = releaseText.toLowerCase();
  return normalized.includes('microsoft') && !normalized.includes('microsoft-standard') && !normalized.includes('wsl2');
}

function resolveDoctorRepoRoot(cwd: string): string {
  const fallback = resolve(cwd);
  let current: string | null = fallback;
  let providerRootCandidate: string | null = null;
  while (current) {
    if (existsSync(join(current, 'tasks', 'index.json'))) {
      return current;
    }
    if (!providerRootCandidate && existsSync(join(current, PROVIDER_ROOT_RELATIVE_PATH))) {
      providerRootCandidate = current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return providerRootCandidate ?? fallback;
}

export function formatDoctorCloudPreflightSummary(result: DoctorCloudPreflightResult): string[] {
  const lines: string[] = [];
  lines.push(`Cloud preflight: ${result.ok ? 'ok' : 'failed'}`);
  lines.push(`  - codex bin: ${result.details.codex_bin}`);
  lines.push(`  - environment id: ${result.details.environment_id ?? '<unset>'}`);
  lines.push(`  - branch: ${result.details.branch ?? '<unset>'}`);
  lines.push(`  - auth provider: ${result.details.auth_provenance.provider_kind}`);
  lines.push(
    `  - credential source: ${result.details.auth_provenance.credential_source ?? '<none detected>'}`
  );
  lines.push(
    `  - profile fingerprint: ${
      result.details.auth_provenance.active_profile_fingerprint ?? '<unset>'
    }`
  );
  lines.push(
    `  - account fingerprint: ${
      result.details.auth_provenance.active_account_fingerprint ?? '<unset>'
    }`
  );
  lines.push(`  - auth freshness: ${result.details.auth_provenance.auth_freshness}`);

  if (result.issues.length > 0) {
    lines.push('  - issues:');
    for (const issue of result.issues) {
      lines.push(`    - [${issue.code}] ${issue.message}`);
    }
  }

  if (result.guidance.length > 0) {
    lines.push('  - guidance:');
    for (const item of result.guidance) {
      lines.push(`    - ${item}`);
    }
  }

  if (result.security_advisories.length > 0) {
    lines.push('  - sandbox/security advisories:');
    for (const advisory of result.security_advisories) {
      lines.push(`    - [${advisory.code}/${advisory.scope}] ${advisory.message}`);
      lines.push(`      guidance: ${advisory.guidance}`);
      if (advisory.details?.path) {
        lines.push(`      path: ${advisory.details.path}`);
      }
      if (advisory.details?.platform || advisory.details?.os_release) {
        lines.push(
          `      platform: ${advisory.details.platform ?? '<unknown>'}, os_release: ${advisory.details.os_release ?? '<unknown>'}`
        );
      }
    }
  }

  return lines;
}

export function formatDoctorSummary(result: DoctorResult): string[] {
  const lines: string[] = [];
  lines.push(`Status: ${result.status}`);

  for (const dep of result.dependencies) {
    if (dep.status === 'ok') {
      const source = dep.source ? ` (${dep.source})` : '';
      lines.push(`  - ${dep.name}: ok${source}`);
    } else {
      lines.push(`  - ${dep.name}: missing`);
      if (dep.install) {
        lines.push(`    install: ${dep.install}`);
      }
    }
  }

  lines.push(`DevTools: ${result.devtools.status}`);
  if (result.devtools.skill.status === 'ok') {
    lines.push(`  - ${result.devtools.skill.name}: ok (${result.devtools.skill.path})`);
  } else {
    lines.push(`  - ${result.devtools.skill.name}: missing`);
    for (const instruction of result.devtools.skill.install ?? []) {
      lines.push(`    install: ${instruction}`);
    }
  }
  if (result.devtools.config.status === 'ok') {
    lines.push(`  - config.toml: ok (${result.devtools.config.path})`);
  } else {
    const label =
      result.devtools.config.status === 'invalid'
        ? `invalid (${result.devtools.config.path})`
        : `missing (${result.devtools.config.path})`;
    lines.push(`  - config.toml: ${label}`);
    if (result.devtools.config.detail) {
      lines.push(`    detail: ${result.devtools.config.detail}`);
    }
    if (result.devtools.config.error) {
      lines.push(`    error: ${result.devtools.config.error}`);
    }
    for (const instruction of result.devtools.config.install ?? []) {
      lines.push(`    install: ${instruction}`);
    }
  }
  for (const line of result.devtools.enablement) {
    lines.push(`  - ${line}`);
  }

  lines.push(`Codex CLI: ${result.codex_cli.active.command}`);
  lines.push(
    `  - managed opt-in: ${result.codex_cli.active.managed_opt_in ? 'enabled' : 'disabled'} (set CODEX_CLI_USE_MANAGED=1)`
  );
  lines.push(`  - managed: ${result.codex_cli.managed.status} (${result.codex_cli.managed.config.path})`);
  if (result.codex_cli.managed.status === 'invalid' && result.codex_cli.managed.config.error) {
    lines.push(`    error: ${result.codex_cli.managed.config.error}`);
  }
  if (result.codex_cli.managed.status === 'ok') {
    lines.push(`  - binary: ${result.codex_cli.managed.binary.status} (${result.codex_cli.managed.binary.path})`);
    if (!result.codex_cli.active.managed_opt_in) {
      lines.push('  - note: managed binary is installed but inactive; stock codex is currently selected.');
    }
    if (result.codex_cli.managed.install?.version) {
      lines.push(`  - version: ${result.codex_cli.managed.install.version}`);
    }
  }

  lines.push(`Codex defaults advisory: ${result.codex_defaults.status}`);
  lines.push(`  - config.toml: ${result.codex_defaults.config.status} (${result.codex_defaults.config.path})`);
  if (result.codex_defaults.config.detail) {
    lines.push(`    detail: ${result.codex_defaults.config.detail}`);
  }
  lines.push(
    `  - model: ${result.codex_defaults.checks.model.status} (actual: ${result.codex_defaults.checks.model.actual ?? '<unset>'}, expected: ${result.codex_defaults.checks.model.expected})`
  );
  lines.push(
    `  - review_model: ${result.codex_defaults.checks.review_model.status} (actual: ${result.codex_defaults.checks.review_model.actual ?? '<unset>'}, expected: ${result.codex_defaults.checks.review_model.expected})`
  );
  lines.push(
    `  - model_reasoning_effort: ${result.codex_defaults.checks.model_reasoning_effort.status} (actual: ${result.codex_defaults.checks.model_reasoning_effort.actual ?? '<unset>'}, expected >= ${result.codex_defaults.checks.model_reasoning_effort.expected_minimum})`
  );
  if (result.codex_defaults.checks.max_threads.status === 'skipped') {
    lines.push(
      `  - agents.max_threads: skipped (actual: ${result.codex_defaults.checks.max_threads.actual ?? '<unset>'}; ${result.codex_defaults.checks.max_threads.detail ?? 'omitted by policy'})`
    );
  } else if (result.codex_defaults.checks.max_threads.detail) {
    lines.push(
      `  - agents.max_threads: ${result.codex_defaults.checks.max_threads.status} (actual: ${result.codex_defaults.checks.max_threads.actual ?? '<unset>'}; ${result.codex_defaults.checks.max_threads.detail})`
    );
  } else {
    lines.push(
      `  - agents.max_threads: ${result.codex_defaults.checks.max_threads.status} (actual: ${result.codex_defaults.checks.max_threads.actual ?? '<unset>'}, expected >= ${result.codex_defaults.checks.max_threads.expected_minimum})`
    );
  }
  lines.push(
    `  - agents.max_depth: ${result.codex_defaults.checks.max_depth.status} (actual: ${result.codex_defaults.checks.max_depth.actual ?? '<unset>'}, expected >= ${result.codex_defaults.checks.max_depth.expected_minimum} when set; <unset> accepted)`
  );
  if (result.codex_defaults.legacy_max_spawn_depth?.present) {
    lines.push(
      `  - legacy agents.max_spawn_depth: ${result.codex_defaults.legacy_max_spawn_depth.status} (actual: ${result.codex_defaults.legacy_max_spawn_depth.actual ?? '<unset>'}; ${result.codex_defaults.legacy_max_spawn_depth.detail})`
    );
  }
  for (const line of result.codex_defaults.guidance) {
    lines.push(`  - ${line}`);
  }

  lines.push(...formatCheckoutPostureSummary(result.checkout_posture));
  lines.push(...formatSourceRootFreshnessSummary(result.source_root_freshness));

  lines.push(`Collab: ${result.collab.status}`);
  if (result.collab.enabled !== null) {
    lines.push(`  - enabled: ${result.collab.enabled}`);
  }
  if (result.collab.feature_key) {
    lines.push(`  - feature key: ${result.collab.feature_key}`);
  }
  for (const line of result.collab.enablement) {
    lines.push(`  - ${line}`);
  }

  lines.push(`Cloud: ${result.cloud.status}`);
  lines.push(`  - CODEX_CLOUD_ENV_ID: ${result.cloud.env_id_configured ? 'set' : 'missing'}`);
  lines.push(`  - CODEX_CLOUD_BRANCH: ${result.cloud.branch ?? '<unset>'}`);
  lines.push(`  - fallback policy: ${result.cloud.fallback_policy}`);
  lines.push(`  - fallback policy source: ${result.cloud.fallback_policy_source}`);
  if (result.cloud.fallback_policy_error) {
    lines.push(`    error: ${result.cloud.fallback_policy_error}`);
  }
  for (const line of result.cloud.enablement) {
    lines.push(`  - ${line}`);
  }

  lines.push(`Delegation: ${result.delegation.status}`);
  const delegationConfigLabel =
    result.delegation.config.status === 'ok'
      ? `ok (${result.delegation.config.path})`
      : `missing (${result.delegation.config.path})`;
  lines.push(`  - config.toml: ${delegationConfigLabel}`);
  if (result.delegation.config.detail) {
    lines.push(`    detail: ${result.delegation.config.detail}`);
  }
  if (result.delegation.config.source) {
    lines.push(`  - source: ${result.delegation.config.source}`);
  }
  lines.push(`  - transport: ${result.delegation.transport.status} (${result.delegation.transport.kind})`);
  if (result.delegation.transport.command_line) {
    lines.push(`    command: ${result.delegation.transport.command_line}`);
  }
  lines.push(`    detail: ${result.delegation.transport.detail}`);
  lines.push(
    `  - initialize: ${result.delegation.startup.status} (latency: ${result.delegation.startup.latency_ms ?? '<skipped>'} ms, threshold: ${result.delegation.startup.threshold_ms} ms)`
  );
  lines.push(`    detail: ${result.delegation.startup.detail}`);
  lines.push(
    `  - processes: ${result.delegation.processes.status} (active: ${result.delegation.processes.active_count}, stale: ${result.delegation.processes.stale_count}, stale rss: ${result.delegation.processes.stale_rss_mb.toFixed(1)} MB)`
  );
  lines.push(`    detail: ${result.delegation.processes.detail}`);
  if (result.delegation.processes.stale_pids.length > 0) {
    lines.push(`    stale pids: ${result.delegation.processes.stale_pids.join(', ')}`);
    for (const detail of result.delegation.processes.details
      .filter((entry) => entry.classification === 'stale-parent-session' || entry.classification === 'stale-orphan')
      .slice(0, 3)) {
      lines.push(`    stale detail: ${formatDelegateServerProcessSummary({
        pid: detail.pid,
        classification: detail.classification,
        cwd: detail.cwd,
        parentPid: detail.parent_pid,
        parentCwd: detail.parent_cwd,
        rootCodexParentPid: detail.root_codex_parent_pid,
        rootCodexParentCwd: detail.root_codex_parent_cwd,
        manifestPath: detail.manifest_path
      })}`);
    }
  }
  for (const line of result.delegation.enablement) {
    lines.push(`  - ${line}`);
  }

  lines.push(`Providers: ${result.providers.status}`);
  lines.push(`  - repo examples: ${result.providers.repo_examples.status} (${result.providers.repo_examples.root})`);
  if (result.providers.repo_examples.missing.length > 0) {
    lines.push(`    missing: ${result.providers.repo_examples.missing.join(', ')}`);
  }
  lines.push(
    `  - control policy: ${result.providers.control_policy.status} (${result.providers.control_policy.path})`
  );
  if (result.providers.control_policy.detail) {
    lines.push(`    detail: ${result.providers.control_policy.detail}`);
  }
  lines.push(`  - Linear: ${result.providers.linear.status}`);
  lines.push(`    credentials: ${result.providers.linear.credentials_present ? 'present' : 'missing'}`);
  lines.push(`    binding: ${result.providers.linear.binding_present ? 'present' : 'missing'}`);
  lines.push(`    webhook secret: ${result.providers.linear.webhook_secret_present ? 'present' : 'missing'}`);
  lines.push(
    `    dispatch_pilot: ${renderProviderToggleSummary(
      result.providers.linear.dispatch_pilot_enabled,
      result.providers.linear.dispatch_pilot_provider
    )}`
  );
  lines.push(`  - Telegram: ${result.providers.telegram.status}`);
  lines.push(`    polling: ${result.providers.telegram.polling_enabled ? 'enabled' : 'disabled'}`);
  lines.push(`    bot token: ${result.providers.telegram.bot_token_present ? 'present' : 'missing'}`);
  lines.push(`    allowlisted chats: ${result.providers.telegram.allowed_chat_ids}`);
  lines.push(`    mutations: ${result.providers.telegram.mutations_enabled ? 'enabled' : 'disabled'}`);
  lines.push(`    push: ${result.providers.telegram.push_enabled ? 'enabled' : 'disabled'}`);
  lines.push(
    `    transport policy: ${renderTransportPolicySummary(result.providers.telegram.telegram_transport_allowed)}`
  );
  for (const line of result.providers.guidance) {
    lines.push(`  - ${line}`);
  }

  return lines;
}

export function buildDelegationDirectTransportGuidance(
  resolver: () => { commandLine: string } = () =>
    resolveDelegationServerInvocation({ env: process.env, execPath: process.execPath })
): string {
  try {
    return `Direct dist transport: ${resolver().commandLine} --repo <path>`;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return `Direct dist transport unavailable until dist is built: ${detail}`;
  }
}

export function buildDelegationEnablementGuidance(options: {
  configStatus: 'ok' | 'missing';
  transportStatus: 'safe' | 'unsafe' | 'missing';
  directTransportGuidance?: string;
}): string[] {
  const lines: string[] = [];
  const setupApplyWouldHelp = options.configStatus !== 'ok' || options.transportStatus !== 'safe';

  if (setupApplyWouldHelp) {
    lines.push('Quick fix: codex-orchestrator doctor --apply --yes');
  }

  lines.push('Run: codex-orchestrator delegation setup --yes');
  lines.push('Run: codex-orchestrator delegation cleanup-stale --yes');
  lines.push(options.directTransportGuidance ?? buildDelegationDirectTransportGuidance());
  lines.push("Enable for a run with: codex -c 'mcp_servers.delegation.enabled=true' ...");
  lines.push('See: codex-orchestrator init codex');
  return lines;
}

function inspectProviderReadiness(
  repoRoot: string,
  env: NodeJS.ProcessEnv = process.env
): DoctorResult['providers'] {
  const providerRoot = join(repoRoot, PROVIDER_ROOT_RELATIVE_PATH);
  const repoExamples = {
    readme: join(providerRoot, 'README.md'),
    env_example: join(providerRoot, 'provider.env.example'),
    control_example: join(providerRoot, 'control.example.json')
  };
  const missingRepoExamples = Object.entries(repoExamples)
    .filter(([, filePath]) => !existsSync(filePath))
    .map(([key]) => key);

  const controlPolicy = readProviderControlPolicy(providerRoot);
  const linearSourceSetup = resolveLinearSourceSetup(
    {
      provider: 'linear',
      workspace_id: controlPolicy.dispatch_pilot_source_setup?.workspace_id ?? null,
      team_id: controlPolicy.dispatch_pilot_source_setup?.team_id ?? null,
      project_id: controlPolicy.dispatch_pilot_source_setup?.project_id ?? null
    },
    env
  );
  const linearCredentialsPresent = hasLinearApiCredentials(env);
  const linearBindingPresent = hasLinearSourceBinding(linearSourceSetup);
  const linearWebhookSecretPresent = Boolean(normalizeOptionalString(env.CO_LINEAR_WEBHOOK_SECRET));
  const linearRequired =
    controlPolicy.dispatch_pilot_enabled === true && controlPolicy.dispatch_pilot_provider === 'linear';
  const linearReady =
    linearCredentialsPresent &&
    linearBindingPresent &&
    linearWebhookSecretPresent &&
    linearRequired;

  const telegramPollingEnabled = parseEnvBoolean(env.CO_TELEGRAM_POLLING_ENABLED);
  const telegramBotTokenPresent = Boolean(normalizeOptionalString(env.CO_TELEGRAM_BOT_TOKEN));
  const telegramAllowedChatIds = parseCsvList(env.CO_TELEGRAM_ALLOWED_CHAT_IDS).length;
  const telegramMutationsEnabled = parseEnvBoolean(env.CO_TELEGRAM_ENABLE_MUTATIONS);
  const telegramPushEnabled = parseEnvBoolean(env.CO_TELEGRAM_PUSH_ENABLED);
  const telegramRequired = controlPolicy.telegram_transport_allowed === true;
  const telegramReady =
    telegramPollingEnabled &&
    telegramBotTokenPresent &&
    telegramAllowedChatIds > 0 &&
    telegramMutationsEnabled &&
    telegramRequired;

  const repoExamplesStatus: DoctorResult['providers']['repo_examples']['status'] =
    missingRepoExamples.length === 0 ? 'ok' : 'missing';

  return {
    status:
      repoExamplesStatus === 'ok' &&
      controlPolicy.status === 'ok' &&
      (!linearRequired || linearReady) &&
      (!telegramRequired || telegramReady)
        ? 'ok'
        : 'advisory',
    repo_examples: {
      status: repoExamplesStatus,
      root: providerRoot,
      paths: repoExamples,
      missing: missingRepoExamples
    },
    control_policy: controlPolicy,
    linear: {
      status: linearReady ? 'ready' : 'incomplete',
      credentials_present: linearCredentialsPresent,
      binding_present: linearBindingPresent,
      webhook_secret_present: linearWebhookSecretPresent,
      dispatch_pilot_enabled: controlPolicy.dispatch_pilot_enabled,
      dispatch_pilot_provider: controlPolicy.dispatch_pilot_provider
    },
    telegram: {
      status: telegramReady ? 'ready' : 'incomplete',
      polling_enabled: telegramPollingEnabled,
      bot_token_present: telegramBotTokenPresent,
      allowed_chat_ids: telegramAllowedChatIds,
      mutations_enabled: telegramMutationsEnabled,
      push_enabled: telegramPushEnabled,
      telegram_transport_allowed: controlPolicy.telegram_transport_allowed
    },
    guidance: [
      'Seed the current repo with: codex-orchestrator init codex --cwd <repo>',
      'Review .codex/providers/provider.env.example and .codex/providers/control.example.json before enabling providers.',
      'Re-run codex-orchestrator doctor --format json after exporting provider env vars to confirm readiness.'
    ]
  };
}

function inspectCodexDefaultsAdvisory(
  env: NodeJS.ProcessEnv = process.env,
  codexBin: string = resolveCodexCliBin(env),
  featureProbe: CodexFeatureProbeResult | null = readCodexFeatureProbe(codexBin, env)
): DoctorCodexDefaultsAdvisory {
  const configPath = join(resolveCodexHome(env), 'config.toml');
  const checks: DoctorCodexDefaultsAdvisory['checks'] = {
    model: { status: 'advisory', expected: formatModelDefaultExpectation(BASELINE_MODEL), actual: null },
    review_model: {
      status: 'advisory',
      expected: formatModelDefaultExpectation(BASELINE_REVIEW_MODEL),
      actual: null
    },
    model_reasoning_effort: { status: 'advisory', expected_minimum: BASELINE_REASONING_MINIMUM, actual: null },
    max_threads: { status: 'advisory', expected_minimum: BASELINE_AGENTS.max_threads, actual: null },
    max_depth: { status: 'advisory', expected_minimum: BASELINE_AGENTS.max_depth, actual: null }
  };
  let legacyMaxSpawnDepth: DoctorCodexDefaultsAdvisory['legacy_max_spawn_depth'] = null;
  const guidance: string[] = [
    'Run `codex-orchestrator codex defaults --yes` to apply additive baseline defaults.',
    'Additive policy: unrelated config keys are preserved; existing role files stay untouched unless `--force` is set or they exactly match a prior CO-managed model baseline.',
    'When `features.multi_agent_v2=true`, omit `agents.max_threads`; Codex CLI 0.125+ rejects that key.',
    'Current CO baseline no longer seeds or expects `agents.max_spawn_depth`; keep it only as a legacy local override when an older parser/runtime still honors it.',
    'Leaving `agents.max_depth` unset remains accepted when local parser/runtime constraints require it.'
  ];
  const featureProbeDisablesMultiAgentV2 =
    featureProbe ? codexFeatureProbeDisablesMultiAgentV2(featureProbe) : false;
  const featureProbeIndicatesMultiAgentV2 =
    !featureProbeDisablesMultiAgentV2
    && (featureProbe?.flags?.multi_agent_v2 === true
      || (featureProbe ? codexFeatureProbeRejectsAgentMaxThreads(featureProbe) : false));
  if (featureProbeIndicatesMultiAgentV2) {
    checks.max_threads.status = 'skipped';
    checks.max_threads.actual = null;
    checks.max_threads.detail =
      'features.multi_agent_v2=true; omit agents.max_threads because Codex CLI 0.125+ rejects it';
  }

  if (!existsSync(configPath)) {
    return {
      status: 'advisory',
      config: { path: configPath, status: 'missing', detail: 'config.toml not found' },
      checks,
      guidance
    };
  }

  let parsed: Record<string, unknown>;
  try {
    const raw = readFileSync(configPath, 'utf8');
    const value = getTomlParser().parse(raw);
    if (!isRecord(value)) {
      throw new Error('top-level TOML document must be a table.');
    }
    parsed = value;
  } catch (error) {
    return {
      status: 'advisory',
      config: {
        path: configPath,
        status: 'invalid',
        detail: error instanceof Error ? error.message : String(error)
      },
      checks,
      guidance: [
        `Fix TOML syntax in ${configPath} first, then rerun \`codex-orchestrator codex defaults --yes\`.`,
        ...guidance
      ]
    };
  }

  const model = normalizeOptionalString(readStringValue(parsed.model));
  const reviewModel = normalizeOptionalString(readStringValue(parsed.review_model));
  const localModelCandidates = new Set(
    [model, reviewModel].filter(isLocalModelOptIn)
  );
  const modelAccess =
    localModelCandidates.size === 0
      ? {
          status: 'unavailable',
          models: new Set<string>(),
          detail: 'model access was not checked because no local ChatGPT-auth model is configured'
        } satisfies DoctorCodexModelAccess
      : inspectCodexModelAccess(codexBin, env);
  const verifiedLocalModels = new Set(
    [...localModelCandidates].filter(
      (candidate) => modelAccess.status === 'ok' && modelAccess.models.has(candidate)
    )
  );
  const unverifiedLocalModels = [...localModelCandidates].filter(
    (candidate) => !verifiedLocalModels.has(candidate)
  );
  for (const candidate of unverifiedLocalModels) {
    guidance.push(
      `Configured local ChatGPT-auth model ${candidate} is not verified by \`codex debug models\`; rerun local access smoke or use the portable ${BASELINE_MODEL} fallback for this surface.`
    );
  }

  checks.model.actual = model;
  checks.model.status =
    model === BASELINE_MODEL || (isLocalModelOptIn(model) && verifiedLocalModels.has(model))
      ? 'ok'
      : 'advisory';

  checks.review_model.actual = reviewModel;
  checks.review_model.status =
    reviewModel === BASELINE_REVIEW_MODEL || (isLocalModelOptIn(reviewModel) && verifiedLocalModels.has(reviewModel))
      ? 'ok'
      : 'advisory';

  const reasoning = normalizeOptionalString(readStringValue(parsed.model_reasoning_effort));
  checks.model_reasoning_effort.actual = reasoning;
  checks.model_reasoning_effort.status = isReasoningAtLeastMinimum(reasoning, BASELINE_REASONING_MINIMUM)
    ? 'ok'
    : 'advisory';

  const agents = isRecord(parsed.agents) ? parsed.agents : {};
  const multiAgentV2Enabled =
    featureProbeIndicatesMultiAgentV2
    || (!featureProbeDisablesMultiAgentV2
      && readBooleanValue(readRecordValue(parsed, 'features')?.multi_agent_v2) === true);
  const maxThreads = readNumberValue(agents.max_threads);
  const maxDepth = readNumberValue(agents.max_depth);
  const maxSpawnDepth = readNumberValue(agents.max_spawn_depth);
  const hasMaxThreads = Object.prototype.hasOwnProperty.call(agents, 'max_threads');

  checks.max_threads.actual = maxThreads;
  if (multiAgentV2Enabled) {
    checks.max_threads.status = hasMaxThreads ? 'advisory' : 'skipped';
    checks.max_threads.detail =
      hasMaxThreads
        ? 'features.multi_agent_v2=true; remove agents.max_threads because Codex CLI 0.125+ rejects it'
        : 'features.multi_agent_v2=true; omit agents.max_threads because Codex CLI 0.125+ rejects it';
  } else {
    checks.max_threads.status =
      typeof maxThreads === 'number' && maxThreads >= BASELINE_AGENTS.max_threads ? 'ok' : 'advisory';
  }
  checks.max_depth.actual = maxDepth;
  checks.max_depth.status =
    maxDepth === null || (typeof maxDepth === 'number' && maxDepth >= BASELINE_AGENTS.max_depth) ? 'ok' : 'advisory';
  if (maxSpawnDepth !== null) {
    const legacySpawnDepthOk = maxSpawnDepth >= BASELINE_AGENTS.max_depth;
    legacyMaxSpawnDepth = {
      present: true,
      status: legacySpawnDepthOk ? 'ok' : 'advisory',
      actual: maxSpawnDepth,
      detail: legacySpawnDepthOk
        ? 'legacy override detected; safe for the CO baseline, but remove it when your local parser/runtime no longer consumes spawn-depth caps'
        : `older parser/runtime may still treat this as a hard cap below the CO baseline depth; raise it to >= ${BASELINE_AGENTS.max_depth} or remove it`
    };
  }

  const allChecksOk =
    Object.values(checks).every((check) => check.status === 'ok' || check.status === 'skipped')
    && unverifiedLocalModels.length === 0
    && legacyMaxSpawnDepth?.status !== 'advisory';
  return {
    status: allChecksOk ? 'ok' : 'advisory',
    config: { path: configPath, status: 'ok' },
    checks,
    legacy_max_spawn_depth: legacyMaxSpawnDepth,
    guidance
  };
}

function inspectCodexModelAccess(codexBin: string, env: NodeJS.ProcessEnv): DoctorCodexModelAccess {
  const overrideJson = env[CODEX_DEBUG_MODELS_JSON_ENV];
  if (typeof overrideJson === 'string' && overrideJson.trim().length > 0) {
    return parseCodexDebugModels(overrideJson, `${CODEX_DEBUG_MODELS_JSON_ENV} override`);
  }

  const result = spawnSync(codexBin, ['debug', 'models'], {
    encoding: 'utf8',
    env,
    timeout: 5000,
    maxBuffer: 5 * 1024 * 1024
  });
  if (result.error) {
    return {
      status: 'unavailable',
      models: new Set<string>(),
      detail: result.error.message
    };
  }
  if (result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
    return {
      status: 'unavailable',
      models: new Set<string>(),
      detail: stderr || `codex debug models exited ${result.status ?? 'without a status'}`
    };
  }
  return parseCodexDebugModels(result.stdout, '`codex debug models`');
}

function parseCodexDebugModels(source: unknown, detailPrefix: string): DoctorCodexModelAccess {
  if (typeof source !== 'string' || source.trim().length === 0) {
    return {
      status: 'unavailable',
      models: new Set<string>(),
      detail: `${detailPrefix} produced no model catalog output`
    };
  }

  try {
    const parsed = JSON.parse(source);
    const models = new Set<string>();
    const entries = isRecord(parsed) && Array.isArray(parsed.models) ? parsed.models : [];
    for (const entry of entries) {
      if (!isRecord(entry)) {
        continue;
      }
      const slug = readStringValue(entry.slug);
      if (slug) {
        models.add(slug);
      }
    }
    return {
      status: models.size > 0 ? 'ok' : 'unavailable',
      models,
      detail: `${detailPrefix} reported ${models.size} model(s)`
    };
  } catch (error) {
    return {
      status: 'unavailable',
      models: new Set<string>(),
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

function getTomlParser(): { parse: (source: string) => unknown } {
  if (tomlParser) {
    return tomlParser;
  }
  if (tomlParser === null) {
    throw new Error('Failed to load @iarna/toml.');
  }
  try {
    tomlParser = require('@iarna/toml') as { parse: (source: string) => unknown };
    return tomlParser;
  } catch (error) {
    tomlParser = null;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringValue(value: unknown, ...keys: string[]): string | null {
  if (keys.length === 0) {
    return typeof value === 'string' ? value : null;
  }
  if (!isRecord(value)) {
    return null;
  }
  for (const key of keys) {
    if (typeof value[key] === 'string') {
      return value[key] as string;
    }
  }
  return null;
}

function readNumberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBooleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readRecordValue(value: unknown, ...keys: string[]): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  for (const key of keys) {
    if (isRecord(value[key])) {
      return value[key] as Record<string, unknown>;
    }
  }
  return null;
}

function readStringArrayValue(value: unknown, ...keys: string[]): string[] | undefined {
  const raw = isRecord(value)
    ? keys.map((key) => value[key]).find((entry) => Array.isArray(entry))
    : Array.isArray(value)
      ? value
      : undefined;
  if (!Array.isArray(raw)) {
    return undefined;
  }
  return raw
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function parseEnvBoolean(value: string | null | undefined): boolean {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(normalized.toLowerCase());
}

function parseCsvList(value: string | null | undefined): string[] {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return [];
  }
  return normalized
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readProviderControlPolicy(providerRoot: string): DoctorResult['providers']['control_policy'] {
  const preferredPath = join(providerRoot, 'control.json');
  const fallbackPath = join(providerRoot, 'control.example.json');
  const candidate = existsSync(preferredPath) ? preferredPath : existsSync(fallbackPath) ? fallbackPath : preferredPath;

  if (!existsSync(candidate)) {
    return {
      status: 'missing',
      path: preferredPath,
      dispatch_pilot_enabled: null,
      dispatch_pilot_provider: null,
      dispatch_pilot_source_setup: null,
      transport_mutating_enabled: null,
      telegram_transport_allowed: null
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('provider control policy must be a JSON object');
    }
    const featureToggles = isRecord(parsed.feature_toggles) ? (parsed.feature_toggles as Record<string, unknown>) : null;
    const dispatchPilot = resolveDispatchPilotControls(featureToggles);
    const dispatchSource = readRecordValue(dispatchPilot, 'source');
    const dispatchBindingSource = readRecordValue(dispatchSource, 'linear') ?? dispatchSource;
    const dispatchPilotEnabled = readBooleanValue(dispatchPilot?.enabled);
    const rawDispatchPilotProvider = normalizeOptionalString(
      readStringValue(dispatchSource, 'provider', 'source_provider', 'sourceProvider')
    );
    const normalizedDispatchPilotProvider = normalizeDispatchSourceProvider(rawDispatchPilotProvider ?? undefined);
    if (dispatchPilotEnabled === true) {
      if (!dispatchSource) {
        throw new Error('dispatch_pilot.source is required when dispatch_pilot.enabled=true');
      }
      if (!normalizedDispatchPilotProvider) {
        throw new Error(
          rawDispatchPilotProvider
            ? `unsupported dispatch_pilot.source.provider: ${rawDispatchPilotProvider}`
            : 'dispatch_pilot.source.provider is required when dispatch_pilot.enabled=true'
        );
      }
    }
    const transportMutating = resolveTransportMutatingControls(featureToggles);
    const transportMutatingEnabled = readBooleanValue(transportMutating?.enabled);
    const allowedTransports = readStringArrayValue(transportMutating, 'allowed_transports', 'allowedTransports');
    const telegramTransportAllowed =
      transportMutating === null
        ? null
        : transportMutatingEnabled === true
          ? allowedTransports ? allowedTransports.includes('telegram') : true
          : false;
    return {
      status: 'ok',
      path: candidate,
      dispatch_pilot_enabled: dispatchPilotEnabled,
      dispatch_pilot_provider: normalizedDispatchPilotProvider ?? rawDispatchPilotProvider,
      dispatch_pilot_source_setup: dispatchBindingSource
        ? {
            workspace_id: normalizeOptionalString(readStringValue(dispatchBindingSource, 'workspace_id', 'workspaceId')),
            team_id: normalizeOptionalString(readStringValue(dispatchBindingSource, 'team_id', 'teamId')),
            project_id: normalizeOptionalString(readStringValue(dispatchBindingSource, 'project_id', 'projectId'))
          }
        : null,
      transport_mutating_enabled: transportMutatingEnabled,
      telegram_transport_allowed: telegramTransportAllowed
    };
  } catch (error) {
    return {
      status: 'invalid',
      path: candidate,
      detail: error instanceof Error ? error.message : String(error),
      dispatch_pilot_enabled: null,
      dispatch_pilot_provider: null,
      dispatch_pilot_source_setup: null,
      transport_mutating_enabled: null,
      telegram_transport_allowed: null
    };
  }
}

function resolveTransportMutatingControls(
  featureToggles: Record<string, unknown> | null
): Record<string, unknown> | null {
  const direct = readRecordValue(featureToggles, 'transport_mutating_controls');
  const coordinator = readRecordValue(featureToggles, 'coordinator');
  const nested = readRecordValue(coordinator, 'transport_mutating_controls');
  return nested ?? direct ?? null;
}

function resolveDispatchPilotControls(
  featureToggles: Record<string, unknown> | null
): Record<string, unknown> | null {
  const direct = readRecordValue(featureToggles, 'dispatch_pilot');
  const coordinator = readRecordValue(featureToggles, 'coordinator');
  const nested = readRecordValue(coordinator, 'dispatch_pilot');
  return nested ?? direct ?? null;
}

function renderProviderToggleSummary(enabled: boolean | null, provider: string | null): string {
  if (enabled === null) {
    return 'unconfigured';
  }
  const label = enabled ? 'enabled' : 'disabled';
  return provider ? `${label} (${provider})` : label;
}

function renderTransportPolicySummary(allowed: boolean | null): string {
  if (allowed === null) {
    return 'unconfigured';
  }
  return allowed ? 'telegram allowed' : 'telegram blocked';
}

function isReasoningAtLeastMinimum(value: string | null, minimum: string): boolean {
  const rank = resolveReasoningRank(value);
  const minimumRank = resolveReasoningRank(minimum);
  if (rank === null || minimumRank === null) {
    return false;
  }
  return rank >= minimumRank;
}

function resolveReasoningRank(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'minimal':
      return 0;
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    case 'xhigh':
      return 4;
    case 'maximum':
      return 5;
    default:
      return null;
  }
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveCloudFallbackPolicyDiagnostic(env: NodeJS.ProcessEnv = process.env): {
  policy: DoctorResult['cloud']['fallback_policy'];
  source: DoctorResult['cloud']['fallback_policy_source'];
  raw_value: string | null;
  error: string | null;
} {
  try {
    const resolution = resolveSharedCloudFallbackPolicy(env);
    return {
      policy: resolution.policy,
      source: resolution.source,
      raw_value: resolution.raw_value,
      error: null
    };
  } catch (error) {
    return {
      policy: 'invalid',
      source: 'invalid',
      raw_value: normalizeOptionalString(env.CODEX_ORCHESTRATOR_CLOUD_FALLBACK),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function resolvePlanMetadataCloudEnvironmentId(
  repoRoot: string,
  taskId: string | null,
  processEnv: NodeJS.ProcessEnv = process.env
): Promise<string | null> {
  const env: EnvironmentPaths = {
    repoRoot,
    runsRoot: join(repoRoot, '.runs'),
    outRoot: join(repoRoot, 'out'),
    taskId: taskId ?? '0101'
  };
  const resolver = new PipelineResolver();
  const resolution = await resolver.resolve(env, { quiet: true, processEnv });
  const planner = new CommandPlanner(resolution.pipeline);
  const context: TaskContext = {
    id: env.taskId,
    title: env.taskId,
    metadata: {}
  };
  const plan = await planner.plan(context);
  const selected =
    plan.items.find((item) => item.id === plan.targetId)
    ?? plan.items[0]
    ?? null;
  if (!selected || !selected.metadata || typeof selected.metadata !== 'object') {
    return null;
  }
  return resolveCloudEnvironmentIdFromMetadata(selected.metadata as Record<string, unknown>);
}

function resolveCloudEnvironmentIdFromMetadata(metadata: Record<string, unknown>): string | null {
  const stagePlan = metadata.plan && typeof metadata.plan === 'object'
    ? (metadata.plan as Record<string, unknown>)
    : null;
  const candidates: Array<string | null> = [
    normalizeOptionalString(typeof stagePlan?.cloudEnvId === 'string' ? stagePlan.cloudEnvId : null),
    normalizeOptionalString(typeof stagePlan?.cloud_env_id === 'string' ? stagePlan.cloud_env_id : null),
    normalizeOptionalString(typeof metadata.cloudEnvId === 'string' ? metadata.cloudEnvId : null),
    normalizeOptionalString(typeof metadata.cloud_env_id === 'string' ? metadata.cloud_env_id : null)
  ];
  return candidates.find((value): value is string => Boolean(value)) ?? null;
}

function resolveTaskMetadataCloudEnvironmentId(repoRoot: string, taskId: string | null): string | null {
  if (!taskId) {
    return null;
  }
  const tasksPath = join(repoRoot, 'tasks', 'index.json');
  if (!existsSync(tasksPath)) {
    return null;
  }
  try {
    const raw = readFileSync(tasksPath, 'utf8');
    const parsed = JSON.parse(raw) as { items?: unknown };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const match = items.find((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const record = item as Record<string, unknown>;
      return matchesTaskIdentifier(record.id, taskId) || matchesTaskIdentifier(record.slug, taskId);
    });
    if (!match || typeof match !== 'object') {
      return null;
    }
    const record = match as Record<string, unknown>;
    const metadata = (record.metadata ?? null) as Record<string, unknown> | null;
    const cloudMetadata =
      metadata && typeof metadata.cloud === 'object' && metadata.cloud
        ? (metadata.cloud as Record<string, unknown>)
        : null;
    const candidates: Array<string | null> = [
      normalizeOptionalString(typeof metadata?.cloudEnvId === 'string' ? metadata.cloudEnvId : null),
      normalizeOptionalString(typeof metadata?.cloud_env_id === 'string' ? metadata.cloud_env_id : null),
      normalizeOptionalString(typeof metadata?.envId === 'string' ? metadata.envId : null),
      normalizeOptionalString(typeof metadata?.environmentId === 'string' ? metadata.environmentId : null),
      normalizeOptionalString(typeof cloudMetadata?.envId === 'string' ? cloudMetadata.envId : null),
      normalizeOptionalString(typeof cloudMetadata?.environmentId === 'string' ? cloudMetadata.environmentId : null),
      normalizeOptionalString(typeof cloudMetadata?.cloudEnvId === 'string' ? cloudMetadata.cloudEnvId : null),
      normalizeOptionalString(typeof cloudMetadata?.cloud_env_id === 'string' ? cloudMetadata.cloud_env_id : null)
    ];
    return candidates.find((value): value is string => Boolean(value)) ?? null;
  } catch {
    return null;
  }
}

function matchesTaskIdentifier(value: unknown, taskId: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return false;
  }
  return normalized === taskId || taskId.startsWith(`${normalized}-`);
}

function buildCloudPreflightGuidance(issues: CloudPreflightIssue[]): string[] {
  if (issues.length === 0) {
    return ['Cloud preflight passed. You can run cloud mode with `--cloud --target <stage-id>`.'];
  }

  const guidance: string[] = [];
  for (const issue of issues) {
    switch (issue.code) {
      case 'missing_environment':
        guidance.push('Set CODEX_CLOUD_ENV_ID or provide target metadata.cloudEnvId.');
        break;
      case 'environment_not_found':
        guidance.push('Set CODEX_CLOUD_ENV_ID to a Codex Cloud environment visible to the active account; run `codex cloud` to list available environments.');
        break;
      case 'environment_unavailable':
        guidance.push('Verify the active Codex account/profile can read CODEX_CLOUD_ENV_ID before running required cloud canaries.');
        break;
      case 'branch_missing':
        guidance.push('Push the branch to origin or set CODEX_CLOUD_BRANCH to an existing remote branch.');
        break;
      case 'codex_unavailable':
        guidance.push('Install Codex CLI or set CODEX_CLI_BIN to a valid codex binary.');
        break;
      case 'git_unavailable':
        guidance.push('Install git or run with CODEX_CLOUD_BRANCH unset to skip remote branch verification.');
        break;
      case 'pipeline_resolution_failed':
        guidance.push('Fix pipeline/config resolution errors before cloud runs (run `codex-orchestrator init codex`).');
        break;
      default:
        break;
    }
  }

  return [...new Set(guidance)];
}

function canRunCommand(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'ignore', 'ignore'],
    timeout: 5000
  });
  if (result.error) {
    return false;
  }
  return result.status === 0;
}
