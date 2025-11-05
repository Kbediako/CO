export const CONTROL_PLANE_RUN_REQUEST_SCHEMA = 'codex.control-plane.run-request';
export const CONTROL_PLANE_RUN_REQUEST_VERSION = '2.0.0';

export interface RunRequestStage {
  id: string;
  kind: 'command' | 'subpipeline';
  title: string;
  optional?: boolean;
  capabilities?: string[];
}

export interface RunRequestScheduleFanOut {
  capability: string;
  weight: number;
  maxConcurrency?: number;
}

export interface RunRequestScheduleRecovery {
  heartbeatIntervalSeconds: number;
  missingHeartbeatTimeoutSeconds: number;
  maxRetries: number;
}

export interface RunRequestSchedule {
  strategy: 'auto' | 'manual';
  minInstances: number;
  maxInstances: number;
  fanOut: RunRequestScheduleFanOut[];
  recovery: RunRequestScheduleRecovery;
}

export interface RunRequestStreamingObservers {
  maxSubscribers: number;
  defaultBackpressureMs: number;
}

export interface RunRequestStreaming {
  handles: boolean;
  resumeSupported: boolean;
  observers: RunRequestStreamingObservers;
}

export interface RunRequestConstraints {
  privacyLevel: 'standard' | 'restricted' | 'sensitive';
  dataResidency?: string;
  policyVersion: string;
}

export interface RunRequestMetrics {
  emitIntervalSeconds: number;
  requiredDimensions: string[];
}

export interface RunRequestTask {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface RunRequestPipeline {
  id: string;
  version: string;
  title: string;
  capabilities: string[];
  stages: RunRequestStage[];
}

export interface RunRequestRequestedBy {
  actorId: string;
  channel: string;
  name?: string;
}

export interface RunRequestV2 {
  schema: typeof CONTROL_PLANE_RUN_REQUEST_SCHEMA;
  version: typeof CONTROL_PLANE_RUN_REQUEST_VERSION;
  requestId: string;
  task: RunRequestTask;
  pipeline: RunRequestPipeline;
  schedule: RunRequestSchedule;
  streaming: RunRequestStreaming;
  constraints: RunRequestConstraints;
  metrics: RunRequestMetrics;
  requestedAt: string;
  requestedBy: RunRequestRequestedBy;
  metadata?: Record<string, unknown>;
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  expected?: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  errors: ValidationError[];
}

const PRIVACY_LEVELS = new Set<RunRequestConstraints['privacyLevel']>([
  'standard',
  'restricted',
  'sensitive'
]);

const STAGE_KINDS = new Set<RunRequestStage['kind']>(['command', 'subpipeline']);
const SCHEDULE_STRATEGIES = new Set<RunRequestSchedule['strategy']>(['auto', 'manual']);

export function validateRunRequestV2(payload: unknown): ValidationResult<RunRequestV2> {
  const errors: ValidationError[] = [];
  if (!isPlainObject(payload)) {
    errors.push({
      path: '$',
      message: 'Run request must be an object.',
      value: payload
    });
    return { valid: false, errors };
  }

  const schema = requireString(payload, 'schema', '$.schema', errors, { minLength: 1 });
  if (schema && schema !== CONTROL_PLANE_RUN_REQUEST_SCHEMA) {
    errors.push({
      path: '$.schema',
      message: `Expected schema to equal ${CONTROL_PLANE_RUN_REQUEST_SCHEMA}.`,
      value: schema,
      expected: CONTROL_PLANE_RUN_REQUEST_SCHEMA
    });
  }

  const version = requireString(payload, 'version', '$.version', errors, { minLength: 1 });
  if (version && version !== CONTROL_PLANE_RUN_REQUEST_VERSION) {
    errors.push({
      path: '$.version',
      message: `Expected version to equal ${CONTROL_PLANE_RUN_REQUEST_VERSION}.`,
      value: version,
      expected: CONTROL_PLANE_RUN_REQUEST_VERSION
    });
  }

  const requestId = requireString(payload, 'requestId', '$.requestId', errors, { minLength: 1 });

  const task = validateTask(payload, errors);
  const pipeline = validatePipeline(payload, errors);
  const schedule = validateSchedule(payload, errors);
  const streaming = validateStreaming(payload, errors);
  const constraints = validateConstraints(payload, errors);
  const metrics = validateMetrics(payload, errors);

  const requestedAt = requireString(payload, 'requestedAt', '$.requestedAt', errors, {
    minLength: 1
  });
  if (requestedAt && Number.isNaN(Date.parse(requestedAt))) {
    errors.push({
      path: '$.requestedAt',
      message: 'requestedAt must be an ISO 8601 timestamp.',
      value: requestedAt
    });
  }

  const requestedBy = validateRequestedBy(payload, errors);

  const metadata = optionalRecord(payload, 'metadata', '$.metadata', errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      schema: CONTROL_PLANE_RUN_REQUEST_SCHEMA,
      version: CONTROL_PLANE_RUN_REQUEST_VERSION,
      requestId: requestId!,
      task: task!,
      pipeline: pipeline!,
      schedule: schedule!,
      streaming: streaming!,
      constraints: constraints!,
      metrics: metrics!,
      requestedAt: requestedAt!,
      requestedBy: requestedBy!,
      metadata: metadata ?? undefined
    },
    errors: []
  };
}

