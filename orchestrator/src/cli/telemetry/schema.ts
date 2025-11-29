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
const PRIVACY_ACTIONS = new Set(['allow', 'redact', 'block']);
const SNAPSHOT_STATUS = new Set(['pending', 'captured', 'snapshot_failed', 'stalled_snapshot']);
const SCENARIO_STATUS = new Set(['pending', 'synthesized', 'needs_manual_scenario']);
const CRYSTALIZER_STATUS = new Set(['pending', 'succeeded', 'skipped', 'failed']);
const VALIDATION_MODE = new Set(['per-task', 'grouped']);
const VALIDATION_STATUS = new Set([
  'pending',
  'validated',
  'snapshot_failed',
  'stalled_snapshot',
  'needs_manual_scenario'
]);
const ALERT_TYPES = new Set(['snapshot_failed', 'stalled_snapshot', 'needs_manual_scenario', 'budget_exceeded']);
const ALERT_CHANNELS = new Set(['slack', 'pagerduty']);
const APPROVAL_STATES = new Set(['stalled_snapshot', 'needs_manual_scenario', 'requeue']);

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
    'run_summary_path',
    'instructions_hash',
    'instructions_sources'
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
    run_summary_path: { type: ['string', 'null'] },
    plan_target_id: { type: ['string', 'null'] },
    instructions_hash: { type: ['string', 'null'] },
    instructions_sources: {
      type: 'array',
      items: { type: 'string', minLength: 1 }
    },
    prompt_packs: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        required: ['id', 'domain', 'stamp', 'experience_slots', 'sources'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1 },
          domain: { type: 'string', minLength: 1 },
          stamp: { type: 'string', minLength: 1 },
          experience_slots: { type: 'integer', minimum: 0 },
          sources: {
            type: 'array',
            items: { type: 'string', minLength: 1 }
          },
          experiences: {
            type: ['array', 'null'],
            items: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    tfgrpo: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        epoch: { type: ['integer', 'null'] },
        group_id: { type: ['string', 'null'] },
        group_size: { type: ['integer', 'null'], minimum: 0 },
        tool_metrics: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['tool_calls', 'token_total', 'cost_usd', 'latency_ms', 'per_tool'],
          properties: {
            tool_calls: { type: 'integer', minimum: 0 },
            token_total: { type: 'number', minimum: 0 },
            cost_usd: { type: 'number', minimum: 0 },
            latency_ms: { type: 'number', minimum: 0 },
            per_tool: {
              type: 'array',
              items: {
                type: 'object',
                required: [
                  'tool',
                  'tokens',
                  'cost_usd',
                  'latency_ms',
                  'attempts',
                  'status',
                  'sandbox_state'
                ],
                additionalProperties: false,
                properties: {
                  tool: { type: 'string', minLength: 1 },
                  tokens: { type: 'number', minimum: 0 },
                  cost_usd: { type: 'number', minimum: 0 },
                  latency_ms: { type: 'number', minimum: 0 },
                  attempts: { type: 'integer', minimum: 1 },
                  status: { type: 'string', enum: ['succeeded', 'failed'] },
                  sandbox_state: { type: 'string', enum: ['sandboxed', 'escalated', 'failed'] }
                }
              }
            }
          }
        },
        experiences: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['ids', 'written', 'manifest_path'],
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string', minLength: 1 }
            },
            written: { type: 'integer', minimum: 0 },
            manifest_path: { type: ['string', 'null'] }
          }
        }
      }
    },
    privacy: {
      type: 'object',
      additionalProperties: false,
      required: ['mode', 'decisions', 'totals'],
      properties: {
        mode: { type: 'string', enum: ['shadow', 'enforce'] },
        decisions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['handle_id', 'sequence', 'action', 'timestamp', 'stage_id'],
            properties: {
              handle_id: { type: 'string', minLength: 1 },
              sequence: { type: 'integer', minimum: 0 },
              action: { type: 'string', enum: Array.from(PRIVACY_ACTIONS) },
              rule: { type: ['string', 'null'] },
              reason: { type: ['string', 'null'] },
              timestamp: { type: 'string', minLength: 1 },
              stage_id: { type: ['string', 'null'] }
            }
          }
        },
        totals: {
          type: 'object',
          additionalProperties: false,
          required: ['total_frames', 'redacted_frames', 'blocked_frames', 'allowed_frames'],
          properties: {
            total_frames: { type: 'integer', minimum: 0 },
            redacted_frames: { type: 'integer', minimum: 0 },
            blocked_frames: { type: 'integer', minimum: 0 },
            allowed_frames: { type: 'integer', minimum: 0 }
          }
        },
        log_path: { type: ['string', 'null'] }
      }
    },
    learning: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        snapshot: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: [
            'tag',
            'commit_sha',
            'tarball_path',
            'tarball_digest',
            's3_uri',
            'retention_days',
            'status',
            'attempts',
            'created_at'
          ],
          properties: {
            tag: { type: 'string', minLength: 1 },
            commit_sha: { type: 'string', minLength: 1 },
            tarball_path: { type: 'string', minLength: 1 },
            tarball_digest: { type: 'string', minLength: 1 },
            s3_uri: { type: 'string', minLength: 1 },
            retention_days: { type: 'integer', minimum: 1 },
            status: { type: 'string', enum: Array.from(SNAPSHOT_STATUS) },
            attempts: { type: 'integer', minimum: 0 },
            created_at: { type: 'string', minLength: 1 },
            last_error: { type: ['string', 'null'] },
            git_status_path: { type: ['string', 'null'] },
            git_log_path: { type: ['string', 'null'] }
          }
        },
        queue: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['snapshot_id', 'manifest_path', 'enqueued_at', 'payload_path', 'status'],
          properties: {
            snapshot_id: { type: 'string', minLength: 1 },
            diff_path: { type: ['string', 'null'] },
            prompt_path: { type: ['string', 'null'] },
            execution_history_path: { type: ['string', 'null'] },
            manifest_path: { type: 'string', minLength: 1 },
            enqueued_at: { type: 'string', minLength: 1 },
            payload_path: { type: 'string', minLength: 1 },
            status: { type: 'string', enum: ['queued', 'failed'] }
          }
        },
        scenario: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['path', 'generated_at', 'source', 'status', 'attempts'],
          properties: {
            path: { type: ['string', 'null'] },
            generated_at: { type: ['string', 'null'] },
            source: { type: 'string', enum: ['execution_history', 'prompt', 'diff', 'template', 'manual'] },
            status: { type: 'string', enum: Array.from(SCENARIO_STATUS) },
            attempts: { type: 'integer', minimum: 0 },
            partial_path: { type: ['string', 'null'] },
            manual_template: { type: ['string', 'null'] },
            approver: { type: ['string', 'null'] },
            reason: { type: ['string', 'null'] }
          }
        },
        validation: {
          type: ['object', 'null'],
          additionalProperties: false,
          properties: {
            mode: { type: 'string', enum: Array.from(VALIDATION_MODE) },
            grouping: {
              type: ['object', 'null'],
              additionalProperties: false,
              required: ['id', 'members'],
              properties: {
                id: { type: 'string', minLength: 1 },
                members: { type: 'array', items: { type: 'string', minLength: 1 } },
                window_hours: { type: ['number', 'null'] }
              }
            },
            status: { type: 'string', enum: Array.from(VALIDATION_STATUS) }
          }
        },
        crystalizer: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['candidate_path', 'model', 'prompt_pack', 'prompt_pack_stamp', 'budget_usd', 'cost_usd', 'status', 'created_at'],
          properties: {
            candidate_path: { type: ['string', 'null'] },
            model: { type: 'string', minLength: 1 },
            prompt_pack: { type: 'string', minLength: 1 },
            prompt_pack_stamp: { type: ['string', 'null'] },
            budget_usd: { type: 'number', minimum: 0 },
            cost_usd: { type: ['number', 'null'] },
            status: { type: 'string', enum: Array.from(CRYSTALIZER_STATUS) },
            error: { type: ['string', 'null'] },
            created_at: { type: 'string', minLength: 1 }
          }
        },
        alerts: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'channel', 'target', 'message', 'created_at'],
            properties: {
              type: { type: 'string', enum: Array.from(ALERT_TYPES) },
              channel: { type: 'string', enum: Array.from(ALERT_CHANNELS) },
              target: { type: 'string', minLength: 1 },
              message: { type: 'string', minLength: 1 },
              created_at: { type: 'string', minLength: 1 },
              severity: { type: ['string', 'null'] }
            }
          }
        },
        approvals: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['actor', 'timestamp', 'state'],
            properties: {
              actor: { type: 'string', minLength: 1 },
              timestamp: { type: 'string', minLength: 1 },
              reason: { type: ['string', 'null'] },
              state: { type: 'string', enum: Array.from(APPROVAL_STATES) }
            }
          }
        },
        review: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['rejections', 'latency_ms', 'updated_at'],
          properties: {
            rejections: { type: 'integer', minimum: 0 },
            latency_ms: { type: ['number', 'null'] },
            last_reviewer: { type: ['string', 'null'] },
            updated_at: { type: 'string', minLength: 1 }
          }
        },
        regressions: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['detected'],
          properties: {
            detected: { type: 'integer', minimum: 0 },
            detail_path: { type: ['string', 'null'] }
          }
        },
        pattern_hygiene: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['promoted', 'deprecated', 'updated_at'],
          properties: {
            promoted: { type: 'integer', minimum: 0 },
            deprecated: { type: 'integer', minimum: 0 },
            notes: { type: ['array', 'null'], items: { type: 'string' } },
            updated_at: { type: 'string', minLength: 1 }
          }
        },
        throughput: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['candidates', 'active', 'deprecated', 'updated_at'],
          properties: {
            candidates: { type: 'integer', minimum: 0 },
            active: { type: 'integer', minimum: 0 },
            deprecated: { type: 'integer', minimum: 0 },
            updated_at: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    guardrail_status: {
      type: 'object',
      additionalProperties: false,
      required: ['present', 'recommendation', 'summary', 'computed_at', 'counts'],
      properties: {
        present: { type: 'boolean' },
        recommendation: { type: ['string', 'null'] },
        summary: { type: 'string', minLength: 1 },
        computed_at: { type: 'string', minLength: 1 },
        counts: {
          type: 'object',
          additionalProperties: false,
          required: ['total', 'succeeded', 'failed', 'skipped', 'other'],
          properties: {
            total: { type: 'integer', minimum: 0 },
            succeeded: { type: 'integer', minimum: 0 },
            failed: { type: 'integer', minimum: 0 },
            skipped: { type: 'integer', minimum: 0 },
            other: { type: 'integer', minimum: 0 }
          }
        }
      }
    }
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
  validateOptionalString(candidate, 'plan_target_id', errors);
  validateOptionalString(candidate, 'completed_at', errors);
  validateOptionalString(candidate, 'heartbeat_at', errors);
  validateOptionalString(candidate, 'summary', errors);
  validateOptionalString(candidate, 'run_summary_path', errors);
  validateOptionalString(candidate, 'instructions_hash', errors);
  if (!Array.isArray(candidate.instructions_sources)) {
    errors.push('instructions_sources must be an array');
  } else if (!candidate.instructions_sources.every((source: unknown) => typeof source === 'string')) {
    errors.push('instructions_sources must contain only strings');
  }
  validatePromptPacks(candidate.prompt_packs, errors);
  validateTfgrpo(candidate.tfgrpo, errors);

  validateBoolean(candidate, 'metrics_recorded', errors);

  const status = candidate.status;
  if (typeof status !== 'string' || !RUN_STATUS.has(status)) {
    errors.push(`status must be one of ${Array.from(RUN_STATUS).join(', ')}`);
  }

  validateCommands(candidate.commands, errors);
  validateChildRuns(candidate.child_runs, errors);
  validateResumeEvents(candidate.resume_events, errors);
  validateApprovals(candidate.approvals, errors);
  validatePrivacy(candidate.privacy, errors);
  validateLearning(candidate.learning, errors);

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

function validatePromptPacks(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!Array.isArray(candidate)) {
    errors.push('prompt_packs must be an array when provided');
    return;
  }
  candidate.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`prompt_packs[${index}] must be an object`);
      return;
    }
    const pack = entry as Record<string, unknown>;
    validateString(pack, 'id', errors, `prompt_packs[${index}]`);
    validateString(pack, 'domain', errors, `prompt_packs[${index}]`);
    validateString(pack, 'stamp', errors, `prompt_packs[${index}]`);
    validateNumber(pack, 'experience_slots', errors, {
      integer: true,
      minimum: 0,
      path: `prompt_packs[${index}].experience_slots`
    });
    const sources = pack.sources;
    if (!Array.isArray(sources)) {
      errors.push(`prompt_packs[${index}].sources must be an array`);
    } else if (!sources.every((source) => typeof source === 'string')) {
      errors.push(`prompt_packs[${index}].sources must contain strings only`);
    }
    if (pack.experiences !== undefined && pack.experiences !== null) {
      if (!Array.isArray(pack.experiences)) {
        errors.push(`prompt_packs[${index}].experiences must be an array when provided`);
      } else if (!pack.experiences.every((entry: unknown) => typeof entry === 'string')) {
        errors.push(`prompt_packs[${index}].experiences must contain strings`);
      }
    }
  });
}

