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
  const raw = await readFile(permitPath, 'utf8');
  return JSON.parse(raw) as CompliancePermit;
}

export function ensureSourcePermitted(url: string, permit: CompliancePermit): void {
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
  if (!allowed.has(origin)) {
    throw new Error(
      `Extraction target ${origin} is not listed in compliance/permit.json. Add an allowedSources entry before running the pipeline.`
    );
  }
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
