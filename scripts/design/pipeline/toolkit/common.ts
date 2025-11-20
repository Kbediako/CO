import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

interface CompliancePermit {
  allowedSources?: Array<{ origin: string; [key: string]: unknown }>;
}

export async function loadToolkitPermit(repoRoot: string): Promise<CompliancePermit> {
  const permitPath = join(repoRoot, 'compliance', 'permit.json');
  try {
    const raw = await readFile(permitPath, 'utf8');
    return JSON.parse(raw) as CompliancePermit;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === 'ENOENT') {
      console.warn('[design-toolkit] compliance/permit.json not found; proceeding without permit enforcement');
      return { allowedSources: [] };
    }
    throw error;
  }
}

export function ensureSourcePermitted(url: string, permit: CompliancePermit): boolean {
  const allowed = new Set(
    (permit.allowedSources ?? [])
      .map((entry) => {
        try {
          return new URL(entry.origin).origin;
        } catch {
          return null;
        }
      })
      .filter((origin): origin is string => Boolean(origin))
  );
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
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (normalized.length > 0) {
    return normalized;
  }
  return `source-${index + 1}`;
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