function validateTfgrpo(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('tfgrpo must be an object when provided');
    return;
  }
  const section = candidate as Record<string, unknown>;
  validateOptionalNumber(section, 'epoch', errors, { integer: true, path: 'tfgrpo.epoch' });
  validateOptionalString(section, 'group_id', errors, 'tfgrpo');
  validateOptionalNumber(section, 'group_size', errors, { integer: true, path: 'tfgrpo.group_size' });
  if ('tool_metrics' in section) {
    validateTfgrpoToolMetrics(section.tool_metrics, errors);
  }
  if ('experiences' in section) {
    validateTfgrpoExperiences(section.experiences, errors);
  }
}

function validateTfgrpoToolMetrics(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('tfgrpo.tool_metrics must be an object when provided');
    return;
  }
  const metrics = candidate as Record<string, unknown>;
  validateNumber(metrics, 'tool_calls', errors, { integer: true, minimum: 0, path: 'tfgrpo.tool_metrics.tool_calls' });
  validateNumber(metrics, 'token_total', errors, { minimum: 0, path: 'tfgrpo.tool_metrics.token_total' });
  validateNumber(metrics, 'cost_usd', errors, { minimum: 0, path: 'tfgrpo.tool_metrics.cost_usd' });
  validateNumber(metrics, 'latency_ms', errors, { minimum: 0, path: 'tfgrpo.tool_metrics.latency_ms' });

  const perTool = metrics.per_tool;
  if (!Array.isArray(perTool)) {
    errors.push('tfgrpo.tool_metrics.per_tool must be an array');
    return;
  }
  perTool.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`tfgrpo.tool_metrics.per_tool[${index}] must be an object`);
      return;
    }
    const record = entry as Record<string, unknown>;
    validateString(record, 'tool', errors, `tfgrpo.tool_metrics.per_tool[${index}]`);
    validateNumber(record, 'tokens', errors, { minimum: 0, path: `tfgrpo.tool_metrics.per_tool[${index}].tokens` });
    validateNumber(record, 'cost_usd', errors, { minimum: 0, path: `tfgrpo.tool_metrics.per_tool[${index}].cost_usd` });
    validateNumber(record, 'latency_ms', errors, { minimum: 0, path: `tfgrpo.tool_metrics.per_tool[${index}].latency_ms` });
    validateNumber(record, 'attempts', errors, { integer: true, minimum: 1, path: `tfgrpo.tool_metrics.per_tool[${index}].attempts` });
    const status = record.status;
    if (status !== 'succeeded' && status !== 'failed') {
      errors.push(`tfgrpo.tool_metrics.per_tool[${index}].status must be "succeeded" or "failed"`);
    }
    const sandbox = record.sandbox_state;
    if (sandbox !== 'sandboxed' && sandbox !== 'escalated' && sandbox !== 'failed') {
      errors.push(`tfgrpo.tool_metrics.per_tool[${index}].sandbox_state must be sandboxed, escalated, or failed`);
    }
  });
}

