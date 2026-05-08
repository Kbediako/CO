/* eslint-disable patterns/prefer-logger-over-console */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';

import {
  resolveLinearSourceSetup,
} from './control/linearDispatchSource.js';
import {
  attachProviderLinearIssuePr,
  buildFollowUpPacketTraceabilityEvidence,
  createProviderLinearFollowUpIssue,
  deleteProviderLinearWorkpadComment,
  findMissingFollowUpLabelIds,
  getProviderLinearIssueContext,
  resolveFollowUpLabelsFromSourceIssue,
  type ProviderLinearAttachPrResult,
  type ProviderLinearCreateFollowUpResult,
  type ProviderLinearDeleteWorkpadResult,
  type ProviderLinearIssueContextResult,
  type ProviderLinearTransitionResult,
  type ProviderLinearUpsertWorkpadResult,
  transitionProviderLinearIssueState,
  upsertProviderLinearWorkpadComment
} from './control/providerLinearWorkflowFacade.js';
import {
  appendProviderLinearAuditEntry,
  isProviderLinearParallelizationDecision,
  isProviderLinearParallelizationReason,
  isProviderLinearParallelizationReasonAllowed,
  resolveProviderLinearAuditPath,
  summarizeProviderLinearAuditPath,
  type ProviderLinearDecisionLineage,
  type ProviderLinearParallelizationDecision,
  type ProviderLinearParallelizationReason,
  type ProviderLinearAuditEntry,
  type ProviderLinearAuditSummary
} from './control/providerLinearWorkflowAudit.js';
import {
  findDeterministicProviderMutationSuppression,
  isFollowUpParityMatrixSuppressionCode,
  isFollowUpPacketTraceabilitySuppressionCode,
  resolveProviderLinearWorkerAttemptStartedAt
} from './control/providerLinearWorkerTruth.js';
import {
  resolveProviderLinearRuntimeProof,
  type ProviderLinearRuntimeProofKind,
  type ProviderLinearRuntimeProofPolicy,
  type ProviderLinearRuntimeProofReachability
} from './control/providerLinearRuntimeProof.js';
import {
  resolveProviderLinearScreenshotProof,
  type ProviderLinearScreenshotProofCapture,
  type ProviderLinearScreenshotProofError
} from './control/providerLinearScreenshotProof.js';
import {
  runProviderLinearChildStreamShell,
  type ProviderLinearChildStreamResult
} from './providerLinearChildStreamShell.js';
import {
  runProviderLinearChildLaneShell,
  type ProviderLinearChildLaneResult
} from './providerLinearChildLaneShell.js';
import {
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  loadProviderLinearWorkerContext,
  refreshProviderLinearWorkerProofSnapshot
} from './providerLinearWorkerRunner.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';

type ArgMap = Record<string, string | boolean>;

export interface RunLinearCliShellParams {
  positionals: string[];
  flags: ArgMap;
  printHelp: () => void;
}

interface LinearCliShellDependencies {
  getProviderLinearIssueContext: typeof getProviderLinearIssueContext;
  upsertProviderLinearWorkpadComment: typeof upsertProviderLinearWorkpadComment;
  deleteProviderLinearWorkpadComment: typeof deleteProviderLinearWorkpadComment;
  transitionProviderLinearIssueState: typeof transitionProviderLinearIssueState;
  attachProviderLinearIssuePr: typeof attachProviderLinearIssuePr;
  runProviderLinearChildStreamShell: typeof runProviderLinearChildStreamShell;
  runProviderLinearChildLaneShell: typeof runProviderLinearChildLaneShell;
  createProviderLinearFollowUpIssue: typeof createProviderLinearFollowUpIssue;
  resolveProviderLinearRuntimeProof: typeof resolveProviderLinearRuntimeProof;
  resolveProviderLinearScreenshotProof: typeof resolveProviderLinearScreenshotProof;
  loadProviderLinearWorkerContext: typeof loadProviderLinearWorkerContext;
  refreshProviderLinearWorkerProofSnapshot: typeof refreshProviderLinearWorkerProofSnapshot;
  appendAuditEntry: typeof appendProviderLinearAuditEntry;
  readTextFile: (path: string) => Promise<string>;
  getEnv: () => NodeJS.ProcessEnv;
  getCwd: () => string;
  now: () => string;
  log: (line: string) => void;
  warn: (line: string) => void;
  setExitCode: (code: number) => void;
}

interface LinearCliUsageFailureResult {
  ok: false;
  error: {
    code: string;
    message: string;
    status: number;
  };
}

type LinearCliUsageError = Error & {
  result: LinearCliUsageFailureResult;
};

interface ResolvedTextInput {
  text: string;
  filePath: string | null;
}

type ProviderLinearRuntimeProofResult =
  | {
      ok: true;
      operation: 'runtime-proof';
      issue_id: string;
      source_setup: DispatchPilotSourceSetup | null;
      policy: ProviderLinearRuntimeProofPolicy;
      proof: {
        kind: ProviderLinearRuntimeProofKind;
        reviewer_url: string;
        title: string;
        summary: string | null;
      } | null;
      handoff: {
        workpad_markdown: string;
        pr_markdown: string;
      } | null;
      reachability: ProviderLinearRuntimeProofReachability;
    }
  | {
      ok: false;
      operation: 'runtime-proof';
      issue_id: string | null;
      source_setup: DispatchPilotSourceSetup | null;
      policy: ProviderLinearRuntimeProofPolicy | null;
      error: {
        code: string;
        message: string;
        status: number;
        details?: Record<string, unknown>;
      };
    };

type ProviderLinearScreenshotProofResult =
  | {
      ok: true;
      operation: 'screenshot-proof';
      issue_id: string;
      source_setup: DispatchPilotSourceSetup | null;
      capture: ProviderLinearScreenshotProofCapture;
    }
  | {
      ok: false;
      operation: 'screenshot-proof';
      issue_id: string | null;
      source_setup: DispatchPilotSourceSetup | null;
      capture: ProviderLinearScreenshotProofCapture | null;
      error: ProviderLinearScreenshotProofError;
    };

type ProviderLinearParallelizationResult =
  | {
      ok: true;
      operation: 'parallelization';
      issue_id: string;
      issue_identifier: string | null;
      source_setup: DispatchPilotSourceSetup | null;
      decision: ProviderLinearParallelizationDecision;
      reason: ProviderLinearParallelizationReason;
      summary: string | null;
      decision_lineage: ProviderLinearDecisionLineage | null;
    }
  | {
      ok: false;
      operation: 'parallelization';
      issue_id: string | null;
      issue_identifier: string | null;
      source_setup: DispatchPilotSourceSetup | null;
      error: {
        code: string;
        message: string;
        status: number;
      };
    };

const DEFAULT_DEPENDENCIES: LinearCliShellDependencies = {
  getProviderLinearIssueContext,
  upsertProviderLinearWorkpadComment,
  deleteProviderLinearWorkpadComment,
  transitionProviderLinearIssueState,
  attachProviderLinearIssuePr,
  runProviderLinearChildStreamShell,
  runProviderLinearChildLaneShell,
  createProviderLinearFollowUpIssue,
  resolveProviderLinearRuntimeProof,
  resolveProviderLinearScreenshotProof,
  loadProviderLinearWorkerContext,
  refreshProviderLinearWorkerProofSnapshot,
  appendAuditEntry: appendProviderLinearAuditEntry,
  readTextFile: async (path: string) => await readFile(path, 'utf8'),
  getEnv: () => process.env,
  getCwd: () => process.cwd(),
  now: () => new Date().toISOString(),
  log: (line: string) => console.log(line),
  warn: (line: string) => console.warn(line),
  setExitCode: (code: number) => {
    process.exitCode = code;
  }
};

const LINEAR_MUTATING_SUBCOMMANDS = new Set([
  'upsert-workpad',
  'delete-workpad',
  'transition',
  'attach-pr',
  'parallelization',
  'create-follow-up',
  'child-stream',
  'child-lane'
]);
const LINEAR_CANONICAL_OWNER_MARKER_PREFIX = 'codex-orchestrator:canonical-owner-key=';

