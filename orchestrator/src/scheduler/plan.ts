import type { RunRequestV2 } from '../../../packages/control-plane-schemas/src/index.js';
import type {
  SchedulerAssignment,
  SchedulerAssignmentAttempt,
  SchedulerAssignmentStatus,
  SchedulerManifest,
  SchedulerManifestAssignment,
  SchedulerManifestAttempt,
  SchedulerPlan,
  SchedulerRunSummary,
  SchedulerRunSummaryAssignment
} from './types.js';

export interface SchedulerPlanOptions {
  now?: () => Date;
  instancePrefix?: string;
}

export function createSchedulerPlan(
  request: RunRequestV2,
  options: SchedulerPlanOptions = {}
): SchedulerPlan {
  const now = options.now ?? (() => new Date());
  const requestedAt = now().toISOString();
  const prefix = options.instancePrefix ?? request.task.id.toLowerCase();
  const groupSize = extractTfgrpoGroupSize(request);

  const recovery = {
    heartbeatIntervalSeconds: request.schedule.recovery.heartbeatIntervalSeconds,
    missingHeartbeatTimeoutSeconds: request.schedule.recovery.missingHeartbeatTimeoutSeconds,
    maxRetries: request.schedule.recovery.maxRetries
  };

  const slots = buildCapabilitySlots(request);
  const { minInstances, maxInstances } = request.schedule;

  if (minInstances > maxInstances) {
    throw new Error(
      `Scheduler minInstances (${minInstances}) cannot exceed maxInstances (${maxInstances}).`
    );
  }

  if (minInstances > slots.length) {
    const capacity = slots.length;
    const slotLabel = capacity === 1 ? 'slot' : 'slots';
    throw new Error(
      `Scheduler requires at least ${minInstances} instances but only ${capacity} fan-out ${slotLabel} ` +
        'are available. Adjust the schedule fanOut or lower minInstances.'
    );
  }

  const targetCount = Math.max(minInstances, Math.min(maxInstances, slots.length));

  const assignments: SchedulerAssignment[] = [];
  const capabilityCounters = new Map<string, number>();

  for (let i = 0; i < targetCount; i += 1) {
    const slot = slots[i]!;
    const counter = (capabilityCounters.get(slot.capability) ?? 0) + 1;
    capabilityCounters.set(slot.capability, counter);

    const instanceId = `${prefix}-${slot.capability}-${String(counter).padStart(2, '0')}`;
    const attempt: SchedulerAssignmentAttempt = {
      number: 1,
      assignedAt: requestedAt,
      startedAt: null,
      completedAt: null,
      status: 'pending',
      recoveryCheckpoints: []
    };
    const groupIndex = groupSize && groupSize > 0 ? ((i % groupSize) + 1) : null;
    assignments.push({
      instanceId,
      capability: slot.capability,
      status: 'assigned',
      assignedAt: requestedAt,
      completedAt: null,
      attempts: [attempt],
      metadata: {
        weight: slot.weight,
        maxConcurrency: slot.maxConcurrency,
        ...(groupIndex ? { groupIndex } : {})
      }
    });
  }

  return {
    mode: 'multi-instance',
    requestedAt,
    minInstances: request.schedule.minInstances,
    maxInstances: request.schedule.maxInstances,
    recovery,
    assignments
  };
}

export function finalizeSchedulerPlan(
  plan: SchedulerPlan,
  finalStatus: SchedulerAssignmentStatus,
  timestamp: string
): void {
  const attemptStatus: SchedulerAssignmentAttempt['status'] =
    finalStatus === 'succeeded' ? 'completed' : finalStatus === 'running' ? 'running' : 'failed';
  const isTerminal = finalStatus !== 'running';

  for (const assignment of plan.assignments) {
    assignment.status = finalStatus;
    if (isTerminal) {
      assignment.completedAt = timestamp;
    }
    const latest = assignment.attempts[assignment.attempts.length - 1];
    if (latest) {
      if (!latest.startedAt) {
        latest.startedAt = timestamp;
      }
      if (isTerminal) {
        latest.completedAt = timestamp;
      }
      latest.status = attemptStatus;
      if (attemptStatus === 'failed') {
        latest.recoveryCheckpoints.push({
          timestamp,
          reason: 'missed-heartbeat',
          action: 'requeue',
          detail: 'Finalizer detected incomplete execution; queued for recovery.'
        });
      }
    }
  }
}

export function serializeSchedulerPlan(plan: SchedulerPlan): SchedulerManifest {
  return {
    mode: plan.mode,
    requested_at: plan.requestedAt,
    min_instances: plan.minInstances,
    max_instances: plan.maxInstances,
    recovery: {
      heartbeat_interval_seconds: plan.recovery.heartbeatIntervalSeconds,
      missing_heartbeat_timeout_seconds: plan.recovery.missingHeartbeatTimeoutSeconds,
      max_retries: plan.recovery.maxRetries
    },
    assignments: plan.assignments.map(serializeAssignment)
  };
}

export function buildSchedulerRunSummary(plan: SchedulerPlan): SchedulerRunSummary {
  const assignments: SchedulerRunSummaryAssignment[] = plan.assignments.map((assignment) => ({
    instanceId: assignment.instanceId,
    capability: assignment.capability,
    status: assignment.status,
    attempts: assignment.attempts.length,
    lastCompletedAt: assignment.completedAt
  }));

  return {
    mode: plan.mode,
    recovery: plan.recovery,
    assignments
  };
}

interface CapabilitySlot {
  capability: string;
  weight: number;
  maxConcurrency: number;
}

function buildCapabilitySlots(request: RunRequestV2): CapabilitySlot[] {
  const slots: CapabilitySlot[] = [];
  for (const entry of request.schedule.fanOut) {
    const maxConcurrency = Math.max(1, entry.maxConcurrency ?? 1);
    for (let index = 0; index < maxConcurrency; index += 1) {
      slots.push({
        capability: entry.capability,
        weight: entry.weight,
        maxConcurrency
      });
    }
  }

  if (slots.length === 0) {
    slots.push({ capability: 'general', weight: 1, maxConcurrency: 1 });
  }

  slots.sort((a, b) => b.weight - a.weight);
  return slots;
}

function serializeAssignment(assignment: SchedulerAssignment): SchedulerManifestAssignment {
  return {
    instance_id: assignment.instanceId,
    capability: assignment.capability,
    status: assignment.status,
    assigned_at: assignment.assignedAt,
    completed_at: assignment.completedAt,
    metadata: assignment.metadata,
    attempts: assignment.attempts.map(serializeAttempt)
  };
}

function serializeAttempt(attempt: SchedulerAssignmentAttempt): SchedulerManifestAttempt {
  return {
    number: attempt.number,
    assigned_at: attempt.assignedAt,
    started_at: attempt.startedAt ?? null,
    completed_at: attempt.completedAt ?? null,
    status: attempt.status,
    recovery_checkpoints: attempt.recoveryCheckpoints
  };
}

function extractTfgrpoGroupSize(request: RunRequestV2): number | null {
  const metadata = request.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const tfgrpo = (metadata as Record<string, unknown>).tfgrpo;
  if (!tfgrpo || typeof tfgrpo !== 'object') {
    return null;
  }
  const value = (tfgrpo as Record<string, unknown>).groupSize;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.trunc(value);
}
