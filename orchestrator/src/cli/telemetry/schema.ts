import type { CliManifest } from '../types.js';

export type JsonSchema = Record<string, unknown>;

export interface TelemetrySchemas {
  manifest: JsonSchema;
}

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  value: T | null;
}

const COMMAND_STATUS = new Set(['pending', 'running', 'succeeded', 'failed', 'skipped']);
const RUN_STATUS = new Set(['queued', 'in_progress', 'succeeded', 'failed', 'cancelled']);
const CHILD_STATUS = new Set(['queued', 'in_progress', 'succeeded', 'failed', 'cancelled']);
const COMMAND_KINDS = new Set(['command', 'subpipeline']);
const RESUME_OUTCOMES = new Set(['accepted', 'blocked']);

export const CLI_MANIFEST_SCHEMA: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://schemas.codex.openai.com/orchestrator/cli-manifest.json',
  title: 'Codex Orchestrator CLI Manifest',
  type: 'object',
  additionalProperties: false,
  required: [
    'version',
    'task_id',
    'task_slug',
    'run_id',
    'parent_run_id',
    'pipeline_id',
    'pipeline_title',
    'runner',
    'approval_policy',
    'status',
    'status_detail',
    'started_at',
    'completed_at',
    'updated_at',
    'heartbeat_at',
    'heartbeat_interval_seconds',
    'heartbeat_stale_after_seconds',
    'artifact_root',
    'compat_path',
    'log_path',
    'summary',
    'metrics_recorded',
    'resume_token',
    'resume_events',
    'approvals',
    'commands',
    'child_runs',
    'run_summary_path'
  ],
  properties: {
    version: { type: 'integer', minimum: 1 },
    task_id: { type: 'string', minLength: 1 },
    task_slug: { type: ['string', 'null'] },
    run_id: { type: 'string', minLength: 1 },
    parent_run_id: { type: ['string', 'null'] },
    pipeline_id: { type: 'string', minLength: 1 },
    pipeline_title: { type: 'string', minLength: 1 },
    runner: { type: 'string', const: 'codex-cli' },
    approval_policy: { type: ['string', 'null'] },
    status: { type: 'string', enum: Array.from(RUN_STATUS) },
    status_detail: { type: ['string', 'null'] },
    started_at: { type: 'string', minLength: 1 },
    completed_at: { type: ['string', 'null'] },
    updated_at: { type: 'string', minLength: 1 },
    heartbeat_at: { type: ['string', 'null'] },
    heartbeat_interval_seconds: { type: 'integer', minimum: 1 },
    heartbeat_stale_after_seconds: { type: 'integer', minimum: 1 },
    artifact_root: { type: 'string', minLength: 1 },
    compat_path: { type: 'string', minLength: 1 },
    log_path: { type: 'string', minLength: 1 },
    summary: { type: ['string', 'null'] },
    metrics_recorded: { type: 'boolean' },
    resume_token: { type: 'string', minLength: 1 },
    resume_events: {
      type: 'array',
      items: {
        type: 'object',
        required: ['timestamp', 'actor', 'reason', 'outcome'],
        additionalProperties: false,
        properties: {
          timestamp: { type: 'string', minLength: 1 },
          actor: { type: 'string', minLength: 1 },
          reason: { type: 'string', minLength: 1 },
          outcome: { type: 'string', enum: Array.from(RESUME_OUTCOMES) },
          detail: { type: ['string', 'null'] }
        }
      }
    },
    approvals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['actor', 'timestamp'],
        additionalProperties: false,
        properties: {
          actor: { type: 'string', minLength: 1 },
          timestamp: { type: 'string', minLength: 1 },
          reason: { type: ['string', 'null'] }
        }
      }
    },
    commands: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'index',
          'id',
          'title',
          'command',
          'kind',
          'status',
          'started_at',
          'completed_at',
          'exit_code',
          'summary',
          'log_path',
          'error_file',
          'sub_run_id'
        ],
        additionalProperties: false,
        properties: {
          index: { type: 'integer', minimum: 1 },
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          command: { type: ['string', 'null'] },
          kind: { type: 'string', enum: Array.from(COMMAND_KINDS) },
          status: { type: 'string', enum: Array.from(COMMAND_STATUS) },
          started_at: { type: ['string', 'null'] },
          completed_at: { type: ['string', 'null'] },
          exit_code: { type: ['integer', 'null'] },
          summary: { type: ['string', 'null'] },
          log_path: { type: ['string', 'null'] },
          error_file: { type: ['string', 'null'] },
          sub_run_id: { type: ['string', 'null'] }
        }
      }
    },
    child_runs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['run_id', 'pipeline_id', 'status', 'manifest'],
        additionalProperties: false,
        properties: {
          run_id: { type: 'string', minLength: 1 },
          pipeline_id: { type: 'string', minLength: 1 },
          status: { type: 'string', enum: Array.from(CHILD_STATUS) },
          manifest: { type: 'string', minLength: 1 }
        }
      }
    },
    run_summary_path: { type: ['string', 'null'] }
  }
};