function validateTfgrpoExperiences(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('tfgrpo.experiences must be an object when provided');
    return;
  }
  const experiences = candidate as Record<string, unknown>;
  const ids = experiences.ids;
  if (!Array.isArray(ids)) {
    errors.push('tfgrpo.experiences.ids must be an array');
  } else if (!ids.every((value) => typeof value === 'string' && value.length > 0)) {
    errors.push('tfgrpo.experiences.ids must contain non-empty strings');
  }
  validateNumber(experiences, 'written', errors, { integer: true, minimum: 0, path: 'tfgrpo.experiences.written' });
  validateOptionalString(experiences, 'manifest_path', errors, 'tfgrpo.experiences');
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

function validatePrivacy(candidate: unknown, errors: string[]): void {
  if (candidate === undefined) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('privacy must be an object when provided');
    return;
  }

  const privacy = candidate as Record<string, unknown>;

  const mode = privacy.mode;
  if (mode !== 'shadow' && mode !== 'enforce') {
    errors.push('privacy.mode must be either "shadow" or "enforce"');
  }

  const decisions = privacy.decisions;
  if (!Array.isArray(decisions)) {
    errors.push('privacy.decisions must be an array');
  } else {
    decisions.forEach((decision, index) => {
      if (!isPlainObject(decision)) {
        errors.push(`privacy.decisions[${index}] must be an object`);
        return;
      }
      const decisionRecord = decision as Record<string, unknown>;
      validateString(decisionRecord, 'handle_id', errors, `privacy.decisions[${index}]`);
      validateNumber(decisionRecord, 'sequence', errors, { integer: true, minimum: 0, path: `privacy.decisions[${index}].sequence` });
      const action = decisionRecord.action;
      if (typeof action !== 'string' || !PRIVACY_ACTIONS.has(action)) {
        errors.push(`privacy.decisions[${index}].action must be one of ${Array.from(PRIVACY_ACTIONS).join(', ')}`);
      }
      validateOptionalString(decisionRecord, 'rule', errors, `privacy.decisions[${index}]`);
      validateOptionalString(decisionRecord, 'reason', errors, `privacy.decisions[${index}]`);
      validateString(decisionRecord, 'timestamp', errors, `privacy.decisions[${index}]`);
      if (!('stage_id' in decisionRecord) || (decisionRecord.stage_id !== null && typeof decisionRecord.stage_id !== 'string')) {
        errors.push(`privacy.decisions[${index}].stage_id must be string or null`);
      }
    });
  }

  const totals = privacy.totals;
  if (!isPlainObject(totals)) {
    errors.push('privacy.totals must be an object');
  } else {
    const totalsRecord = totals as Record<string, unknown>;
    validateNumber(totalsRecord, 'total_frames', errors, { minimum: 0, integer: true, path: 'privacy.totals.total_frames' });
    validateNumber(totalsRecord, 'redacted_frames', errors, { minimum: 0, integer: true, path: 'privacy.totals.redacted_frames' });
    validateNumber(totalsRecord, 'blocked_frames', errors, { minimum: 0, integer: true, path: 'privacy.totals.blocked_frames' });
    validateNumber(totalsRecord, 'allowed_frames', errors, { minimum: 0, integer: true, path: 'privacy.totals.allowed_frames' });
  }

  if ('log_path' in privacy) {
    validateOptionalString(privacy, 'log_path', errors, 'privacy');
  }
}

