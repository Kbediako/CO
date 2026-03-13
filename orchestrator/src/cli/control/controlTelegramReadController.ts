import { createHash } from 'node:crypto';

import type { ControlOversightReadContract } from './controlOversightReadContract.js';
import type {
  ControlDispatchPilotPayload,
  ControlQuestionSummaryPayload,
  ControlSelectedRunRuntimeSnapshot,
} from './observabilityReadModel.js';
import {
  buildSelectedRunQuestionSummaryPayload,
  buildSelectedRunRuntimeFingerprintInput
} from './observabilityReadModel.js';

export interface TelegramProjectionDeltaPresentation {
  projectionHash: string | null;
  text: string;
}

export interface ControlTelegramReadController {
  dispatchReadCommand(command: string): Promise<string | null>;
  renderProjectionDeltaMessage(): Promise<TelegramProjectionDeltaPresentation>;
}

export function createControlTelegramReadController(input: {
  readAdapter: ControlOversightReadContract;
  mutationsEnabled: boolean;
}): ControlTelegramReadController {
  return {
    async dispatchReadCommand(command: string): Promise<string | null> {
      switch (command) {
        case '/start':
          return 'CO oversight is connected. Use /help for commands.';
        case '/help':
          return buildHelpMessage(input.mutationsEnabled);
        case '/status':
          return renderStatus(input.readAdapter);
        case '/issue':
          return renderIssue(input.readAdapter);
        case '/dispatch':
          return renderDispatch(input.readAdapter);
        case '/questions':
          return renderQuestions(input.readAdapter);
        default:
          return null;
      }
    },

    async renderProjectionDeltaMessage(): Promise<TelegramProjectionDeltaPresentation> {
      const snapshot = await input.readAdapter.readSelectedRun();
      return {
        projectionHash: buildProjectionHash(snapshot),
        text: buildStatusMessage(snapshot)
      };
    }
  };
}

async function renderStatus(readAdapter: ControlOversightReadContract): Promise<string> {
  return buildStatusMessage(await readAdapter.readSelectedRun());
}

async function renderIssue(readAdapter: ControlOversightReadContract): Promise<string> {
  const snapshot = await readAdapter.readSelectedRun();
  const selected = snapshot.selected ?? null;
  if (!selected?.issueIdentifier) {
    return 'No issue identifier is available for the current run.';
  }
  const trackedLinear = selected.tracked?.linear ?? snapshot.tracked?.linear ?? null;
  const latestEvent = selected.latestEvent ?? null;
  const displayStatus = selected.displayStatus ?? 'unknown';
  const questionSummary = buildSelectedRunQuestionSummaryPayload(selected.questionSummary);

  return [
    `Issue ${selected.issueIdentifier}`,
    formatStateLine(displayStatus, selected.rawStatus ?? null, 'Status'),
    selected.statusReason ? `Reason: ${selected.statusReason}` : null,
    trackedLinear?.identifier
      ? `Linear: ${trackedLinear.identifier}${trackedLinear.title ? ` - ${truncateLine(trackedLinear.title, 120)}` : ''}`
      : null,
    trackedLinear?.state ? `Linear state: ${trackedLinear.state}` : null,
    trackedLinear?.url ? `Linear URL: ${trackedLinear.url}` : null,
    latestEvent?.event ? `Latest event: ${latestEvent.event}` : null,
    latestEvent?.message
      ? `Latest summary: ${truncateLine(latestEvent.message, 180)}`
      : selected.summary
        ? `Latest summary: ${truncateLine(selected.summary, 180)}`
        : null,
    formatQuestionSummary(questionSummary),
    formatDispatchSummary(snapshot.dispatchPilot ?? null)
  ]
    .filter(Boolean)
    .join('\n');
}

async function renderDispatch(readAdapter: ControlOversightReadContract): Promise<string> {
  const payload = await readAdapter.readDispatch();
  const dispatchPilot = payload.dispatch_pilot ?? payload.error?.details?.dispatch_pilot ?? null;
  const trackedIssue = payload.recommendation?.tracked_issue ?? null;

  return [
    'Dispatch advisory',
    formatDispatchSummary(dispatchPilot),
    payload.recommendation?.summary ? `Summary: ${truncateLine(payload.recommendation.summary, 180)}` : null,
    payload.recommendation?.rationale ? `Rationale: ${truncateLine(payload.recommendation.rationale, 180)}` : null,
    payload.recommendation?.confidence !== undefined && payload.recommendation?.confidence !== null
      ? `Confidence: ${payload.recommendation.confidence}`
      : null,
    trackedIssue?.identifier
      ? `Tracked issue: ${trackedIssue.identifier}${trackedIssue.title ? ` - ${truncateLine(trackedIssue.title, 120)}` : ''}`
      : null,
    trackedIssue?.url ? `Tracked URL: ${trackedIssue.url}` : null,
    payload.error?.code ? `Status: ${payload.error.code}` : null
  ]
    .filter(Boolean)
    .join('\n');
}

