import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { normalizeTaskKey, pathExists } from './docs-helpers.js';
import type {
  ReviewFindingPriority,
  ReviewSemanticVerdict
} from './review-execution-telemetry.js';

export const REVIEW_CONTRACT_SCHEMA_VERSION = 'co.review.contract.v1';
export const REVIEW_CONTRACT_MODE_ENV_KEY = 'CODEX_REVIEW_CONTRACT_MODE';
export const REVIEW_CONTRACT_AUTHORITATIVE_GATE_ENV_KEY = 'CODEX_REVIEW_AUTHORITATIVE_GATE';

export type ReviewContractMode = 'off' | 'shadow' | 'enforce';
export type ReviewContractScopeMode = 'uncommitted' | 'base' | 'commit';
export type ReviewContractScopeResolutionKind =
  | 'explicit'
  | 'default-uncommitted'
  | 'default-uncommitted-committed-branch-diff'
  | 'default-uncommitted-empty-branch'
  | 'default-uncommitted-base-unavailable'
  | 'default-uncommitted-non-git';
export type ReviewContractTelemetrySource = 'output-log' | 'last-message-file';
export type ReviewContractAxisName =
  | 'spec_conformance'
  | 'coding_standards'
  | 'code_changes'
  | 'agent_loop';
export type ReviewContractAxisVerdict = 'clean' | 'findings' | 'blocked' | 'unknown';
export type ReviewIntentMatrixAxisName =
  | 'original_spec'
  | 'coding_standards'
  | 'code_change_proposals'
  | 'agent_loop_change_proposals';
export type ReviewIntentMatrixVerdict = 'clean' | 'findings' | 'unknown';

export interface ReviewContractEvidenceRef {
  path: string;
  sha256: string;
  description?: string;
}

export interface ReviewContractFinding {
  id: string;
  priority: ReviewFindingPriority;
  title: string;
  body?: string;
  evidence_refs: ReviewContractEvidenceRef[];
}

export interface ReviewContractAxis {
  verdict: ReviewContractAxisVerdict;
  summary: string;
  clean_signal?: string;
  evidence_refs: ReviewContractEvidenceRef[];
  findings: ReviewContractFinding[];
}

export interface ReviewContractProposalCounts {
  code_change: number;
  agent_loop: number;
}

export interface ReviewIntentMatrixAxis {
  required: boolean;
  verdict: ReviewIntentMatrixVerdict;
  evidence: string[];
  proposed_fixes: string[];
}

export type ReviewIntentMatrix = Record<ReviewIntentMatrixAxisName, ReviewIntentMatrixAxis>;

export interface ReviewContractTelemetry {
  contract_path: string | null;
  contract_mode: ReviewContractMode;
  contract_validation: {
    status: 'off' | 'missing' | 'invalid' | 'valid';
    errors: string[];
  };
  contract_overall_verdict: ReviewContractAxisVerdict | null;
  axis_verdicts: Record<ReviewContractAxisName, ReviewContractAxisVerdict | null>;
  axis_finding_counts: Record<ReviewContractAxisName, number>;
  proposal_counts: ReviewContractProposalCounts;
  review_intent_matrix: ReviewIntentMatrix | null;
  review_verdict: ReviewSemanticVerdict;
  highest_finding_priority: ReviewFindingPriority | null;
  finding_count: number;
}

export interface ReviewContractInputBundleResult {
  inputDir: string;
  contractPath: string;
  outputSchemaPath: string;
  bundleRefs: ReviewContractEvidenceRef[];
  promptLines: string[];
  telemetrySource: ReviewContractTelemetrySource;
}

export interface ReviewContractValidationOptions {
  repoRoot: string;
  trustedEvidenceRoots?: readonly string[];
  currentSpecBundlePath?: string | null;
}

export interface ReviewContractCodeChangeProposalRoute {
  proposal_id: string;
  title: string;
  rationale: string;
  unified_diff: string | null;
  target: Record<string, unknown> | null;
  tests: string[];
  risk: string;
  evidence_refs: ReviewContractEvidenceRef[];
}

export interface ReviewContractAgentLoopFollowUpRoute {
  proposal_id: string;
  title: string;
  description: string;
  intent_checksum: string;
  non_goals: string;
  not_done_if: string;
  acceptance_criteria: string;
  canonical_owner_key: string | null;
  create_follow_up_args: string[];
  evidence_refs: ReviewContractEvidenceRef[];
}

export interface ReviewContractAgentLoopMemoryEntry {
  schema_version: 'co.review.agent_loop_memory_entry.v1';
  proposal_id: string;
  title: string;
  rationale: string;
  source_contract_schema: typeof REVIEW_CONTRACT_SCHEMA_VERSION;
  evidence_refs: ReviewContractEvidenceRef[];
}

export type ReviewContractProposalRoutingResult =
  | {
      ok: true;
      code_change_proposals: ReviewContractCodeChangeProposalRoute[];
      agent_loop_follow_ups: ReviewContractAgentLoopFollowUpRoute[];
      agent_loop_memory_entries: ReviewContractAgentLoopMemoryEntry[];
    }
  | {
      ok: false;
      errors: string[];
    };

interface ReviewContractCandidate {
  schema_version?: unknown;
  overall_verdict?: unknown;
  axes?: unknown;
  review_intent_matrix?: unknown;
  code_change_proposals?: unknown;
  agent_loop_proposals?: unknown;
}

type ReviewContractRecord = Record<string, unknown>;

const execFileAsync = promisify(execFile);
const CONTRACT_AXES: ReviewContractAxisName[] = [
  'spec_conformance',
  'coding_standards',
  'code_changes',
  'agent_loop'
];
const REVIEW_INTENT_MATRIX_AXES: ReviewIntentMatrixAxisName[] = [
  'original_spec',
  'coding_standards',
  'code_change_proposals',
  'agent_loop_change_proposals'
];
const INTENT_MATRIX_TO_CONTRACT_AXIS: Record<ReviewIntentMatrixAxisName, ReviewContractAxisName> = {
  original_spec: 'spec_conformance',
  coding_standards: 'coding_standards',
  code_change_proposals: 'code_changes',
  agent_loop_change_proposals: 'agent_loop'
};
const REVIEW_FINDING_PRIORITY_RANKS: Record<ReviewFindingPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3
};
const TEXT_SNIPPET_LIMIT = 40_000;
const GIT_OUTPUT_MAX_BUFFER_BYTES = 8 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export function resolveReviewContractMode(
  env: NodeJS.ProcessEnv = process.env
): ReviewContractMode {
  const configured = env[REVIEW_CONTRACT_MODE_ENV_KEY]?.trim().toLowerCase();
  if (configured) {
    if (configured === 'off' || configured === 'shadow' || configured === 'enforce') {
      return configured;
    }
    throw new Error(
      `Invalid ${REVIEW_CONTRACT_MODE_ENV_KEY} value "${configured}". Expected off|shadow|enforce.`
    );
  }
  return envFlagEnabled(env[REVIEW_CONTRACT_AUTHORITATIVE_GATE_ENV_KEY]) ? 'enforce' : 'shadow';
}

export async function prepareReviewContractInputBundles(options: {
  repoRoot: string;
  reviewDir: string;
  manifestPath: string;
  runnerLogPath?: string | null;
  runnerLogExists?: boolean;
  taskKey?: string | null;
  taskLabel: string;
  reviewSurface: string;
  scopePaths: string[];
  scopeMode?: ReviewContractScopeMode;
  scopeBase?: string | null;
  scopeCommit?: string | null;
  requestedScopeMode?: ReviewContractScopeMode;
  requestedScopeBase?: string | null;
  requestedScopeCommit?: string | null;
  scopeResolutionKind?: ReviewContractScopeResolutionKind;
  scopeResolutionNote?: string | null;
  notes?: string | null;
  mode: ReviewContractMode;
}): Promise<ReviewContractInputBundleResult | null> {
  if (options.mode === 'off') {
    return null;
  }
  const inputDir = join(options.reviewDir, 'inputs');
  await mkdir(inputDir, { recursive: true });
  const contractPath = join(options.reviewDir, 'contract.json');
  await rm(contractPath, { force: true });
  const bundleDescriptors = [
    {
      name: 'spec-bundle.json',
      payload: await buildSpecBundle(options)
    },
    {
      name: 'standards-bundle.json',
      payload: await buildStandardsBundle(options)
    },
    {
      name: 'change-bundle.json',
      payload: await buildChangeBundle(options)
    },
    {
      name: 'agent-loop-bundle.json',
      payload: await buildAgentLoopBundle(options)
    }
  ];
  const bundleRefs: ReviewContractEvidenceRef[] = [];
  for (const descriptor of bundleDescriptors) {
    const bundlePath = join(inputDir, descriptor.name);
    await writeJson(bundlePath, descriptor.payload);
    bundleRefs.push(await buildEvidenceRef(options.repoRoot, bundlePath, descriptor.name));
  }
  const schemaPath = resolveReviewContractSchemaPath();
  const schemaRef = await buildEvidenceRef(options.repoRoot, schemaPath, 'review contract schema');
  const outputSchemaPath = resolveReviewContractOutputSchemaPath();
  const outputSchemaRef = await buildEvidenceRef(
    options.repoRoot,
    outputSchemaPath,
    'review contract structured-output schema'
  );
  const contractRelativePath = relative(options.repoRoot, contractPath);
  const promptLines = buildReviewContractPromptLines({
    mode: options.mode,
    contractRelativePath,
    schemaRef,
    outputSchemaRef,
    bundleRefs
  });
  return {
    inputDir,
    contractPath,
    outputSchemaPath,
    bundleRefs,
    promptLines,
    telemetrySource: options.mode === 'enforce' ? 'last-message-file' : 'output-log'
  };
}

export async function buildReviewContractTelemetry(options: {
  mode: ReviewContractMode;
  outputText: string | null;
  repoRoot: string;
  contractPath: string;
  source?: ReviewContractTelemetrySource;
}): Promise<ReviewContractTelemetry> {
  if (options.mode === 'off') {
    return buildEmptyContractTelemetry('off', null, 'off', []);
  }

  const extracted =
    options.source === 'last-message-file'
      ? await extractReviewContractCandidateFromLastMessageFile(options.contractPath)
      : extractReviewContractCandidate(options.outputText ?? '');
  if (extracted.errors.length > 0) {
    await writeJson(options.contractPath, {
      schema_version: REVIEW_CONTRACT_SCHEMA_VERSION,
      extraction_status: 'invalid',
      errors: extracted.errors
    });
    return buildEmptyContractTelemetry(
      options.mode,
      relative(options.repoRoot, options.contractPath),
      'invalid',
      extracted.errors
    );
  }
  if (!extracted.contract) {
    await writeJson(options.contractPath, {
      schema_version: REVIEW_CONTRACT_SCHEMA_VERSION,
      extraction_status: 'missing',
      errors: ['No co.review.contract.v1 JSON object was found in the final review output.']
    });
    return buildEmptyContractTelemetry(
      options.mode,
      relative(options.repoRoot, options.contractPath),
      'missing',
      ['No co.review.contract.v1 JSON object was found in the final review output.']
    );
  }

  const normalizedContract = normalizeStructuredOutputOptionalNulls(extracted.contract);
  await writeJson(options.contractPath, normalizedContract);
  const contractEvidenceRoot = dirname(resolve(options.repoRoot, options.contractPath));
  const validation = await validateReviewContract(normalizedContract, {
    repoRoot: options.repoRoot,
    trustedEvidenceRoots: [contractEvidenceRoot],
    currentSpecBundlePath: join(contractEvidenceRoot, 'inputs', 'spec-bundle.json')
  });
  if (!validation.valid) {
    return buildEmptyContractTelemetry(
      options.mode,
      relative(options.repoRoot, options.contractPath),
      'invalid',
      validation.errors
    );
  }
  return buildTelemetryFromValidContract(
    options.mode,
    relative(options.repoRoot, options.contractPath),
    normalizedContract
  );
}

