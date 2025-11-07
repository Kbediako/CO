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

export interface DesignToolkitSourceConfig {
  id: string;
  url: string;
  referenceUrl: string;
  slug: string;
  title?: string | null;
}

export interface DesignToolkitSelfCorrectionConfig {
  enabled: boolean;
  maxIterations: number;
  provider?: string | null;
  approvalId?: string | null;
  threshold?: number | null;
}

export interface DesignToolkitPublishConfig {
  updateTokens: boolean;
  updateComponents: boolean;
  runVisualRegression: boolean;
}

export interface DesignToolkitPipelineConfig {
  enabled: boolean;
  sources: DesignToolkitSourceConfig[];
  breakpoints: DesignBreakpoint[];
  maskSelectors: string[];
  retention?: (DesignRetentionConfig & { policy?: string }) | null;
  selfCorrection: DesignToolkitSelfCorrectionConfig;
  publish: DesignToolkitPublishConfig;
}

export interface DesignConfig {
  metadata: {
    design: DesignMetadataConfig;
  };
  advanced: DesignAdvancedConfig;
  pipelines: {
    designReference: DesignPipelineOverrides;
    hiFiDesignToolkit: DesignToolkitPipelineConfig;
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
    },
    hiFiDesignToolkit: {
      enabled: false,
      sources: [],
      breakpoints: [],
      maskSelectors: [],
      retention: null,
      selfCorrection: {
        enabled: false,
        maxIterations: 1,
        provider: null,
        approvalId: null,
        threshold: null
      },
      publish: {
        updateTokens: true,
        updateComponents: true,
        runVisualRegression: true
      }
    }
  }
};

const DESIGN_REFERENCE_PIPELINE_ID = 'design-reference';
const HI_FI_TOOLKIT_PIPELINE_ID = 'hi-fi-design-toolkit';

interface DesignPipelineSelection {
  id: string;
  shouldRun: boolean;
}

export function designPipelineId(
  result?: DesignConfigLoadResult,
  env: NodeJS.ProcessEnv = process.env
): string {
  return selectDesignPipeline(result ?? null, env).id;
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
  return selectDesignPipeline(result, env).shouldRun;
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

    const hiFi = (pipelines as Record<string, unknown>)['hi_fi_design_toolkit'];
    if (hiFi && typeof hiFi === 'object') {
      base.pipelines.hiFiDesignToolkit = normalizeToolkitPipelineConfig(
        hiFi as Record<string, unknown>,
        base,
        warnings
      );
    }
  }

  return base;
}