export async function runLinearCliShell(
  params: RunLinearCliShellParams,
  overrides: Partial<LinearCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  try {
    const env = dependencies.getEnv();
    const positionals = [...params.positionals];
    const subcommand = positionals.shift();
    const wantsHelp =
      params.flags['help'] === true
      || params.flags['--help'] === true
      || params.flags['h'] === true
      || !subcommand
      || subcommand === 'help'
      || subcommand === '--help'
      || subcommand === '-h';

    if (wantsHelp) {
      params.printHelp();
      return;
    }

    if (positionals.length > 0) {
      throw usageError(
        'linear_extra_arguments',
        `linear does not accept extra positional arguments: ${positionals.join(' ')}`
      );
    }

    await assertLinearMutationAllowed(subcommand, params.flags, env, dependencies.readTextFile);

    switch (subcommand) {
      case 'issue-context': {
        assertAllowedFlags(params.flags, ['format', 'issue-id', 'workspace-id', 'team-id', 'project-id']);
        const result = await dependencies.getProviderLinearIssueContext({
          issueId: requireFlag(params.flags, 'issue-id'),
          sourceSetup: readSourceSetup(params.flags),
          allowReadOnlyCacheReuse: true,
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'upsert-workpad': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'body',
          'body-file',
          'comment-id'
        ]);
        const bodyInput = await resolveBodyInput(
          params.flags,
          dependencies.readTextFile,
          dependencies.getCwd()
        );
        const result = await dependencies.upsertProviderLinearWorkpadComment({
          issueId: requireFlag(params.flags, 'issue-id'),
          body: bodyInput.text,
          bodyFilePath: bodyInput.filePath,
          commentId: readStringFlag(params.flags, 'comment-id') ?? null,
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'delete-workpad': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'comment-id'
        ]);
        const result = await dependencies.deleteProviderLinearWorkpadComment({
          issueId: requireFlag(params.flags, 'issue-id'),
          commentId: readStringFlag(params.flags, 'comment-id') ?? null,
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'transition': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'state',
          'expected-state',
          'expected-state-type',
          'expected-updated-at',
          'force',
          'force-reason'
        ]);
        const result = await dependencies.transitionProviderLinearIssueState({
          issueId: requireFlag(params.flags, 'issue-id'),
          stateName: requireFlag(params.flags, 'state'),
          expectedStateName: readStringFlag(params.flags, 'expected-state') ?? null,
          expectedStateType: readStringFlag(params.flags, 'expected-state-type') ?? null,
          expectedUpdatedAt: readStringFlag(params.flags, 'expected-updated-at') ?? null,
          force: readBooleanFlag(params.flags, 'force'),
          forceReason: readRawStringFlag(params.flags, 'force-reason'),
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'attach-pr': {
        assertAllowedFlags(params.flags, ['format', 'issue-id', 'workspace-id', 'team-id', 'project-id', 'url', 'title']);
        const result = await dependencies.attachProviderLinearIssuePr({
          issueId: requireFlag(params.flags, 'issue-id'),
          url: requireFlag(params.flags, 'url'),
          title: readStringFlag(params.flags, 'title') ?? null,
          sourceSetup: readSourceSetup(params.flags),
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'parallelization': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'decision',
          'reason',
          'summary'
        ]);
        const issueId = requireFlag(params.flags, 'issue-id');
        const decision = requireParallelizationDecision(params.flags);
        const reason = requireParallelizationReason(params.flags, decision);
        const summary = requireParallelizationSummary(params.flags, decision, reason);
        const proofRefreshContext = await resolveParallelizationProofRefreshContext(issueId, env, dependencies);
        const decisionLineage = await resolveParallelizationDecisionLineage(
          proofRefreshContext,
          decision,
          reason,
          dependencies
        );
        const result: ProviderLinearParallelizationResult = {
          ok: true,
          operation: 'parallelization',
          issue_id: issueId,
          issue_identifier: proofRefreshContext?.issueIdentifier ?? null,
          source_setup: resolveAuditSourceSetup(params.flags, env),
          decision,
          reason,
          summary,
          decision_lineage: decisionLineage
        };
        await recordAuditResult(result, params.flags, env, dependencies);
        await refreshParallelizationProofSnapshotBestEffort(
          result,
          proofRefreshContext,
          env,
          dependencies
        );
        emitJsonResult(result, dependencies);
        return;
      }
      case 'create-follow-up': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'title',
          'description',
          'description-file',
          'intent-checksum',
          'intent-checksum-file',
          'non-goals',
          'non-goals-file',
          'not-done-if',
          'not-done-if-file',
          'acceptance-criteria',
          'acceptance-criteria-file',
          'parity-lane',
          'parity-matrix',
          'parity-matrix-file',
          'canonical-owner-key',
          'canonical-owner-key-file',
          'blocked-by-source'
        ]);
        const description = await resolveRequiredText(
          params.flags,
          dependencies.readTextFile,
          'description',
          'description-file'
        );
        const intentChecksum = await resolveRequiredText(
          params.flags,
          dependencies.readTextFile,
          'intent-checksum',
          'intent-checksum-file'
        );
        const nonGoals = await resolveRequiredText(
          params.flags,
          dependencies.readTextFile,
          'non-goals',
          'non-goals-file'
        );
        const notDoneIf = await resolveRequiredText(
          params.flags,
          dependencies.readTextFile,
          'not-done-if',
          'not-done-if-file'
        );
        const acceptanceCriteria = await resolveRequiredText(
          params.flags,
          dependencies.readTextFile,
          'acceptance-criteria',
          'acceptance-criteria-file'
        );
        const issueId = requireFlag(params.flags, 'issue-id');
        const title = requireFlag(params.flags, 'title');
        const parityLane = readBooleanFlag(params.flags, 'parity-lane');
        const parityMatrix = await resolveOptionalText(
          params.flags,
          dependencies.readTextFile,
          'parity-matrix',
          'parity-matrix-file'
        );
        const canonicalOwnerKey = await resolveOptionalText(
          params.flags,
          dependencies.readTextFile,
          'canonical-owner-key',
          'canonical-owner-key-file'
        );
        const blockedBySource = readBooleanFlag(params.flags, 'blocked-by-source');
        const repoRoot = resolveRuntimeProofRepoRoot(dependencies.getCwd(), env);
        const retrySuppressed = await resolveCreateFollowUpRetrySuppression({
          issueId,
          title,
          canonicalOwnerKey,
          blockedBySource,
          parityLane,
          parityMatrix,
          repoRoot,
          env,
          dependencies
        });
        if (retrySuppressed) {
          await recordAuditResult(retrySuppressed, params.flags, env, dependencies, {
            createFollowUpCanonicalOwnerKey: canonicalOwnerKey
          });
          emitJsonResult(retrySuppressed, dependencies);
          return;
        }
        const result = normalizeCreateFollowUpResultForCli(
          await dependencies.createProviderLinearFollowUpIssue({
            issueId,
            title,
            description,
            intentChecksum,
            nonGoals,
            notDoneIf,
            acceptanceCriteria,
            parityLane,
            parityMatrix,
            canonicalOwnerKey,
            blockedBySource,
            repoRoot,
            sourceSetup: readSourceSetup(params.flags),
            env
          })
        );
        await recordAuditResult(result, params.flags, env, dependencies, {
          createFollowUpCanonicalOwnerKey: canonicalOwnerKey
        });
        emitJsonResult(result, dependencies);
        return;
      }
      case 'runtime-proof': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'origin',
          'kind',
          'proof-url',
          'title',
          'summary',
          'reachability-mode'
        ]);
        const issueId = requireFlag(params.flags, 'issue-id');
        const sourceSetup = resolveAuditSourceSetup(params.flags, env);
        const resolved = await dependencies.resolveProviderLinearRuntimeProof({
          repoRoot: resolveRuntimeProofRepoRoot(dependencies.getCwd(), env),
          origin: requireFlag(params.flags, 'origin'),
          kind: readStringFlag(params.flags, 'kind') ?? null,
          proofUrl: readStringFlag(params.flags, 'proof-url') ?? null,
          title: readRawStringFlag(params.flags, 'title'),
          summary: readRawStringFlag(params.flags, 'summary'),
          reachabilityMode: readStringFlag(params.flags, 'reachability-mode') ?? null
        });
        const result: ProviderLinearRuntimeProofResult = resolved.ok
          ? {
              ok: true,
              operation: 'runtime-proof',
              issue_id: issueId,
              source_setup: sourceSetup,
              policy: resolved.policy,
              proof: resolved.proof,
              handoff: resolved.handoff,
              reachability: resolved.reachability
            }
          : {
              ok: false,
              operation: 'runtime-proof',
              issue_id: issueId,
              source_setup: sourceSetup,
              policy: resolved.policy,
              error: resolved.error
            };
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'screenshot-proof': {
        assertAllowedFlags(params.flags, [
          'format',
          'issue-id',
          'workspace-id',
          'team-id',
          'project-id',
          'output',
          'display-id',
          'window-id',
          'open-preview'
        ]);
        const issueId = requireFlag(params.flags, 'issue-id');
        const sourceSetup = resolveAuditSourceSetup(params.flags, env);
        const resolved = await dependencies.resolveProviderLinearScreenshotProof({
          cwd: dependencies.getCwd(),
          outputPath: readRawStringFlag(params.flags, 'output') ?? null,
          displayId: readStringFlag(params.flags, 'display-id') ?? null,
          windowId: readStringFlag(params.flags, 'window-id') ?? null,
          openPreview: readBooleanFlag(params.flags, 'open-preview')
        });
        const result: ProviderLinearScreenshotProofResult = resolved.ok
          ? {
              ok: true,
              operation: 'screenshot-proof',
              issue_id: issueId,
              source_setup: sourceSetup,
              capture: resolved.capture
            }
          : {
              ok: false,
              operation: 'screenshot-proof',
              issue_id: issueId,
              source_setup: sourceSetup,
              capture: resolved.capture,
              error: resolved.error
            };
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'child-stream': {
        assertAllowedFlags(params.flags, ['format', 'pipeline', 'stream']);
        const result = await dependencies.runProviderLinearChildStreamShell({
          pipelineId: requireFlag(params.flags, 'pipeline'),
          streamName: readStringFlag(params.flags, 'stream') ?? null,
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      case 'child-lane': {
        assertAllowedFlags(params.flags, [
          'format',
          'action',
          'stream',
          'purpose',
          'files',
          'phases',
          'instructions',
          'instructions-file',
          'reason'
        ]);
        const result = await dependencies.runProviderLinearChildLaneShell({
          action: requireFlag(params.flags, 'action'),
          streamName: readStringFlag(params.flags, 'stream') ?? null,
          purpose: readRawStringFlag(params.flags, 'purpose') ?? null,
          files: readCommaSeparatedFlag(params.flags, 'files'),
          phases: readCommaSeparatedFlag(params.flags, 'phases'),
          instructions: await resolveOptionalText(
            params.flags,
            dependencies.readTextFile,
            'instructions',
            'instructions-file'
          ),
          reason: readRawStringFlag(params.flags, 'reason') ?? null,
          env
        });
        await recordAuditResult(result, params.flags, env, dependencies);
        emitJsonResult(result, dependencies);
        return;
      }
      default:
        throw usageError('linear_unknown_subcommand', `Unknown linear subcommand: ${subcommand}`);
    }
  } catch (error) {
    emitJsonResult(
      isLinearCliUsageError(error) ? error.result : failureResult('linear_cli_error', resolveErrorMessage(error), 500),
      dependencies
    );
  }
}

interface ParallelizationProofRefreshContext {
  runDir: string;
  issueId: string;
  issueIdentifier: string;
  taskId: string;
  runId: string;
}

async function resolveParallelizationProofRefreshContext(
  issueId: string,
  env: NodeJS.ProcessEnv,
  dependencies: Pick<
    LinearCliShellDependencies,
    'loadProviderLinearWorkerContext'
  >
): Promise<ParallelizationProofRefreshContext | null> {
  try {
    const context = await dependencies.loadProviderLinearWorkerContext(env);
    if (context.pipelineId !== 'provider-linear-worker' || context.issueId !== issueId) {
      return null;
    }
    return {
      runDir: context.runDir,
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      taskId: context.taskId,
      runId: context.runId
    };
  } catch {
    return null;
  }
}

async function resolveParallelizationDecisionLineage(
  context: ParallelizationProofRefreshContext | null,
  decision: ProviderLinearParallelizationDecision,
  reason: ProviderLinearParallelizationReason,
  dependencies: Pick<LinearCliShellDependencies, 'readTextFile'>
): Promise<ProviderLinearDecisionLineage | null> {
  if (!context) {
    return null;
  }
  let proof: Record<string, unknown> | null = null;
  try {
    proof = JSON.parse(
      await dependencies.readTextFile(join(context.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME))
    ) as Record<string, unknown>;
  } catch {
    proof = null;
  }
  const parentTaskId = normalizeOptionalAuditString(context.taskId);
  const parentRunId = normalizeOptionalAuditString(context.runId);
  const parentTurnStartedAt = readUnknownString(proof?.current_turn_started_at);
  const parentTurnId =
    readUnknownString(proof?.latest_turn_id) ??
    readUnknownString(proof?.session_log_turn_id);
  const parentTurnCount = readUnknownNonNegativeInteger(proof?.turn_count);
  if (
    !parentTaskId ||
    !parentRunId ||
    (!parentTurnStartedAt && !parentTurnId && parentTurnCount === null)
  ) {
    return null;
  }
  return {
    schema_version: 1,
    parent_task_id: parentTaskId,
    parent_run_id: parentRunId,
    parent_turn_started_at: parentTurnStartedAt,
    parent_turn_id: parentTurnId,
    parent_turn_count: parentTurnCount,
    decision_id: null,
    decision_recorded_at: null,
    decision,
    reason
  };
}

async function resolveProviderLinearWorkerAttemptStartedAtForIssue(
  issueId: string,
  env: NodeJS.ProcessEnv,
  dependencies: Pick<
    LinearCliShellDependencies,
    'loadProviderLinearWorkerContext' | 'readTextFile'
  >
): Promise<string | null> {
  const context = await resolveParallelizationProofRefreshContext(issueId, env, dependencies);
  if (!context) {
    return null;
  }
  try {
    const raw = await dependencies.readTextFile(
      join(context.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return resolveProviderLinearWorkerAttemptStartedAt(parsed);
  } catch {
    return null;
  }
}

async function resolveCreateFollowUpRetrySuppression(input: {
  issueId: string;
  title: string;
  canonicalOwnerKey: string | null;
  blockedBySource: boolean;
  parityLane: boolean;
  parityMatrix: string | null;
  repoRoot: string;
  env: NodeJS.ProcessEnv;
  dependencies: Pick<
    LinearCliShellDependencies,
    'getProviderLinearIssueContext' | 'loadProviderLinearWorkerContext' | 'readTextFile' | 'warn'
  >;
}): Promise<ProviderLinearCreateFollowUpResult | null> {
  const auditPath = resolveProviderLinearAuditPath(input.env);
  if (!auditPath) {
    return null;
  }
  const attemptStartedAt = await resolveProviderLinearWorkerAttemptStartedAtForIssue(
    input.issueId,
    input.env,
    input.dependencies
  );
  if (!attemptStartedAt) {
    return null;
  }
  let audit = null;
  try {
    audit = await summarizeProviderLinearAuditPath(auditPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    input.dependencies.warn(
      `linear create-follow-up warning: failed to summarize provider-linear audit at ${auditPath}; proceeding without retry suppression. error=${message}`
    );
    return null;
  }
  const followUpIntentKey = buildFollowUpIntentKey(input);
  const suppression = findDeterministicProviderMutationSuppression(
    audit,
    'create-follow-up',
    {
      recordedAtNotBefore: attemptStartedAt,
      issueId: input.issueId,
      followUpIntentKey
    }
  );
  if (!suppression) {
    return null;
  }
  if (input.parityLane && (input.parityMatrix?.trim().length ?? 0) === 0) {
    if (!isFollowUpParityMatrixSuppressionCode(suppression.error_code)) {
      return null;
    }
    return {
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_parity_matrix_retry_suppressed',
        message: `Same-attempt retry suppressed: ${suppression.instruction}`,
        status: 409
      }
    };
  }
  if (isFollowUpPacketTraceabilitySuppressionCode(suppression.error_code)) {
    const suppressionEntry = findLatestCreateFollowUpSuppressionAuditEntry({
      audit,
      issueId: input.issueId,
      recordedAtNotBefore: attemptStartedAt,
      followUpIntentKey,
      matchesErrorCode: isFollowUpPacketTraceabilityPendingCode
    });
    const reconciledRetry = suppressionEntry
      ? await buildLocallyReconciledFollowUpPacketRetryResult({
          entry: suppressionEntry,
          title: input.title,
          canonicalOwnerKey: input.canonicalOwnerKey,
          blockedBySource: input.blockedBySource,
          repoRoot: input.repoRoot,
          env: input.env,
          dependencies: input.dependencies
        })
      : null;
    if (reconciledRetry) {
      return reconciledRetry;
    }
    return {
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_packet_traceability_retry_suppressed',
        message: `Same-attempt retry suppressed: ${suppression.instruction}`,
        status: 409,
        details: {
          follow_up_issue: suppressionEntry
            ? {
                id: suppressionEntry.follow_up_issue_id,
                identifier: suppressionEntry.follow_up_issue_identifier
              }
            : null,
          audit_entry: suppressionEntry
            ? {
                recorded_at: suppressionEntry.recorded_at,
                action: suppressionEntry.action,
                via: suppressionEntry.via,
                state: suppressionEntry.state,
                follow_up_intent_key: suppressionEntry.follow_up_intent_key ?? null,
                error_code: suppressionEntry.error_code
              }
            : null
        }
      }
    };
  }
  return null;
}

function buildFollowUpIntentKey(input: {
  title: string;
  canonicalOwnerKey: string | null;
  blockedBySource: boolean;
  parityLane: boolean;
}): string {
  return [
    `title=${normalizeFollowUpIntentKeyPart(input.title)}`,
    `canonical=${normalizeFollowUpIntentKeyPart(input.canonicalOwnerKey ?? '')}`,
    `blocked=${input.blockedBySource ? '1' : '0'}`,
    `parity=${input.parityLane ? '1' : '0'}`
  ].join(';');
}

function normalizeFollowUpIntentKeyPart(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase());
}

function findLatestCreateFollowUpSuppressionAuditEntry(input: {
  audit: ProviderLinearAuditSummary;
  issueId: string;
  recordedAtNotBefore: string;
  followUpIntentKey: string;
  matchesErrorCode: (errorCode: string | null | undefined) => boolean;
}): ProviderLinearAuditEntry | null {
  const lowerBoundMs = Date.parse(input.recordedAtNotBefore);
  if (!Number.isFinite(lowerBoundMs) || !Array.isArray(input.audit.entries)) {
    return null;
  }
  return input.audit.entries
    .filter((entry) => (
      entry.operation === 'create-follow-up'
      && entry.ok === false
      && entry.issue_id === input.issueId
      && entry.follow_up_intent_key === input.followUpIntentKey
      && input.matchesErrorCode(entry.error_code)
      && Date.parse(entry.recorded_at) >= lowerBoundMs
    ))
    .sort((left, right) => Date.parse(right.recorded_at) - Date.parse(left.recorded_at))[0] ?? null;
}

async function buildLocallyReconciledFollowUpPacketRetryResult(input: {
  entry: ProviderLinearAuditEntry;
  title: string;
  canonicalOwnerKey: string | null;
  blockedBySource: boolean;
  repoRoot: string;
  env: NodeJS.ProcessEnv;
  dependencies: Pick<LinearCliShellDependencies, 'getProviderLinearIssueContext'>;
}): Promise<ProviderLinearCreateFollowUpResult | null> {
  const entry = input.entry;
  const followUpIssueId = normalizeOptionalString(entry.follow_up_issue_id);
  if (!followUpIssueId) {
    return null;
  }
  const sourceIssueId = normalizeOptionalString(entry.issue_id);
  const sourceIssueIdentifier = normalizeOptionalString(entry.issue_identifier) ?? sourceIssueId;
  const followUpIssueIdentifier = normalizeOptionalString(entry.follow_up_issue_identifier);
  if (!sourceIssueId || !sourceIssueIdentifier || !followUpIssueIdentifier) {
    return null;
  }
  const relatedSatisfied = entry.via === 'related' || entry.via === 'related+blocks';
  const blockedSatisfied = entry.via === 'related+blocks';
  if (!relatedSatisfied || (input.blockedBySource && !blockedSatisfied)) {
    return null;
  }
  const localPacketTraceability = await buildFollowUpPacketTraceabilityEvidence({
    id: followUpIssueId,
    description: null,
    state: {
      id: 'audit-backlog-state',
      name: entry.state ?? 'Backlog',
      type: null
    }
  }, input.repoRoot);
  if (
    localPacketTraceability.readiness.missing_paths.length > 0
    || localPacketTraceability.readiness.missing_registry_mirrors.length > 0
  ) {
    return null;
  }
  const followUpContext = await input.dependencies.getProviderLinearIssueContext({
    issueId: followUpIssueId,
    env: input.env
  });
  if (!followUpContext.ok) {
    return null;
  }
  const packetTraceability = await buildFollowUpPacketTraceabilityEvidence(
    followUpContext.issue,
    input.repoRoot
  );
  if (!packetTraceability.readiness.ready) {
    return null;
  }
  const sourceContext = await input.dependencies.getProviderLinearIssueContext({
    issueId: sourceIssueId,
    env: input.env
  });
  if (!sourceContext.ok) {
    return null;
  }
  const requestedLabels = resolveFollowUpLabelsFromSourceIssue(sourceContext.issue);
  if (!requestedLabels.ok) {
    return {
      ok: false,
      operation: 'create-follow-up',
      error: requestedLabels.error
    };
  }
  const missingLabelIds = findMissingFollowUpLabelIds(
    followUpContext.issue.labels,
    requestedLabels.labels
  );
  if (missingLabelIds.length > 0) {
    return {
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_label_assignment_incomplete',
        message: 'Linear follow-up issue label assignment did not return all requested live labels.',
        status: 409,
        retryable: false,
        details: {
          issue: {
            id: sourceContext.issue.id,
            identifier: sourceContext.issue.identifier
          },
          follow_up_issue: {
            id: followUpContext.issue.id,
            identifier: followUpContext.issue.identifier
          },
          requested_labels: requestedLabels.labels,
          observed_labels: followUpContext.issue.labels,
          missing_label_ids: missingLabelIds
        }
      }
    };
  }
  const followUpTeam = followUpContext.issue.team
    ? {
        id: followUpContext.issue.team.id,
        key: followUpContext.issue.team.key,
        name: followUpContext.issue.team.name
      }
    : null;
  return {
    ok: true,
    operation: 'create-follow-up',
    action: 'reused',
    issue: {
      id: sourceContext.issue.id,
      identifier: sourceContext.issue.identifier
    },
    follow_up_issue: {
      id: followUpContext.issue.id,
      identifier: followUpContext.issue.identifier,
      title: followUpContext.issue.title,
      description: followUpContext.issue.description,
      url: followUpContext.issue.url,
      state: followUpContext.issue.state,
      team: followUpTeam,
      project: followUpContext.issue.project
    },
    canonical_owner: input.canonicalOwnerKey
      ? {
          key: input.canonicalOwnerKey,
          marker: `${LINEAR_CANONICAL_OWNER_MARKER_PREFIX}${input.canonicalOwnerKey}`
        }
      : null,
    relations: {
      related: relatedSatisfied,
      blocked_by_source: blockedSatisfied
    },
    traceability: {
      labels: {
        source_issue: {
          id: sourceContext.issue.id,
          identifier: sourceContext.issue.identifier
        },
        requested_labels: requestedLabels.labels,
        observed_labels: followUpContext.issue.labels,
        missing_label_ids: []
      },
      relations: {
        related: {
          type: 'related',
          requested: true,
          satisfied: relatedSatisfied,
          action: 'already_satisfied',
          issue_id: sourceIssueId,
          related_issue_id: followUpIssueId
        },
        blocked_by_source: {
          type: 'blocks',
          requested: input.blockedBySource,
          satisfied: blockedSatisfied,
          action: input.blockedBySource ? 'already_satisfied' : 'not_requested',
          issue_id: sourceIssueId,
          related_issue_id: followUpIssueId
        }
      },
      packet: packetTraceability
    },
    source_setup: null
  };
}

async function refreshParallelizationProofSnapshotBestEffort(
  result: ProviderLinearParallelizationResult,
  context: ParallelizationProofRefreshContext | null,
  env: NodeJS.ProcessEnv,
  dependencies: Pick<
    LinearCliShellDependencies,
    'refreshProviderLinearWorkerProofSnapshot' | 'warn'
  >
): Promise<void> {
  if (!result.ok || !context) {
    return;
  }
  const auditPath = resolveProviderLinearAuditPath(env);
  try {
    await dependencies.refreshProviderLinearWorkerProofSnapshot(
      context.runDir,
      auditPath,
      undefined,
      undefined,
      env
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dependencies.warn(
      `linear parallelization warning: failed to refresh provider-linear-worker proof snapshot for ${context.issueIdentifier}: ${message}`
    );
  }
}

function emitJsonResult(
  result: { ok: boolean },
  dependencies: Pick<LinearCliShellDependencies, 'log' | 'setExitCode'>
): void {
  dependencies.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    dependencies.setExitCode(1);
  }
}

function normalizeCreateFollowUpResultForCli(
  result: ProviderLinearCreateFollowUpResult
): ProviderLinearCreateFollowUpResult {
  if (!result.ok) {
    return result;
  }
  const traceability = result.traceability;
  const blocker = traceability.packet.queue_admission_blocker;
  if (!blocker || typeof blocker !== 'object') {
    return result;
  }
  const blockerRecord = blocker as Record<string, unknown>;
  const summary = typeof blockerRecord.summary === 'string'
    ? blockerRecord.summary
    : 'Backlog admission remains blocked until follow-up packet traceability evidence is ready.';
  return {
    ok: false,
    operation: 'create-follow-up',
    error: {
      code: 'linear_follow_up_packet_traceability_pending',
      message: summary,
      status: 409,
      retryable: false,
      details: {
        issue: result.issue,
        follow_up_issue: result.follow_up_issue,
        action: result.action,
        canonical_owner: result.canonical_owner,
        relations: result.relations,
        traceability,
        queue_admission_blocker: blocker
      }
    }
  };
}

function assertAllowedFlags(flags: ArgMap, allowed: string[]): void {
  const allowedSet = new Set([...allowed, 'help', '--help', 'h']);
  for (const key of Object.keys(flags)) {
    if (!allowedSet.has(key)) {
      throw usageError('linear_unknown_flag', `Unknown linear flag: --${key}`);
    }
  }
  const format = flags['format'];
  if (format !== undefined && format !== 'json') {
    throw usageError('linear_format_unsupported', 'linear only supports --format json.');
  }
}

function requireFlag(flags: ArgMap, key: string): string {
  const value = readStringFlag(flags, key);
  if (!value) {
    throw usageError('linear_missing_flag', `--${key} is required.`);
  }
  return value;
}

function readRawStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBooleanFlag(flags: ArgMap, key: string): boolean {
  const value = flags[key];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function requireParallelizationDecision(flags: ArgMap): ProviderLinearParallelizationDecision {
  const decision = readStringFlag(flags, 'decision');
  if (!isProviderLinearParallelizationDecision(decision)) {
    throw usageError(
      'linear_parallelization_decision_invalid',
      'linear parallelization requires --decision parallelize_now|stay_serial|forbid_parallel.'
    );
  }
  return decision;
}

function requireParallelizationReason(
  flags: ArgMap,
  decision: ProviderLinearParallelizationDecision
): ProviderLinearParallelizationReason {
  const reason = readStringFlag(flags, 'reason');
  if (!isProviderLinearParallelizationReason(reason)) {
    throw usageError(
      'linear_parallelization_reason_invalid',
      'linear parallelization requires a recognized --reason code.'
    );
  }
  if (!isProviderLinearParallelizationReasonAllowed(decision, reason)) {
    throw usageError(
      'linear_parallelization_reason_mismatch',
      `linear parallelization reason ${reason} is not allowed for decision ${decision}.`
    );
  }
  return reason;
}

function requireParallelizationSummary(
  flags: ArgMap,
  decision: ProviderLinearParallelizationDecision,
  reason: ProviderLinearParallelizationReason
): string {
  const summary = readStringFlag(flags, 'summary');
  if (!summary) {
    throw usageError(
      'linear_parallelization_summary_missing',
      'linear parallelization requires --summary with matrix/cap evidence for the decision.'
    );
  }
  if (decision === 'stay_serial' && reason === 'single_bounded_change') {
    const missingSlices = ['docs', 'test', 'research', 'review'].filter(
      (slice) => !new RegExp(`(?:^|;)\\s*${slice}\\s*:\\s*[^;\\s][^;]*`, 'i').test(summary)
    );
    if (missingSlices.length > 0) {
      throw usageError(
        'linear_parallelization_single_bounded_change_summary_incomplete',
        `linear parallelization single_bounded_change summaries must explain why no docs/test/research/review slice can be separated safely with labeled slice evidence; missing: ${missingSlices.join(', ')}.`
      );
    }
  }
  if (
    decision === 'stay_serial' &&
    reason === 'existing_child_lane_active' &&
    !/(?:^|;)\s*cap_exhausted\s*:\s*[^;\s][^;]*/iu.test(summary)
  ) {
    throw usageError(
      'linear_parallelization_cap_exhausted_summary_missing',
      'linear parallelization existing_child_lane_active summaries must include labeled cap_exhausted evidence, for example `cap_exhausted: 2/2 active child lanes`.'
    );
  }
  return summary;
}

function readCommaSeparatedFlag(flags: ArgMap, key: string): string[] {
  const value = readRawStringFlag(flags, key);
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readSourceSetup(flags: ArgMap): DispatchPilotSourceSetup | null {
  const workspaceId = readStringFlag(flags, 'workspace-id') ?? null;
  const teamId = readStringFlag(flags, 'team-id') ?? null;
  const projectId = readStringFlag(flags, 'project-id') ?? null;
  if (!workspaceId && !teamId && !projectId) {
    return null;
  }
  return {
    provider: 'linear',
    workspace_id: workspaceId,
    team_id: teamId,
    project_id: projectId
  };
}

async function resolveBodyInput(
  flags: ArgMap,
  readTextFile: (path: string) => Promise<string>,
  cwd: string
): Promise<ResolvedTextInput> {
  const inlineValue = readRawStringFlag(flags, 'body');
  const fileValue = readStringFlag(flags, 'body-file');
  const hasInlineValue = typeof inlineValue === 'string' && inlineValue.trim().length > 0;
  if (hasInlineValue && fileValue) {
    throw usageError('linear_body_conflict', 'Use either --body or --body-file, not both.');
  }
  if (hasInlineValue) {
    return {
      text: inlineValue,
      filePath: null
    };
  }
  if (!fileValue) {
    throw usageError('linear_body_missing', '--body or --body-file is required.');
  }
  const resolvedFilePath = resolveInputFilePath(fileValue, cwd);
  let fileText: string;
  try {
    fileText = await readTextFile(resolvedFilePath);
  } catch {
    throw usageError('linear_body_file_unreadable', '--body-file must reference a readable file.');
  }
  if (fileText.trim().length === 0) {
    throw usageError('linear_body_missing', '--body or --body-file is required.');
  }
  return {
    text: fileText,
    filePath: resolvedFilePath
  };
}

function resolveInputFilePath(filePath: string, cwd: string): string {
  return isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
}

async function resolveOptionalText(
  flags: ArgMap,
  readTextFile: (path: string) => Promise<string>,
  inlineFlag: string,
  fileFlag: string
): Promise<string | null> {
  const inlineValue = readRawStringFlag(flags, inlineFlag);
  const fileValue = readStringFlag(flags, fileFlag);
  const hasInlineValue = typeof inlineValue === 'string' && inlineValue.trim().length > 0;
  if (hasInlineValue && fileValue) {
    throw usageError(
      `linear_${inlineFlag.replace(/-/gu, '_')}_conflict`,
      `Use either --${inlineFlag} or --${fileFlag}, not both.`
    );
  }
  if (hasInlineValue) {
    return inlineValue;
  }
  if (!fileValue) {
    return null;
  }
  let fileText: string;
  try {
    fileText = await readTextFile(fileValue);
  } catch {
    throw usageError(
      `linear_${fileFlag.replace(/-/gu, '_')}_unreadable`,
      `--${fileFlag} must reference a readable file.`
    );
  }
  return fileText.trim().length > 0 ? fileText : null;
}

async function resolveRequiredText(
  flags: ArgMap,
  readTextFile: (path: string) => Promise<string>,
  inlineFlag: string,
  fileFlag: string
): Promise<string> {
  const inlineValue = readRawStringFlag(flags, inlineFlag);
  const fileValue = readStringFlag(flags, fileFlag);
  const hasInlineValue = typeof inlineValue === 'string' && inlineValue.trim().length > 0;
  if (hasInlineValue && fileValue) {
    throw usageError(
      `linear_${inlineFlag.replace(/-/gu, '_')}_conflict`,
      `Use either --${inlineFlag} or --${fileFlag}, not both.`
    );
  }
  if (hasInlineValue) {
    return inlineValue;
  }
  if (fileValue) {
    let fileText: string;
    try {
      fileText = await readTextFile(fileValue);
    } catch {
      throw usageError(
        `linear_${fileFlag.replace(/-/gu, '_')}_unreadable`,
        `--${fileFlag} must reference a readable file.`
      );
    }
    if (fileText.trim().length === 0) {
      throw usageError(
        `linear_${inlineFlag.replace(/-/gu, '_')}_missing`,
        `--${inlineFlag} or --${fileFlag} is required.`
      );
    }
    return fileText;
  }
  throw usageError(
    `linear_${inlineFlag.replace(/-/gu, '_')}_missing`,
    `--${inlineFlag} or --${fileFlag} is required.`
  );
}

function usageError(code: string, message: string): LinearCliUsageError {
  return cliError(code, message, 422);
}

function cliError(code: string, message: string, status: number): LinearCliUsageError {
  const error = new Error(message) as LinearCliUsageError;
  error.result = failureResult(code, message, status);
  return error;
}

function isLinearCliUsageError(error: unknown): error is LinearCliUsageError {
  return (
    error instanceof Error
    && typeof (error as Partial<LinearCliUsageError>).result?.error?.code === 'string'
    && typeof (error as Partial<LinearCliUsageError>).result?.error?.message === 'string'
    && typeof (error as Partial<LinearCliUsageError>).result?.error?.status === 'number'
  );
}

function failureResult(code: string, message: string, status: number): LinearCliUsageFailureResult {
  return {
    ok: false,
    error: {
      code,
      message,
      status
    }
  };
}

async function assertLinearMutationAllowed(
  subcommand: string,
  flags: ArgMap,
  env: NodeJS.ProcessEnv,
  readTextFile: (path: string) => Promise<string>
): Promise<void> {
  if (!LINEAR_MUTATING_SUBCOMMANDS.has(subcommand)) {
    return;
  }
  const pipelineIdFromEnv = readStringEnv(env, 'CODEX_ORCHESTRATOR_PIPELINE_ID');
  const isChildLane = pipelineIdFromEnv === 'provider-linear-child-lane';
  const manifestPath = readStringEnv(env, 'CODEX_ORCHESTRATOR_MANIFEST_PATH');
  if (!manifestPath) {
    if (isChildLane) {
      throw cliError(
        'provider_worker_parent_mutation_required',
        `${subcommand} is only available to the parent provider-linear-worker; subordinate same-issue child lanes are read-only for Linear mutations.`,
        409
      );
    }
    return;
  }
  let manifestRecord: Record<string, unknown>;
  try {
    manifestRecord = JSON.parse(await readTextFile(manifestPath)) as Record<string, unknown>;
  } catch {
    if (isChildLane) {
      throw cliError(
        'provider_worker_parent_mutation_required',
        `${subcommand} is only available to the parent provider-linear-worker; subordinate same-issue child lanes are read-only for Linear mutations.`,
        409
      );
    }
    return;
  }
  const pipelineId = readUnknownString(manifestRecord.pipeline_id) ?? readUnknownString(manifestRecord.pipelineId);
  const parentRunId = readUnknownString(manifestRecord.parent_run_id) ?? readUnknownString(manifestRecord.parentRunId);
  if (pipelineId !== 'provider-linear-child-lane' || !parentRunId) {
    return;
  }
  throw cliError(
    'provider_worker_parent_mutation_required',
    `${subcommand} is only available to the parent provider-linear-worker; subordinate same-issue child lanes are read-only for Linear mutations.`,
    409
  );
}

function resolveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readStringEnv(env: NodeJS.ProcessEnv, key: string): string | null {
  const value = env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

type LinearCliResult =
  | ProviderLinearIssueContextResult
  | ProviderLinearUpsertWorkpadResult
  | ProviderLinearDeleteWorkpadResult
  | ProviderLinearTransitionResult
  | ProviderLinearAttachPrResult
  | ProviderLinearParallelizationResult
  | ProviderLinearCreateFollowUpResult
  | ProviderLinearRuntimeProofResult
  | ProviderLinearScreenshotProofResult
  | ProviderLinearChildStreamResult
  | ProviderLinearChildLaneResult;

interface LinearCliAuditContext {
  createFollowUpCanonicalOwnerKey?: string | null;
}

async function recordAuditResult(
  result: LinearCliResult,
  flags: ArgMap,
  env: NodeJS.ProcessEnv,
  dependencies: Pick<LinearCliShellDependencies, 'appendAuditEntry' | 'now' | 'warn'>,
  context: LinearCliAuditContext = {}
): Promise<void> {
  const auditPath = resolveProviderLinearAuditPath(env);
  if (!auditPath) {
    return;
  }
  try {
    await dependencies.appendAuditEntry(auditPath, buildAuditEntry(result, flags, env, dependencies.now(), context));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dependencies.warn(`linear audit warning: failed to append audit entry to ${auditPath}: ${message}`);
  }
}

function buildAuditEntry(
  result: LinearCliResult,
  flags: ArgMap,
  env: NodeJS.ProcessEnv,
  recordedAt: string,
  context: LinearCliAuditContext = {}
): ProviderLinearAuditEntry {
  const requestedIssueId = readStringFlag(flags, 'issue-id') ?? null;
  const sourceSetup = resolveAuditSourceSetup(flags, env);
  const followUpAuditFields = resolveFollowUpAuditFields(result, flags, context);
  const followUpFailureAuditFields = resolveFollowUpFailureAuditFields(result);
  if (!result.ok) {
    if (result.operation === 'child-stream') {
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: false,
        issue_id: result.issue_id ?? requestedIssueId,
        issue_identifier: result.issue_identifier,
        source_setup: result.source_setup ?? sourceSetup,
        action: result.stream ? `stream:${result.stream}` : null,
        via: result.pipeline_id ? `pipeline:${result.pipeline_id}` : null,
        state: result.child_run?.status ?? null,
        follow_up_issue_id: null,
        follow_up_issue_identifier: null,
        failed_relation_type: null,
        comment_id: null,
        attachment_id: null,
        error_code: result.error.code,
        error_message: result.error.message
      };
    }
    if (result.operation === 'child-lane') {
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: false,
        issue_id: result.issue_id ?? requestedIssueId,
        issue_identifier: result.issue_identifier,
        source_setup: result.source_setup ?? sourceSetup,
        action: result.stream ? `${result.action}:${result.stream}` : result.action,
        via: result.child_lane ? `pipeline:${result.child_lane.pipeline_id}` : null,
        state: result.child_lane?.decision ?? result.child_run?.status ?? null,
        follow_up_issue_id: null,
        follow_up_issue_identifier: null,
        failed_relation_type: null,
        comment_id: null,
        attachment_id: null,
        error_code: result.error.code,
        error_message: result.error.message
      };
    }
    if (result.operation === 'screenshot-proof') {
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: false,
        issue_id: result.issue_id ?? requestedIssueId,
        issue_identifier: null,
        source_setup: result.source_setup ?? sourceSetup,
        action: result.capture?.mode ?? null,
        via: result.capture ? `cleanup:${result.capture.cleanup.status}` : null,
        state: null,
        follow_up_issue_id: null,
        follow_up_issue_identifier: null,
        failed_relation_type: null,
        comment_id: null,
        attachment_id: null,
        error_code: result.error.code,
        error_message: result.error.message
      };
    }
    return {
      recorded_at: recordedAt,
        operation: result.operation,
        ok: false,
        issue_id: requestedIssueId,
        issue_identifier: resolveFailureIssueIdentifier(result),
        source_setup: sourceSetup,
        action: followUpFailureAuditFields.action,
      via: followUpFailureAuditFields.via,
      state: followUpFailureAuditFields.state,
      ...followUpAuditFields,
      comment_id: null,
      attachment_id: null,
      ...resolveTransitionAuditFieldsFromFailure(result, resolveRequestedTransitionAuditFields(flags)),
      error_code: result.error.code,
      error_message: result.error.message
    };
  }

  switch (result.operation) {
    case 'issue-context':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: null,
        via: null,
        state: result.issue.state?.name ?? null,
        ...followUpAuditFields,
        comment_id: result.issue.workpad_comment?.id ?? null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'upsert-workpad':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: null,
        state: null,
        ...followUpAuditFields,
        comment_id: result.comment.id,
        attachment_id: null,
        ...(Array.isArray(result.embedded_assets) && result.embedded_assets.length > 0
          ? {
              asset_urls: result.embedded_assets.map((entry) => entry.asset_url)
            }
          : {}),
        error_code: null,
        error_message: null
      };
    case 'delete-workpad':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: null,
        state: null,
        ...followUpAuditFields,
        comment_id: result.comment_id,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'transition':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: null,
        state: result.issue.state?.name ?? result.target_state.name,
        ...followUpAuditFields,
        comment_id: null,
        attachment_id: null,
        ...resolveTransitionAuditFieldsFromSuccess(result),
        error_code: null,
        error_message: null
      };
    case 'attach-pr':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: result.via,
        state: null,
        ...followUpAuditFields,
        comment_id: null,
        attachment_id: result.attachment.id,
        error_code: null,
        error_message: null
      };
    case 'parallelization':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue_id,
        issue_identifier: result.issue_identifier,
        source_setup: result.source_setup,
        action: result.decision,
        via: result.summary,
        state: result.reason,
        decision_lineage: finalizeProviderLinearDecisionLineage(
          result.decision_lineage,
          result.decision,
          result.reason,
          recordedAt
        ),
        ...followUpAuditFields,
        comment_id: null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'create-follow-up':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: result.action,
        via: result.relations.blocked_by_source
          ? 'related+blocks'
          : result.relations.related
            ? 'related'
            : 'none',
        state: result.follow_up_issue.state?.name ?? null,
        ...followUpAuditFields,
        comment_id: null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'runtime-proof':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue_id,
        issue_identifier: null,
        source_setup: result.source_setup,
        action: result.proof?.kind ?? 'policy',
        via: `permit:${result.policy.permit_status}`,
        state: null,
        ...followUpAuditFields,
        comment_id: null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'screenshot-proof':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue_id,
        issue_identifier: null,
        source_setup: result.source_setup,
        action: result.capture.mode,
        via: `cleanup:${result.capture.cleanup.status}`,
        state: null,
        ...followUpAuditFields,
        comment_id: null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'child-stream':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: `stream:${result.stream}`,
        via: `pipeline:${result.pipeline_id}`,
        state: result.child_run.status,
        follow_up_issue_id: null,
        follow_up_issue_identifier: null,
        failed_relation_type: null,
        comment_id: null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
    case 'child-lane':
      return {
        recorded_at: recordedAt,
        operation: result.operation,
        ok: true,
        issue_id: result.issue.id,
        issue_identifier: result.issue.identifier,
        source_setup: result.source_setup,
        action: `${result.action}:${result.stream}`,
        via: `pipeline:${result.child_lane.pipeline_id}`,
        state: result.child_lane.decision,
        follow_up_issue_id: null,
        follow_up_issue_identifier: null,
        failed_relation_type: null,
        comment_id: null,
        attachment_id: null,
        error_code: null,
        error_message: null
      };
  }
}

