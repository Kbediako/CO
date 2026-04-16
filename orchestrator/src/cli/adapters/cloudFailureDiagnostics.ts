export type CloudFailureCategory = 'configuration' | 'credentials' | 'connectivity' | 'execution' | 'unknown';

export type CloudFailureDiagnosticCategory =
  | 'env_config'
  | 'auth_mismatch'
  | 'cloud_connector_auth_drift'
  | 'quota_rate_limit'
  | 'cloud_denial'
  | 'guardian_timeout'
  | 'guardian_policy_denial'
  | 'network_connectivity'
  | 'provider_runtime'
  | 'unknown';

export interface CloudFailureDiagnosis {
  category: CloudFailureCategory;
  diagnostic_category: CloudFailureDiagnosticCategory;
  guidance: string;
  signal: string;
}

export function formatCloudFailureClass(diagnosis: CloudFailureDiagnosis): string {
  return `${diagnosis.category} (${diagnosis.diagnostic_category})`;
}

interface CloudFailureRule {
  category: CloudFailureCategory;
  diagnostic_category: CloudFailureDiagnosticCategory;
  patterns: string[];
  guidance: string;
}

const CLOUD_FAILURE_RULES: CloudFailureRule[] = [
  {
    category: 'execution',
    diagnostic_category: 'guardian_timeout',
    patterns: [
      'guardian timeout',
      'guardian-timeout',
      'guardian_timeout',
      'guardian timed out',
      'guardian review timeout',
      'guardian review timed out'
    ],
    guidance: 'Guardian review timed out; retry or inspect timeout-specific Guardian guidance before treating it as a policy denial.'
  },
  {
    category: 'execution',
    diagnostic_category: 'guardian_policy_denial',
    patterns: [
      'guardian policy denial',
      'guardian-policy-denial',
      'guardian_policy_denial',
      'guardian policy denied',
      'guardian denied',
      'guardian blocked'
    ],
    guidance: 'Guardian policy denied the request; inspect policy-denial guidance instead of retrying as a timeout.'
  },
  {
    category: 'credentials',
    diagnostic_category: 'cloud_connector_auth_drift',
    patterns: [
      'cloud connector auth drift',
      'cloud-connector-auth-drift',
      'cloud_connector_auth_drift',
      'missing_github_connector_link',
      'missing github connector link',
      'github connection not found for user',
      'github connection not found',
      'github connector not found',
      'github connector link missing',
      'missing github connection',
      'missing github connector'
    ],
    guidance:
      'Repair or relink the GitHub connector for the current ChatGPT/Codex cloud account/environment, or record an explicit waiver before re-running cloud-canary gates.'
  },
  {
    category: 'credentials',
    diagnostic_category: 'cloud_denial',
    patterns: [
      'cloud denial',
      'cloud-denial',
      'cloud_denial',
      'cloud denied',
      'not allowed in cloud',
      'cloud access denied',
      'cloud execution denied'
    ],
    guidance: 'Codex Cloud rejected this run; verify the configured cloud environment, branch, and account permission for cloud execution.'
  },
  {
    category: 'configuration',
    diagnostic_category: 'env_config',
    patterns: [
      'env config',
      'env-config',
      'env_config',
      'cloud-env-missing',
      'codex_cloud_env_id',
      'no_environment_id',
      'no environment id is configured',
      '--env'
    ],
    guidance: 'Set CODEX_CLOUD_ENV_ID (or metadata.cloudEnvId) to a valid cloud environment id before re-running.'
  },
  {
    category: 'credentials',
    diagnostic_category: 'auth_mismatch',
    patterns: [
      'auth mismatch',
      'auth-mismatch',
      'auth_mismatch',
      'auth profile',
      'profile mismatch',
      'account mismatch',
      'active account',
      'active profile',
      'unauthorized',
      'forbidden',
      'not logged in',
      'login',
      'api key',
      'credential',
      'auth token',
      'access token',
      'refresh token',
      'bearer token',
      'invalid token',
      'expired token',
      'token expired',
      'missing token',
      'token missing'
    ],
    guidance:
      'Ensure the active Codex account/auth profile matches the cloud environment and has access to the configured environment.'
  },
  {
    category: 'execution',
    diagnostic_category: 'quota_rate_limit',
    patterns: [
      'quota_rate_limit',
      'rate limit',
      'rate-limit',
      'rate_limited',
      'rate_limit_exceeded',
      'quota',
      'too many requests',
      'usage limit',
      'usage_limit_reached'
    ],
    guidance: 'Codex account quota or rate-limit state is implicated; inspect account plan/rate-limit evidence and retry after limits reset.'
  },
  {
    category: 'connectivity',
    diagnostic_category: 'network_connectivity',
    patterns: ['enotfound', 'econn', 'timed out', 'timeout', 'network', '502', '503', '504'],
    guidance: 'Cloud endpoint connectivity looks unstable; retry and inspect network/endpoint health.'
  }
];

