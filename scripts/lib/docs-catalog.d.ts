export const DEFAULT_DOCS_CATALOG_PATH: string;

export interface DocsCatalogClassMeta {
  label: string;
  report_order: number;
}

export interface DocsCatalogRule {
  path: string;
  glob: string;
  glob_regex: RegExp | null;
  status: string;
  tier: number | null;
  doc_class: string;
  audience: string;
  source_of_truth: string[];
  owner: string;
  cadence_days: number | null;
  update_triggers: string[];
  truth_checks: string[];
  matched_by?: 'path' | 'glob';
}

export interface DocsCatalog {
  version: number;
  relative_path: string;
  absolute_path: string;
  classes: Record<string, DocsCatalogClassMeta>;
  policies: Record<string, any>;
  entries: DocsCatalogRule[];
  patterns: DocsCatalogRule[];
}

export function normalizeDocsCatalog(raw: any, relativePath?: string, absolutePath?: string): DocsCatalog;
export function loadDocsCatalog(repoRoot: string, relativePath?: string): Promise<DocsCatalog>;
export function maybeLoadDocsCatalog(repoRoot: string, relativePath?: string): Promise<DocsCatalog | null>;
export function getDocsCatalogClassMeta(catalog: DocsCatalog | null, docClass: string): DocsCatalogClassMeta;
export function resolveDocsCatalogEntry(docPath: string, catalog: DocsCatalog | null): DocsCatalogRule | null;
export function summarizeDocsByClass(
  items: Array<{ doc_class: string | null; metric: string }>,
  catalog: DocsCatalog | null
): Array<{
  doc_class: string;
  label: string;
  report_order: number;
  docs_scanned: number;
  registry_entries: number;
  missing_in_registry: number;
  missing_on_disk: number;
  invalid_entries: number;
  stale_entries: number;
  terminal_lifecycle_entries: number;
  retained_terminal_packet_entries: number;
  uncatalogued_docs: number;
}>;
export function listBundledSkillNames(repoRoot: string): Promise<string[]>;
export function extractBundledSkillNamesFromMarkdown(content: string, policy?: Record<string, any>): string[];
export interface CodexPostureMatrixRequirement {
  label: string;
  contains: string;
}
export interface CodexPostureMatrixSurface {
  path: string;
  kind: string;
  status: string;
  requirements: CodexPostureMatrixRequirement[];
}
export interface CodexPostureHistoricalReleaseEvidence {
  path: string;
  status: string;
  version: string | null;
  title: string | null;
}
export interface CodexPostureMatrix {
  version: number;
  source_path: string;
  absolute_path: string;
  current: {
    codex_cli_version: string | null;
    latest_audited_candidate_cli_version: string | null;
    marketplace_smoke_cli_version: string | null;
    cloud_canary_cli_version: string | null;
    model: string | null;
    default_runtime: string | null;
    explorer_fast_model: string | null;
    unsupported_review_model: string | null;
  };
  surfaces: CodexPostureMatrixSurface[];
  historical_release_evidence: CodexPostureHistoricalReleaseEvidence[];
}
export function loadCodexPostureMatrix(repoRoot: string, relativePath: string): Promise<CodexPostureMatrix>;
export function readCurrentCodexPosture(
  repoRoot: string,
  policy?: Record<string, any>
): Promise<{
  source_path: string;
  cli_version: string | null;
  cli_compatibility_versions: string[];
  model: string | null;
  default_runtime: string | null;
  explorer_fast_model: string | null;
  unsupported_review_model: string | null;
  latest_audited_candidate_cli_version: string | null;
  marketplace_smoke_cli_version: string | null;
  cloud_canary_cli_version: string | null;
}>;
export function extractCodexCliVersionMentions(content: string): string[];
export function extractCodexModelMentions(content: string): string[];
export function extractModelPostureLines(content: string): string[];
export function hasExpectedDefaultRuntimeLine(content: string, expectedRuntime: string): boolean;
export function hasExpectedModelPostureLine(content: string, expectedModel: string): boolean;
export function countDocumentLines(content: string): number;
export function countHeadingLines(content: string, headingPrefix?: string): number;