function resolveTransitionAuditFieldsFromSuccess(
  result: Extract<LinearCliResult, { ok: true; operation: 'transition' }>
): Partial<ProviderLinearAuditEntry> {
  return {
    previous_state: result.previous_state?.name ?? null,
    previous_state_type: result.previous_state?.type ?? null,
    target_state: result.target_state.name,
    target_state_type: result.target_state.type ?? null,
    issue_updated_at: result.issue.updated_at ?? null,
    expected_state: result.transition_guard?.expected_state ?? null,
    expected_state_type: result.transition_guard?.expected_state_type ?? null,
    expected_updated_at: result.transition_guard?.expected_updated_at ?? null,
    force: result.transition_guard?.force ?? null,
    force_reason: result.transition_guard?.force_reason ?? null
  };
}

function resolveRequestedTransitionAuditFields(flags: ArgMap): Partial<ProviderLinearAuditEntry> {
  const hasForce = Object.prototype.hasOwnProperty.call(flags, 'force');
  return {
    expected_state: readStringFlag(flags, 'expected-state') ?? null,
    expected_state_type: readStringFlag(flags, 'expected-state-type') ?? null,
    expected_updated_at: readStringFlag(flags, 'expected-updated-at') ?? null,
    force: hasForce ? readBooleanFlag(flags, 'force') : null,
    force_reason: normalizeOptionalAuditString(readRawStringFlag(flags, 'force-reason'))
  };
}