export async function validateReviewContract(
  candidate: unknown,
  options: ReviewContractValidationOptions
): Promise<{ valid: boolean; errors: string[] }> {
  const errors = validateContractSchemaShape(candidate);
  if (!isRecord(candidate)) {
    return { valid: false, errors };
  }
  errors.push(...(await validateContractSemantics(candidate, options)));
  return { valid: errors.length === 0, errors };
}

export async function buildReviewContractProposalRouting(options: {
  contract: unknown;
  repoRoot: string;
  issueId: string;
  acceptedAgentLoopProposalIds?: string[];
}): Promise<ReviewContractProposalRoutingResult> {
  const validation = await validateReviewContract(options.contract, { repoRoot: options.repoRoot });
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors
    };
  }
  if (!isRecord(options.contract)) {
    return {
      ok: false,
      errors: ['Review contract must be an object.']
    };
  }
  const codeChangeProposals = Array.isArray(options.contract.code_change_proposals)
    ? options.contract.code_change_proposals
    : [];
  const agentLoopProposals = Array.isArray(options.contract.agent_loop_proposals)
    ? options.contract.agent_loop_proposals
    : [];
  const agentLoopFollowUps = agentLoopProposals
    .filter(isRecord)
    .map((proposal) => buildAgentLoopFollowUpRoute(proposal, options.issueId));
  const knownAgentLoopProposalIds = new Set(agentLoopFollowUps.map((proposal) => proposal.proposal_id));
  const acceptedProposalIds = new Set(
    (options.acceptedAgentLoopProposalIds ?? []).map((proposalId) => proposalId.trim()).filter(Boolean)
  );
  const unknownAcceptedIds = [...acceptedProposalIds].filter((proposalId) => !knownAgentLoopProposalIds.has(proposalId));
  if (unknownAcceptedIds.length > 0) {
    return {
      ok: false,
      errors: unknownAcceptedIds.map(
        (proposalId) => `accepted agent-loop proposal ${proposalId} is not present in the validated contract.`
      )
    };
  }
  return {
    ok: true,
    code_change_proposals: codeChangeProposals.filter(isRecord).map(buildCodeChangeProposalRoute),
    agent_loop_follow_ups: agentLoopFollowUps,
    agent_loop_memory_entries: agentLoopFollowUps
      .filter((proposal) => acceptedProposalIds.has(proposal.proposal_id))
      .map((proposal) => ({
        schema_version: 'co.review.agent_loop_memory_entry.v1',
        proposal_id: proposal.proposal_id,
        title: proposal.title,
        rationale: extractAgentLoopRationale(proposal.description),
        source_contract_schema: REVIEW_CONTRACT_SCHEMA_VERSION,
        evidence_refs: proposal.evidence_refs
      }))
  };
}

export function buildReviewContractPromptLines(options: {
  mode: ReviewContractMode;
  contractRelativePath: string;
  schemaRef: ReviewContractEvidenceRef;
  outputSchemaRef: ReviewContractEvidenceRef;
  bundleRefs: ReviewContractEvidenceRef[];
}): string[] {
  const modeLabel =
    options.mode === 'enforce'
      ? 'enforce mode: missing, invalid, blocked, findings, or unknown contract verdicts fail the semantic review gate'
      : 'shadow mode: telemetry records the contract for audit while legacy semantic parsing remains authoritative';
  return [
    '',
    'Governed review contract:',
    `- Contract mode: ${modeLabel}.`,
    `- The wrapper will extract the final \`${REVIEW_CONTRACT_SCHEMA_VERSION}\` JSON object into \`${options.contractRelativePath}\`.`,
    `- JSON Schema: \`${options.schemaRef.path}\` sha256=${options.schemaRef.sha256}.`,
    `- Enforce-mode structured output schema: \`${options.outputSchemaRef.path}\` sha256=${options.outputSchemaRef.sha256}.`,
    '- Use the structured input bundles below instead of broad rediscovery. Cite bundle evidence refs with exact `path` and `sha256` values.',
    ...options.bundleRefs.map(
      (ref) => `  - \`${ref.path}\` sha256=${ref.sha256}`
    ),
    '- Required axes: `spec_conformance`, `coding_standards`, `code_changes`, and `agent_loop`.',
    '- Also populate `review_intent_matrix` with required axes `original_spec`, `coding_standards`, `code_change_proposals`, and `agent_loop_change_proposals`; every axis must include `required: true`, `verdict: clean|findings|unknown`, non-empty `evidence[]`, and concise `proposed_fixes[]`.',
    '- `original_spec` may be clean only when the spec bundle shows canonical PRD, TECH_SPEC, and ACTION_PLAN evidence reached the reviewer; when unavailable, set `original_spec.verdict` to `unknown`.',
    '- Every axis must set `verdict` to `clean`, `findings`, `blocked`, or `unknown`; `clean` requires a non-empty `clean_signal` and zero findings.',
    '- Put patchable code suggestions only in `code_change_proposals[]`; do not apply reviewer changes directly.',
    '- Put producer-loop feedback only in `agent_loop_proposals[]`; default routing must be `linear_follow_up` with `follow_up_kind: agent_loop`.',
    '- If any axis cannot be proven from the bundles and touched files, set that axis to `unknown` instead of inferring clean from prose or empty findings.',
    '- Final response must be a single JSON object matching the schema, with no prose before or after it.'
  ];
}

function buildEmptyContractTelemetry(
  mode: ReviewContractMode,
  contractPath: string | null,
  status: ReviewContractTelemetry['contract_validation']['status'],
  errors: string[]
): ReviewContractTelemetry {
  return {
    contract_path: contractPath,
    contract_mode: mode,
    contract_validation: {
      status,
      errors
    },
    contract_overall_verdict: null,
    axis_verdicts: {
      spec_conformance: null,
      coding_standards: null,
      code_changes: null,
      agent_loop: null
    },
    axis_finding_counts: {
      spec_conformance: 0,
      coding_standards: 0,
      code_changes: 0,
      agent_loop: 0
    },
    proposal_counts: {
      code_change: 0,
      agent_loop: 0
    },
    review_intent_matrix: null,
    review_verdict: 'unknown',
    highest_finding_priority: null,
    finding_count: 0
  };
}

function buildTelemetryFromValidContract(
  mode: ReviewContractMode,
  contractPath: string,
  contract: ReviewContractRecord
): ReviewContractTelemetry {
  const axes = contract.axes as Record<ReviewContractAxisName, ReviewContractAxis>;
  const axisVerdicts = Object.fromEntries(
    CONTRACT_AXES.map((axis) => [axis, axes[axis].verdict])
  ) as Record<ReviewContractAxisName, ReviewContractAxisVerdict>;
  const axisFindingCounts = Object.fromEntries(
    CONTRACT_AXES.map((axis) => [axis, axes[axis].findings.length])
  ) as Record<ReviewContractAxisName, number>;
  const findings = CONTRACT_AXES.flatMap((axis) => axes[axis].findings);
  const priorities = findings
    .map((finding) => finding.priority)
    .filter((priority): priority is ReviewFindingPriority => isReviewFindingPriority(priority));
  const overallVerdict = coerceAxisVerdict(contract.overall_verdict) ?? deriveOverallVerdict(axisVerdicts);
  const reviewIntentMatrix = normalizeReviewIntentMatrix(contract.review_intent_matrix);
  return {
    contract_path: contractPath,
    contract_mode: mode,
    contract_validation: {
      status: 'valid',
      errors: []
    },
    contract_overall_verdict: overallVerdict,
    axis_verdicts: axisVerdicts,
    axis_finding_counts: axisFindingCounts,
    proposal_counts: {
      code_change: Array.isArray(contract.code_change_proposals)
        ? contract.code_change_proposals.length
        : 0,
      agent_loop: Array.isArray(contract.agent_loop_proposals)
        ? contract.agent_loop_proposals.length
        : 0
    },
    review_intent_matrix: reviewIntentMatrix,
    review_verdict: semanticVerdictFromOverall(overallVerdict),
    highest_finding_priority: priorities.sort(compareReviewFindingPriority)[0] ?? null,
    finding_count: findings.length
  };
}

async function buildSpecBundle(options: {
  repoRoot: string;
  manifestPath: string;
  taskKey?: string | null;
  taskLabel: string;
  reviewSurface: string;
  notes?: string | null;
}): Promise<Record<string, unknown>> {
  const taskIndexPath = join(options.repoRoot, 'tasks', 'index.json');
  const taskIndex = await readJson(taskIndexPath);
  const items = Array.isArray(taskIndex?.items) ? (taskIndex.items as Record<string, unknown>[]) : [];
  const taskEntry = findTaskIndexEntry(items, options.taskKey ?? null);
  const taskDocPathCandidates = collectTaskDocPaths(taskEntry);
  const taskDocPaths = normalizeRepoRelativePaths(options.repoRoot, taskDocPathCandidates);
  const skippedTaskDocPaths = taskDocPathCandidates.filter(
    (entry) => normalizeRepoRelativePath(options.repoRoot, entry) === null
  );
  const canonicalOriginalSpec = shouldAssessCanonicalOriginalSpec(options.taskKey ?? null)
    ? await assessCanonicalOriginalSpec(options.repoRoot, taskEntry, taskDocPaths)
    : null;
  const sourceRefs = await buildEvidenceRefsForPaths(options.repoRoot, [
    taskIndexPath,
    ...taskDocPaths.map((entry) => resolve(options.repoRoot, entry))
  ]);
  return {
    schema_version: 'co.review.input-bundle.v1',
    bundle: 'spec',
    generated_at: new Date().toISOString(),
    task_label: options.taskLabel,
    task_key: options.taskKey ?? null,
    review_surface: options.reviewSurface,
    notes: options.notes ?? null,
    source_refs: sourceRefs,
    task_index_entry: taskEntry ?? null,
    ...(canonicalOriginalSpec ? { canonical_original_spec: canonicalOriginalSpec } : {}),
    skipped_task_document_paths: skippedTaskDocPaths,
    task_documents: await readTextDocuments(options.repoRoot, taskDocPaths)
  };
}

