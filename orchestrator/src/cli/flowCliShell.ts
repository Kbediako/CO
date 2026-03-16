/* eslint-disable patterns/prefer-logger-over-console */
// This shell preserves the existing CLI output contract, which is rendered via console writes in text/json mode.

import type { RunEventEmitter } from './events/runEvents.js';
import type { CodexOrchestrator } from './orchestrator.js';
import type { DoctorIssueLogResult } from './doctorIssueLog.js';
import type { PipelineExecutionResult } from './types.js';

type OutputFormat = 'json' | 'text';
type ExecutionModeOption = 'mcp' | 'cloud';
type RuntimeModeOption = 'cli' | 'appserver';

interface FlowTargetStageSelection {
  docsReviewTargetStageId?: string;
  implementationGateTargetStageId?: string;
}

interface FlowPlanItem {
  id: string;
  metadata?: Record<string, unknown>;
}

interface FlowPlanPreview {
  plan: {
    items: FlowPlanItem[];
  };
}

interface NormalizedFlowTargetToken {
  literalLower: string;
  stageTokenLower: string;
  scopeLower: string | null;
  scoped: boolean;
}

interface AutoIssueLogCaptureResult {
  issueLog: DoctorIssueLogResult | null;
  issueLogError: string | null;
}

export interface RunFlowCliShellParams {
  orchestrator: CodexOrchestrator;
  format: OutputFormat;
  executionMode?: ExecutionModeOption;
  runtimeMode?: RuntimeModeOption;
  autoIssueLogEnabled: boolean;
  taskId?: string;
  parentRunId?: string;
  approvalPolicy?: string;
  targetStageId?: string;
  runWithUi: (action: (runEvents: RunEventEmitter) => Promise<void>) => Promise<void>;
  emitRunOutput: (
    result: PipelineExecutionResult,
    format: OutputFormat,
    label: string,
    issueLogCapture?: AutoIssueLogCaptureResult
  ) => void;
  formatIssueLogSummary: (result: DoctorIssueLogResult) => string[];
  toRunOutputPayload: (result: PipelineExecutionResult) => unknown;
  maybeCaptureAutoIssueLog: (params: {
    enabled: boolean;
    issueTitle: string;
    issueNotes: string;
    taskFilter: string | null;
  }) => Promise<AutoIssueLogCaptureResult>;
  resolveTaskFilter: (preferredTaskId?: string, taskIdOverride?: string) => string | null;
  withAutoIssueLogContext: (error: unknown, capture: AutoIssueLogCaptureResult) => Error;
  maybeEmitRunAdoptionHint: (params: {
    format: OutputFormat;
    taskFilter: string | null | undefined;
  }) => Promise<void>;
}

const FLOW_TARGET_PIPELINE_SCOPES = new Set(['docs-review', 'implementation-gate']);

function isFlowTargetPipelineScope(scope: string): boolean {
  return FLOW_TARGET_PIPELINE_SCOPES.has(scope);
}

function normalizeFlowTargetToken(candidate: string): NormalizedFlowTargetToken | null {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }
  const tokens = trimmed.split(':');
  if (tokens.length > 1 && !(tokens[0] ?? '').trim()) {
    return null;
  }

  let scoped = false;
  let scopeToken: string | null = null;
  let suffixToken = trimmed;
  if (tokens.length > 1) {
    const candidateScope = (tokens[0] ?? '').trim().toLowerCase();
    if (isFlowTargetPipelineScope(candidateScope)) {
      scoped = true;
      scopeToken = candidateScope;
      suffixToken = (tokens[tokens.length - 1] ?? '').trim();
    }
  }

  if (!suffixToken) {
    return null;
  }
  return {
    literalLower: trimmed.toLowerCase(),
    stageTokenLower: suffixToken.toLowerCase(),
    scopeLower: scopeToken,
    scoped
  };
}

function flowPlanItemPipelineId(item: FlowPlanItem): string | null {
  const metadataPipelineId =
    item.metadata && typeof item.metadata['pipelineId'] === 'string'
      ? (item.metadata['pipelineId'] as string).trim().toLowerCase()
      : '';
  if (metadataPipelineId) {
    return metadataPipelineId;
  }
  const delimiterIndex = item.id.indexOf(':');
  if (delimiterIndex <= 0) {
    return null;
  }
  return item.id.slice(0, delimiterIndex).trim().toLowerCase() || null;
}