function resolveTransitionAuditFieldsFromFailure(
  result: Extract<LinearCliResult, { ok: false }>,
  fallbackGuardFields: Partial<
    Pick<
      ProviderLinearAuditEntry,
      'expected_state' | 'expected_state_type' | 'expected_updated_at' | 'force' | 'force_reason'
    >
  > = {}
): Partial<ProviderLinearAuditEntry> {
  if (result.operation !== 'transition') {
    return {};
  }
  const details =
    result.error.details && typeof result.error.details === 'object'
      ? result.error.details as Record<string, unknown>
      : null;
  const issueId = details ? normalizeOptionalAuditString(details.issue_id) : null;
  const issueIdentifier = details ? normalizeOptionalAuditString(details.issue_identifier) : null;
  const expectedState = details
    ? normalizeOptionalAuditString(details.expected_state)
    : null;
  const expectedStateType = details
    ? normalizeOptionalAuditString(details.expected_state_type)
    : null;
  const expectedUpdatedAt = details
    ? normalizeOptionalAuditString(details.expected_updated_at)
    : null;
  const force = details && typeof details.force === 'boolean'
    ? details.force
    : (fallbackGuardFields.force ?? null);
  const forceReason = details
    ? normalizeOptionalAuditString(details.force_reason)
    : null;
  return {
    ...(issueId ? { issue_id: issueId } : {}),
    ...(issueIdentifier ? { issue_identifier: issueIdentifier } : {}),
    previous_state: details ? normalizeOptionalAuditString(details.previous_state) : null,
    previous_state_type: details ? normalizeOptionalAuditString(details.previous_state_type) : null,
    target_state: details ? normalizeOptionalAuditString(details.target_state) : null,
    target_state_type: details ? normalizeOptionalAuditString(details.target_state_type) : null,
    issue_updated_at: details ? normalizeOptionalAuditString(details.issue_updated_at) : null,
    expected_state: expectedState ?? fallbackGuardFields.expected_state ?? null,
    expected_state_type: expectedStateType ?? fallbackGuardFields.expected_state_type ?? null,
    expected_updated_at:
      expectedUpdatedAt ?? fallbackGuardFields.expected_updated_at ?? null,
    force,
    force_reason: forceReason ?? fallbackGuardFields.force_reason ?? null
  };
}

