#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_FIXTURE_ROOT = join(
  process.cwd(),
  'evaluation',
  'fixtures',
  'provider-linear-adoption'
);

const DECISION_REASONS = Object.freeze({
  parallelize_now: new Set(['independent_scope_available']),
  stay_serial: new Set([
    'single_bounded_change',
    'overlapping_scope',
    'existing_child_lane_active',
    'review_or_validation_only'
  ]),
  forbid_parallel: new Set(['parent_only_mutation', 'merge_or_handoff_state', 'blocked_by_dependency'])
});

const REQUIRED_FOLLOW_UP_FIELDS = Object.freeze([
  'intent_checksum',
  'non_goals',
  'not_done_if',
  'acceptance_criteria'
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value) {
  return isRecord(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asBoolean(value) {
  return value === true;
}

function asNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function compareIsoTimestamp(left, right) {
  const leftValue = asString(left);
  const rightValue = asString(right);
  if (leftValue === rightValue) {
    return 0;
  }
  if (!leftValue) {
    return -1;
  }
  if (!rightValue) {
    return 1;
  }
  const leftMs = Date.parse(leftValue);
  const rightMs = Date.parse(rightValue);
  if (Number.isFinite(leftMs) && Number.isFinite(rightMs)) {
    return leftMs - rightMs;
  }
  if (Number.isFinite(leftMs)) {
    return 1;
  }
  if (Number.isFinite(rightMs)) {
    return -1;
  }
  return leftValue.localeCompare(rightValue);
}

function selectCurrentTurnChildLanes(proof) {
  const currentTurnStartedAt =
    asString(proof.current_turn_started_at) ?? asString(proof.attempt_started_at);
  const childLanes = asArray(proof.child_lanes).filter(isRecord);
  return currentTurnStartedAt
    ? childLanes.filter((lane) => compareIsoTimestamp(lane.launched_at, currentTurnStartedAt) >= 0)
    : childLanes;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw?.startsWith('-')) {
      continue;
    }
    const cleaned = raw.replace(/^--?/, '');
    const equalsIndex = cleaned.indexOf('=');
    if (equalsIndex !== -1) {
      args[cleaned.slice(0, equalsIndex)] = cleaned.slice(equalsIndex + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      args[cleaned] = next;
      index += 1;
      continue;
    }
    args[cleaned] = true;
  }
  return args;
}

function resolveMaybeRelative(value, baseDir) {
  const normalized = asString(value);
  if (!normalized) {
    return null;
  }
  return path.isAbsolute(normalized) ? normalized : join(baseDir, normalized);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

function readSelectedMemoryRefs(value, depth = 0) {
  if (depth > 8 || value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => readSelectedMemoryRefs(entry, depth + 1));
  }
  if (!isRecord(value)) {
    return [];
  }
  const direct = Array.isArray(value.selectedMemoryRefs)
    ? value.selectedMemoryRefs.filter((entry) => typeof entry === 'string')
    : [];
  const nested = Object.entries(value)
    .filter(([key]) => key !== 'selectedMemoryRefs')
    .flatMap(([, entry]) => readSelectedMemoryRefs(entry, depth + 1));
  return uniqueStrings([...direct, ...nested]);
}

function latestAuditEntry(proof, operation) {
  const audit = asRecord(proof.linear_audit);
  const latest = asRecord(audit.latest_by_operation);
  const direct = latest[operation];
  if (isRecord(direct)) {
    return direct;
  }
  if (operation === 'parallelization') {
    const entries = asArray(audit.parallelization_entries).filter(isRecord);
    return entries.at(-1) ?? null;
  }
  return null;
}

function selectParallelization(proof) {
  if (isRecord(proof.parallelization)) {
    return {
      decision: asString(proof.parallelization.decision),
      reason: asString(proof.parallelization.reason),
      summary: asString(proof.parallelization.summary),
      recorded_at: asString(proof.parallelization.recorded_at),
      child_lane_count: asNumber(proof.parallelization.child_lane_count, 0),
      source: 'provider-linear-worker-proof.parallelization'
    };
  }
  const auditEntry = latestAuditEntry(proof, 'parallelization');
  if (auditEntry) {
    return {
      decision: asString(auditEntry.action),
      reason: asString(auditEntry.state),
      summary: asString(auditEntry.via),
      recorded_at: asString(auditEntry.recorded_at),
      child_lane_count: 0,
      source: 'provider-linear-worker-proof.linear_audit'
    };
  }
  return {
    decision: null,
    reason: null,
    summary: null,
    recorded_at: null,
    child_lane_count: 0,
    source: null
  };
}

function extractSource0Metrics(manifest, promptArtifacts) {
  const source0 = asRecord(asRecord(manifest.memory).source_0);
  const promptSource = asRecord(promptArtifacts.source_0);
  const providerPrompt = asRecord(promptArtifacts.provider_prompt);
  const pointer = asString(source0.pointer);
  const objectId = asString(source0.object_id);
  const sourcePath = asString(source0.source_path);
  const promptPointer = asString(promptSource.pointer) ?? asString(providerPrompt.source_0_pointer);
  const promptObjectId =
    asString(promptSource.object_id) ?? asString(providerPrompt.source_0_object_id);
  const promptSourcePath =
    asString(promptSource.source_path) ?? asString(providerPrompt.source_payload_path);
  const promptIncluded =
    asBoolean(promptSource.included_in_provider_prompt) ||
    asBoolean(providerPrompt.source_0_included);

  return {
    present: Boolean(pointer && objectId && sourcePath),
    pointer,
    object_id: objectId,
    source_path: sourcePath,
    prompt_present: Boolean(promptPointer && promptObjectId && promptSourcePath),
    prompt_included: promptIncluded,
    prompt_pointer: promptPointer,
    prompt_object_id: promptObjectId,
    prompt_source_path: promptSourcePath,
    prompt_matches_manifest:
      Boolean(
        pointer && objectId && sourcePath && promptPointer && promptObjectId && promptSourcePath
      ) &&
      pointer === promptPointer &&
      objectId === promptObjectId &&
      sourcePath === promptSourcePath
  };
}

function extractPromptPackMetrics(manifest, promptArtifacts) {
  const manifestPacks = asArray(manifest.prompt_packs).filter(isRecord);
  const promptPack = asRecord(promptArtifacts.prompt_pack);
  const providerPrompt = asRecord(promptArtifacts.provider_prompt);
  const selectedId =
    asString(promptPack.selected_id) ?? asString(providerPrompt.selected_prompt_pack_id);
  const selectedManifestPack = manifestPacks.find((pack) => asString(pack.id) === selectedId) ?? null;
  const priorExperienceSourceRun =
    asString(promptPack.prior_experience_source_run) ??
    asString(providerPrompt.prior_experience_source_run);
  const missingExperienceReason =
    asString(promptPack.missing_experience_reason) ??
    asString(providerPrompt.missing_experience_reason);
  const selectedMemoryRefs = uniqueStrings([
    ...readSelectedMemoryRefs(manifest),
    ...readSelectedMemoryRefs(promptArtifacts)
  ]);

  return {
    manifest_pack_count: manifestPacks.length,
    selected_id: selectedId,
    selected_domain:
      asString(promptPack.selected_domain) ??
      asString(providerPrompt.selected_prompt_pack_domain) ??
      asString(selectedManifestPack?.domain),
    selected_present_in_manifest: Boolean(selectedManifestPack),
    prior_experience_source_run: priorExperienceSourceRun,
    missing_experience_reason: missingExperienceReason,
    included_in_provider_prompt:
      asBoolean(promptPack.included_in_provider_prompt) ||
      asBoolean(providerPrompt.prompt_pack_included),
    planner_selected_memory_refs: selectedMemoryRefs
  };
}

function extractParallelizationMetrics(proof, promptArtifacts) {
  const evalConfig = asRecord(promptArtifacts.eval);
  const parallelizationConfig = asRecord(evalConfig.parallelization);
  const parallelization = selectParallelization(proof);
  const childLanes = asArray(proof.child_lanes).filter(isRecord);
  const sameTurnChildLanes = selectCurrentTurnChildLanes(proof);
  const successfulSameTurnChildLanes = sameTurnChildLanes.filter(
    (lane) => asString(lane.status) === 'succeeded'
  );
  const acceptedChildLanes = childLanes.filter((lane) => asString(lane.decision) === 'accepted');
  const acceptedSameTurnChildLanes = sameTurnChildLanes.filter(
    (lane) => asString(lane.decision) === 'accepted'
  );
  const safeCandidateCount = asNumber(
    parallelizationConfig.safe_independent_child_lane_candidates,
    0
  );

  return {
    decision: parallelization.decision,
    reason: parallelization.reason,
    summary: parallelization.summary,
    recorded_at: parallelization.recorded_at,
    source: parallelization.source,
    expected_decision: asString(parallelizationConfig.expected_decision),
    expected_reason: asString(parallelizationConfig.expected_reason),
    safe_independent_child_lane_candidates: safeCandidateCount,
    require_accepted_child_lane: asBoolean(parallelizationConfig.require_accepted_child_lane),
    child_lane_launch_count: childLanes.length,
    same_turn_child_lane_launch_count: sameTurnChildLanes.length,
    successful_same_turn_child_lane_count: successfulSameTurnChildLanes.length,
    accepted_child_lane_count: acceptedSameTurnChildLanes.length,
    historical_accepted_child_lane_count: acceptedChildLanes.length,
    child_lane_acceptance_states: uniqueStrings(
      childLanes.map((lane) => asString(lane.decision) ?? asString(lane.status) ?? 'unknown')
    ),
    child_lanes: childLanes.map((lane) => ({
      stream: asString(lane.stream),
      status: asString(lane.status),
      decision: asString(lane.decision),
      launched_at: asString(lane.launched_at),
      decision_at: asString(lane.decision_at),
      patch_artifact_path: asString(lane.patch_artifact_path)
    }))
  };
}

function extractFollowUpMetrics(proof, promptArtifacts) {
  const followUpTrace = asRecord(promptArtifacts.follow_up_trace);
  const createFollowUp = latestAuditEntry(proof, 'create-follow-up');
  const workpad = latestAuditEntry(proof, 'upsert-workpad');
  const missingFields = REQUIRED_FOLLOW_UP_FIELDS.filter(
    (field) => !asBoolean(followUpTrace[field])
  );
  return {
    required: asBoolean(asRecord(promptArtifacts.eval).follow_up_required),
    create_follow_up_attempted: Boolean(createFollowUp),
    create_follow_up_ok: createFollowUp ? createFollowUp.ok === true : false,
    create_follow_up_identifier:
      asString(createFollowUp?.follow_up_issue_identifier) ??
      asString(followUpTrace.created_issue_identifier),
    related_link_present: asBoolean(followUpTrace.related_link_present),
    blocker_link_present: asBoolean(followUpTrace.blocker_link_present),
    workpad_trace_present:
      asBoolean(followUpTrace.workpad_trace_present) || Boolean(asString(workpad?.comment_id)),
    fail_closed: asBoolean(followUpTrace.fail_closed),
    fail_closed_reason: asString(followUpTrace.fail_closed_reason),
    required_issue_shaping_fields_present: missingFields.length === 0,
    missing_issue_shaping_fields: missingFields
  };
}

function extractHelperConstraintMetrics(proof, promptArtifacts) {
  const evalConfig = asRecord(promptArtifacts.eval);
  const helperConstraints = asRecord(promptArtifacts.helper_constraints);
  const supportedPhases = asArray(helperConstraints.supported_child_lane_phases)
    .map(asString)
    .filter(Boolean)
    .sort();
  const childLanes = selectCurrentTurnChildLanes(proof);
  const zeroByteAdvisoryLanes = childLanes.filter(
    (lane) =>
      asNumber(lane.patch_bytes, -1) === 0 &&
      asString(lane.decision) === 'rejected' &&
      Boolean(
        asString(lane.decision_reason) ||
        asString(lane.summary) ||
        asString(lane.manifest_path) ||
        asString(lane.patch_artifact_path)
      )
  );
  const usefulZeroByteAdvisoryLanes = zeroByteAdvisoryLanes.filter(
    (lane) =>
      Boolean(asString(lane.manifest_path) || asString(lane.artifact_root) || asString(lane.patch_artifact_path)) &&
      Boolean(asString(lane.decision_reason) || asString(lane.summary))
  );
  return {
    required: asBoolean(evalConfig.helper_constraints_required),
    supported_child_lane_phases: supportedPhases,
    classification_analysis_guidance: asBoolean(helperConstraints.classification_analysis_guidance),
    parent_dirty_workpad_recovery: asBoolean(helperConstraints.parent_dirty_workpad_recovery),
    duplicate_parity_retry_suppressed: asBoolean(helperConstraints.duplicate_parity_retry_suppressed),
    deterministic_failure_retry_count: asNumber(helperConstraints.deterministic_failure_retry_count, 0),
    zero_byte_advisory_evidence: zeroByteAdvisoryLanes.length > 0,
    zero_byte_advisory_lane_count: zeroByteAdvisoryLanes.length,
    useful_parent_evidence_path:
      asBoolean(helperConstraints.useful_parent_evidence_path) &&
      usefulZeroByteAdvisoryLanes.length > 0
  };
}

function validateMetrics(fixtureId, promptArtifacts, metrics) {
  const failures = [];
  const evalConfig = asRecord(promptArtifacts.eval);

  if (!asBoolean(promptArtifacts.sanitized)) {
    failures.push(`${fixtureId}: prompt artifact metadata must set sanitized=true`);
  }

  if (asBoolean(evalConfig.memory_required)) {
    if (!metrics.memory.source_0.present) {
      failures.push(`${fixtureId}: memory.source_0 is missing from manifest`);
    }
    if (!metrics.memory.source_0.prompt_present || !metrics.memory.source_0.prompt_included) {
      failures.push(`${fixtureId}: source_0 prompt artifact metadata is missing or not included`);
    }
    if (!metrics.memory.source_0.prompt_matches_manifest) {
      failures.push(`${fixtureId}: source_0 prompt metadata does not match manifest descriptor`);
    }
    if (!metrics.memory.prompt_pack.planner_selected_memory_refs.includes('source_0')) {
      failures.push(`${fixtureId}: planner selectedMemoryRefs did not include source_0`);
    }
  }

  if (asBoolean(evalConfig.prompt_pack_required)) {
    if (!metrics.memory.prompt_pack.selected_id) {
      failures.push(`${fixtureId}: selected prompt pack id is missing`);
    }
    if (!metrics.memory.prompt_pack.selected_present_in_manifest) {
      failures.push(`${fixtureId}: selected prompt pack is absent from manifest.prompt_packs`);
    }
    if (!metrics.memory.prompt_pack.included_in_provider_prompt) {
      failures.push(`${fixtureId}: selected prompt pack was not included in provider prompt metadata`);
    }
    if (
      !metrics.memory.prompt_pack.prior_experience_source_run &&
      !metrics.memory.prompt_pack.missing_experience_reason
    ) {
      failures.push(`${fixtureId}: prompt pack needs prior_experience_source_run or missing_experience_reason`);
    }
    if (
      metrics.memory.prompt_pack.selected_id &&
      !metrics.memory.prompt_pack.planner_selected_memory_refs.includes(
        `prompt_pack:${metrics.memory.prompt_pack.selected_id}`
      )
    ) {
      failures.push(`${fixtureId}: planner selectedMemoryRefs did not include selected prompt pack`);
    }
  }

  const decision = metrics.parallelization.decision;
  const reason = metrics.parallelization.reason;
  if (!decision || !Object.prototype.hasOwnProperty.call(DECISION_REASONS, decision)) {
    failures.push(`${fixtureId}: parallelization decision is missing or invalid`);
  } else if (!reason || !DECISION_REASONS[decision].has(reason)) {
    failures.push(`${fixtureId}: parallelization reason ${reason ?? 'missing'} is invalid for ${decision}`);
  }
  if (
    metrics.parallelization.expected_decision &&
    metrics.parallelization.expected_decision !== decision
  ) {
    failures.push(
      `${fixtureId}: expected decision ${metrics.parallelization.expected_decision} but saw ${decision ?? 'missing'}`
    );
  }
  if (
    metrics.parallelization.expected_reason &&
    metrics.parallelization.expected_reason !== reason
  ) {
    failures.push(
      `${fixtureId}: expected reason ${metrics.parallelization.expected_reason} but saw ${reason ?? 'missing'}`
    );
  }
  if (
    decision === 'stay_serial' &&
    metrics.parallelization.safe_independent_child_lane_candidates > 0
  ) {
    failures.push(`${fixtureId}: stay_serial used while safe independent child-lane candidates remain`);
  }
  if (
    decision !== 'parallelize_now' &&
    metrics.parallelization.same_turn_child_lane_launch_count > 0
  ) {
    failures.push(`${fixtureId}: ${decision} recorded but same-turn child lanes were launched`);
  }
  if (decision === 'parallelize_now') {
    if (metrics.parallelization.safe_independent_child_lane_candidates <= 0) {
      failures.push(`${fixtureId}: parallelize_now lacks a safe independent child-lane candidate`);
    }
    if (metrics.parallelization.successful_same_turn_child_lane_count <= 0) {
      failures.push(`${fixtureId}: parallelize_now lacks successful same-turn child-lane proof`);
    }
    if (
      metrics.parallelization.require_accepted_child_lane &&
      metrics.parallelization.accepted_child_lane_count <= 0
    ) {
      failures.push(`${fixtureId}: parallelize_now lacks accepted child-lane proof`);
    }
  }

  if (metrics.follow_up.required) {
    if (!metrics.follow_up.workpad_trace_present) {
      failures.push(`${fixtureId}: follow-up trace lacks workpad evidence`);
    }
    if (!metrics.follow_up.related_link_present) {
      failures.push(`${fixtureId}: follow-up trace lacks related link evidence`);
    }
    if (!metrics.follow_up.required_issue_shaping_fields_present) {
      failures.push(
        `${fixtureId}: follow-up trace missing issue-shaping fields ${metrics.follow_up.missing_issue_shaping_fields.join(', ')}`
      );
    }
    if (!metrics.follow_up.create_follow_up_ok && !metrics.follow_up.fail_closed) {
      failures.push(`${fixtureId}: follow-up trace lacks create-follow-up success or fail-closed proof`);
    }
    if (metrics.follow_up.fail_closed && !metrics.follow_up.fail_closed_reason) {
      failures.push(`${fixtureId}: fail-closed follow-up trace lacks a reason`);
    }
  }

  if (metrics.helper_constraints.required) {
    const expectedPhases = ['docs', 'implementation', 'tests'];
    if (JSON.stringify(metrics.helper_constraints.supported_child_lane_phases) !== JSON.stringify(expectedPhases)) {
      failures.push(`${fixtureId}: helper constraints do not expose supported child-lane phases docs, implementation, tests`);
    }
    if (!metrics.helper_constraints.classification_analysis_guidance) {
      failures.push(`${fixtureId}: helper constraints lack classification/analysis fallback guidance`);
    }
    if (!metrics.helper_constraints.parent_dirty_workpad_recovery) {
      failures.push(`${fixtureId}: helper constraints lack parent-dirty workpad recovery`);
    }
    if (!metrics.helper_constraints.duplicate_parity_retry_suppressed) {
      failures.push(`${fixtureId}: helper constraints do not suppress duplicate parity follow-up retries`);
    }
    if (metrics.helper_constraints.deterministic_failure_retry_count > 0) {
      failures.push(`${fixtureId}: helper constraints still show duplicate deterministic mutation retries`);
    }
    if (!metrics.helper_constraints.zero_byte_advisory_evidence) {
      failures.push(`${fixtureId}: helper constraints do not classify zero-byte child lanes as advisory evidence`);
    }
    if (!metrics.helper_constraints.useful_parent_evidence_path) {
      failures.push(`${fixtureId}: helper constraints lack a useful parent-owned evidence path`);
    }
  }

  return failures;
}

async function evaluateFixture(fixtureDir) {
  const fixtureId = path.basename(fixtureDir);
  const manifestPath = join(fixtureDir, 'manifest.json');
  const proofPath = join(fixtureDir, 'provider-linear-worker-proof.json');
  const promptArtifactsPath = join(fixtureDir, 'prompt-artifacts.json');
  const [manifest, proof, promptArtifacts] = await Promise.all([
    readJson(manifestPath),
    readJson(proofPath),
    readJson(promptArtifactsPath)
  ]);
  const metrics = {
    memory: {
      source_0: extractSource0Metrics(manifest, promptArtifacts),
      prompt_pack: extractPromptPackMetrics(manifest, promptArtifacts)
    },
    parallelization: extractParallelizationMetrics(proof, promptArtifacts),
    follow_up: extractFollowUpMetrics(proof, promptArtifacts),
    helper_constraints: extractHelperConstraintMetrics(proof, promptArtifacts)
  };
  const failures = validateMetrics(fixtureId, promptArtifacts, metrics);
  return {
    id: fixtureId,
    description: asString(asRecord(promptArtifacts.eval).description),
    ok: failures.length === 0,
    failures,
    paths: {
      fixture_dir: fixtureDir,
      manifest: manifestPath,
      provider_linear_worker_proof: proofPath,
      prompt_artifacts: promptArtifactsPath
    },
    metrics
  };
}

async function discoverFixtureDirs(fixtureRoot) {
  const entries = await readdir(fixtureRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(fixtureRoot, entry.name))
    .sort();
}

function buildSummary(runs) {
  const failures = runs.flatMap((run) => run.failures);
  const decisionCounts = {
    parallelize_now: 0,
    stay_serial: 0,
    forbid_parallel: 0,
    missing: 0
  };
  let source0AdoptingRuns = 0;
  let promptPackAdoptingRuns = 0;
  let priorExperienceRuns = 0;
  let missingExperienceReasonRuns = 0;
  let childLaneLaunchCount = 0;
  let acceptedChildLaneCount = 0;
  let traceableFollowUpRuns = 0;

  for (const run of runs) {
    const decision = run.metrics.parallelization.decision;
    if (decision && Object.prototype.hasOwnProperty.call(decisionCounts, decision)) {
      decisionCounts[decision] += 1;
    } else {
      decisionCounts.missing += 1;
    }
    if (
      run.metrics.memory.source_0.present &&
      run.metrics.memory.source_0.prompt_included &&
      run.metrics.memory.source_0.prompt_matches_manifest
    ) {
      source0AdoptingRuns += 1;
    }
    if (
      run.metrics.memory.prompt_pack.selected_present_in_manifest &&
      run.metrics.memory.prompt_pack.included_in_provider_prompt
    ) {
      promptPackAdoptingRuns += 1;
    }
    if (run.metrics.memory.prompt_pack.prior_experience_source_run) {
      priorExperienceRuns += 1;
    }
    if (run.metrics.memory.prompt_pack.missing_experience_reason) {
      missingExperienceReasonRuns += 1;
    }
    childLaneLaunchCount += run.metrics.parallelization.child_lane_launch_count;
    acceptedChildLaneCount += run.metrics.parallelization.accepted_child_lane_count;
    if (
      run.metrics.follow_up.workpad_trace_present &&
      run.metrics.follow_up.related_link_present &&
      run.metrics.follow_up.required_issue_shaping_fields_present
    ) {
      traceableFollowUpRuns += 1;
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    total_runs: runs.length,
    source_0_adopting_runs: source0AdoptingRuns,
    prompt_pack_adopting_runs: promptPackAdoptingRuns,
    prior_experience_runs: priorExperienceRuns,
    missing_experience_reason_runs: missingExperienceReasonRuns,
    parallelization_decision_counts: decisionCounts,
    child_lane_launch_count: childLaneLaunchCount,
    accepted_child_lane_count: acceptedChildLaneCount,
    traceable_follow_up_runs: traceableFollowUpRuns
  };
}

export async function buildProviderLinearAdoptionEvalReport(options = {}) {
  const fixtureRoot = options.fixtureRoot ?? DEFAULT_FIXTURE_ROOT;
  const fixtureDirs = options.fixtureDirs ?? await discoverFixtureDirs(fixtureRoot);
  const runs = [];
  for (const fixtureDir of fixtureDirs) {
    runs.push(await evaluateFixture(fixtureDir));
  }
  return {
    schema_version: 1,
    generated_at: options.generatedAt ?? new Date().toISOString(),
    task_id:
      options.taskId ??
      process.env.MCP_RUNNER_TASK_ID ??
      process.env.TASK ??
      'provider-linear-adoption-eval',
    fixture_root: fixtureRoot,
    summary: buildSummary(runs),
    runs
  };
}

export function validateProviderLinearAdoptionEvalReport(report) {
  if (!isRecord(report) || !Array.isArray(report.runs)) {
    return {
      ok: false,
      failures: ['report missing or runs invalid']
    };
  }
  const summary = buildSummary(report.runs);
  const failures = [...summary.failures];
  if (report.summary?.ok !== summary.ok) {
    failures.push('report summary ok does not match run failures');
  }
  if (JSON.stringify(report.summary?.failures) !== JSON.stringify(summary.failures)) {
    failures.push('report summary failures do not match run failures');
  }
  if (report.summary?.total_runs !== summary.total_runs) {
    failures.push('report summary total_runs does not match runs length');
  }
  return {
    ok: failures.length === 0,
    failures
  };
}

function resolveOutputPath(args, taskId) {
  const explicit = args.output ?? args.out;
  if (typeof explicit === 'string' && explicit.trim().length > 0) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(process.cwd(), explicit);
  }
  return join(process.cwd(), 'out', taskId, 'provider-linear-adoption-eval.json');
}

function printHelp() {
  console.log(`Usage: node scripts/provider-linear-adoption-eval.mjs [--fixtures <dir>] [--output <path>]

Replays sanitized provider-linear worker fixtures and emits machine-readable
adoption metrics for memory/source-0, prompt-pack, parallelization, child-lane,
follow-up, link, and workpad traceability.

Options:
  --fixtures <dir>  Fixture root (default: evaluation/fixtures/provider-linear-adoption)
  --output <path>   Report output path (default: out/<task>/provider-linear-adoption-eval.json)
  -h, --help        Show this help message`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.h || args.help) {
    printHelp();
    return;
  }
  const fixtureRoot = resolveMaybeRelative(args.fixtures, process.cwd()) ?? DEFAULT_FIXTURE_ROOT;
  const taskId =
    process.env.MCP_RUNNER_TASK_ID ?? process.env.TASK ?? 'provider-linear-adoption-eval';
  const report = await buildProviderLinearAdoptionEvalReport({ fixtureRoot, taskId });
  const outputPath = resolveOutputPath(args, report.task_id);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Provider-linear adoption eval ${report.summary.ok ? 'passed' : 'failed'}.`);
  console.log(`Report: ${outputPath}`);
  if (!report.summary.ok) {
    for (const failure of report.summary.failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  }
}

const executedScriptUrl = process.argv[1]
  ? pathToFileURL(realpathSync(path.resolve(process.argv[1]))).href
  : null;

if (import.meta.url === executedScriptUrl) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  });
}