function validateLearning(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning must be an object when provided');
    return;
  }
  const learning = candidate as Record<string, unknown>;
  if ('snapshot' in learning) {
    validateLearningSnapshot(learning.snapshot, errors);
  }
  if ('queue' in learning) {
    validateLearningQueue(learning.queue, errors);
  }
  if ('scenario' in learning) {
    validateLearningScenario(learning.scenario, errors);
  }
  if ('validation' in learning) {
    validateLearningValidation(learning.validation, errors);
  }
  if ('crystalizer' in learning) {
    validateLearningCrystalizer(learning.crystalizer, errors);
  }
  if ('alerts' in learning) {
    validateLearningAlerts(learning.alerts, errors);
  }
  if ('approvals' in learning) {
    validateLearningApprovals(learning.approvals, errors);
  }
  if ('review' in learning) {
    validateLearningReview(learning.review, errors);
  }
  if ('regressions' in learning) {
    validateLearningRegressions(learning.regressions, errors);
  }
  if ('pattern_hygiene' in learning) {
    validateLearningPatternHygiene(learning.pattern_hygiene, errors);
  }
  if ('throughput' in learning) {
    validateLearningThroughput(learning.throughput, errors);
  }
}

function validateLearningSnapshot(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.snapshot must be an object when provided');
    return;
  }
  const snapshot = candidate as Record<string, unknown>;
  validateString(snapshot, 'tag', errors, 'learning.snapshot');
  validateString(snapshot, 'commit_sha', errors, 'learning.snapshot');
  validateString(snapshot, 'tarball_path', errors, 'learning.snapshot');
  validateString(snapshot, 'tarball_digest', errors, 'learning.snapshot');
  validateString(snapshot, 's3_uri', errors, 'learning.snapshot');
  validateNumber(snapshot, 'retention_days', errors, { integer: true, minimum: 1, path: 'learning.snapshot.retention_days' });
  validateNumber(snapshot, 'attempts', errors, { integer: true, minimum: 0, path: 'learning.snapshot.attempts' });
  validateString(snapshot, 'created_at', errors, 'learning.snapshot');
  const status = snapshot.status;
  if (typeof status !== 'string' || !SNAPSHOT_STATUS.has(status)) {
    errors.push(`learning.snapshot.status must be one of ${Array.from(SNAPSHOT_STATUS).join(', ')}`);
  }
  validateOptionalString(snapshot, 'last_error', errors, 'learning.snapshot');
  validateOptionalString(snapshot, 'git_status_path', errors, 'learning.snapshot');
  validateOptionalString(snapshot, 'git_log_path', errors, 'learning.snapshot');
}