function normalizeOptionalAuditString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function finalizeProviderLinearDecisionLineage(
  lineage: ProviderLinearDecisionLineage | null,
  decision: ProviderLinearParallelizationDecision,
  reason: ProviderLinearParallelizationReason,
  recordedAt: string
): ProviderLinearDecisionLineage | null {
  if (!lineage) {
    return null;
  }
  const finalized: ProviderLinearDecisionLineage = {
    ...lineage,
    decision_recorded_at: recordedAt,
    decision,
    reason
  };
  return {
    ...finalized,
    decision_id: lineage.decision_id ?? buildProviderLinearDecisionLineageId(finalized)
  };
}

function buildProviderLinearDecisionLineageId(lineage: ProviderLinearDecisionLineage): string | null {
  if (!lineage.parent_run_id || !lineage.decision_recorded_at) {
    return null;
  }
  const turnKey =
    lineage.parent_turn_id ??
    lineage.parent_turn_started_at ??
    (lineage.parent_turn_count !== null ? `turn-${lineage.parent_turn_count}` : null);
  if (!turnKey) {
    return null;
  }
  return [
    'provider-linear-parallelization',
    sanitizeLineageIdPart(lineage.parent_run_id),
    sanitizeLineageIdPart(turnKey),
    sanitizeLineageIdPart(lineage.decision_recorded_at)
  ].join(':');
}