function flowPlanItemMatchesTarget(item: FlowPlanItem, candidate: string): boolean {
  const normalized = normalizeFlowTargetToken(candidate);
  if (!normalized) {
    return false;
  }
  if (item.id.toLowerCase() === normalized.literalLower) {
    return true;
  }

  if (normalized.scoped && normalized.scopeLower) {
    const itemPipelineId = flowPlanItemPipelineId(item);
    if (itemPipelineId && itemPipelineId !== normalized.scopeLower) {
      return false;
    }
  }

  const metadataStageId =
    item.metadata && typeof item.metadata['stageId'] === 'string'
      ? (item.metadata['stageId'] as string).toLowerCase()
      : null;

  const aliases = Array.isArray(item.metadata?.['aliases'])
    ? (item.metadata?.['aliases'] as unknown[])
    : [];
  const aliasTokens = aliases.filter((alias): alias is string => typeof alias === 'string').map((alias) => alias.toLowerCase());

  if (normalized.scoped) {
    if (
      metadataStageId
      && (metadataStageId === normalized.literalLower || metadataStageId === normalized.stageTokenLower)
    ) {
      return true;
    }
    return aliasTokens.some(
      (alias) => alias === normalized.literalLower || alias === normalized.stageTokenLower
    );
  }

  if (item.id.toLowerCase().endsWith(`:${normalized.stageTokenLower}`)) {
    return true;
  }

  if (
    metadataStageId
    && (
      metadataStageId === normalized.stageTokenLower
      || metadataStageId.endsWith(`:${normalized.stageTokenLower}`)
    )
  ) {
    return true;
  }

  return aliasTokens.some(
    (alias) => alias === normalized.stageTokenLower || alias.endsWith(`:${normalized.stageTokenLower}`)
  );
}

function planIncludesStageId(plan: FlowPlanPreview, stageId: string): boolean {
  if (!stageId.trim()) {
    return false;
  }
  return plan.plan.items.some((item) => flowPlanItemMatchesTarget(item, stageId));
}

function resolveFlowTargetScope(stageId: string): string | null {
  const delimiterIndex = stageId.indexOf(':');
  if (delimiterIndex <= 0) {
    return null;
  }
  const scope = stageId.slice(0, delimiterIndex).trim().toLowerCase();
  if (!isFlowTargetPipelineScope(scope)) {
    return null;
  }
  return scope;
}

export async function resolveFlowTargetStageSelection(
  orchestrator: CodexOrchestrator,
  taskId: string | undefined,
  requestedTargetStageId: string | undefined
): Promise<FlowTargetStageSelection> {
  if (!requestedTargetStageId) {
    return {};
  }

  const [docsPlan, implementationPlan] = (await Promise.all([
    orchestrator.plan({ pipelineId: 'docs-review', taskId }),
    orchestrator.plan({ pipelineId: 'implementation-gate', taskId })
  ])) as [FlowPlanPreview, FlowPlanPreview];

  const requestedScope = resolveFlowTargetScope(requestedTargetStageId);
  const docsScopeMatch = !requestedScope || requestedScope === 'docs-review';
  const implementationScopeMatch = !requestedScope || requestedScope === 'implementation-gate';

  const docsReviewTargetStageId = docsScopeMatch && planIncludesStageId(docsPlan, requestedTargetStageId)
    ? requestedTargetStageId
    : undefined;
  const implementationGateTargetStageId =
    implementationScopeMatch && planIncludesStageId(implementationPlan, requestedTargetStageId)
      ? requestedTargetStageId
      : undefined;

  if (!docsReviewTargetStageId && !implementationGateTargetStageId) {
    throw new Error(
      `Target stage "${requestedTargetStageId}" is not defined in docs-review or implementation-gate.`
    );
  }

  return { docsReviewTargetStageId, implementationGateTargetStageId };
}

