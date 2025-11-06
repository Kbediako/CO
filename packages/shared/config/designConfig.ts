import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load as parseYaml } from 'js-yaml';

const DEFAULT_CONFIG_PATH = 'design.config.yaml';
const DEFAULT_RETENTION_DAYS = 30;

export interface DesignBreakpoint {
  id: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export interface DesignRetentionConfig {
  days: number;
  autoPurge: boolean;
}

export interface DesignPrivacyConfig {
  allowThirdParty: boolean;
  requireApproval: boolean;
  approver?: string | null;
}

export interface DesignMetadataConfig {
  enabled: boolean;
  captureUrls: string[];
  breakpoints: DesignBreakpoint[];
  maskSelectors: string[];
  retention: DesignRetentionConfig;
  privacy: DesignPrivacyConfig;
}

export interface DesignAdvancedFeatureConfig {
  enabled: boolean;
  quotaSeconds: number;
  approver?: string | null;
}

export interface DesignAdvancedConfig {
  framerMotion: DesignAdvancedFeatureConfig;
  ffmpeg: DesignAdvancedFeatureConfig & {
    maxDurationSeconds?: number | null;
  };
}

export interface DesignPipelineOverrides {
  continueOnFailure?: boolean;
  visualRegression?: {
    enabled: boolean;
    baselineDir?: string | null;
  };
}

export interface DesignConfig {
  metadata: {
    design: DesignMetadataConfig;
  };
  advanced: DesignAdvancedConfig;
  pipelines: {
    designReference: DesignPipelineOverrides;
  };
}

export interface DesignConfigLoadOptions {
  rootDir?: string;
  filePath?: string;
}

export interface DesignConfigLoadResult {
  config: DesignConfig;
  path: string;
  exists: boolean;
  warnings: string[];
}

const DEFAULT_CONFIG: DesignConfig = {
  metadata: {
    design: {
      enabled: false,
      captureUrls: [],
      breakpoints: [],
      maskSelectors: [],
      retention: {
        days: DEFAULT_RETENTION_DAYS,
        autoPurge: false
      },
      privacy: {
        allowThirdParty: false,
        requireApproval: true,
        approver: null
      }
    }
  },
  advanced: {
    framerMotion: {
      enabled: false,
      quotaSeconds: 0,
      approver: null
    },
    ffmpeg: {
      enabled: false,
      quotaSeconds: 0,
      approver: null,
      maxDurationSeconds: null
    }
  },
  pipelines: {
    designReference: {
      continueOnFailure: false,
      visualRegression: {
        enabled: true,
        baselineDir: null
      }
    }
  }
};

export function designPipelineId(): string {
  return 'design-reference';
}

export async function loadDesignConfig(
  options: DesignConfigLoadOptions = {}
): Promise<DesignConfigLoadResult> {
  const rootDir = options.rootDir ?? process.cwd();
  const path = options.filePath ?? join(rootDir, DEFAULT_CONFIG_PATH);

  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = parseYaml(raw) as unknown;
    const warnings: string[] = [];
    const config = normalizeDesignConfig(parsed, warnings);
    return { config, path, exists: true, warnings };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError && nodeError.code === 'ENOENT') {
      return { config: structuredClone(DEFAULT_CONFIG), path, exists: false, warnings: [] };
    }
    throw new Error(`Failed to load design config at ${path}: ${(error as Error).message}`);
  }
}

export function shouldActivateDesignPipeline(
  result: DesignConfigLoadResult,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const envToggle = env.DESIGN_PIPELINE ?? env.DESIGN_REFERENCE_PIPELINE;
  if (typeof envToggle === 'string') {
    const flag = isTruthyFlag(envToggle);
    if (flag !== null) {
      return flag;
    }
  }
  return Boolean(result.config.metadata.design.enabled);
}