function sanitizeLineageIdPart(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9._-]+/gu, '_').replace(/^_+|_+$/gu, '') || 'unknown';
}

function resolveFollowUpAuditFields(
  result: LinearCliResult,
  flags: ArgMap,
  context: LinearCliAuditContext = {}
): Pick<
  ProviderLinearAuditEntry,
  'follow_up_issue_id' | 'follow_up_issue_identifier' | 'failed_relation_type'
> & Partial<Pick<ProviderLinearAuditEntry, 'follow_up_intent_key'>> {
  if (result.ok) {
    if (result.operation !== 'create-follow-up') {
      return {
        follow_up_issue_id: null,
        follow_up_issue_identifier: null,
        failed_relation_type: null
      };
    }
    return {
      follow_up_issue_id: result.follow_up_issue.id,
      follow_up_issue_identifier: result.follow_up_issue.identifier,
      ...resolveFollowUpIntentAuditField(result, flags, context),
      failed_relation_type: null
    };
  }
  if (result.operation !== 'create-follow-up') {
    return {
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null
    };
  }
  const details = result.error.details;
  const followUpIssue = readIssueLikeRecord(details?.follow_up_issue)
    ?? readIssueLikeRecord(details?.created_issue);
  return {
    follow_up_issue_id: readRecordString(followUpIssue, 'id'),
    follow_up_issue_identifier: readRecordString(followUpIssue, 'identifier'),
    ...resolveFollowUpIntentAuditField(result, flags, context),
    failed_relation_type: readUnknownString(details?.failed_relation_type)
  };
}