async function buildStandardsBundle(options: { repoRoot: string }): Promise<Record<string, unknown>> {
  const standardsPaths = [
    'AGENTS.md',
    '.agent/AGENTS.md',
    '.agent/SOPs/review-loop.md',
    '.agent/SOPs/git-management.md',
    'docs/guides/fallback-expiry-and-refactor-policy.md',
    'docs/standalone-review-guide.md',
    'docs/guides/docs-freshness-cohorts.md'
  ];
  const existing = await filterExistingRepoPaths(options.repoRoot, standardsPaths);
  return {
    schema_version: 'co.review.input-bundle.v1',
    bundle: 'standards',
    generated_at: new Date().toISOString(),
    source_refs: await buildEvidenceRefsForPaths(
      options.repoRoot,
      existing.map((entry) => resolve(options.repoRoot, entry))
    ),
    standards_documents: await readTextDocuments(options.repoRoot, existing)
  };
}

async function buildChangeBundle(options: {
  repoRoot: string;
  scopePaths: string[];
  scopeMode?: ReviewContractScopeMode;
  scopeBase?: string | null;
  scopeCommit?: string | null;
  requestedScopeMode?: ReviewContractScopeMode;
  requestedScopeBase?: string | null;
  requestedScopeCommit?: string | null;
  scopeResolutionKind?: ReviewContractScopeResolutionKind;
  scopeResolutionNote?: string | null;
}): Promise<Record<string, unknown>> {
  const scopePaths = normalizeRepoRelativePaths(options.repoRoot, options.scopePaths);
  const scopeMode = options.scopeMode ?? 'uncommitted';
  const scopeBase = options.scopeBase ?? null;
  const scopeCommit = options.scopeCommit ?? null;
  const requestedScopeMode = options.requestedScopeMode ?? scopeMode;
  const requestedScopeBase = options.requestedScopeBase ?? null;
  const requestedScopeCommit = options.requestedScopeCommit ?? null;
  const scopeResolutionKind = options.scopeResolutionKind ?? 'explicit';
  const scopeResolutionNote = options.scopeResolutionNote ?? null;
  const changeScope = {
    repoRoot: options.repoRoot,
    scopePaths,
    scopeMode,
    scopeBase,
    scopeCommit
  };
  const nameStatus = await buildChangeNameStatus(changeScope);
  const diffStat = await buildChangeStat(changeScope);
  const diffPatch = await buildChangePatch(changeScope);
  const touchedRefs = await buildEvidenceRefsForPaths(
    options.repoRoot,
    scopePaths.map((entry) => resolve(options.repoRoot, entry))
  );
  return {
    schema_version: 'co.review.input-bundle.v1',
    bundle: 'change',
    generated_at: new Date().toISOString(),
    scope_mode: scopeMode,
    scope_base: scopeBase,
    scope_commit: scopeCommit,
    requested_scope_mode: requestedScopeMode,
    requested_scope_base: requestedScopeBase,
    requested_scope_commit: requestedScopeCommit,
    scope_resolution_kind: scopeResolutionKind,
    scope_resolution_note: scopeResolutionNote,
    scope_paths: scopePaths,
    git_diff_name_status: nameStatus,
    git_diff_stat: diffStat,
    git_diff_patch: diffPatch,
    touched_refs: touchedRefs
  };
}

async function buildAgentLoopBundle(options: {
  repoRoot: string;
  reviewDir: string;
  manifestPath: string;
  runnerLogPath?: string | null;
  runnerLogExists?: boolean;
}): Promise<Record<string, unknown>> {
  const inputDir = join(options.reviewDir, 'inputs');
  const manifestSnapshotPath = await snapshotReviewInputFile(
    inputDir,
    options.manifestPath,
    'agent-loop-active-manifest.snapshot.json'
  );
  const paths = [manifestSnapshotPath];
  let runnerLogSnapshotPath: string | null = null;
  if (options.runnerLogExists && options.runnerLogPath) {
    runnerLogSnapshotPath = await snapshotReviewInputFile(
      inputDir,
      options.runnerLogPath,
      'agent-loop-runner-log.snapshot.ndjson'
    );
    paths.push(runnerLogSnapshotPath);
  }
  const sourceRefs = await buildEvidenceRefsForPaths(options.repoRoot, paths);
  return {
    schema_version: 'co.review.input-bundle.v1',
    bundle: 'agent_loop',
    generated_at: new Date().toISOString(),
    source_refs: sourceRefs,
    manifest: await readJson(manifestSnapshotPath),
    runner_log_tail: runnerLogSnapshotPath
      ? await readTailText(runnerLogSnapshotPath, TEXT_SNIPPET_LIMIT)
      : null
  };
}

async function snapshotReviewInputFile(
  inputDir: string,
  sourcePath: string,
  snapshotName: string
): Promise<string> {
  const snapshotPath = join(inputDir, snapshotName);
  await mkdir(inputDir, { recursive: true });
  await writeFile(snapshotPath, await readFile(sourcePath));
  return snapshotPath;
}

async function buildEvidenceRefsForPaths(
  repoRoot: string,
  absolutePaths: string[]
): Promise<ReviewContractEvidenceRef[]> {
  const refs: ReviewContractEvidenceRef[] = [];
  for (const absolutePath of absolutePaths) {
    if (!(await pathExists(absolutePath))) {
      continue;
    }
    try {
      if (!(await lstat(absolutePath)).isFile()) {
        continue;
      }
    } catch {
      continue;
    }
    refs.push(await buildEvidenceRef(repoRoot, absolutePath));
  }
  return refs;
}

async function buildEvidenceRef(
  repoRoot: string,
  absolutePath: string,
  description?: string
): Promise<ReviewContractEvidenceRef> {
  return {
    path: toRepoRelativePath(repoRoot, absolutePath),
    sha256: await sha256File(absolutePath),
    ...(description ? { description } : {})
  };
}

function findTaskIndexEntry(
  items: Record<string, unknown>[],
  taskKey: string | null
): Record<string, unknown> | null {
  if (!taskKey) {
    return null;
  }
  const keyed = items
    .flatMap((item) => collectTaskIndexEntryKeys(item).map((key) => ({ item, key })))
    .sort((left, right) => right.key.length - left.key.length);
  return (
    keyed.find((entry) => entry.key === taskKey)?.item ??
    keyed.find((entry) => taskKey.startsWith(`${entry.key}-`))?.item ??
    null
  );
}

function collectTaskIndexEntryKeys(item: Record<string, unknown>): string[] {
  const keys = new Set<string>();
  const normalized = normalizeTaskKey(item);
  if (normalized) {
    keys.add(normalized);
  }
  const id = normalizeOptionalString(item.id);
  if (id) {
    keys.add(id);
  }
  const notes = isRecord(item.notes) ? item.notes : {};
  const providerIssueTaskKey = normalizeOptionalString(notes.provider_issue_task_key);
  if (providerIssueTaskKey) {
    keys.add(providerIssueTaskKey);
  }
  return [...keys].sort((left, right) => right.length - left.length);
}

function collectTaskDocPaths(taskEntry: Record<string, unknown> | null): string[] {
  if (!taskEntry) {
    return [];
  }
  const candidates = new Set<string>();
  for (const key of ['path', 'relates_to']) {
    const value = taskEntry[key];
    if (typeof value === 'string' && value.trim()) {
      candidates.add(value.trim());
    }
  }
  const paths = taskEntry.paths;
  if (isRecord(paths)) {
    for (const key of ['task', 'spec', 'agent_task', 'prd', 'docs', 'tech_spec', 'action_plan', 'findings']) {
      const value = paths[key];
      if (typeof value === 'string' && value.trim()) {
        candidates.add(value.trim());
      }
    }
  }
  return [...candidates].sort();
}

function shouldAssessCanonicalOriginalSpec(taskKey: string | null): boolean {
  return isLinearProviderTaskKey(taskKey);
}

function isLinearProviderTaskKey(taskKey: string | null): boolean {
  return Boolean(taskKey?.startsWith('linear-') || /^\d{8}-linear-/u.test(taskKey ?? ''));
}

async function assessCanonicalOriginalSpec(
  repoRoot: string,
  taskEntry: Record<string, unknown> | null,
  taskDocPaths: string[]
): Promise<Record<string, unknown>> {
  const paths = isRecord(taskEntry?.paths) ? taskEntry.paths : {};
  const requiredPaths = {
    prd: normalizeTaskEntryPath(repoRoot, paths.prd),
    tech_spec: normalizeTaskEntryPath(repoRoot, paths.tech_spec) ?? normalizeTaskEntryPath(repoRoot, paths.docs),
    action_plan: normalizeTaskEntryPath(repoRoot, paths.action_plan)
  };
  const taskDocPathSet = new Set(taskDocPaths);
  const missingPaths: string[] = [];
  for (const [label, repoPath] of Object.entries(requiredPaths)) {
    if (!repoPath) {
      missingPaths.push(label);
      continue;
    }
    if (!taskDocPathSet.has(repoPath) || !(await pathExists(resolve(repoRoot, repoPath)))) {
      missingPaths.push(repoPath);
    }
  }
  return {
    available: missingPaths.length === 0,
    required_paths: requiredPaths,
    missing_paths: missingPaths
  };
}

function normalizeTaskEntryPath(repoRoot: string, value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? normalizeRepoRelativePath(repoRoot, value.trim())
    : null;
}

function normalizeRepoRelativePaths(repoRoot: string, repoPaths: string[]): string[] {
  const normalized = new Set<string>();
  for (const repoPath of repoPaths) {
    const safePath = normalizeRepoRelativePath(repoRoot, repoPath);
    if (safePath) {
      normalized.add(safePath);
    }
  }
  return [...normalized].sort();
}

function normalizeRepoRelativePath(repoRoot: string, repoPath: string): string | null {
  const trimmed = repoPath.trim();
  if (!trimmed || isAbsolute(trimmed)) {
    return null;
  }
  const absolutePath = resolve(repoRoot, trimmed);
  if (!isPathWithinRoot(resolve(repoRoot), absolutePath)) {
    return null;
  }
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

async function filterExistingRepoPaths(repoRoot: string, repoPaths: string[]): Promise<string[]> {
  const existing: string[] = [];
  for (const repoPath of normalizeRepoRelativePaths(repoRoot, repoPaths)) {
    if (await pathExists(resolve(repoRoot, repoPath))) {
      existing.push(repoPath);
    }
  }
  return existing;
}

async function readTextDocuments(
  repoRoot: string,
  repoPaths: string[]
): Promise<Array<{ path: string; content: string }>> {
  const docs: Array<{ path: string; content: string }> = [];
  for (const repoPath of normalizeRepoRelativePaths(repoRoot, repoPaths)) {
    const absolutePath = resolve(repoRoot, repoPath);
    if (!(await pathExists(absolutePath))) {
      continue;
    }
    try {
      if (!(await lstat(absolutePath)).isFile()) {
        continue;
      }
    } catch {
      continue;
    }
    docs.push({
      path: repoPath,
      content: await readTailText(absolutePath, TEXT_SNIPPET_LIMIT)
    });
  }
  return docs;
}

async function runGit(repoRoot: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync('git', args, {
      cwd: repoRoot,
      maxBuffer: GIT_OUTPUT_MAX_BUFFER_BYTES
    });
    return String(result.stdout ?? '').trim();
  } catch (error) {
    return error instanceof Error ? `[git command failed: ${error.message}]` : '[git command failed]';
  }
}