function normalizeDesignConfig(raw: unknown, warnings: string[]): DesignConfig {
  const base = structuredClone(DEFAULT_CONFIG);
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const metadata = (raw as Record<string, unknown>).metadata;
  if (metadata && typeof metadata === 'object') {
    const design = (metadata as Record<string, unknown>).design;
    if (design && typeof design === 'object') {
      base.metadata.design.enabled = coerceBoolean(
        (design as Record<string, unknown>).enabled,
        base.metadata.design.enabled
      );
      base.metadata.design.captureUrls = normalizeStringArray(
        (design as Record<string, unknown>).capture_urls,
        warnings,
        'metadata.design.capture_urls'
      );
      base.metadata.design.breakpoints = normalizeBreakpoints(
        (design as Record<string, unknown>).breakpoints,
        warnings
      );
      base.metadata.design.maskSelectors = normalizeStringArray(
        (design as Record<string, unknown>).mask_selectors,
        warnings,
        'metadata.design.mask_selectors'
      );

      const retentionRaw = (design as Record<string, unknown>).retention;
      if (retentionRaw && typeof retentionRaw === 'object') {
        const retentionRecord = retentionRaw as Record<string, unknown>;
        const retentionDays =
          coerceNumber(retentionRecord.days, base.metadata.design.retention.days, {
            min: 1,
            field: 'metadata.design.retention.days',
            warnings
          }) ?? base.metadata.design.retention.days;
        base.metadata.design.retention.days = retentionDays;
        base.metadata.design.retention.autoPurge = coerceBoolean(
          retentionRecord.auto_purge,
          base.metadata.design.retention.autoPurge
        );
      }

      const privacyRaw = (design as Record<string, unknown>).privacy;
      if (privacyRaw && typeof privacyRaw === 'object') {
        const privacyRecord = privacyRaw as Record<string, unknown>;
        base.metadata.design.privacy.allowThirdParty = coerceBoolean(
          privacyRecord.allow_third_party,
          base.metadata.design.privacy.allowThirdParty
        );
        base.metadata.design.privacy.requireApproval = coerceBoolean(
          privacyRecord.require_approval,
          base.metadata.design.privacy.requireApproval
        );
        const approver = coerceString(privacyRecord.approver);
        base.metadata.design.privacy.approver = approver ?? base.metadata.design.privacy.approver ?? null;
      }
    }
  }

  const advanced = (raw as Record<string, unknown>).advanced;
  if (advanced && typeof advanced === 'object') {
    const advancedRecord = advanced as Record<string, unknown>;
    base.advanced.framerMotion = normalizeAdvancedConfig(
      advancedRecord.framer_motion,
      base.advanced.framerMotion,
      'advanced.framer_motion',
      warnings
    );
    const ffmpeg = normalizeAdvancedConfig(
      advancedRecord.ffmpeg,
      base.advanced.ffmpeg,
      'advanced.ffmpeg',
      warnings
    );
    const ffmpegRecord =
      advancedRecord.ffmpeg && typeof advancedRecord.ffmpeg === 'object'
        ? (advancedRecord.ffmpeg as Record<string, unknown>)
        : null;
    const ffmpegExtended: DesignAdvancedConfig['ffmpeg'] = {
      ...ffmpeg,
      maxDurationSeconds: base.advanced.ffmpeg.maxDurationSeconds ?? null
    };
    if (ffmpegRecord) {
      const duration = coerceNumber(ffmpegRecord.max_duration_seconds, null, {
        min: 1,
        allowNull: true,
        field: 'advanced.ffmpeg.max_duration_seconds',
        warnings
      });
      ffmpegExtended.maxDurationSeconds = duration;
    }
    base.advanced.ffmpeg = ffmpegExtended;
  }

  const pipelines = (raw as Record<string, unknown>).pipelines;
  if (pipelines && typeof pipelines === 'object') {
    const designReference = (pipelines as Record<string, unknown>)['design-reference'];
    if (designReference && typeof designReference === 'object') {
      const record = designReference as Record<string, unknown>;
      const continueOnFailure = record.continue_on_failure;
      if (continueOnFailure !== undefined) {
        base.pipelines.designReference.continueOnFailure = coerceBoolean(
          continueOnFailure,
          Boolean(base.pipelines.designReference.continueOnFailure)
        );
      }
      const visualRegression = record.visual_regression;
      if (visualRegression && typeof visualRegression === 'object') {
        const vrRecord = visualRegression as Record<string, unknown>;
        base.pipelines.designReference.visualRegression = {
          enabled: coerceBoolean(
            vrRecord.enabled,
            base.pipelines.designReference.visualRegression?.enabled ?? true
          ),
          baselineDir: coerceString(vrRecord.baseline_dir) ?? null
        };
      }
    }
  }

  return base;
}