function resolveFollowUpFailureAuditFields(
  result: LinearCliResult
): Pick<ProviderLinearAuditEntry, 'action' | 'via' | 'state'> {
  if (result.ok || result.operation !== 'create-follow-up') {
    return {
      action: null,
      via: null,
      state: null
    };
  }
  const details = result.error.details;
  const action = readUnknownString(details?.action);
  const relations = readIssueLikeRecord(details?.relations);
  const queueAdmissionBlocker = readIssueLikeRecord(details?.queue_admission_blocker);
  return {
    action,
    via: formatFollowUpRelationsAuditVia(relations),
    state: readRecordString(queueAdmissionBlocker, 'state')
  };
}

function formatFollowUpRelationsAuditVia(relations: Record<string, unknown> | null): string | null {
  if (!relations) {
    return null;
  }
  const blockedBySource = relations.blocked_by_source === true;
  const related = relations.related === true;
  if (blockedBySource) {
    return 'related+blocks';
  }
  return related ? 'related' : 'none';
}

function resolveFailureIssueIdentifier(result: LinearCliResult): string | null {
  if (result.ok || result.operation !== 'create-follow-up') {
    return null;
  }
  const issue = readIssueLikeRecord(result.error.details?.issue);
  return readRecordString(issue, 'identifier');
}