async function buildChangeNameStatus(options: {
  repoRoot: string;
  scopePaths: string[];
  scopeMode: ReviewContractScopeMode;
  scopeBase: string | null;
  scopeCommit: string | null;
}): Promise<string> {
  if (options.scopeMode === 'base' && options.scopeBase) {
    return await runGit(options.repoRoot, [
      'diff',
      '--name-status',
      `${options.scopeBase}...HEAD`,
      '--',
      ...options.scopePaths
    ]);
  }
  if (options.scopeMode === 'commit' && options.scopeCommit) {
    return await runGit(options.repoRoot, [
      'show',
      '--no-color',
      '--name-status',
      '--format=',
      options.scopeCommit,
      '--',
      ...options.scopePaths
    ]);
  }
  return await buildUncommittedChangeNameStatus(options.repoRoot, options.scopePaths);
}

async function buildChangeStat(options: {
  repoRoot: string;
  scopePaths: string[];
  scopeMode: ReviewContractScopeMode;
  scopeBase: string | null;
  scopeCommit: string | null;
}): Promise<string> {
  if (options.scopeMode === 'base' && options.scopeBase) {
    return await runGit(options.repoRoot, [
      'diff',
      '--stat',
      `${options.scopeBase}...HEAD`,
      '--',
      ...options.scopePaths
    ]);
  }
  if (options.scopeMode === 'commit' && options.scopeCommit) {
    return await runGit(options.repoRoot, [
      'show',
      '--no-color',
      '--stat',
      '--format=',
      options.scopeCommit,
      '--',
      ...options.scopePaths
    ]);
  }
  return await buildUncommittedChangeStat(options.repoRoot, options.scopePaths);
}

async function buildChangePatch(options: {
  repoRoot: string;
  scopePaths: string[];
  scopeMode: ReviewContractScopeMode;
  scopeBase: string | null;
  scopeCommit: string | null;
}): Promise<string> {
  if (options.scopeMode === 'base' && options.scopeBase) {
    return await runGit(options.repoRoot, [
      'diff',
      '--no-color',
      `${options.scopeBase}...HEAD`,
      '--',
      ...options.scopePaths
    ]);
  }
  if (options.scopeMode === 'commit' && options.scopeCommit) {
    return await runGit(options.repoRoot, [
      'show',
      '--no-color',
      '--format=',
      '--patch',
      options.scopeCommit,
      '--',
      ...options.scopePaths
    ]);
  }
  const unstaged = await runGit(options.repoRoot, [
    'diff',
    '--no-color',
    '--',
    ...options.scopePaths
  ]);
  const staged = await runGit(options.repoRoot, [
    'diff',
    '--cached',
    '--no-color',
    '--',
    ...options.scopePaths
  ]);
  const untracked = await formatUntrackedPatches(
    options.repoRoot,
    await listUntrackedScopePaths(options.repoRoot, options.scopePaths)
  );
  return joinGitSections([unstaged, staged, untracked]);
}

async function buildUncommittedChangeNameStatus(
  repoRoot: string,
  scopePaths: string[]
): Promise<string> {
  const unstaged = await runGit(repoRoot, ['diff', '--name-status', '--', ...scopePaths]);
  const staged = await runGit(repoRoot, ['diff', '--cached', '--name-status', '--', ...scopePaths]);
  const untracked = formatUntrackedNameStatus(await listUntrackedScopePaths(repoRoot, scopePaths));
  return joinGitSections([unstaged, staged, untracked]);
}

async function buildUncommittedChangeStat(
  repoRoot: string,
  scopePaths: string[]
): Promise<string> {
  const unstaged = await runGit(repoRoot, ['diff', '--stat', '--', ...scopePaths]);
  const staged = await runGit(repoRoot, ['diff', '--cached', '--stat', '--', ...scopePaths]);
  const untracked = await formatUntrackedStat(repoRoot, await listUntrackedScopePaths(repoRoot, scopePaths));
  return joinGitSections([unstaged, staged, untracked]);
}

async function listUntrackedScopePaths(repoRoot: string, scopePaths: string[]): Promise<string[]> {
  const output = await runGit(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...scopePaths]);
  if (output.startsWith('[git command failed:')) {
    return [];
  }
  return output
    .split('\0')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort();
}

function formatUntrackedNameStatus(paths: string[]): string {
  return paths.map((entry) => `??\t${entry}`).join('\n');
}

async function formatUntrackedStat(repoRoot: string, paths: string[]): Promise<string> {
  const lines: string[] = [];
  for (const repoPath of paths) {
    const absolutePath = resolve(repoRoot, repoPath);
    if (!isPathWithinRoot(repoRoot, absolutePath)) {
      continue;
    }
    try {
      if (!(await lstat(absolutePath)).isFile()) {
        continue;
      }
      const content = await readFile(absolutePath);
      const lineCount = countBufferLines(content);
      const pluses = '+'.repeat(Math.min(Math.max(lineCount, 1), 20));
      lines.push(` ${repoPath} | ${lineCount} ${pluses}`);
    } catch {
      continue;
    }
  }
  if (lines.length === 0) {
    return '';
  }
  const totalLines = lines.reduce((sum, line) => {
    const match = line.match(/\|\s+(\d+)\s/u);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);
  const fileLabel = lines.length === 1 ? 'file' : 'files';
  const insertionLabel = totalLines === 1 ? 'insertion' : 'insertions';
  return [...lines, ` ${lines.length} ${fileLabel} changed, ${totalLines} ${insertionLabel}(+)`].join('\n');
}

async function formatUntrackedPatches(repoRoot: string, paths: string[]): Promise<string> {
  const patches: string[] = [];
  for (const repoPath of paths) {
    const absolutePath = resolve(repoRoot, repoPath);
    if (!isPathWithinRoot(repoRoot, absolutePath)) {
      continue;
    }
    try {
      if (!(await lstat(absolutePath)).isFile()) {
        continue;
      }
      const rawContent = await readFile(absolutePath, 'utf8');
      const content =
        rawContent.length > TEXT_SNIPPET_LIMIT
          ? `${rawContent.slice(0, TEXT_SNIPPET_LIMIT)}\n[review-contract bundle truncated untracked file after ${TEXT_SNIPPET_LIMIT} characters]\n`
          : rawContent;
      const lines = content.length > 0 ? content.split(/\r?\n/u) : [''];
      if (lines.at(-1) === '') {
        lines.pop();
      }
      const hunkLineCount = Math.max(lines.length, 1);
      patches.push(
        [
          `diff --git a/${repoPath} b/${repoPath}`,
          'new file mode 100644',
          'index 0000000..0000000',
          '--- /dev/null',
          `+++ b/${repoPath}`,
          `@@ -0,0 +1,${hunkLineCount} @@`,
          ...(lines.length > 0 ? lines.map((line) => `+${line}`) : ['+'])
        ].join('\n')
      );
    } catch {
      continue;
    }
  }
  return patches.join('\n\n');
}

function joinGitSections(sections: string[]): string {
  return sections.map((entry) => entry.trim()).filter(Boolean).join('\n');
}

function countBufferLines(content: Buffer): number {
  if (content.length === 0) {
    return 0;
  }
  let count = 0;
  for (const byte of content) {
    if (byte === 10) {
      count += 1;
    }
  }
  return content[content.length - 1] === 10 ? count : count + 1;
}

function extractReviewContractCandidate(outputText: string): {
  contract: ReviewContractRecord | null;
  errors: string[];
} {
  const finalText = extractFinalReviewerText(outputText);
  if (finalText === null) {
    return { contract: null, errors: [] };
  }
  const extracted = extractStandaloneJsonObjectText(finalText);
  if (extracted.error) {
    return { contract: null, errors: [extracted.error] };
  }
  if (!extracted.text) {
    return { contract: null, errors: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted.text) as unknown;
  } catch (error) {
    return {
      contract: null,
      errors: [`Final review output contract JSON could not be parsed (${formatErrorMessage(error)}).`]
    };
  }
  if (isRecord(parsed) && parsed.extraction_status === 'missing') {
    return { contract: null, errors: [] };
  }
  if (isRecord(parsed) && parsed.extraction_status === 'invalid') {
    const errors = Array.isArray(parsed.errors)
      ? parsed.errors.filter((entry): entry is string => typeof entry === 'string')
      : [];
    return { contract: null, errors };
  }
  if (!isReviewContractCandidate(parsed)) {
    return {
      contract: null,
      errors: [`Final review output JSON object must declare schema_version "${REVIEW_CONTRACT_SCHEMA_VERSION}".`]
    };
  }
  return { contract: parsed, errors: [] };
}

async function extractReviewContractCandidateFromLastMessageFile(contractPath: string): Promise<{
  contract: ReviewContractRecord | null;
  errors: string[];
}> {
  let finalText: string;
  try {
    finalText = await readFile(contractPath, 'utf8');
  } catch {
    return { contract: null, errors: [] };
  }
  const extracted = extractStandaloneJsonObjectText(finalText);
  if (extracted.error) {
    return { contract: null, errors: [extracted.error] };
  }
  if (!extracted.text) {
    return { contract: null, errors: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted.text) as unknown;
  } catch (error) {
    return {
      contract: null,
      errors: [`Final review output contract JSON could not be parsed (${formatErrorMessage(error)}).`]
    };
  }
  if (isRecord(parsed) && parsed.extraction_status === 'missing') {
    return { contract: null, errors: [] };
  }
  if (isRecord(parsed) && parsed.extraction_status === 'invalid') {
    const errors = Array.isArray(parsed.errors)
      ? parsed.errors.filter((entry): entry is string => typeof entry === 'string')
      : [];
    return { contract: null, errors };
  }
  if (!isReviewContractCandidate(parsed)) {
    return {
      contract: null,
      errors: [`Final review output JSON object must declare schema_version "${REVIEW_CONTRACT_SCHEMA_VERSION}".`]
    };
  }
  return { contract: parsed, errors: [] };
}

function isReviewContractCandidate(value: unknown): value is ReviewContractRecord {
  return isRecord(value) && value.schema_version === REVIEW_CONTRACT_SCHEMA_VERSION;
}

function extractFinalReviewerText(outputText: string): string | null {
  const lines = outputText.split(/\r?\n/u);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.trim() === 'codex') {
      if (isLikelyInspectedContractOutputMarker(lines, index)) {
        return null;
      }
      return lines.slice(index + 1).join('\n').trim();
    }
  }
  const trimmed = outputText.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('```') ? outputText.trim() : null;
}