function validateLearningQueue(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.queue must be an object when provided');
    return;
  }
  const queue = candidate as Record<string, unknown>;
  validateString(queue, 'snapshot_id', errors, 'learning.queue');
  validateOptionalString(queue, 'diff_path', errors, 'learning.queue');
  validateOptionalString(queue, 'prompt_path', errors, 'learning.queue');
  validateOptionalString(queue, 'execution_history_path', errors, 'learning.queue');
  validateString(queue, 'manifest_path', errors, 'learning.queue');
  validateString(queue, 'enqueued_at', errors, 'learning.queue');
  validateString(queue, 'payload_path', errors, 'learning.queue');
  const status = queue.status;
  if (status !== 'queued' && status !== 'failed') {
    errors.push('learning.queue.status must be queued or failed');
  }
}

function validateLearningScenario(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.scenario must be an object when provided');
    return;
  }
  const scenario = candidate as Record<string, unknown>;
  validateOptionalString(scenario, 'path', errors, 'learning.scenario');
  validateOptionalString(scenario, 'generated_at', errors, 'learning.scenario');
  validateOptionalString(scenario, 'partial_path', errors, 'learning.scenario');
  validateOptionalString(scenario, 'manual_template', errors, 'learning.scenario');
  validateOptionalString(scenario, 'approver', errors, 'learning.scenario');
  validateOptionalString(scenario, 'reason', errors, 'learning.scenario');
  validateNumber(scenario, 'attempts', errors, { integer: true, minimum: 0, path: 'learning.scenario.attempts' });
  const source = scenario.source;
  if (
    source !== 'execution_history' &&
    source !== 'prompt' &&
    source !== 'diff' &&
    source !== 'template' &&
    source !== 'manual'
  ) {
    errors.push(
      'learning.scenario.source must be execution_history, prompt, diff, template, or manual'
    );
  }
  const status = scenario.status;
  if (typeof status !== 'string' || !SCENARIO_STATUS.has(status)) {
    errors.push(`learning.scenario.status must be one of ${Array.from(SCENARIO_STATUS).join(', ')}`);
  }
}

