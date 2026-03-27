export interface CompliancePermitSource {
  origin: string;
  allow_video_capture?: boolean;
  runtime_proof?: {
    allow_screenshot?: boolean;
    allow_external_link?: boolean;
    allow_video?: boolean;
  };
  [key: string]: unknown;
}

export interface CompliancePermit {
  allowedSources?: CompliancePermitSource[];
}

export function loadPermitFile(repoRoot: string): Promise<{
  status: 'found' | 'missing' | 'error';
  permit: CompliancePermit | null;
  path: string;
  error: string | null;
}>;

export function buildAllowedOriginSet(permit: CompliancePermit | null): Set<string>;
export function findPermitEntry(permit: CompliancePermit | null, origin: string): CompliancePermitSource | null;
export function resolveRuntimeProofCapabilities(
  permitEntry: CompliancePermitSource | null
): { screenshot: boolean; external_link: boolean; video: boolean };