function isLikelyInspectedContractOutputMarker(lines: string[], markerIndex: number): boolean {
  let sawOrdinaryCommandOutput = false;
  let sawEarlierCodexMarker = false;
  let sawNestedTranscriptMarker = false;
  let sawAssistantProgressMarker = false;
  for (let index = markerIndex - 1; index >= 0; index -= 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed === 'codex') {
      sawEarlierCodexMarker = true;
      continue;
    }
    if (isTopLevelAssistantProgressBoundaryLine(trimmed)) {
      sawAssistantProgressMarker = true;
      continue;
    }
    if (isCodexTranscriptMarkerLine(trimmed)) {
      sawNestedTranscriptMarker = true;
      continue;
    }
    if (isTopLevelReviewRuntimeLine(trimmed)) {
      continue;
    }
    if (isCommandResultHeaderLine(line)) {
      const commandLine =
        extractInlineCommandLineFromResultHeader(line) ?? findCommandLineBeforeResultHeader(lines, index);
      if (isReviewContractInspectionCommandLine(commandLine)) {
        if (sawNestedTranscriptMarker || sawEarlierCodexMarker || sawAssistantProgressMarker) {
          return true;
        }
        return !sawOrdinaryCommandOutput;
      }
    }
    sawOrdinaryCommandOutput = true;
  }
  return false;
}

function isTopLevelAssistantProgressBoundaryLine(trimmedLine: string): boolean {
  return trimmedLine === 'thinking' || trimmedLine === 'exec';
}

function isTopLevelReviewRuntimeLine(trimmedLine: string): boolean {
  return (
    trimmedLine.startsWith('[run-review]') ||
    /^\d{4}-\d{2}-\d{2}T[^\s]+\s+(?:TRACE|DEBUG|INFO|WARN|ERROR)\s/u.test(trimmedLine) ||
    isCodexRolloutItemCleanupNoiseLine(trimmedLine)
  );
}

function isCodexRolloutItemCleanupNoiseLine(trimmedLine: string): boolean {
  return /^(?:(?:trace|debug|info|warn|error)\s+|\d{4}-\d{2}-\d{2}T[^\s]+\s+(?:trace|debug|info|warn|error)\s+)?codex_core::session:\s+failed to record rollout items:\s+thread\b.*\bnot found\b/iu.test(
    trimmedLine
  );
}

function isCodexTranscriptMarkerLine(trimmedLine: string): boolean {
  return (
    trimmedLine === 'user' ||
    trimmedLine === '--------' ||
    /^OpenAI Codex v/u.test(trimmedLine) ||
    /^(workdir|model|provider|approval|sandbox|reasoning effort|session id):\s/u.test(trimmedLine)
  );
}

function isCommandResultHeaderLine(line: string): boolean {
  return (
    STANDALONE_COMMAND_RESULT_HEADER_PATTERN.test(line) ||
    extractInlineCommandLineFromResultHeader(line) !== null
  );
}

const STANDALONE_COMMAND_RESULT_HEADER_PATTERN =
  /^\s+(?:succeeded|exited \d+|failed) in \d+(?:\.\d+)?(?:ms|s):\s*$/u;

const COMMAND_RESULT_TRAILER_PATTERN =
  /\s(?:succeeded|exited \d+|failed) in \d+(?:\.\d+)?(?:ms|s):\s*$/u;

function extractInlineCommandLineFromResultHeader(line: string): string | null {
  const trailerMatch = line.match(COMMAND_RESULT_TRAILER_PATTERN);
  if (!trailerMatch || typeof trailerMatch.index !== 'number') {
    return null;
  }
  const beforeStatus = line.slice(0, trailerMatch.index).trimEnd();
  const cwdDelimiterIndex = beforeStatus.lastIndexOf(' in ');
  if (cwdDelimiterIndex <= 0) {
    return null;
  }
  const commandLine = beforeStatus.slice(0, cwdDelimiterIndex).trim();
  return commandLine && commandLine.length > 0 ? commandLine : null;
}

function findCommandLineBeforeResultHeader(lines: string[], headerIndex: number): string | null {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const trimmed = lines[index]?.trim() ?? '';
    if (!trimmed) {
      continue;
    }
    return trimmed === 'exec' ? null : trimmed;
  }
  return null;
}

function isReviewContractInspectionCommandLine(commandLine: string | null): boolean {
  if (!commandLine) {
    return false;
  }
  const normalized = commandLine.toLowerCase();
  return (
    /(?:^|[/\s"'=])review\/(?:contract\.json|output(?:-[^/\s"']*)?\.log)(?:$|[\s"'])/u.test(
      normalized
    ) ||
    /\b(?:cat|sed|tail|head|less|rg|grep|awk|nl)\b[\s\S]*(?:^|[/\s"'=])(?:nested-review|codex[^/\s"']*|[^/\s"']*transcript[^/\s"']*)\.log(?:$|[\s"'])/u.test(
      normalized
    )
  );
}

function extractStandaloneJsonObjectText(value: string): {
  text: string | null;
  error: string | null;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { text: null, error: null };
  }
  if (trimmed.startsWith('```')) {
    return extractStandaloneFencedJsonObjectText(trimmed);
  }
  if (!trimmed.startsWith('{')) {
    return { text: null, error: null };
  }
  const span = extractBalancedJsonObjectSpan(trimmed, 0);
  if (!span) {
    return {
      text: null,
      error: 'Final review output starts with a JSON object but the object is not balanced.'
    };
  }
  const trailing = trimmed.slice(span.endIndex).trim();
  if (trailing.length > 0 && !isAllowedTrailingContractRuntimeNoise(trailing)) {
    return {
      text: null,
      error: 'Final review output must contain only one co.review.contract.v1 JSON object with no trailing content.'
    };
  }
  return { text: span.text, error: null };
}

function extractStandaloneFencedJsonObjectText(trimmed: string): {
  text: string | null;
  error: string | null;
} {
  const firstNewline = trimmed.indexOf('\n');
  if (firstNewline === -1) {
    return {
      text: null,
      error: 'Final review output starts with a JSON fence but has no contract body.'
    };
  }
  const fenceHeader = trimmed.slice(0, firstNewline).trim().toLowerCase();
  if (fenceHeader !== '```' && fenceHeader !== '```json') {
    return {
      text: null,
      error: 'Final review output JSON fence must be plain ``` or ```json.'
    };
  }
  const body = trimmed.slice(firstNewline + 1).trimStart();
  if (!body.startsWith('{')) {
    return {
      text: null,
      error: 'Final review output JSON fence must contain a co.review.contract.v1 object.'
    };
  }
  const span = extractBalancedJsonObjectSpan(body, 0);
  if (!span) {
    return {
      text: null,
      error: 'Final review output JSON fence contains an unbalanced object.'
    };
  }
  const remainder = body.slice(span.endIndex).trimStart();
  if (!remainder.startsWith('```')) {
    return {
      text: null,
      error: 'Final review output JSON fence must close immediately after the contract object.'
    };
  }
  const trailing = remainder.slice(3).trim();
  if (trailing.length > 0 && !isAllowedTrailingContractRuntimeNoise(trailing)) {
    return {
      text: null,
      error: 'Final review output must contain only one co.review.contract.v1 JSON object with no trailing content.'
    };
  }
  return { text: span.text, error: null };
}

function isAllowedTrailingContractRuntimeNoise(value: string): boolean {
  const lines = value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 && lines.every((line) => isCodexRolloutItemCleanupNoiseLine(line));
}

function extractBalancedJsonObjectSpan(value: string, startIndex: number): {
  text: string;
  endIndex: number;
} | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          text: value.slice(startIndex, index + 1),
          endIndex: index + 1
        };
      }
    }
  }
  return null;
}

function validateContractSchemaShape(candidate: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(candidate)) {
    return ['contract: must be an object'];
  }
  validateNoAdditionalProperties(candidate, [
    'schema_version',
    'generated_at',
    'overall_verdict',
    'axes',
    'review_intent_matrix',
    'code_change_proposals',
    'agent_loop_proposals'
  ], '', errors);
  validateConst(candidate.schema_version, REVIEW_CONTRACT_SCHEMA_VERSION, '/schema_version', errors);
  validateNonEmptyString(candidate.generated_at, '/generated_at', errors);
  validateVerdict(candidate.overall_verdict, '/overall_verdict', errors);
  validateAxes(candidate.axes, errors);
  validateReviewIntentMatrixShape(candidate.review_intent_matrix, errors);
  validateArray(candidate.code_change_proposals, '/code_change_proposals', errors)
    ?.forEach((proposal, index) => validateCodeChangeProposalShape(proposal, `/code_change_proposals/${index}`, errors));
  validateArray(candidate.agent_loop_proposals, '/agent_loop_proposals', errors)
    ?.forEach((proposal, index) => validateAgentLoopProposalShape(proposal, `/agent_loop_proposals/${index}`, errors));
  return errors;
}

function validateAxes(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('/axes: must be object');
    return;
  }
  validateNoAdditionalProperties(value, CONTRACT_AXES, '/axes', errors);
  for (const axisName of CONTRACT_AXES) {
    if (!Object.prototype.hasOwnProperty.call(value, axisName)) {
      errors.push(`/axes: must have required property '${axisName}'`);
      continue;
    }
    validateAxisShape(value[axisName], `/axes/${axisName}`, errors);
  }
}

function validateReviewIntentMatrixShape(value: unknown, errors: string[]): void {
  if (value === undefined) {
    errors.push("/: must have required property 'review_intent_matrix'");
    return;
  }
  if (!isRecord(value)) {
    errors.push('/review_intent_matrix: must be object');
    return;
  }
  validateNoAdditionalProperties(value, REVIEW_INTENT_MATRIX_AXES, '/review_intent_matrix', errors);
  for (const axisName of REVIEW_INTENT_MATRIX_AXES) {
    if (!Object.prototype.hasOwnProperty.call(value, axisName)) {
      errors.push(`/review_intent_matrix: must have required property '${axisName}'`);
      continue;
    }
    validateReviewIntentMatrixAxisShape(value[axisName], `/review_intent_matrix/${axisName}`, errors);
  }
}