function validateLearningValidation(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.validation must be an object when provided');
    return;
  }
  const validation = candidate as Record<string, unknown>;
  if ('mode' in validation) {
    const mode = validation.mode;
    if (typeof mode !== 'string' || !VALIDATION_MODE.has(mode)) {
      errors.push(`learning.validation.mode must be one of ${Array.from(VALIDATION_MODE).join(', ')}`);
    }
  }
  if ('status' in validation) {
    const status = validation.status;
    if (typeof status !== 'string' || !VALIDATION_STATUS.has(status)) {
      errors.push(`learning.validation.status must be one of ${Array.from(VALIDATION_STATUS).join(', ')}`);
    }
  }
  if ('grouping' in validation) {
    const grouping = validation.grouping;
    if (grouping !== null && grouping !== undefined) {
      if (!isPlainObject(grouping)) {
        errors.push('learning.validation.grouping must be an object when provided');
      } else {
        const groupRecord = grouping as Record<string, unknown>;
        validateString(groupRecord, 'id', errors, 'learning.validation.grouping');
        const members = groupRecord.members;
        if (!Array.isArray(members)) {
          errors.push('learning.validation.grouping.members must be an array');
        } else if (!members.every((entry) => typeof entry === 'string' && entry.length > 0)) {
          errors.push('learning.validation.grouping.members must contain non-empty strings');
        }
        if ('window_hours' in groupRecord && groupRecord.window_hours !== null && groupRecord.window_hours !== undefined) {
          if (typeof groupRecord.window_hours !== 'number' || Number.isNaN(groupRecord.window_hours)) {
            errors.push('learning.validation.grouping.window_hours must be a number when provided');
          }
        }
      }
    }
  }
}