function selectDesignPipeline(
  result: DesignConfigLoadResult | null,
  env: NodeJS.ProcessEnv
): DesignPipelineSelection {
  const config = result?.config ?? DEFAULT_CONFIG;

  const designPipelineEnv = typeof env.DESIGN_PIPELINE === 'string' ? isTruthyFlag(env.DESIGN_PIPELINE) : null;
  if (designPipelineEnv !== null) {
    return { id: DESIGN_REFERENCE_PIPELINE_ID, shouldRun: designPipelineEnv };
  }

  const toolkitEnv = typeof env.DESIGN_TOOLKIT === 'string' ? isTruthyFlag(env.DESIGN_TOOLKIT) : null;
  if (toolkitEnv !== null) {
    return { id: HI_FI_TOOLKIT_PIPELINE_ID, shouldRun: toolkitEnv };
  }

  const referenceEnv =
    typeof env.DESIGN_REFERENCE_PIPELINE === 'string' ? isTruthyFlag(env.DESIGN_REFERENCE_PIPELINE) : null;
  if (referenceEnv !== null) {
    return { id: DESIGN_REFERENCE_PIPELINE_ID, shouldRun: referenceEnv };
  }

  const toolkitConfigEnabled =
    config.pipelines.hiFiDesignToolkit.enabled && config.pipelines.hiFiDesignToolkit.sources.length > 0;
  if (toolkitConfigEnabled) {
    return { id: HI_FI_TOOLKIT_PIPELINE_ID, shouldRun: true };
  }

  if (config.metadata.design.enabled) {
    return { id: DESIGN_REFERENCE_PIPELINE_ID, shouldRun: true };
  }

  return { id: DESIGN_REFERENCE_PIPELINE_ID, shouldRun: false };
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

function normalizeToolkitPipelineConfig(
  raw: Record<string, unknown>,
  baseConfig: DesignConfig,
  warnings: string[]
): DesignToolkitPipelineConfig {
  const normalized: DesignToolkitPipelineConfig = structuredClone(
    DEFAULT_CONFIG.pipelines.hiFiDesignToolkit
  );

  normalized.enabled = coerceBoolean(raw.enabled, normalized.enabled);
  normalized.maskSelectors = normalizeStringArray(
    raw.mask_selectors ?? raw.maskSelectors,
    warnings,
    'pipelines.hi_fi_design_toolkit.mask_selectors'
  );
  normalized.breakpoints = normalizeBreakpoints(
    raw.breakpoints,
    warnings
  );
  normalized.sources = normalizeToolkitSources(raw.sources, warnings);

  const retentionRaw = raw.retention;
  if (retentionRaw && typeof retentionRaw === 'object') {
    const record = retentionRaw as Record<string, unknown>;
    const defaultRetention = baseConfig.metadata.design.retention;
    const days =
      coerceNumber(record.days, defaultRetention.days, {
        min: 1,
        field: 'pipelines.hi_fi_design_toolkit.retention.days',
        warnings
      }) ?? defaultRetention.days;
    const autoPurge = coerceBoolean(record.auto_purge ?? record.autoPurge, defaultRetention.autoPurge);
    normalized.retention = {
      days,
      autoPurge,
      policy: coerceString(record.policy) ?? 'design.config.retention'
    };
  }

  const selfCorrectionRaw = raw.self_correction ?? raw.selfCorrection;
  if (selfCorrectionRaw && typeof selfCorrectionRaw === 'object') {
    const record = selfCorrectionRaw as Record<string, unknown>;
    normalized.selfCorrection = {
      enabled: coerceBoolean(record.enabled, normalized.selfCorrection.enabled),
      maxIterations:
        coerceNumber(record.max_iterations ?? record.maxIterations, normalized.selfCorrection.maxIterations, {
          min: 1,
          field: 'pipelines.hi_fi_design_toolkit.self_correction.max_iterations',
          warnings
        }) ?? normalized.selfCorrection.maxIterations,
      provider: coerceString(record.provider) ?? normalized.selfCorrection.provider ?? null,
      approvalId: coerceString(record.approval_id ?? record.approvalId) ?? normalized.selfCorrection.approvalId ?? null,
      threshold:
        coerceNumber(record.threshold, normalized.selfCorrection.threshold ?? null, {
          min: 0,
          allowNull: true,
          field: 'pipelines.hi_fi_design_toolkit.self_correction.threshold',
          warnings
        }) ?? normalized.selfCorrection.threshold ?? null
    };
  }

  const publishRaw = raw.publish;
  if (publishRaw && typeof publishRaw === 'object') {
    const record = publishRaw as Record<string, unknown>;
    normalized.publish = {
      updateTokens: coerceBoolean(record.update_tokens ?? record.updateTokens ?? record.sync_tokens, normalized.publish.updateTokens),
      updateComponents: coerceBoolean(
        record.update_components ?? record.updateComponents ?? record.componentize,
        normalized.publish.updateComponents
      ),
      runVisualRegression: coerceBoolean(
        record.run_visual_regression ?? record.visual_regression,
        normalized.publish.runVisualRegression
      )
    };
  }

  return normalized;
}

function normalizeToolkitSources(raw: unknown, warnings: string[]): DesignToolkitSourceConfig[] {
  if (!raw) {
    return [];
  }
  if (!Array.isArray(raw)) {
    warnings.push('pipelines.hi_fi_design_toolkit.sources: expected array');
    return [];
  }
  const result: DesignToolkitSourceConfig[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry === 'string') {
      const url = entry.trim();
      if (!url) {
        return;
      }
      const slug = sanitizeToolkitSlug(url, index);
      result.push({
        id: `source-${index + 1}`,
        url,
        referenceUrl: url,
        slug,
        title: null
      });
      return;
    }
    if (!entry || typeof entry !== 'object') {
      warnings.push(`pipelines.hi_fi_design_toolkit.sources[${index}]: expected string or object`);
      return;
    }
    const record = entry as Record<string, unknown>;
    const url = coerceString(record.url ?? record.capture_url ?? record.source);
    if (!url) {
      warnings.push(`pipelines.hi_fi_design_toolkit.sources[${index}]: missing url`);
      return;
    }
    const identifier =
      coerceString(record.id ?? record.slug ?? record.name) ?? `source-${index + 1}`;
    const slug = sanitizeToolkitSlug(coerceString(record.slug) ?? identifier, index);
    const referenceUrl = coerceString(record.reference_url ?? record.referenceUrl) ?? url;
    const title = coerceString(record.title);
    result.push({
      id: identifier,
      url,
      referenceUrl,
      slug,
      title
    });
  });
  return result;
}

function sanitizeToolkitSlug(candidate: string, index: number): string {
  const normalized = candidate
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (normalized.length > 0) {
    return normalized;
  }
  return `source-${index + 1}`;
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
