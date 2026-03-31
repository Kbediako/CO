import { posix } from 'node:path';

export interface ProviderLinearChildLanePathSelector {
  kind: 'exact' | 'prefix';
  value: string;
  source: 'file' | 'phase';
  phase: string | null;
}

export interface ProviderLinearChildLaneScopeContractLike {
  files: string[];
  phases: string[];
  phase_contract_version?: string | null;
  allowed_path_selectors?: ProviderLinearChildLanePathSelector[] | null;
}

export const PROVIDER_LINEAR_CHILD_LANE_PHASE_CONTRACT_VERSION = 'phase-path-selectors-v1';

const PROVIDER_LINEAR_CHILD_LANE_PHASE_SELECTOR_DEFINITIONS: Record<
  string,
  ReadonlyArray<{ kind: 'exact' | 'prefix'; value: string }>
> = {
  docs: [
    { kind: 'exact', value: 'AGENTS.md' },
    { kind: 'prefix', value: '.agent/task/' },
    { kind: 'prefix', value: 'docs/' },
    { kind: 'prefix', value: 'skills/' },
    { kind: 'prefix', value: 'tasks/' }
  ],
  implementation: [
    { kind: 'prefix', value: 'bin/' },
    { kind: 'exact', value: 'codex.orchestrator.json' },
    { kind: 'prefix', value: 'orchestrator/src/' },
    { kind: 'exact', value: 'package-lock.json' },
    { kind: 'exact', value: 'package.json' },
    { kind: 'prefix', value: 'scripts/' }
  ],
  tests: [
    { kind: 'prefix', value: 'orchestrator/tests/' },
    { kind: 'prefix', value: 'tests/' }
  ]
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function normalizeScopeContractPath(value: string, kind: 'exact' | 'prefix'): string | null {
  const normalizedInput = normalizeOptionalString(value);
  if (!normalizedInput) {
    return null;
  }
  const normalized = posix.normalize(normalizedInput.replaceAll('\\', '/'));
  const withoutCurrentDir = normalized.replace(/^(?:\.\/)+/u, '');
  const trimmed = withoutCurrentDir.replace(/\/+/gu, '/').replace(/\/$/u, '');
  if (trimmed === '' || trimmed === '.' || trimmed === '..' || trimmed.startsWith('../')) {
    return null;
  }
  if (kind === 'prefix') {
    return `${trimmed}/`;
  }
  return trimmed;
}

function normalizePhaseName(value: string): string | null {
  const normalizedInput = normalizeOptionalString(value);
  if (!normalizedInput) {
    return null;
  }
  const normalized = normalizedInput.toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function selectorPathSignature(selector: Pick<ProviderLinearChildLanePathSelector, 'kind' | 'value'>): string {
  return `${selector.kind}:${selector.value}`;
}

function selectorIdentitySignature(
  selector: Pick<ProviderLinearChildLanePathSelector, 'kind' | 'value' | 'source' | 'phase'>
): string {
  return `${selector.kind}:${selector.value}:${selector.source}:${selector.phase ?? ''}`;
}

function dedupeSelectors(
  selectors: ProviderLinearChildLanePathSelector[]
): ProviderLinearChildLanePathSelector[] {
  const seen = new Set<string>();
  const deduped: ProviderLinearChildLanePathSelector[] = [];
  for (const selector of selectors) {
    const signature = selectorPathSignature(selector);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(selector);
  }
  return deduped;
}

export function normalizeProviderLinearChildLanePathSelectors(
  value: unknown
): ProviderLinearChildLanePathSelector[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized: ProviderLinearChildLanePathSelector[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }
    const kind = entry.kind === 'exact' || entry.kind === 'prefix' ? entry.kind : null;
    const source = entry.source === 'file' || entry.source === 'phase' ? entry.source : null;
    const normalizedValue = kind ? normalizeScopeContractPath(String(entry.value ?? ''), kind) : null;
    const phase = source === 'phase'
      ? normalizePhaseName(String(entry.phase ?? ''))
      : normalizeOptionalString(entry.phase) ?? null;
    if (!kind || !source || !normalizedValue || (source === 'phase' && !phase)) {
      return null;
    }
    normalized.push({
      kind,
      value: normalizedValue,
      source,
      phase: source === 'phase' ? phase : null
    });
  }
  return dedupeSelectors(normalized);
}

export function resolveProviderLinearChildLaneSupportedPhases(): string[] {
  return Object.keys(PROVIDER_LINEAR_CHILD_LANE_PHASE_SELECTOR_DEFINITIONS).sort();
}

export function resolveProviderLinearChildLaneScopeContract<T extends ProviderLinearChildLaneScopeContractLike>(
  scope: T
): T & {
  files: string[];
  phases: string[];
  phase_contract_version: string;
  allowed_path_selectors: ProviderLinearChildLanePathSelector[];
} {
  const normalizedFiles = [
    ...new Set(
      (scope.files ?? [])
        .map((entry) => normalizeScopeContractPath(String(entry), 'exact'))
        .filter((entry): entry is string => entry !== null)
    )
  ];
  const normalizedPhases = [
    ...new Set(
      (scope.phases ?? [])
        .map((entry) => normalizePhaseName(String(entry)))
        .filter((entry): entry is string => entry !== null)
    )
  ];
  if (normalizedFiles.length === 0 && normalizedPhases.length === 0) {
    throw new Error('Provider worker child lanes require at least one declared file or supported phase scope.');
  }

  const unsupportedPhases = normalizedPhases.filter(
    (phase) => !(phase in PROVIDER_LINEAR_CHILD_LANE_PHASE_SELECTOR_DEFINITIONS)
  );
  if (unsupportedPhases.length > 0) {
    throw new Error(
      `Unsupported child-lane phases: ${unsupportedPhases.join(', ')}. Supported phases: ${resolveProviderLinearChildLaneSupportedPhases().join(', ')}.`
    );
  }

  const selectors = dedupeSelectors([
    ...normalizedFiles.map((file) => ({
      kind: 'exact' as const,
      value: file,
      source: 'file' as const,
      phase: null
    })),
    ...normalizedPhases.flatMap((phase) =>
      PROVIDER_LINEAR_CHILD_LANE_PHASE_SELECTOR_DEFINITIONS[phase].map((selector) => ({
        kind: selector.kind,
        value: selector.value,
        source: 'phase' as const,
        phase
      }))
    )
  ]);

  return {
    ...scope,
    files: normalizedFiles,
    phases: normalizedPhases,
    phase_contract_version: PROVIDER_LINEAR_CHILD_LANE_PHASE_CONTRACT_VERSION,
    allowed_path_selectors: selectors
  };
}

export function providerLinearChildLanePathSelectorsEqual(
  left: ProviderLinearChildLanePathSelector[],
  right: ProviderLinearChildLanePathSelector[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftSignatures = left.map((selector) => selectorIdentitySignature(selector)).sort();
  const rightSignatures = right.map((selector) => selectorIdentitySignature(selector)).sort();
  return leftSignatures.every((signature, index) => signature === rightSignatures[index]);
}

export function providerLinearChildLanePathMatchesSelectors(
  candidatePath: string,
  selectors: ProviderLinearChildLanePathSelector[]
): boolean {
  const normalizedCandidate = normalizeScopeContractPath(candidatePath, 'exact');
  if (!normalizedCandidate) {
    return false;
  }
  return selectors.some((selector) =>
    selector.kind === 'exact'
      ? selector.value === normalizedCandidate
      : normalizedCandidate.startsWith(selector.value)
  );
}

function pathSelectorsOverlap(
  left: ProviderLinearChildLanePathSelector,
  right: ProviderLinearChildLanePathSelector
): boolean {
  if (left.kind === 'exact' && right.kind === 'exact') {
    return left.value === right.value;
  }
  if (left.kind === 'exact' && right.kind === 'prefix') {
    return left.value.startsWith(right.value);
  }
  if (left.kind === 'prefix' && right.kind === 'exact') {
    return right.value.startsWith(left.value);
  }
  return left.value.startsWith(right.value) || right.value.startsWith(left.value);
}

export function providerLinearChildLanePathSelectorsOverlap(
  left: ProviderLinearChildLanePathSelector[],
  right: ProviderLinearChildLanePathSelector[]
): boolean {
  return left.some((leftSelector) =>
    right.some((rightSelector) => pathSelectorsOverlap(leftSelector, rightSelector))
  );
}

export function formatProviderLinearChildLanePathSelectors(
  selectors: ProviderLinearChildLanePathSelector[]
): string {
  return selectors
    .map((selector) => (selector.kind === 'exact' ? selector.value : `${selector.value}*`))
    .join(', ');
}