function validateLearningCrystalizer(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.crystalizer must be an object when provided');
    return;
  }
  const crystal = candidate as Record<string, unknown>;
  validateOptionalString(crystal, 'candidate_path', errors, 'learning.crystalizer');
  validateString(crystal, 'model', errors, 'learning.crystalizer');
  validateString(crystal, 'prompt_pack', errors, 'learning.crystalizer');
  validateOptionalString(crystal, 'prompt_pack_stamp', errors, 'learning.crystalizer');
  validateNumber(crystal, 'budget_usd', errors, { minimum: 0, path: 'learning.crystalizer.budget_usd' });
  if ('cost_usd' in crystal && crystal.cost_usd !== null) {
    validateNumber(crystal, 'cost_usd', errors, { minimum: 0, path: 'learning.crystalizer.cost_usd' });
  }
  validateString(crystal, 'created_at', errors, 'learning.crystalizer');
  const status = crystal.status;
  if (typeof status !== 'string' || !CRYSTALIZER_STATUS.has(status)) {
    errors.push(`learning.crystalizer.status must be one of ${Array.from(CRYSTALIZER_STATUS).join(', ')}`);
  }
  validateOptionalString(crystal, 'error', errors, 'learning.crystalizer');
}

function validateLearningAlerts(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!Array.isArray(candidate)) {
    errors.push('learning.alerts must be an array when provided');
    return;
  }
  candidate.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`learning.alerts[${index}] must be an object`);
      return;
    }
    const alert = entry as Record<string, unknown>;
    validateString(alert, 'target', errors, `learning.alerts[${index}]`);
    validateString(alert, 'message', errors, `learning.alerts[${index}]`);
    validateString(alert, 'created_at', errors, `learning.alerts[${index}]`);
    const type = alert.type;
    if (typeof type !== 'string' || !ALERT_TYPES.has(type)) {
      errors.push(`learning.alerts[${index}].type must be one of ${Array.from(ALERT_TYPES).join(', ')}`);
    }
    const channel = alert.channel;
    if (typeof channel !== 'string' || !ALERT_CHANNELS.has(channel)) {
      errors.push(
        `learning.alerts[${index}].channel must be one of ${Array.from(ALERT_CHANNELS).join(', ')}`
      );
    }
  });
}