function validateTask(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): RunRequestTask | undefined {
  const path = '$.task';
  const value = requireRecord(payload, 'task', path, errors);
  if (!value) {
    return undefined;
  }

  const id = requireString(value, 'id', `${path}.id`, errors, { minLength: 1 });
  const title = requireString(value, 'title', `${path}.title`, errors, { minLength: 1 });
  const slug = optionalString(value, 'slug', `${path}.slug`, errors);
  const description = optionalString(value, 'description', `${path}.description`, errors);
  const metadata = optionalRecord(value, 'metadata', `${path}.metadata`, errors);
  const tags = optionalStringArray(value, 'tags', `${path}.tags`, errors, { minLength: 1 });

  if (!id || !title) {
    return undefined;
  }

  return {
    id,
    title,
    slug: slug ?? undefined,
    description: description ?? undefined,
    metadata: metadata ?? undefined,
    tags: tags ?? undefined
  };
}

function validatePipeline(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): RunRequestPipeline | undefined {
  const path = '$.pipeline';
  const value = requireRecord(payload, 'pipeline', path, errors);
  if (!value) {
    return undefined;
  }

  const id = requireString(value, 'id', `${path}.id`, errors, { minLength: 1 });
  const version = requireString(value, 'version', `${path}.version`, errors, { minLength: 1 });
  const title = requireString(value, 'title', `${path}.title`, errors, { minLength: 1 });
  const capabilities = requireStringArray(value, 'capabilities', `${path}.capabilities`, errors, {
    minLength: 1,
    allowEmpty: false
  });

  const stagesValue = requireArray(value, 'stages', `${path}.stages`, errors, {
    minLength: 1
  });
  const stages: RunRequestStage[] = [];
  if (stagesValue) {
    stagesValue.forEach((stagePayload, index) => {
      const stagePath = `${path}.stages[${index}]`;
      if (!isPlainObject(stagePayload)) {
        errors.push({
          path: stagePath,
          message: 'Stage entry must be an object.',
          value: stagePayload
        });
        return;
      }
      const stageId = requireString(stagePayload, 'id', `${stagePath}.id`, errors, { minLength: 1 });
      const kind = requireString(stagePayload, 'kind', `${stagePath}.kind`, errors, {
        minLength: 1
      });
      if (kind && !STAGE_KINDS.has(kind as RunRequestStage['kind'])) {
        errors.push({
          path: `${stagePath}.kind`,
          message: "Stage kind must be 'command' or 'subpipeline'.",
          value: kind
        });
      }
      const titleValue = requireString(stagePayload, 'title', `${stagePath}.title`, errors, {
        minLength: 1
      });
      const optional = optionalBoolean(stagePayload, 'optional', `${stagePath}.optional`, errors);
      const stageCapabilities = optionalStringArray(
        stagePayload,
        'capabilities',
        `${stagePath}.capabilities`,
        errors,
        { minLength: 1 }
      );

      if (stageId && titleValue && kind && STAGE_KINDS.has(kind as RunRequestStage['kind'])) {
        stages.push({
          id: stageId,
          title: titleValue,
          kind: kind as RunRequestStage['kind'],
          optional: optional ?? undefined,
          capabilities: stageCapabilities ?? undefined
        });
      }
    });
  }

  if (!id || !version || !title || !capabilities || stages.length === 0) {
    return undefined;
  }

  return {
    id,
    version,
    title,
    capabilities,
    stages
  };
}