async function renderQuestions(readAdapter: ControlOversightReadContract): Promise<string> {
  const payload = await readAdapter.readQuestions();
  const queued = (payload.questions ?? []).filter((question) => question.status === 'queued');
  if (queued.length === 0) {
    return 'No queued questions.';
  }
  return [
    `Queued questions: ${queued.length}`,
    ...queued.slice(0, 3).map((question) => {
      const urgency = question.urgency ? ` [${question.urgency}]` : '';
      return `${question.question_id ?? 'question'}${urgency}: ${truncateLine(question.prompt ?? '', 140)}`;
    })
  ].join('\n');
}

function buildStatusMessage(snapshot: ControlSelectedRunRuntimeSnapshot): string {
  const selected = snapshot.selected ?? null;
  const dispatch = snapshot.dispatchPilot ?? null;
  const trackedLinear = selected?.tracked?.linear ?? snapshot.tracked?.linear ?? null;
  if (!selected) {
    return [
      'CO status',
      'No active running projection.',
      trackedLinear?.identifier
        ? `Linear: ${trackedLinear.identifier}${trackedLinear.title ? ` - ${truncateLine(trackedLinear.title, 120)}` : ''}`
        : null,
      trackedLinear?.state ? `Linear state: ${trackedLinear.state}` : null,
      formatDispatchSummary(dispatch)
    ]
      .filter(Boolean)
      .join('\n');
  }

  const issueIdentifier = selected.issueIdentifier ?? 'n/a';
  const sessionId = selected.runId ?? null;
  const displayStatus = selected.displayStatus ?? 'unknown';
  const rawStatus = selected.rawStatus ?? null;
  const statusReason = selected.statusReason ?? null;
  const latestEvent = selected.latestEvent ?? null;
  const questionSummary = buildSelectedRunQuestionSummaryPayload(selected.questionSummary);
  const summary = latestEvent?.message ?? selected.summary ?? null;

  return [
    'CO status',
    `Issue: ${issueIdentifier}`,
    formatStateLine(displayStatus, rawStatus),
    statusReason ? `Reason: ${statusReason}` : null,
    sessionId ? `Session: ${sessionId}` : null,
    latestEvent?.event ? `Last event: ${latestEvent.event}` : null,
    summary ? `Summary: ${truncateLine(summary, 180)}` : null,
    formatQuestionSummary(questionSummary),
    trackedLinear?.identifier
      ? `Linear: ${trackedLinear.identifier}${trackedLinear.title ? ` - ${truncateLine(trackedLinear.title, 120)}` : ''}`
      : null,
    trackedLinear?.state ? `Linear state: ${trackedLinear.state}` : null,
    formatDispatchSummary(dispatch)
  ]
    .filter(Boolean)
    .join('\n');
}

function buildHelpMessage(mutationsEnabled: boolean): string {
  return [
    'Commands:',
    '/start',
    '/help',
    '/status',
    '/issue',
    '/dispatch',
    '/questions',
    mutationsEnabled ? '/pause' : '/pause (disabled)',
    mutationsEnabled ? '/resume' : '/resume (disabled)'
  ].join('\n');
}

function formatDispatchSummary(
  dispatchPilot: ControlDispatchPilotPayload | null | undefined
): string | null {
  if (!dispatchPilot) {
    return null;
  }
  const status = dispatchPilot.status ?? 'unknown';
  const sourceStatus = dispatchPilot.source_status ?? 'unknown';
  const reason = dispatchPilot.reason ? ` (${dispatchPilot.reason})` : '';
  return `Dispatch: ${status}/${sourceStatus}${reason}`;
}

function formatStateLine(
  displayStatus: string | null | undefined,
  rawStatus: string | null | undefined,
  label = 'State'
): string {
  const normalizedDisplay = displayStatus && displayStatus.trim().length > 0 ? displayStatus.trim() : 'unknown';
  const normalizedRaw = rawStatus && rawStatus.trim().length > 0 ? rawStatus.trim() : null;
  if (!normalizedRaw || normalizedRaw === normalizedDisplay) {
    return `${label}: ${normalizedDisplay}`;
  }
  return `${label}: ${normalizedDisplay} (raw ${normalizedRaw})`;
}

function formatQuestionSummary(summary: ControlQuestionSummaryPayload | null | undefined): string | null {
  if (!summary || typeof summary.queued_count !== 'number' || summary.queued_count <= 0) {
    return null;
  }
  const latestQuestion = summary.latest_question ?? null;
  const latestPrompt =
    latestQuestion?.prompt && latestQuestion.prompt.trim().length > 0
      ? truncateLine(latestQuestion.prompt, 120)
      : null;
  const urgency =
    latestQuestion?.urgency && latestQuestion.urgency.trim().length > 0 ? ` [${latestQuestion.urgency}]` : '';
  if (latestQuestion?.question_id) {
    return `Queued questions: ${summary.queued_count} (latest ${latestQuestion.question_id}${urgency}${latestPrompt ? `: ${latestPrompt}` : ''})`;
  }
  return `Queued questions: ${summary.queued_count}`;
}

function truncateLine(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(maxLength - 3, 1))}...`;
}

function buildProjectionHash(snapshot: ControlSelectedRunRuntimeSnapshot): string | null {
  const fingerprint = buildSelectedRunRuntimeFingerprintInput(snapshot);
  if (!fingerprint) {
    return null;
  }
  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
}