const TERMINAL_FAILURE_STATUSES = new Set(['failed', 'error', 'cancelled']);
const MACHINE_READABLE_CLOUD_DETAILS = new Set([
  'auth_mismatch',
  'cloud_access_denied',
  'cloud_denial',
  'cloud_denied',
  'cloud_env_missing',
  'cloud_execution_denied',
  'cloud_connector_auth_drift',
  'codex_cloud_env_id',
  'env_config',
  'guardian_policy_denial',
  'guardian_timeout',
  'github_connection_not_found',
  'github_connector_not_found',
  'missing_github_connector_link',
  'no_environment_id',
  'not_allowed_in_cloud',
  'quota_rate_limit',
  'rate_limit',
  'rate_limit_exceeded',
  'rate_limited',
  'usage_limit_reached'
]);

function matchCloudFailureRule(signal: string): CloudFailureRule | null {
  const lowercase = signal.toLowerCase();
  const normalized = normalizeCloudFailureSignal(signal);
  return CLOUD_FAILURE_RULES.find((rule) =>
    rule.patterns.some((pattern) => {
      const normalizedPattern = normalizeCloudFailureSignal(pattern);
      return lowercase.includes(pattern) ||
        (normalizedPattern.length >= 4 && normalized.includes(normalizedPattern));
    })
  ) ?? null;
}

function normalizeCloudFailureSignal(signal: string): string {
  return signal
    .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .toLowerCase()
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function isMachineReadableCloudDetail(signal: string): boolean {
  return MACHINE_READABLE_CLOUD_DETAILS.has(normalizeCloudFailureSignal(signal).replace(/\s+/gu, '_'));
}

function buildCloudFailureDiagnosis(rule: CloudFailureRule, signal: string): CloudFailureDiagnosis {
  return {
    category: rule.category,
    diagnostic_category: rule.diagnostic_category,
    guidance: rule.guidance,
    signal
  };
}

export function diagnoseCloudFailure(options: {
  status?: string | null;
  error?: string | null;
  statusDetail?: string | null;
}): CloudFailureDiagnosis {
  const signal = [options.status ?? null, options.statusDetail ?? null, options.error ?? null]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join('\n');

  if (options.statusDetail && isMachineReadableCloudDetail(options.statusDetail)) {
    const statusDetailRule = matchCloudFailureRule(options.statusDetail);
    if (statusDetailRule) {
      return buildCloudFailureDiagnosis(statusDetailRule, signal);
    }
  }

  if (options.error) {
    const errorRule = matchCloudFailureRule(options.error);
    if (errorRule) {
      return buildCloudFailureDiagnosis(errorRule, signal);
    }
  }

  const signalRule = matchCloudFailureRule(signal);
  if (signalRule) {
    return buildCloudFailureDiagnosis(signalRule, signal);
  }

  if (options.status && TERMINAL_FAILURE_STATUSES.has(options.status.toLowerCase())) {
    return {
      category: 'execution',
      diagnostic_category: 'provider_runtime',
      guidance: 'Inspect manifest cloud_execution.error and cloud command logs for the terminal cloud failure.',
      signal
    };
  }

  return {
    category: 'unknown',
    diagnostic_category: 'unknown',
    guidance: 'Inspect manifest status_detail plus cloud command logs to classify this failure.',
    signal
  };
}