function validateLearningApprovals(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!Array.isArray(candidate)) {
    errors.push('learning.approvals must be an array when provided');
    return;
  }
  candidate.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`learning.approvals[${index}] must be an object`);
      return;
    }
    const approval = entry as Record<string, unknown>;
    validateString(approval, 'actor', errors, `learning.approvals[${index}]`);
    validateString(approval, 'timestamp', errors, `learning.approvals[${index}]`);
    validateOptionalString(approval, 'reason', errors, `learning.approvals[${index}]`);
    const state = approval.state;
    if (typeof state !== 'string' || !APPROVAL_STATES.has(state)) {
      errors.push(`learning.approvals[${index}].state must be one of ${Array.from(APPROVAL_STATES).join(', ')}`);
    }
  });
}

function validateLearningReview(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.review must be an object when provided');
    return;
  }
  const review = candidate as Record<string, unknown>;
  validateNumber(review, 'rejections', errors, { integer: true, minimum: 0, path: 'learning.review.rejections' });
  if ('latency_ms' in review && review.latency_ms !== null) {
    validateNumber(review, 'latency_ms', errors, { path: 'learning.review.latency_ms' });
  }
  validateOptionalString(review, 'last_reviewer', errors, 'learning.review');
  validateString(review, 'updated_at', errors, 'learning.review');
}

function validateLearningRegressions(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.regressions must be an object when provided');
    return;
  }
  const regressions = candidate as Record<string, unknown>;
  validateNumber(regressions, 'detected', errors, { integer: true, minimum: 0, path: 'learning.regressions.detected' });
  validateOptionalString(regressions, 'detail_path', errors, 'learning.regressions');
}

function validateLearningPatternHygiene(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.pattern_hygiene must be an object when provided');
    return;
  }
  const hygiene = candidate as Record<string, unknown>;
  validateNumber(hygiene, 'promoted', errors, { integer: true, minimum: 0, path: 'learning.pattern_hygiene.promoted' });
  validateNumber(hygiene, 'deprecated', errors, { integer: true, minimum: 0, path: 'learning.pattern_hygiene.deprecated' });
  if ('notes' in hygiene && hygiene.notes !== null) {
    if (!Array.isArray(hygiene.notes)) {
      errors.push('learning.pattern_hygiene.notes must be an array when provided');
    }
  }
  validateString(hygiene, 'updated_at', errors, 'learning.pattern_hygiene');
}

function validateLearningThroughput(candidate: unknown, errors: string[]): void {
  if (candidate === undefined || candidate === null) {
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push('learning.throughput must be an object when provided');
    return;
  }
  const throughput = candidate as Record<string, unknown>;
  validateNumber(throughput, 'candidates', errors, { integer: true, minimum: 0, path: 'learning.throughput.candidates' });
  validateNumber(throughput, 'active', errors, { integer: true, minimum: 0, path: 'learning.throughput.active' });
  validateNumber(throughput, 'deprecated', errors, { integer: true, minimum: 0, path: 'learning.throughput.deprecated' });
  validateString(throughput, 'updated_at', errors, 'learning.throughput');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