function validateReviewIntentMatrixAxisShape(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: must be object`);
    return;
  }
  validateNoAdditionalProperties(value, ['required', 'verdict', 'evidence', 'proposed_fixes'], path, errors);
  for (const property of ['required', 'verdict', 'evidence', 'proposed_fixes']) {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
      errors.push(`${path}: must have required property '${property}'`);
    }
  }
  if (value.required !== true) {
    errors.push(`${path}/required: must be true`);
  }
  validateIntentVerdict(value.verdict, `${path}/verdict`, errors);
  validateStringArray(value.evidence, `${path}/evidence`, errors);
  validateStringArray(value.proposed_fixes, `${path}/proposed_fixes`, errors);
}

function validateAxisShape(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: must be object`);
    return;
  }
  validateNoAdditionalProperties(value, ['verdict', 'summary', 'clean_signal', 'evidence_refs', 'findings'], path, errors);
  for (const property of ['verdict', 'summary', 'evidence_refs', 'findings']) {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
      errors.push(`${path}: must have required property '${property}'`);
    }
  }
  const verdict = coerceAxisVerdict(value.verdict);
  validateVerdict(value.verdict, `${path}/verdict`, errors);
  validateNonEmptyString(value.summary, `${path}/summary`, errors);
  if (Object.prototype.hasOwnProperty.call(value, 'clean_signal')) {
    validateNonEmptyString(value.clean_signal, `${path}/clean_signal`, errors);
  }
  validateEvidenceRefArrayShape(value.evidence_refs, `${path}/evidence_refs`, errors);
  const findings = validateArray(value.findings, `${path}/findings`, errors);
  findings?.forEach((finding, index) => validateFindingShape(finding, `${path}/findings/${index}`, errors));
  if (verdict === 'clean') {
    if (!Object.prototype.hasOwnProperty.call(value, 'clean_signal')) {
      errors.push(`${path}: must have required property 'clean_signal'`);
    }
    if (findings && findings.length > 0) {
      errors.push(`${path}/findings: must NOT have more than 0 items`);
    }
  }
  if ((verdict === 'findings' || verdict === 'blocked') && findings && findings.length === 0) {
    errors.push(`${path}/findings: must NOT have fewer than 1 items`);
  }
}

function validateFindingShape(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: must be object`);
    return;
  }
  validateNoAdditionalProperties(value, ['id', 'priority', 'title', 'body', 'evidence_refs'], path, errors);
  for (const property of ['id', 'priority', 'title', 'evidence_refs']) {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
      errors.push(`${path}: must have required property '${property}'`);
    }
  }
  validateNonEmptyString(value.id, `${path}/id`, errors);
  validatePriority(value.priority, `${path}/priority`, errors);
  validateNonEmptyString(value.title, `${path}/title`, errors);
  if (Object.prototype.hasOwnProperty.call(value, 'body')) {
    validateNonEmptyString(value.body, `${path}/body`, errors);
  }
  validateEvidenceRefArrayShape(value.evidence_refs, `${path}/evidence_refs`, errors);
}

function validateCodeChangeProposalShape(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: must be object`);
    return;
  }
  validateNoAdditionalProperties(value, [
    'id',
    'title',
    'rationale',
    'unified_diff',
    'target',
    'tests',
    'risk',
    'evidence_refs'
  ], path, errors);
  for (const property of ['id', 'title', 'rationale', 'tests', 'risk', 'evidence_refs']) {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
      errors.push(`${path}: must have required property '${property}'`);
    }
  }
  validateNonEmptyString(value.id, `${path}/id`, errors);
  validateNonEmptyString(value.title, `${path}/title`, errors);
  validateNonEmptyString(value.rationale, `${path}/rationale`, errors);
  if (Object.prototype.hasOwnProperty.call(value, 'unified_diff')) {
    validateNonEmptyString(value.unified_diff, `${path}/unified_diff`, errors);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'target')) {
    validateProposalTargetShape(value.target, `${path}/target`, errors);
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'unified_diff') && !Object.prototype.hasOwnProperty.call(value, 'target')) {
    errors.push(`${path}: must match a schema in anyOf`);
  }
  validateStringArray(value.tests, `${path}/tests`, errors);
  validateNonEmptyString(value.risk, `${path}/risk`, errors);
  validateEvidenceRefArrayShape(value.evidence_refs, `${path}/evidence_refs`, errors);
}

function validateProposalTargetShape(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: must be object`);
    return;
  }
  validateNoAdditionalProperties(value, ['path', 'section', 'function'], path, errors);
  if (!Object.prototype.hasOwnProperty.call(value, 'path')) {
    errors.push(`${path}: must have required property 'path'`);
  }
  validateNonEmptyString(value.path, `${path}/path`, errors);
  if (Object.prototype.hasOwnProperty.call(value, 'section')) {
    validateNonEmptyString(value.section, `${path}/section`, errors);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'function')) {
    validateNonEmptyString(value.function, `${path}/function`, errors);
  }
}

function validateAgentLoopProposalShape(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: must be object`);
    return;
  }
  validateNoAdditionalProperties(value, ['id', 'title', 'rationale', 'blocking', 'routing', 'evidence_refs'], path, errors);
  for (const property of ['id', 'title', 'rationale', 'routing', 'evidence_refs']) {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
      errors.push(`${path}: must have required property '${property}'`);
    }
  }
  validateNonEmptyString(value.id, `${path}/id`, errors);
  validateNonEmptyString(value.title, `${path}/title`, errors);
  validateNonEmptyString(value.rationale, `${path}/rationale`, errors);
  if (Object.prototype.hasOwnProperty.call(value, 'blocking') && typeof value.blocking !== 'boolean') {
    errors.push(`${path}/blocking: must be boolean`);
  }
  validateAgentLoopRoutingShape(value.routing, `${path}/routing`, errors);
  validateEvidenceRefArrayShape(value.evidence_refs, `${path}/evidence_refs`, errors);
}

function validateBlockingAgentLoopProposals(
  contract: ReviewContractRecord,
  agentLoopVerdict: ReviewContractAxisVerdict | null
): string[] {
  const errors: string[] = [];
  const proposals = Array.isArray(contract.agent_loop_proposals) ? contract.agent_loop_proposals : [];
  proposals.forEach((proposal, index) => {
    if (!isRecord(proposal) || proposal.blocking !== true) {
      return;
    }
    if (agentLoopVerdict === 'findings' || agentLoopVerdict === 'blocked') {
      return;
    }
    errors.push(
      `/agent_loop_proposals/${index}/blocking: blocking agent-loop proposals require the agent_loop axis to be findings or blocked.`
    );
  });
  return errors;
}

function validateAgentLoopRoutingShape(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: must be object`);
    return;
  }
  validateNoAdditionalProperties(value, [
    'default_route',
    'follow_up_kind',
    'intent_checksum',
    'canonical_owner_key',
    'non_goals',
    'not_done_if',
    'acceptance_criteria'
  ], path, errors);
  for (const property of [
    'default_route',
    'follow_up_kind',
    'intent_checksum',
    'non_goals',
    'not_done_if',
    'acceptance_criteria'
  ]) {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
      errors.push(`${path}: must have required property '${property}'`);
    }
  }
  validateConst(value.default_route, 'linear_follow_up', `${path}/default_route`, errors);
  validateConst(value.follow_up_kind, 'agent_loop', `${path}/follow_up_kind`, errors);
  validateNonEmptyString(value.intent_checksum, `${path}/intent_checksum`, errors);
  if (Object.prototype.hasOwnProperty.call(value, 'canonical_owner_key')) {
    validateNonEmptyString(value.canonical_owner_key, `${path}/canonical_owner_key`, errors);
  }
  validateStringArray(value.non_goals, `${path}/non_goals`, errors);
  validateStringArray(value.not_done_if, `${path}/not_done_if`, errors);
  validateStringArray(value.acceptance_criteria, `${path}/acceptance_criteria`, errors);
}

function validateEvidenceRefArrayShape(value: unknown, path: string, errors: string[]): void {
  const refs = validateArray(value, path, errors, { minItems: 1 });
  refs?.forEach((ref, index) => validateEvidenceRefShape(ref, `${path}/${index}`, errors));
}

function validateEvidenceRefShape(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: must be object`);
    return;
  }
  validateNoAdditionalProperties(value, ['path', 'sha256', 'description'], path, errors);
  for (const property of ['path', 'sha256']) {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
      errors.push(`${path}: must have required property '${property}'`);
    }
  }
  validateNonEmptyString(value.path, `${path}/path`, errors);
  validateNonEmptyString(value.sha256, `${path}/sha256`, errors);
  if (typeof value.sha256 === 'string' && !SHA256_PATTERN.test(value.sha256)) {
    errors.push(`${path}/sha256: must match pattern "^[a-f0-9]{64}$"`);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'description')) {
    validateNonEmptyString(value.description, `${path}/description`, errors);
  }
}

function validateStringArray(value: unknown, path: string, errors: string[]): void {
  const entries = validateArray(value, path, errors, { minItems: 1 });
  entries?.forEach((entry, index) => validateNonEmptyString(entry, `${path}/${index}`, errors));
}

