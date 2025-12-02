import type { ExecRunContext } from './context.js';
import type { RunSummaryEvent, RunSummaryEventPayload } from '../../../../packages/shared/events/types.js';

export async function deliverNotifications(
  context: ExecRunContext,
  summaryPayload: RunSummaryEventPayload,
  summaryEvent: RunSummaryEvent
): Promise<void> {
  const notificationOutcome = await context.notificationSink.notify(summaryEvent);
  if (summaryPayload.notifications) {
    summaryPayload.notifications.delivered = notificationOutcome.delivered;
    summaryPayload.notifications.failures = notificationOutcome.failures;
  }
}

export function recordSummaryTelemetry(context: ExecRunContext, summaryEvent: RunSummaryEvent): void {
  context.telemetryTasks.push(
    Promise.resolve(context.telemetrySink.recordSummary(summaryEvent)).then(() => undefined)
  );
}

export async function flushTelemetry(context: ExecRunContext): Promise<void> {
  await Promise.allSettled(context.telemetryTasks);
  await context.telemetrySink.flush();
}

export async function shutdownSinks(context: ExecRunContext): Promise<void> {
  await context.telemetrySink.shutdown();
  await context.notificationSink.shutdown();
}
