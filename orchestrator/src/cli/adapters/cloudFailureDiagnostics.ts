export type CloudFailureCategory = 'configuration' | 'credentials' | 'connectivity' | 'execution' | 'unknown';

export interface CloudFailureDiagnosis {
  category: CloudFailureCategory;
  guidance: string;
  signal: string;
}

interface CloudFailureRule {
  category: CloudFailureCategory;
  patterns: string[];
  guidance: string;
}

const CLOUD_FAILURE_RULES: CloudFailureRule[] = [
  {
    category: 'configuration',
    patterns: ['cloud-env-missing', 'codex_cloud_env_id', 'no environment id is configured', '--env'],
    guidance: 'Set CODEX_CLOUD_ENV_ID (or metadata.cloudEnvId) to a valid cloud environment id before re-running.'
  },
  {
    category: 'credentials',
    patterns: ['unauthorized', 'forbidden', 'not logged in', 'login', 'api key', 'credential', 'token'],
    guidance:
      'Ensure Codex Cloud credentials are available to the runner and have access to the configured environment.'
  },
  {
    category: 'connectivity',
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
        guidance: rule.guidance,
        signal
      };
    }
  }

  if (options.status && TERMINAL_FAILURE_STATUSES.has(options.status.toLowerCase())) {
    return {
      category: 'execution',
      guidance: 'Inspect manifest cloud_execution.error and cloud command logs for the terminal cloud failure.',
      signal
    };
  }

  return {
    category: 'unknown',
    guidance: 'Inspect manifest status_detail plus cloud command logs to classify this failure.',
    signal
  };
}