function validateArray(
  value: unknown,
  path: string,
  errors: string[],
  options: { minItems?: number } = {}
): unknown[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${path}: must be array`);
    return null;
  }
  if (options.minItems !== undefined && value.length < options.minItems) {
    errors.push(`${path}: must NOT have fewer than ${options.minItems} items`);
  }
  return value;
}

function validateNoAdditionalProperties(
  value: ReviewContractRecord,
  allowed: readonly string[],
  path: string,
  errors: string[]
): void {
  const allowedProperties = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedProperties.has(key)) {
      errors.push(`${path || '/'}: must NOT have additional properties (${key})`);
    }
  }
}

function validateVerdict(value: unknown, path: string, errors: string[]): void {
  if (!coerceAxisVerdict(value)) {
    errors.push(`${path}: must be equal to one of the allowed values`);
  }
}

function validateIntentVerdict(value: unknown, path: string, errors: string[]): void {
  if (!coerceIntentMatrixVerdict(value)) {
    errors.push(`${path}: must be equal to one of the allowed values`);
  }
}

function validatePriority(value: unknown, path: string, errors: string[]): void {
  if (!isReviewFindingPriority(value)) {
    errors.push(`${path}: must be equal to one of the allowed values`);
  }
}

function validateConst(value: unknown, expected: string, path: string, errors: string[]): void {
  if (value !== expected) {
    errors.push(`${path}: must be equal to constant`);
  }
}

function validateNonEmptyString(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== 'string') {
    errors.push(`${path}: must be string`);
    return;
  }
  if (value.trim().length < 1) {
    errors.push(`${path}: must NOT have fewer than 1 characters`);
  }
}

async function validateContractSemantics(
  contract: ReviewContractRecord,
  options: ReviewContractValidationOptions
): Promise<string[]> {
  const errors: string[] = [];
  const axes = contract.axes;
  if (!isRecord(axes)) {
    return errors;
  }
  const axisVerdicts = {} as Record<ReviewContractAxisName, ReviewContractAxisVerdict>;
  for (const axisName of CONTRACT_AXES) {
    const axis = axes[axisName];
    if (!isRecord(axis)) {
      continue;
    }
    const verdict = coerceAxisVerdict(axis.verdict);
    if (!verdict) {
      continue;
    }
    axisVerdicts[axisName] = verdict;
    if (verdict === 'clean' && normalizeOptionalString(axis.clean_signal) === null) {
      errors.push(`/axes/${axisName}/clean_signal: clean verdict requires an explicit clean signal.`);
    }
    const findings = Array.isArray(axis.findings) ? axis.findings : [];
    if ((verdict === 'findings' || verdict === 'blocked') && findings.length === 0) {
      errors.push(`/axes/${axisName}/findings: ${verdict} verdict requires at least one finding.`);
    }
  }
  const expectedOverall = deriveOverallVerdict(axisVerdicts);
  const observedOverall = coerceAxisVerdict(contract.overall_verdict);
  if (observedOverall && observedOverall !== expectedOverall) {
    errors.push(
      `/overall_verdict: expected ${expectedOverall} from axis verdicts, observed ${observedOverall}.`
    );
  }
  errors.push(...(await validateReviewIntentMatrixSemantics(contract, options)));
  errors.push(...validateBlockingAgentLoopProposals(contract, axisVerdicts.agent_loop ?? null));
  errors.push(...(await validateEvidenceRefs(contract, options)));
  errors.push(...validateCodeChangeProposals(contract));
  errors.push(...validateAgentLoopProposals(contract));
  return errors;
}

async function validateReviewIntentMatrixSemantics(
  contract: ReviewContractRecord,
  options: ReviewContractValidationOptions
): Promise<string[]> {
  const errors: string[] = [];
  const matrix = normalizeReviewIntentMatrix(contract.review_intent_matrix);
  const axes = isRecord(contract.axes) ? contract.axes : {};
  if (!matrix) {
    return errors;
  }
  const originalSpecAvailability = await resolveOriginalSpecAvailability(contract, options);
  for (const intentAxis of REVIEW_INTENT_MATRIX_AXES) {
    const contractAxisName = INTENT_MATRIX_TO_CONTRACT_AXIS[intentAxis];
    const contractAxis = isRecord(axes[contractAxisName]) ? axes[contractAxisName] : null;
    const contractVerdict = contractAxis ? coerceAxisVerdict(contractAxis.verdict) : null;
    const expectedIntentVerdict = contractVerdict ? intentVerdictFromContractAxis(contractVerdict) : null;
    const observedIntentVerdict = matrix[intentAxis].verdict;
    if (intentAxis === 'original_spec' && originalSpecAvailability?.available !== true) {
      if (observedIntentVerdict !== 'unknown') {
        errors.push(
          `/review_intent_matrix/original_spec/verdict: expected unknown when canonical PRD/TECH_SPEC/ACTION_PLAN evidence is unavailable (${originalSpecAvailability?.missingPaths.join(', ') || 'missing_paths unavailable'}), observed ${observedIntentVerdict}.`
        );
      }
      continue;
    }
    if (expectedIntentVerdict && observedIntentVerdict !== expectedIntentVerdict) {
      errors.push(
        `/review_intent_matrix/${intentAxis}/verdict: expected ${expectedIntentVerdict} from ${contractAxisName}, observed ${observedIntentVerdict}.`
      );
    }
  }
  return errors;
}

async function validateEvidenceRefs(
  contract: ReviewContractRecord,
  options: ReviewContractValidationOptions
): Promise<string[]> {
  const errors: string[] = [];
  const refs = collectEvidenceRefs(contract);
  const seen = new Set<string>();
  for (const ref of refs) {
    if (!isRecord(ref)) {
      continue;
    }
    const refPath = normalizeOptionalString(ref.path);
    const sha256 = normalizeOptionalString(ref.sha256);
    if (!refPath || !sha256) {
      continue;
    }
    const key = `${refPath}\0${sha256}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (isAbsolute(refPath)) {
      errors.push(`/evidence_refs/${refPath}: evidence path must be relative.`);
      continue;
    }
    const absolutePath = resolve(options.repoRoot, refPath);
    if (!isAllowedEvidencePath(options, absolutePath)) {
      errors.push(
        `/evidence_refs/${refPath}: evidence path must stay within the repository root or trusted run artifact roots.`
      );
      continue;
    }
    if (!(await pathExists(absolutePath))) {
      errors.push(`/evidence_refs/${refPath}: evidence file is missing.`);
      continue;
    }
    try {
      if (!(await lstat(absolutePath)).isFile()) {
        errors.push(`/evidence_refs/${refPath}: evidence path must be a readable file.`);
        continue;
      }
    } catch (error) {
      errors.push(`/evidence_refs/${refPath}: evidence file could not be inspected (${formatErrorMessage(error)}).`);
      continue;
    }
    let actualSha: string;
    try {
      actualSha = await sha256File(absolutePath);
    } catch (error) {
      errors.push(`/evidence_refs/${refPath}: evidence file could not be hashed (${formatErrorMessage(error)}).`);
      continue;
    }
    if (actualSha !== sha256) {
      errors.push(
        `/evidence_refs/${refPath}: evidence sha256 is stale or mismatched (expected ${sha256}, observed ${actualSha}).`
      );
    }
  }
  return errors;
}

function isAllowedEvidencePath(options: ReviewContractValidationOptions, absolutePath: string): boolean {
  return buildAllowedEvidenceRoots(options).some((root) => isPathWithinRoot(root, absolutePath));
}

function buildAllowedEvidenceRoots(options: ReviewContractValidationOptions): string[] {
  const roots = new Set<string>([resolve(options.repoRoot)]);
  const workspaceBaseRoot = resolveWorkspaceBaseRoot(options.repoRoot);
  if (workspaceBaseRoot) {
    roots.add(join(workspaceBaseRoot, '.runs'));
    roots.add(join(workspaceBaseRoot, 'out'));
  }
  for (const configuredRoot of [
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
    process.env.CODEX_ORCHESTRATOR_OUT_DIR,
    ...(options.trustedEvidenceRoots ?? [])
  ]) {
    const trimmed = configuredRoot?.trim();
    if (trimmed) {
      roots.add(resolve(options.repoRoot, trimmed));
    }
  }
  return [...roots];
}

function resolveWorkspaceBaseRoot(repoRoot: string): string | null {
  const normalizedRoot = resolve(repoRoot);
  const marker = `${sep}.workspaces${sep}`;
  const markerIndex = normalizedRoot.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }
  return normalizedRoot.slice(0, markerIndex);
}

function validateCodeChangeProposals(contract: ReviewContractRecord): string[] {
  const errors: string[] = [];
  const proposals = Array.isArray(contract.code_change_proposals) ? contract.code_change_proposals : [];
  const axes = isRecord(contract.axes) ? contract.axes : {};
  const codeChangesAxis = isRecord(axes.code_changes) ? axes.code_changes : null;
  const codeChangesVerdict = codeChangesAxis ? coerceAxisVerdict(codeChangesAxis.verdict) : null;
  if (proposals.length > 0 && codeChangesVerdict !== 'findings' && codeChangesVerdict !== 'blocked') {
    errors.push(
      '/code_change_proposals: code-change proposals require the code_changes axis to be findings or blocked.'
    );
  }
  proposals.forEach((proposal, index) => {
    if (!isRecord(proposal)) {
      return;
    }
    const unifiedDiff = normalizeOptionalString(proposal.unified_diff);
    if (unifiedDiff && !/^(diff --git|---\s)/u.test(unifiedDiff)) {
      errors.push(
        `/code_change_proposals/${index}/unified_diff: unified diff must start with "diff --git" or "---".`
      );
    }
  });
  return errors;
}

function validateAgentLoopProposals(contract: ReviewContractRecord): string[] {
  const errors: string[] = [];
  const proposals = Array.isArray(contract.agent_loop_proposals) ? contract.agent_loop_proposals : [];
  const axes = isRecord(contract.axes) ? contract.axes : {};
  const agentLoopAxis = isRecord(axes.agent_loop) ? axes.agent_loop : null;
  const agentLoopVerdict = agentLoopAxis ? coerceAxisVerdict(agentLoopAxis.verdict) : null;
  if (proposals.length > 0 && agentLoopVerdict !== 'findings' && agentLoopVerdict !== 'blocked') {
    errors.push(
      '/agent_loop_proposals: agent-loop proposals require the agent_loop axis to be findings or blocked.'
    );
  }
  return errors;
}

function buildCodeChangeProposalRoute(
  proposal: ReviewContractRecord
): ReviewContractCodeChangeProposalRoute {
  return {
    proposal_id: normalizeOptionalString(proposal.id) ?? 'unknown',
    title: normalizeOptionalString(proposal.title) ?? 'Untitled code-change proposal',
    rationale: normalizeOptionalString(proposal.rationale) ?? '',
    unified_diff: normalizeOptionalString(proposal.unified_diff),
    target: isRecord(proposal.target) ? proposal.target : null,
    tests: normalizeStringArray(proposal.tests),
    risk: normalizeOptionalString(proposal.risk) ?? '',
    evidence_refs: normalizeEvidenceRefArray(proposal.evidence_refs)
  };
}

function buildAgentLoopFollowUpRoute(
  proposal: ReviewContractRecord,
  issueId: string
): ReviewContractAgentLoopFollowUpRoute {
  const routing = isRecord(proposal.routing) ? proposal.routing : {};
  const proposalId = normalizeOptionalString(proposal.id) ?? 'unknown';
  const title = normalizeOptionalString(proposal.title) ?? 'Untitled agent-loop proposal';
  const rationale = normalizeOptionalString(proposal.rationale) ?? '';
  const intentChecksum = normalizeOptionalString(routing.intent_checksum) ?? proposalId;
  const nonGoals = formatList(normalizeStringArray(routing.non_goals));
  const notDoneIf = formatList(normalizeStringArray(routing.not_done_if));
  const acceptanceCriteria = formatList(normalizeStringArray(routing.acceptance_criteria));
  const canonicalOwnerKey = normalizeOptionalString(routing.canonical_owner_key);
  const evidenceRefs = normalizeEvidenceRefArray(proposal.evidence_refs);
  const description = [
    'Typed agent-loop proposal from `co.review.contract.v1`.',
    '',
    `Proposal id: \`${proposalId}\``,
    '',
    rationale,
    '',
    'Evidence refs:',
    ...evidenceRefs.map((ref) => `- \`${ref.path}\` sha256=${ref.sha256}`),
    '',
    'Routing:',
    '- default_route: `linear_follow_up`',
    '- follow_up_kind: `agent_loop`'
  ].join('\n');
  const createFollowUpArgs = [
    'create-follow-up',
    '--issue-id',
    issueId,
    '--title',
    title,
    '--description',
    description,
    '--intent-checksum',
    intentChecksum,
    '--non-goals',
    nonGoals,
    '--not-done-if',
    notDoneIf,
    '--acceptance-criteria',
    acceptanceCriteria
  ];
  if (canonicalOwnerKey) {
    createFollowUpArgs.push('--canonical-owner-key', canonicalOwnerKey);
  }
  return {
    proposal_id: proposalId,
    title,
    description,
    intent_checksum: intentChecksum,
    non_goals: nonGoals,
    not_done_if: notDoneIf,
    acceptance_criteria: acceptanceCriteria,
    canonical_owner_key: canonicalOwnerKey,
    create_follow_up_args: createFollowUpArgs,
    evidence_refs: evidenceRefs
  };
}