export function getTelemetrySchemas(): TelemetrySchemas {
  return { manifest: CLI_MANIFEST_SCHEMA };
}

export function validateCliManifest(candidate: unknown): ValidationResult<CliManifest> {
  const errors: string[] = [];
  if (!isPlainObject(candidate)) {
    return { valid: false, errors: ['Manifest must be an object'], value: null };
  }

  validateString(candidate, 'task_id', errors);
  validateString(candidate, 'run_id', errors);
  validateString(candidate, 'pipeline_id', errors);
  validateString(candidate, 'pipeline_title', errors);
  validateString(candidate, 'runner', errors);
  validateString(candidate, 'artifact_root', errors);
  validateString(candidate, 'compat_path', errors);
  validateString(candidate, 'log_path', errors);
  validateString(candidate, 'resume_token', errors);
  validateString(candidate, 'started_at', errors);
  validateString(candidate, 'updated_at', errors);

  validateNumber(candidate, 'version', errors, { minimum: 1, integer: true });
  validateNumber(candidate, 'heartbeat_interval_seconds', errors, { minimum: 1, integer: true });
  validateNumber(candidate, 'heartbeat_stale_after_seconds', errors, { minimum: 1, integer: true });

  validateOptionalString(candidate, 'task_slug', errors);
  validateOptionalString(candidate, 'parent_run_id', errors);
  validateOptionalString(candidate, 'approval_policy', errors);
  validateOptionalString(candidate, 'status_detail', errors);
  validateOptionalString(candidate, 'completed_at', errors);
  validateOptionalString(candidate, 'heartbeat_at', errors);
  validateOptionalString(candidate, 'summary', errors);
  validateOptionalString(candidate, 'run_summary_path', errors);

  validateBoolean(candidate, 'metrics_recorded', errors);

  const status = candidate.status;
  if (typeof status !== 'string' || !RUN_STATUS.has(status)) {
    errors.push(`status must be one of ${Array.from(RUN_STATUS).join(', ')}`);
  }

  validateCommands(candidate.commands, errors);
  validateChildRuns(candidate.child_runs, errors);
  validateResumeEvents(candidate.resume_events, errors);
  validateApprovals(candidate.approvals, errors);

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  // At this point we've validated every property, so the cast is safe.
  return { valid: true, errors: [], value: candidate as unknown as CliManifest };
}

function validateCommands(candidate: unknown, errors: string[]): void {
  if (!Array.isArray(candidate)) {
    errors.push('commands must be an array');
    return;
  }
  candidate.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`commands[${index}] must be an object`);
      return;
    }
    validateNumber(entry, 'index', errors, { minimum: 1, integer: true, path: `commands[${index}].index` });
    validateString(entry, 'id', errors, `commands[${index}]`);
    validateString(entry, 'title', errors, `commands[${index}]`);
    validateOptionalString(entry, 'command', errors, `commands[${index}]`);
    validateOptionalString(entry, 'summary', errors, `commands[${index}]`);
    validateOptionalString(entry, 'log_path', errors, `commands[${index}]`);
    validateOptionalString(entry, 'error_file', errors, `commands[${index}]`);
    validateOptionalString(entry, 'sub_run_id', errors, `commands[${index}]`);
    validateOptionalString(entry, 'started_at', errors, `commands[${index}]`);
    validateOptionalString(entry, 'completed_at', errors, `commands[${index}]`);
    validateOptionalNumber(entry, 'exit_code', errors, { integer: true, path: `commands[${index}].exit_code` });

    const kind = entry.kind;
    if (typeof kind !== 'string' || !COMMAND_KINDS.has(kind)) {
      errors.push(`commands[${index}].kind must be ${Array.from(COMMAND_KINDS).join(' or ')}`);
    }
    const status = entry.status;
    if (typeof status !== 'string' || !COMMAND_STATUS.has(status)) {
      errors.push(`commands[${index}].status must be one of ${Array.from(COMMAND_STATUS).join(', ')}`);
    }
  });
}