function resolveFollowUpIntentAuditField(
  result: LinearCliResult,
  flags: ArgMap,
  context: LinearCliAuditContext = {}
): Partial<Pick<ProviderLinearAuditEntry, 'follow_up_intent_key'>> {
  if (result.operation !== 'create-follow-up') {
    return {};
  }
  const title = readStringFlag(flags, 'title');
  if (!title) {
    return {};
  }
  const canonicalOwnerKey = (
    result.ok
      ? result.canonical_owner?.key ?? null
      : readRecordString(readIssueLikeRecord(result.error.details?.canonical_owner), 'key')
  )
    ?? context.createFollowUpCanonicalOwnerKey
    ?? readStringFlag(flags, 'canonical-owner-key')
    ?? null;
  return {
    follow_up_intent_key: buildFollowUpIntentKey({
      title,
      canonicalOwnerKey,
      blockedBySource: readBooleanFlag(flags, 'blocked-by-source'),
      parityLane: readBooleanFlag(flags, 'parity-lane')
    })
  };
}

function readIssueLikeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readRecordString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) {
    return null;
  }
  return readUnknownString(record[key]);
}

function readUnknownString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalString(value: unknown): string | null {
  return readUnknownString(value);
}

function isFollowUpPacketTraceabilityPendingCode(errorCode: string | null | undefined): boolean {
  return normalizeOptionalString(errorCode) === 'linear_follow_up_packet_traceability_pending';
}

function readUnknownInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function readUnknownNonNegativeInteger(value: unknown): number | null {
  const normalized = readUnknownInteger(value);
  return normalized !== null && normalized >= 0 ? normalized : null;
}

function resolveAuditSourceSetup(flags: ArgMap, env: NodeJS.ProcessEnv): DispatchPilotSourceSetup | null {
  const sourceSetup = readSourceSetup(flags);
  if (sourceSetup) {
    return sourceSetup;
  }
  const resolved = resolveLinearSourceSetup(
    {
      provider: 'linear',
      workspace_id: null,
      team_id: null,
      project_id: null
    },
    env
  );
  return resolved.workspace_id || resolved.team_id || resolved.project_id ? resolved : null;
}

function resolveRuntimeProofRepoRoot(cwd: string, env: NodeJS.ProcessEnv): string {
  const configuredRoot = normalizeEnvPath(env.CODEX_ORCHESTRATOR_ROOT);
  if (!configuredRoot) {
    return resolveRepoRootFromHint(cwd);
  }
  const configuredHint = isAbsolute(configuredRoot) ? configuredRoot : resolve(cwd, configuredRoot);
  return resolveRepoRootFromHint(configuredHint);
}

function resolveRepoRootFromHint(rootHint: string): string {
  const normalizedHint = resolve(rootHint);
  const gitBoundary = findNearestGitBoundary(normalizedHint);
  let current: string | null = normalizedHint;
  while (current) {
    if (existsSync(join(current, 'tasks', 'index.json'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return gitBoundary ?? normalizedHint;
}

function findNearestGitBoundary(start: string): string | null {
  let current: string | null = resolve(start);
  while (current) {
    if (existsSync(join(current, '.git'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

function normalizeEnvPath(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
