import { buildAllowedOriginSet, loadPermitFile } from '../permit.js';
import { slugify as sharedSlugify } from '../../../../packages/shared/utils/strings.js';
import type {
  DesignBreakpoint,
  DesignMetadataConfig,
  DesignToolkitPipelineConfig,
  DesignToolkitSourceConfig
} from '../../../../packages/shared/config/index.js';

export interface ToolkitRuntimeSource extends DesignToolkitSourceConfig {
  breakpoints: DesignBreakpoint[];
  maskSelectors: string[];
}

export interface ToolkitRetentionPolicy {
  days: number;
  autoPurge: boolean;
  policy?: string;
}

export interface ToolkitRetentionMetadata extends ToolkitRetentionPolicy {
  expiry: string;
}

export async function loadToolkitPermit(repoRoot: string): Promise<{
  allowedSources?: Array<{ origin: string; [key: string]: unknown }>;
}> {
  const permitResult = await loadPermitFile(repoRoot);
  if (permitResult.status === 'missing') {
    console.warn('[design-toolkit] compliance/permit.json not found; proceeding without permit enforcement');
    return { allowedSources: [] };
  }
  if (permitResult.status === 'error') {
    throw new Error(permitResult.error ?? 'Unable to read compliance/permit.json');
  }
  return permitResult.permit ?? { allowedSources: [] };
}

export function ensureSourcePermitted(
  url: string,
  permit: { allowedSources?: Array<{ origin: string; [key: string]: unknown }> }
): boolean {
  const allowed = buildAllowedOriginSet(permit);
  const origin = new URL(url).origin;
  if (allowed.size === 0 || allowed.has(origin)) {
    return true;
  }
  console.warn(
    `[design-toolkit] Extraction target ${origin} is not listed in compliance/permit.json; continuing without permit match`
  );
  return false;
}

export function resolveToolkitSources(
  pipeline: DesignToolkitPipelineConfig,
  metadata: DesignMetadataConfig
): ToolkitRuntimeSource[] {
  const sourceList = pipeline.sources.length > 0 ? pipeline.sources : buildSourcesFromCaptureUrls(metadata.captureUrls);
  const breakpoints = pipeline.breakpoints.length > 0 ? pipeline.breakpoints : metadata.breakpoints;
  const maskSelectors = pipeline.maskSelectors.length > 0 ? pipeline.maskSelectors : metadata.maskSelectors;
  const finalBreakpoints = breakpoints.length > 0 ? breakpoints : defaultBreakpoints();
  return sourceList.map((source, index) => ({
    ...source,
    referenceUrl: source.referenceUrl ?? source.url,
    slug: source.slug ?? slugifyToolkitValue(source.id ?? source.url, index),
    breakpoints: finalBreakpoints,
    maskSelectors
  }));
}

export function computeToolkitRetention(
  pipeline: DesignToolkitPipelineConfig,
  fallback: ToolkitRetentionPolicy
): ToolkitRetentionPolicy {
  if (pipeline.retention) {
    return {
      days: pipeline.retention.days,
      autoPurge: pipeline.retention.autoPurge,
      policy: pipeline.retention.policy ?? fallback.policy
    };
  }
  return fallback;
}

export function buildRetentionMetadata(retention: ToolkitRetentionPolicy, now: Date): ToolkitRetentionMetadata {
  const expiryMs = now.getTime() + Math.max(1, retention.days) * 24 * 60 * 60 * 1000;
  return {
    ...retention,
    expiry: new Date(expiryMs).toISOString()
  };
}

export function slugifyToolkitValue(value: string, index: number): string {
  const normalized = sharedSlugify(value, {
    fallback: '',
    maxLength: 48,
    lowercase: true,
    pattern: /[^a-z0-9-_]+/g,
    collapseDashes: false
  });
  return normalized.length > 0 ? normalized : `source-${index + 1}`;
}

function defaultBreakpoints(): DesignBreakpoint[] {
  return [
    {
      id: 'desktop',
      width: 1280,
      height: 720
    }
  ];
}

function buildSourcesFromCaptureUrls(urls: string[]): DesignToolkitSourceConfig[] {
  return urls.map((url, index) => ({
    id: `source-${index + 1}`,
    url,
    referenceUrl: url,
    slug: slugifyToolkitValue(url, index),
    title: null
  }));
}