function validateChildRuns(candidate: unknown, errors: string[]): void {
  if (!Array.isArray(candidate)) {
    errors.push('child_runs must be an array');
    return;
  }
  candidate.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`child_runs[${index}] must be an object`);
      return;
    }
    validateString(entry, 'run_id', errors, `child_runs[${index}]`);
    validateString(entry, 'pipeline_id', errors, `child_runs[${index}]`);
    validateString(entry, 'manifest', errors, `child_runs[${index}]`);
    validateChildStatus(entry.status, errors, index);
  });
}

function validateResumeEvents(candidate: unknown, errors: string[]): void {
  if (!Array.isArray(candidate)) {
    errors.push('resume_events must be an array');
    return;
  }
  candidate.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`resume_events[${index}] must be an object`);
      return;
    }
    validateString(entry, 'timestamp', errors, `resume_events[${index}]`);
    validateString(entry, 'actor', errors, `resume_events[${index}]`);
    validateString(entry, 'reason', errors, `resume_events[${index}]`);
    const outcome = entry.outcome;
    if (typeof outcome !== 'string' || !RESUME_OUTCOMES.has(outcome)) {
      errors.push(`resume_events[${index}].outcome must be one of ${Array.from(RESUME_OUTCOMES).join(', ')}`);
    }
    validateOptionalString(entry, 'detail', errors, `resume_events[${index}]`);
  });
}

function validateChildStatus(value: unknown, errors: string[], index: number): void {
  if (typeof value !== 'string' || !CHILD_STATUS.has(value)) {
    errors.push(`child_runs[${index}].status must be one of ${Array.from(CHILD_STATUS).join(', ')}`);
  }
}

function validateApprovals(candidate: unknown, errors: string[]): void {
  if (!Array.isArray(candidate)) {
    errors.push('approvals must be an array');
    return;
  }
  candidate.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`approvals[${index}] must be an object`);
      return;
    }
    validateString(entry, 'actor', errors, `approvals[${index}]`);
    validateString(entry, 'timestamp', errors, `approvals[${index}]`);
    validateOptionalString(entry, 'reason', errors, `approvals[${index}]`);
  });
}

function validateString(
  candidate: Record<string, unknown>,
  key: string,
  errors: string[],
  context: string | null = null
): void {
  const value = candidate[key];
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`${context ?? key}: ${key} must be a non-empty string`);
  }
}

function validateOptionalString(
  candidate: Record<string, unknown>,
  key: string,
  errors: string[],
  context: string | null = null
): void {
  const value = candidate[key];
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value !== 'string') {
    errors.push(`${context ?? key}: ${key} must be a string or null`);
  }
}

function validateNumber(
  candidate: Record<string, unknown>,
  key: string,
  errors: string[],
  options: { minimum?: number; integer?: boolean; path?: string } = {}
): void {
  const value = candidate[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    errors.push(`${options.path ?? key}: ${key} must be a number`);
    return;
  }
  if (options.integer && !Number.isInteger(value)) {
    errors.push(`${options.path ?? key}: ${key} must be an integer`);
  }
  if (options.minimum !== undefined && value < options.minimum) {
    errors.push(`${options.path ?? key}: ${key} must be >= ${options.minimum}`);
  }
}

function validateOptionalNumber(
  candidate: Record<string, unknown>,
  key: string,
  errors: string[],
  options: { integer?: boolean; path?: string } = {}
): void {
  const value = candidate[key];
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    errors.push(`${options.path ?? key}: ${key} must be a number or null`);
    return;
  }
  if (options.integer && !Number.isInteger(value)) {
    errors.push(`${options.path ?? key}: ${key} must be an integer`);
  }
}

function validateBoolean(candidate: Record<string, unknown>, key: string, errors: string[]): void {
  const value = candidate[key];
  if (typeof value !== 'boolean') {
    errors.push(`${key} must be a boolean`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