function validateSchedule(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): RunRequestSchedule | undefined {
  const path = '$.schedule';
  const value = requireRecord(payload, 'schedule', path, errors);
  if (!value) {
    return undefined;
  }

  const strategyValue = requireString(value, 'strategy', `${path}.strategy`, errors, {
    minLength: 1
  });
  if (strategyValue && !SCHEDULE_STRATEGIES.has(strategyValue as RunRequestSchedule['strategy'])) {
    errors.push({
      path: `${path}.strategy`,
      message: "strategy must be 'auto' or 'manual'.",
      value: strategyValue
    });
  }

  const minInstances = requireInteger(value, 'minInstances', `${path}.minInstances`, errors, {
    min: 1
  });
  const maxInstances = requireInteger(value, 'maxInstances', `${path}.maxInstances`, errors, {
    min: 1
  });

  if (
    typeof minInstances === 'number' &&
    typeof maxInstances === 'number' &&
    maxInstances < minInstances
  ) {
    errors.push({
      path: path,
      message: 'maxInstances must be greater than or equal to minInstances.',
      value: { minInstances, maxInstances }
    });
  }

  const fanOutPayload = requireArray(value, 'fanOut', `${path}.fanOut`, errors, { minLength: 1 });
  const fanOut: RunRequestScheduleFanOut[] = [];
  if (fanOutPayload) {
    fanOutPayload.forEach((entry, index) => {
      const entryPath = `${path}.fanOut[${index}]`;
      if (!isPlainObject(entry)) {
        errors.push({
          path: entryPath,
          message: 'fanOut entries must be objects.',
          value: entry
        });
        return;
      }
      const capability = requireString(entry, 'capability', `${entryPath}.capability`, errors, {
        minLength: 1
      });
      const weight = requireNumber(entry, 'weight', `${entryPath}.weight`, errors, {
        min: 0,
        exclusiveMin: true
      });
      const maxConcurrency = optionalInteger(
        entry,
        'maxConcurrency',
        `${entryPath}.maxConcurrency`,
        errors,
        { min: 1 }
      );
      if (capability && typeof weight === 'number') {
        fanOut.push({
          capability,
          weight,
          maxConcurrency: maxConcurrency ?? undefined
        });
      }
    });
  }

  const recoveryPayload = requireRecord(value, 'recovery', `${path}.recovery`, errors);
  let recovery: RunRequestScheduleRecovery | undefined;
  if (recoveryPayload) {
    const heartbeatIntervalSeconds = requireInteger(
      recoveryPayload,
      'heartbeatIntervalSeconds',
      `${path}.recovery.heartbeatIntervalSeconds`,
      errors,
      { min: 1 }
    );
    const missingHeartbeatTimeoutSeconds = requireInteger(
      recoveryPayload,
      'missingHeartbeatTimeoutSeconds',
      `${path}.recovery.missingHeartbeatTimeoutSeconds`,
      errors,
      { min: 1 }
    );
    const maxRetries = requireInteger(
      recoveryPayload,
      'maxRetries',
      `${path}.recovery.maxRetries`,
      errors,
      { min: 0 }
    );

    if (
      typeof heartbeatIntervalSeconds === 'number' &&
      typeof missingHeartbeatTimeoutSeconds === 'number' &&
      typeof maxRetries === 'number'
    ) {
      recovery = {
        heartbeatIntervalSeconds,
        missingHeartbeatTimeoutSeconds,
        maxRetries
      };
    }
  }

  if (
    !strategyValue ||
    typeof minInstances !== 'number' ||
    typeof maxInstances !== 'number' ||
    fanOut.length === 0 ||
    !recovery
  ) {
    return undefined;
  }

  return {
    strategy: strategyValue as RunRequestSchedule['strategy'],
    minInstances,
    maxInstances,
    fanOut,
    recovery
  };
}

