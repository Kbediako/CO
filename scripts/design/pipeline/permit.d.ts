export interface CompliancePermit {
  allowedSources?: Array<{ origin: string; [key: string]: unknown }>;
}

export function loadPermitFile(repoRoot: string): Promise<{
  status: 'found' | 'missing' | 'error';
  permit: CompliancePermit | null;
  path: string;
  error: string | null;
}>;

export function buildAllowedOriginSet(permit: CompliancePermit | null): Set<string>;
export function findPermitEntry(permit: CompliancePermit | null, origin: string): { origin: string } | null;