function normalizeBreakpoints(raw: unknown, warnings: string[]): DesignBreakpoint[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: DesignBreakpoint[] = [];
  raw.forEach((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') {
      warnings.push(`breakpoints[${index}]: expected object`);
      return;
    }
    const record = candidate as Record<string, unknown>;
    const id = coerceString(record.id) ?? `bp-${index + 1}`;
    const width = coerceNumber(record.width, null, {
      min: 1,
      field: `breakpoints[${index}].width`,
      warnings
    });
    const height = coerceNumber(record.height, null, {
      min: 1,
      field: `breakpoints[${index}].height`,
      warnings
    });
    if (width === null || height === null) {
      return;
    }
    const deviceScaleFactor = coerceNumber(record.deviceScaleFactor ?? record.device_scale_factor, null, {
      min: 0.1,
      allowNull: true,
      field: `breakpoints[${index}].deviceScaleFactor`,
      warnings
    });
    const breakpoint: DesignBreakpoint = {
      id,
      width,
      height
    };
    if (deviceScaleFactor !== null) {
      breakpoint.deviceScaleFactor = deviceScaleFactor;
    }
    result.push(breakpoint);
  });
  return result;
}

function normalizeAdvancedConfig(
  raw: unknown,
  defaults: DesignAdvancedFeatureConfig,
  field: string,
  warnings: string[]
): DesignAdvancedFeatureConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }
  const record = raw as Record<string, unknown>;
  return {
    enabled: coerceBoolean(record.enabled, defaults.enabled),
    quotaSeconds:
      coerceNumber(record.quota_seconds ?? record.quotaSeconds, defaults.quotaSeconds, {
        min: 0,
        field: `${field}.quota_seconds`,
        warnings
      }) ?? defaults.quotaSeconds,
    approver: coerceString(record.approver) ?? defaults.approver ?? null
  };
}

function normalizeStringArray(
  raw: unknown,
  warnings: string[],
  field: string
): string[] {
  if (!raw) {
    return [];
  }
  if (!Array.isArray(raw)) {
    warnings.push(`${field}: expected array`);
    return [];
  }
  return raw
    .map((value, index) => {
      const text = coerceString(value);
      if (!text) {
        warnings.push(`${field}[${index}]: ignored non-string entry`);
      }
      return text;
    })
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

interface CoerceNumberOptions {
  min?: number;
  max?: number;
  allowNull?: boolean;
  field?: string;
  warnings?: string[];
}

function coerceNumber(
  value: unknown,
  fallback: number | null,
  options: CoerceNumberOptions = {}
): number | null {
  if (value === null || value === undefined || value === '') {
    if (!options.allowNull && options.field && options.warnings) {
      options.warnings.push(`${options.field}: missing value`);
    }
    return options.allowNull ? null : fallback ?? null;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    if (options.warnings && options.field) {
      options.warnings.push(`${options.field}: expected numeric value`);
    }
    return options.allowNull ? null : fallback ?? null;
  }
  if (options.min !== undefined && numeric < options.min) {
    if (options.warnings && options.field) {
      options.warnings.push(
        `${options.field}: clamped to minimum ${options.min} (received ${numeric})`
      );
    }
    return options.min;
  }
  if (options.max !== undefined && numeric > options.max) {
    if (options.warnings && options.field) {
      options.warnings.push(
        `${options.field}: clamped to maximum ${options.max} (received ${numeric})`
      );
    }
    return options.max;
  }
  return numeric;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    return isTruthyFlag(value) ?? fallback;
  }
  return fallback;
}

function coerceString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function isTruthyFlag(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false;
  }
  return null;
}

// structuredClone fallback for Node versions that may lack global support.
function structuredClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
