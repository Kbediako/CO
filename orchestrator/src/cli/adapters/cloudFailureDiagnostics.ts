export type CloudFailureCategory = 'configuration' | 'credentials' | 'connectivity' | 'execution' | 'unknown';

export type CloudFailureDiagnosticCategory =
  | 'env_config'
  | 'auth_mismatch'
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
    patterns: ['guardian timeout', 'guardian timed out', 'guardian review timeout', 'guardian review timed out'],
    guidance: 'Guardian review timed out; retry or inspect timeout-specific Guardian guidance before treating it as a policy denial.'
  },
  {
    category: 'execution',
    diagnostic_category: 'guardian_policy_denial',
    patterns: ['guardian policy denial', 'guardian policy denied', 'guardian denied', 'guardian blocked'],
    guidance: 'Guardian policy denied the request; inspect policy-denial guidance instead of retrying as a timeout.'
  },
  {
    category: 'execution',
    diagnostic_category: 'quota_rate_limit',
    patterns: ['rate limit', 'rate-limit', 'quota', 'too many requests', 'prolite', 'wham', 'usage limit'],
    guidance: 'Codex account quota or rate-limit state is implicated; inspect account plan/rate-limit evidence and retry after limits reset.'
  },
  {
    category: 'credentials',
    diagnostic_category: 'cloud_denial',
    patterns: ['cloud denial', 'cloud denied', 'not allowed in cloud', 'cloud access denied', 'cloud execution denied'],
    guidance: 'Codex Cloud rejected this run; verify the configured cloud environment, branch, and account permission for cloud execution.'
  },
  {
    category: 'configuration',
    diagnostic_category: 'env_config',
    patterns: ['cloud-env-missing', 'codex_cloud_env_id', 'no environment id is configured', '--env'],
    guidance: 'Set CODEX_CLOUD_ENV_ID (or metadata.cloudEnvId) to a valid cloud environment id before re-running.'
  },
  {
    category: 'credentials',
    diagnostic_category: 'auth_mismatch',
    patterns: [
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
      'token'
    ],
    guidance:
      'Ensure the active Codex account/auth profile matches the cloud environment and has access to the configured environment.'
  },
  {
    category: 'connectivity',
    diagnostic_category: 'network_connectivity',
    patterns: ['enotfound', 'econn', 'timed out', 'timeout', 'network', '502', '503', '504'],
    guidance: 'Cloud endpoint connectivity looks unstable; retry and inspect network/endpoint health.'
  }
];

const TERMINAL_FAILURE_STATUSES = new Set(['failed', 'error', 'cancelled']);

export function diagnoseCloudFailure(options: {
  status?: string | null;
  error?: string | null;
  statusDetail?: string | null;
}): CloudFailureDiagnosis {
  const signal = [options.status ?? null, options.statusDetail ?? null, options.error ?? null]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join('\n');
  const normalized = signal.toLowerCase();

  for (const rule of CLOUD_FAILURE_RULES) {
    if (rule.patterns.some((pattern) => normalized.includes(pattern))) {
      return {
        category: rule.category,
        diagnostic_category: rule.diagnostic_category,
        guidance: rule.guidance,
        signal
      };
    }
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
