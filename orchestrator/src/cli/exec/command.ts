import { serializeRunSummaryEvent } from '../../../../packages/shared/events/serializer.js';
import { appendMetricsEntry } from '../metrics/metricsRecorder.js';
import { resolveTfgrpoContext } from './tfgrpo.js';
import {
  bootstrapExecContext,
  type ExecCommandContext,
  type ExecCommandInvocation
} from './context.js';
import { runExecStage } from './stageRunner.js';
import { finalizeCommandLifecycle } from './finalization.js';
import { handleTfgrpoArtifacts } from './tfgrpoArtifacts.js';
import {
  buildExecRunSummary,
  createRunSummaryPayload,
  emitCommandError,
  persistRunOutputs,
  renderRunOutput
} from './summary.js';
import type { ExecRunSummary } from './summary.js';
import { deliverNotifications, flushTelemetry, recordSummaryTelemetry, shutdownSinks } from './telemetry.js';
import { maybeTriggerLearning } from './learning.js';

export type { ExecOutputMode, ExecCommandInvocation, ExecCommandContext } from './context.js';
export type { ExecRunSummary } from './summary.js';

export async function executeExecCommand(
  context: ExecCommandContext,
  invocation: ExecCommandInvocation
): Promise<ExecRunSummary> {
  if (!invocation.command) {
    throw new Error('exec command requires a command to run.');
  }

  const runContext = await bootstrapExecContext(context, invocation);
  const stageResult = await runExecStage(runContext);
  const finalization = await finalizeCommandLifecycle(runContext, stageResult);

  const tfgrpoContext = resolveTfgrpoContext();
  const runMetricSummary = await handleTfgrpoArtifacts(runContext, finalization, tfgrpoContext);

  const summaryPayload = createRunSummaryPayload({
    env: runContext.env,
    paths: runContext.paths,
    manifest: runContext.manifest,
    runStatus: finalization.runStatus,
    shellCommand: runContext.shellCommand,
    argv: runContext.argv,
    resultSummary: finalization.summarySnapshot,
    toolRecord: finalization.toolRecord,
    execEvents: runContext.execEvents,
    exitCode: finalization.exitCode,
    signal: finalization.signal,
    notificationTargets: runContext.notificationSink.targets,
    cwd: runContext.stage.cwd ?? null,
    metrics: runMetricSummary
  });
  const summaryEvent = serializeRunSummaryEvent(summaryPayload);

  await deliverNotifications(runContext, summaryPayload, summaryEvent);
  recordSummaryTelemetry(runContext, summaryEvent);
  renderRunOutput(runContext, summaryPayload, summaryEvent);

  await flushTelemetry(runContext);
  await persistRunOutputs(runContext, summaryEvent);
  await appendMetricsEntry(runContext.env, runContext.paths, runContext.manifest, runContext.persister);
  await maybeTriggerLearning(runContext, finalization.runStatus);
  await runContext.persister.flush();

  await shutdownSinks(runContext);
  emitCommandError(runContext, finalization.commandError);

  return buildExecRunSummary({
    manifest: runContext.manifest,
    summaryPayload,
    summaryEvent,
    shellCommand: runContext.shellCommand,
    argv: runContext.argv,
    events: runContext.execEvents,
    toolRecord: finalization.toolRecord
  });
}