function validateStreaming(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): RunRequestStreaming | undefined {
  const path = '$.streaming';
  const value = requireRecord(payload, 'streaming', path, errors);
  if (!value) {
    return undefined;
  }

  const handles = requireBoolean(value, 'handles', `${path}.handles`, errors);
  const resumeSupported = requireBoolean(value, 'resumeSupported', `${path}.resumeSupported`, errors);

  const observersPayload = requireRecord(value, 'observers', `${path}.observers`, errors);
  let observers: RunRequestStreamingObservers | undefined;
  if (observersPayload) {
    const maxSubscribers = requireInteger(
      observersPayload,
      'maxSubscribers',
      `${path}.observers.maxSubscribers`,
      errors,
      { min: 1 }
    );
    const defaultBackpressureMs = requireInteger(
      observersPayload,
      'defaultBackpressureMs',
      `${path}.observers.defaultBackpressureMs`,
      errors,
      { min: 0 }
    );
    if (typeof maxSubscribers === 'number' && typeof defaultBackpressureMs === 'number') {
      observers = { maxSubscribers, defaultBackpressureMs };
    }
  }

  if (typeof handles !== 'boolean' || typeof resumeSupported !== 'boolean' || !observers) {
    return undefined;
  }

  return {
    handles,
    resumeSupported,
    observers
  };
}

function validateConstraints(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): RunRequestConstraints | undefined {
  const path = '$.constraints';
  const value = requireRecord(payload, 'constraints', path, errors);
  if (!value) {
    return undefined;
  }

  const privacyLevel = requireString(value, 'privacyLevel', `${path}.privacyLevel`, errors, {
    minLength: 1
  });
  if (privacyLevel && !PRIVACY_LEVELS.has(privacyLevel as RunRequestConstraints['privacyLevel'])) {
    errors.push({
      path: `${path}.privacyLevel`,
      message: "privacyLevel must be 'standard', 'restricted', or 'sensitive'.",
      value: privacyLevel
    });
  }

  const dataResidency = optionalString(value, 'dataResidency', `${path}.dataResidency`, errors);
  const policyVersion = requireString(value, 'policyVersion', `${path}.policyVersion`, errors, {
    minLength: 1
  });

  if (!privacyLevel || !policyVersion) {
    return undefined;
  }

  return {
    privacyLevel: privacyLevel as RunRequestConstraints['privacyLevel'],
    dataResidency: dataResidency ?? undefined,
    policyVersion
  };
}

function validateMetrics(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): RunRequestMetrics | undefined {
  const path = '$.metrics';
  const value = requireRecord(payload, 'metrics', path, errors);
  if (!value) {
    return undefined;
  }

  const emitIntervalSeconds = requireInteger(
    value,
    'emitIntervalSeconds',
    `${path}.emitIntervalSeconds`,
    errors,
    { min: 1 }
  );
  const requiredDimensions = requireStringArray(
    value,
    'requiredDimensions',
    `${path}.requiredDimensions`,
    errors,
    { minLength: 1, allowEmpty: false }
  );

  if (typeof emitIntervalSeconds !== 'number' || !requiredDimensions) {
    return undefined;
  }

  return {
    emitIntervalSeconds,
    requiredDimensions
  };
}

function validateRequestedBy(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): RunRequestRequestedBy | undefined {
  const path = '$.requestedBy';
  const value = requireRecord(payload, 'requestedBy', path, errors);
  if (!value) {
    return undefined;
  }

  const actorId = requireString(value, 'actorId', `${path}.actorId`, errors, { minLength: 1 });
  const channel = requireString(value, 'channel', `${path}.channel`, errors, { minLength: 1 });
  const name = optionalString(value, 'name', `${path}.name`, errors);

  if (!actorId || !channel) {
    return undefined;
  }

  return {
    actorId,
    channel,
    name: name ?? undefined
  };
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  options: { minLength?: number } = {}
): string | undefined {
  const value = record[key];
  if (typeof value !== 'string') {
    errors.push({ path, message: 'Expected a string.', value });
    return undefined;
  }
  if (typeof options.minLength === 'number' && value.length < options.minLength) {
    errors.push({
      path,
      message: `String must be at least ${options.minLength} characters.`,
      value
    });
    return undefined;
  }
  return value;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[]
): string | null {
  if (!(key in record)) {
    return null;
  }
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  errors.push({ path, message: 'Expected a string.', value });
  return null;
}

function requireNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  options: { min?: number; exclusiveMin?: boolean } = {}
): number | undefined {
  const value = record[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    errors.push({ path, message: 'Expected a number.', value });
    return undefined;
  }
  if (typeof options.min === 'number') {
    const compare = options.exclusiveMin ? value <= options.min : value < options.min;
    if (compare) {
      errors.push({
        path,
        message: options.exclusiveMin
          ? `Number must be greater than ${options.min}.`
          : `Number must be greater than or equal to ${options.min}.`,
        value
      });
      return undefined;
    }
  }
  return value;
}

function requireInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  options: { min?: number } = {}
): number | undefined {
  const value = requireNumber(record, key, path, errors, {
    min: options.min,
    exclusiveMin: false
  });
  if (typeof value === 'number' && !Number.isInteger(value)) {
    errors.push({ path, message: 'Number must be an integer.', value });
    return undefined;
  }
  return value;
}

function optionalInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  options: { min?: number } = {}
): number | null {
  if (!(key in record)) {
    return null;
  }
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    errors.push({ path, message: 'Expected a number.', value });
    return null;
  }
  if (!Number.isInteger(value)) {
    errors.push({ path, message: 'Number must be an integer.', value });
    return null;
  }
  if (typeof options.min === 'number' && value < options.min) {
    errors.push({
      path,
      message: `Number must be greater than or equal to ${options.min}.`,
      value
    });
    return null;
  }
  return value;
}

function requireBoolean(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[]
): boolean | undefined {
  const value = record[key];
  if (typeof value !== 'boolean') {
    errors.push({ path, message: 'Expected a boolean.', value });
    return undefined;
  }
  return value;
}

function optionalBoolean(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[]
): boolean | null {
  if (!(key in record)) {
    return null;
  }
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== 'boolean') {
    errors.push({ path, message: 'Expected a boolean.', value });
    return null;
  }
  return value;
}

function requireRecord(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[]
): Record<string, unknown> | undefined {
  const value = record[key];
  if (!isPlainObject(value)) {
    errors.push({ path, message: 'Expected an object.', value });
    return undefined;
  }
  return value;
}

function optionalRecord(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[]
): Record<string, unknown> | null {
  if (!(key in record)) {
    return null;
  }
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (!isPlainObject(value)) {
    errors.push({ path, message: 'Expected an object.', value });
    return null;
  }
  return value;
}

function requireArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  options: { minLength?: number } = {}
): unknown[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) {
    errors.push({ path, message: 'Expected an array.', value });
    return undefined;
  }
  if (typeof options.minLength === 'number' && value.length < options.minLength) {
    errors.push({
      path,
      message: `Array must contain at least ${options.minLength} item(s).`,
      value
    });
    return undefined;
  }
  return value;
}

function optionalStringArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  options: { minLength?: number } = {}
): string[] | null {
  if (!(key in record)) {
    return null;
  }
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    errors.push({ path, message: 'Expected an array.', value });
    return null;
  }
  const strings: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      errors.push({
        path: `${path}[${index}]`,
        message: 'Expected a string.',
        value: entry
      });
      return;
    }
    if (typeof options.minLength === 'number' && entry.length < options.minLength) {
      errors.push({
        path: `${path}[${index}]`,
        message: `String must be at least ${options.minLength} characters.`,
        value: entry
      });
      return;
    }
    strings.push(entry);
  });
  return strings;
}

function requireStringArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  options: { minLength?: number; allowEmpty?: boolean } = {}
): string[] | undefined {
  const value = optionalStringArray(record, key, path, errors, options);
  if (!value) {
    if (!(key in record)) {
      errors.push({ path, message: 'Expected an array.', value: record[key] });
    }
    return undefined;
  }
  if (options.allowEmpty === false && value.length === 0) {
    errors.push({ path, message: 'Array must not be empty.', value });
    return undefined;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
