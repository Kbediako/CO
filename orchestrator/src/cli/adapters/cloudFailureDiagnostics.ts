export type CloudFailureCategory = 'configuration' | 'credentials' | 'connectivity' | 'execution' | 'unknown';

export type CloudFailureDiagnosticCategory =
  | 'env_config'
  | 'environment_not_found'
  | 'environment_unavailable'
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
    diagnostic_category: 'environment_not_found',
    patterns: ['environment_not_found', 'environment not found', 'is not visible to codex cloud'],
    guidance: 'CODEX_CLOUD_ENV_ID is configured, but Codex Cloud could not resolve it. Fix the env id or choose an environment visible to this account.'
  },
  {
    category: 'configuration',
    diagnostic_category: 'environment_unavailable',
    patterns: ['environment_unavailable', 'could not be verified by codex cloud'],
    guidance: 'CODEX_CLOUD_ENV_ID is configured, but this account cannot use that environment right now. Verify visibility/permissions and retry.'
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
  'environment_not_found',
  'environment_unavailable',
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

function isEnvironmentNotFoundSignal(signal: string): boolean {
  return /\benvironment\s+(?:['"][^'"]+['"]|[^\s'"]+)\s+not\s+found\b/u.test(signal.toLowerCase());
}

function matchesCloudFailureRule(rule: CloudFailureRule, lowercase: string, normalized: string): boolean {
  return rule.patterns.some((pattern) => {
    const normalizedPattern = normalizeCloudFailureSignal(pattern);
    return lowercase.includes(pattern) ||
      (normalizedPattern.length >= 4 && normalized.includes(normalizedPattern));
  });
}

function findCloudFailureRule(diagnosticCategory: CloudFailureDiagnosticCategory): CloudFailureRule | null {
  return CLOUD_FAILURE_RULES.find((rule) => rule.diagnostic_category === diagnosticCategory) ?? null;
}

function findMatchedCloudFailureRule(
  diagnosticCategory: CloudFailureDiagnosticCategory,
  signal: string
): CloudFailureRule | null {
  const rule = findCloudFailureRule(diagnosticCategory);
  if (!rule) {
    return null;
  }
  const lowercase = signal.toLowerCase();
  const normalized = normalizeCloudFailureSignal(signal);
  return matchesCloudFailureRule(rule, lowercase, normalized) ? rule : null;
}

function maskEnvConfigIdentifierValues(normalizedSignal: string): string {
  return normalizedSignal
    .replace(/\bcodex_cloud_env_id\s+(?:['"][^'"]+['"]|[^\s'"]+)/gu, 'codex_cloud_env_id <env-id>')
    .replace(/\bcodex cloud env id\s+(?:['"][^'"]+['"]|[^\s'"]+)/gu, 'codex cloud env id <env-id>');
}

function hasStrongConnectivityContext(signal: string): boolean {
  const normalized = maskEnvConfigIdentifierValues(signal.toLowerCase());
  return (
    normalized.includes('enotfound') ||
    normalized.includes('econn') ||
    normalized.includes('bad gateway') ||
    normalized.includes('service unavailable') ||
    normalized.includes('gateway timeout') ||
    /\bnetwork\W{0,24}(?:error|failure|unreachable|unavailable|timeout|timed out|connection|connectivity)\b/u.test(normalized) ||
    /\b(?:request|connection|endpoint|gateway|upstream|service)\W{0,24}(?:timed out|timeout)\b/u.test(normalized) ||
    /\b(?:timed out|timeout)\W{0,24}(?:(?:while\s+)?(?:contacting|connecting|reaching|calling|waiting)|request|connection|endpoint|gateway|upstream|service|after)\b/u.test(normalized) ||
    /\b(?:http(?:\s+(?:status|response))?|status|response|upstream|gateway|error|failed|returned)\D{0,16}(?:502|503|504)\b/u.test(normalized) ||
    /\b(?:502|503|504)\D{0,16}(?:bad gateway|service unavailable|gateway timeout)\b/u.test(normalized)
  );
}

function matchCloudFailureRule(signal: string): CloudFailureRule | null {
  const lowercase = signal.toLowerCase();
  const normalized = normalizeCloudFailureSignal(signal);
  const envConfigRule = findCloudFailureRule('env_config');
  if (isEnvironmentNotFoundSignal(signal)) {
    return findCloudFailureRule('environment_not_found');
  }
  if (envConfigRule && matchesCloudFailureRule(envConfigRule, lowercase, normalized)) {
    const maskedSignal = maskEnvConfigIdentifierValues(lowercase);
    for (const diagnosticCategory of [
      'cloud_connector_auth_drift',
      'cloud_denial',
      'auth_mismatch',
      'quota_rate_limit'
    ] as const) {
      const rule = findMatchedCloudFailureRule(diagnosticCategory, maskedSignal);
      if (rule) {
        return rule;
      }
    }
    const connectivityRule = findCloudFailureRule('network_connectivity');
    if (
      connectivityRule &&
      matchesCloudFailureRule(connectivityRule, lowercase, normalized) &&
      hasStrongConnectivityContext(signal)
    ) {
      return connectivityRule;
    }
    const envUnavailableRule = findCloudFailureRule('environment_unavailable');
    if (envUnavailableRule && matchesCloudFailureRule(envUnavailableRule, lowercase, normalized)) {
      return envUnavailableRule;
    }
  }
  return CLOUD_FAILURE_RULES.find((rule) => matchesCloudFailureRule(rule, lowercase, normalized)) ?? null;
}

function normalizeCloudFailureSignal(signal: string): string {
  return signal
    .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .toLowerCase()
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeMachineReadableCloudDetail(signal: string): string {
  return normalizeCloudFailureSignal(signal).replace(/\s+/gu, '_');
}

function isMachineReadableCloudDetail(signal: string): boolean {
  return MACHINE_READABLE_CLOUD_DETAILS.has(normalizeMachineReadableCloudDetail(signal));
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
      if (
        normalizeMachineReadableCloudDetail(options.statusDetail) === 'environment_unavailable' &&
        options.error
      ) {
        const errorRule = matchCloudFailureRule(options.error);
        if (
          errorRule &&
          errorRule.diagnostic_category !== 'environment_unavailable' &&
          errorRule.diagnostic_category !== 'env_config'
        ) {
          return buildCloudFailureDiagnosis(errorRule, signal);
        }
      }
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