export async function runFlowCliShell(params: RunFlowCliShellParams): Promise<void> {
  try {
    const { docsReviewTargetStageId, implementationGateTargetStageId } =
      await resolveFlowTargetStageSelection(params.orchestrator, params.taskId, params.targetStageId);

    await params.runWithUi(async (runEvents) => {
      const docsReviewResult = await params.orchestrator.start({
        pipelineId: 'docs-review',
        taskId: params.taskId,
        parentRunId: params.parentRunId,
        approvalPolicy: params.approvalPolicy,
        targetStageId: docsReviewTargetStageId,
        executionMode: params.executionMode,
        runtimeMode: params.runtimeMode,
        runEvents
      });
      const docsPayload = params.toRunOutputPayload(docsReviewResult);
      if (params.format === 'text') {
        params.emitRunOutput(docsReviewResult, params.format, 'Docs-review run');
      }

      if (docsReviewResult.manifest.status !== 'succeeded') {
        const issueLogCapture = await params.maybeCaptureAutoIssueLog({
          enabled: params.autoIssueLogEnabled,
          issueTitle: 'Auto issue log: flow docs-review failed',
          issueNotes: `Automatic failure capture for docs-review run ${docsReviewResult.manifest.run_id} (${docsReviewResult.manifest.status}).`,
          taskFilter: params.resolveTaskFilter(docsReviewResult.manifest.task_id ?? undefined, params.taskId)
        });
        process.exitCode = 1;
        if (params.format === 'json') {
          console.log(
            JSON.stringify(
              {
                status: docsReviewResult.manifest.status,
                failed_stage: 'docs-review',
                docs_review: docsPayload,
                implementation_gate: null,
                issue_log: issueLogCapture.issueLog,
                issue_log_error: issueLogCapture.issueLogError
              },
              null,
              2
            )
          );
        } else {
          console.log('Flow halted: docs-review failed.');
          if (issueLogCapture.issueLog) {
            for (const line of params.formatIssueLogSummary(issueLogCapture.issueLog)) {
              console.log(line);
            }
          }
          if (issueLogCapture.issueLogError) {
            console.log(`Auto issue log: failed (${issueLogCapture.issueLogError})`);
          }
        }
        return;
      }

      const implementationGateResult = await params.orchestrator.start({
        pipelineId: 'implementation-gate',
        taskId: params.taskId,
        parentRunId: docsReviewResult.manifest.run_id,
        approvalPolicy: params.approvalPolicy,
        targetStageId: implementationGateTargetStageId,
        executionMode: params.executionMode,
        runtimeMode: params.runtimeMode,
        runEvents
      });
      const implementationPayload = params.toRunOutputPayload(implementationGateResult);
      const issueLogCapture =
        implementationGateResult.manifest.status !== 'succeeded'
          ? await params.maybeCaptureAutoIssueLog({
              enabled: params.autoIssueLogEnabled,
              issueTitle: 'Auto issue log: flow implementation-gate failed',
              issueNotes: `Automatic failure capture for implementation-gate run ${implementationGateResult.manifest.run_id} (${implementationGateResult.manifest.status}).`,
              taskFilter: params.resolveTaskFilter(
                implementationGateResult.manifest.task_id ?? undefined,
                params.taskId
              )
            })
          : { issueLog: null, issueLogError: null };

      if (params.format === 'json') {
        console.log(
          JSON.stringify(
            {
              status: implementationGateResult.manifest.status,
              failed_stage: implementationGateResult.manifest.status === 'succeeded' ? null : 'implementation-gate',
              docs_review: docsPayload,
              implementation_gate: implementationPayload,
              issue_log: issueLogCapture.issueLog,
              issue_log_error: issueLogCapture.issueLogError
            },
            null,
            2
          )
        );
        if (implementationGateResult.manifest.status !== 'succeeded') {
          process.exitCode = 1;
        }
        return;
      }

      params.emitRunOutput(implementationGateResult, params.format, 'Implementation-gate run');
      if (implementationGateResult.manifest.status !== 'succeeded') {
        process.exitCode = 1;
        console.log('Flow halted: implementation-gate failed.');
        if (issueLogCapture.issueLog) {
          for (const line of params.formatIssueLogSummary(issueLogCapture.issueLog)) {
            console.log(line);
          }
        }
        if (issueLogCapture.issueLogError) {
          console.log(`Auto issue log: failed (${issueLogCapture.issueLogError})`);
        }
        return;
      }

      console.log('Flow complete: docs-review -> implementation-gate.');
      await params.maybeEmitRunAdoptionHint({
        format: params.format,
        taskFilter: params.resolveTaskFilter(implementationGateResult.manifest.task_id ?? undefined, params.taskId)
      });
    });
  } catch (error) {
    const issueLogCapture = await params.maybeCaptureAutoIssueLog({
      enabled: params.autoIssueLogEnabled,
      issueTitle: 'Auto issue log: flow failed before run manifest',
      issueNotes: 'Automatic failure capture for flow setup failure before run manifest creation.',
      taskFilter: params.resolveTaskFilter(undefined, params.taskId)
    });
    throw params.withAutoIssueLogContext(error, issueLogCapture);
  }
}