function extractAgentLoopRationale(description: string): string {
  const lines = description.split(/\r?\n/u);
  const proposalIndex = lines.findIndex((line) => line.trim().startsWith('Proposal id:'));
  const evidenceIndex = lines.findIndex((line) => line.trim() === 'Evidence refs:');
  if (proposalIndex === -1 || evidenceIndex === -1 || evidenceIndex <= proposalIndex) {
    return description.trim();
  }
  return lines.slice(proposalIndex + 1, evidenceIndex).join('\n').trim();
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => normalizeOptionalString(entry)).filter((entry): entry is string => Boolean(entry))
    : [];
}

function normalizeEvidenceRefArray(value: unknown): ReviewContractEvidenceRef[] {
  return Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((entry) => {
          const path = normalizeOptionalString(entry.path);
          const sha256 = normalizeOptionalString(entry.sha256);
          return path && sha256
            ? {
                path,
                sha256,
                ...(normalizeOptionalString(entry.description)
                  ? { description: normalizeOptionalString(entry.description) as string }
                  : {})
              }
            : null;
        })
        .filter((entry): entry is ReviewContractEvidenceRef => Boolean(entry))
    : [];
}

function formatList(values: string[]): string {
  return values.map((value) => `- ${value}`).join('\n');
}

function normalizeReviewIntentMatrix(value: unknown): ReviewIntentMatrix | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = {} as Partial<ReviewIntentMatrix>;
  for (const axisName of REVIEW_INTENT_MATRIX_AXES) {
    const axis = value[axisName];
    if (!isRecord(axis)) {
      return null;
    }
    const verdict = coerceIntentMatrixVerdict(axis.verdict);
    if (!verdict) {
      return null;
    }
    entries[axisName] = {
      required: axis.required === true,
      verdict,
      evidence: normalizeStringArray(axis.evidence),
      proposed_fixes: normalizeStringArray(axis.proposed_fixes)
    };
  }
  return entries as ReviewIntentMatrix;
}

async function resolveOriginalSpecAvailability(
  contract: ReviewContractRecord,
  options: ReviewContractValidationOptions
): Promise<{ available: boolean; missingPaths: string[] } | null> {
  const currentSpecBundlePath = options.currentSpecBundlePath
    ? resolve(options.repoRoot, options.currentSpecBundlePath)
    : null;
  if (currentSpecBundlePath && !(await pathExists(currentSpecBundlePath))) {
    return {
      available: false,
      missingPaths: ['current_spec_bundle_missing']
    };
  }
  const candidatePaths = collectSpecBundleEvidencePaths(contract, options.repoRoot);
  if (!currentSpecBundlePath && candidatePaths.length > 1) {
    return {
      available: false,
      missingPaths: ['ambiguous_spec_bundle']
    };
  }
  const selectedPaths = currentSpecBundlePath
    ? candidatePaths.filter((candidatePath) => candidatePath === currentSpecBundlePath)
    : candidatePaths;
  if (currentSpecBundlePath && selectedPaths.length === 0) {
    return {
      available: false,
      missingPaths: ['current_spec_bundle_not_referenced']
    };
  }
  let sawLegacyNonProviderSpecBundle = false;
  for (const absoluteRefPath of selectedPaths) {
    if (!isAllowedEvidencePath(options, absoluteRefPath) || !(await pathExists(absoluteRefPath))) {
      continue;
    }
    const specBundle = await readJson(absoluteRefPath);
    if (!isRecord(specBundle)) {
      return {
        available: false,
        missingPaths: ['current_spec_bundle_malformed']
      };
    }
    if (isRecord(specBundle.canonical_original_spec)) {
      const canonical = specBundle.canonical_original_spec;
      if (typeof canonical.available === 'boolean') {
        return {
          available: canonical.available,
          missingPaths: normalizeStringArray(canonical.missing_paths)
        };
      }
    }
    const taskKey = normalizeOptionalString(specBundle?.task_key);
    if (isLinearProviderTaskKey(taskKey)) {
      return {
        available: false,
        missingPaths: ['canonical_original_spec']
      };
    }
    sawLegacyNonProviderSpecBundle = true;
  }
  return sawLegacyNonProviderSpecBundle ? { available: true, missingPaths: [] } : null;
}

function collectSpecBundleEvidencePaths(contract: ReviewContractRecord, repoRoot: string): string[] {
  const candidates = new Set<string>();
  for (const ref of collectEvidenceRefs(contract)) {
    if (!isRecord(ref)) {
      continue;
    }
    const refPath = normalizeOptionalString(ref.path);
    if (!refPath || !refPath.endsWith('spec-bundle.json') || isAbsolute(refPath)) {
      continue;
    }
    candidates.add(resolve(repoRoot, refPath));
  }
  return [...candidates].sort();
}

function collectEvidenceRefs(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectEvidenceRefs(entry));
  }
  if (!isRecord(value)) {
    return [];
  }
  const ownRefs = Array.isArray(value.evidence_refs) ? value.evidence_refs : [];
  return [
    ...ownRefs,
    ...Object.entries(value)
      .filter(([key]) => key !== 'evidence_refs')
      .flatMap(([, entry]) => collectEvidenceRefs(entry))
  ];
}

function normalizeStructuredOutputOptionalNulls(contract: ReviewContractRecord): ReviewContractRecord {
  const normalized = JSON.parse(JSON.stringify(contract)) as ReviewContractRecord;
  const axes = isRecord(normalized.axes) ? normalized.axes : {};
  for (const axis of CONTRACT_AXES) {
    const value = axes[axis];
    if (!isRecord(value)) {
      continue;
    }
    deleteNullProperty(value, 'clean_signal');
    normalizeEvidenceRefs(value.evidence_refs);
    if (Array.isArray(value.findings)) {
      for (const finding of value.findings) {
        if (!isRecord(finding)) {
          continue;
        }
        deleteNullProperty(finding, 'body');
        normalizeEvidenceRefs(finding.evidence_refs);
      }
    }
  }

  if (Array.isArray(normalized.code_change_proposals)) {
    for (const proposal of normalized.code_change_proposals) {
      if (!isRecord(proposal)) {
        continue;
      }
      deleteNullProperty(proposal, 'unified_diff');
      if (proposal.target === null) {
        delete proposal.target;
      } else if (isRecord(proposal.target)) {
        deleteNullProperty(proposal.target, 'section');
        deleteNullProperty(proposal.target, 'function');
      }
      normalizeEvidenceRefs(proposal.evidence_refs);
    }
  }

  if (Array.isArray(normalized.agent_loop_proposals)) {
    for (const proposal of normalized.agent_loop_proposals) {
      if (!isRecord(proposal)) {
        continue;
      }
      deleteNullProperty(proposal, 'blocking');
      if (isRecord(proposal.routing)) {
        deleteNullProperty(proposal.routing, 'canonical_owner_key');
      }
      normalizeEvidenceRefs(proposal.evidence_refs);
    }
  }

  return normalized;
}

function normalizeEvidenceRefs(value: unknown): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const evidenceRef of value) {
    if (isRecord(evidenceRef)) {
      deleteNullProperty(evidenceRef, 'description');
    }
  }
}

function deleteNullProperty(record: ReviewContractRecord, key: string): void {
  if (record[key] === null) {
    delete record[key];
  }
}

function deriveOverallVerdict(
  axisVerdicts: Partial<Record<ReviewContractAxisName, ReviewContractAxisVerdict>>
): ReviewContractAxisVerdict {
  const verdicts = CONTRACT_AXES.map((axis) => axisVerdicts[axis]);
  if (verdicts.includes('blocked')) {
    return 'blocked';
  }
  if (verdicts.includes('findings')) {
    return 'findings';
  }
  if (verdicts.includes('unknown') || verdicts.some((verdict) => verdict === undefined)) {
    return 'unknown';
  }
  return 'clean';
}

function semanticVerdictFromOverall(verdict: ReviewContractAxisVerdict): ReviewSemanticVerdict {
  if (verdict === 'clean') {
    return 'clean';
  }
  if (verdict === 'findings' || verdict === 'blocked') {
    return 'findings';
  }
  return 'unknown';
}

function intentVerdictFromContractAxis(verdict: ReviewContractAxisVerdict): ReviewIntentMatrixVerdict {
  return verdict === 'clean' ? 'clean' : verdict === 'unknown' ? 'unknown' : 'findings';
}

function coerceAxisVerdict(value: unknown): ReviewContractAxisVerdict | null {
  return value === 'clean' || value === 'findings' || value === 'blocked' || value === 'unknown'
    ? value
    : null;
}

function coerceIntentMatrixVerdict(value: unknown): ReviewIntentMatrixVerdict | null {
  return value === 'clean' || value === 'findings' || value === 'unknown' ? value : null;
}

function compareReviewFindingPriority(
  left: ReviewFindingPriority,
  right: ReviewFindingPriority
): number {
  return REVIEW_FINDING_PRIORITY_RANKS[left] - REVIEW_FINDING_PRIORITY_RANKS[right];
}

function isReviewFindingPriority(value: unknown): value is ReviewFindingPriority {
  return value === 'P0' || value === 'P1' || value === 'P2' || value === 'P3';
}

function resolveReviewContractSchemaPath(): string {
  let current: string | null = dirname(fileURLToPath(import.meta.url));
  while (current) {
    const candidate = join(current, 'package.json');
    if (existsSync(candidate)) {
      return join(current, 'schemas', 'review-contract.v1.schema.json');
    }
    const parent = dirname(current);
    if (parent === current) {
      current = null;
      continue;
    }
    current = parent;
  }
  throw new Error('Unable to locate schemas/review-contract.v1.schema.json');
}

function resolveReviewContractOutputSchemaPath(): string {
  let current: string | null = dirname(fileURLToPath(import.meta.url));
  while (current) {
    const candidate = join(current, 'package.json');
    if (existsSync(candidate)) {
      return join(current, 'schemas', 'review-contract.v1.output.schema.json');
    }
    const parent = dirname(current);
    if (parent === current) {
      current = null;
      continue;
    }
    current = parent;
  }
  throw new Error('Unable to locate schemas/review-contract.v1.output.schema.json');
}

async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readTailText(filePath: string, limit: number): Promise<string> {
  const content = await readFile(filePath, 'utf8');
  return content.length <= limit ? content : content.slice(content.length - limit);
}

async function sha256File(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function toRepoRelativePath(repoRoot: string, absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') &&
      !relativePath.startsWith(`..${sep}`) &&
      !relativePath.startsWith('../') &&
      !isAbsolute(relativePath))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function envFlagEnabled(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}
