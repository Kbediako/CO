export type SchedulerMode = 'multi-instance';

export type SchedulerAssignmentStatus =
  | 'assigned'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'recovered';

export type SchedulerAttemptStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'requeued';

export interface SchedulerRecoveryConfig {
  heartbeatIntervalSeconds: number;
  missingHeartbeatTimeoutSeconds: number;
  maxRetries: number;
}

export interface SchedulerRecoveryCheckpoint {
  timestamp: string;
  reason: 'missed-heartbeat' | 'manual' | 'auto';
  action: 'requeue' | 'escalate' | 'ack';
  detail?: string;
}

export interface SchedulerAssignmentAttempt {
  number: number;
  assignedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  status: SchedulerAttemptStatus;
  recoveryCheckpoints: SchedulerRecoveryCheckpoint[];
}

export interface SchedulerAssignmentMetadata {
  weight: number;
  maxConcurrency: number;
  groupIndex?: number | null;
}

export interface SchedulerAssignment {
  instanceId: string;
  capability: string;
  status: SchedulerAssignmentStatus;
  assignedAt: string;
  completedAt: string | null;
  attempts: SchedulerAssignmentAttempt[];
  metadata: SchedulerAssignmentMetadata;
}

export interface SchedulerPlan {
  mode: SchedulerMode;
  requestedAt: string;
  minInstances: number;
  maxInstances: number;
  recovery: SchedulerRecoveryConfig;
  assignments: SchedulerAssignment[];
}

export interface SchedulerManifestAttempt {
  number: number;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: SchedulerAttemptStatus;
  recovery_checkpoints: SchedulerRecoveryCheckpoint[];
}

export interface SchedulerManifestAssignment {
  instance_id: string;
  capability: string;
  status: SchedulerAssignmentStatus;
  assigned_at: string;
  completed_at: string | null;
  metadata: SchedulerAssignmentMetadata;
  attempts: SchedulerManifestAttempt[];
}

export interface SchedulerManifest {
  mode: SchedulerMode;
  requested_at: string;
  min_instances: number;
  max_instances: number;
  recovery: {
    heartbeat_interval_seconds: number;
    missing_heartbeat_timeout_seconds: number;
    max_retries: number;
  };
  assignments: SchedulerManifestAssignment[];
}

export interface SchedulerRunSummaryAssignment {
  instanceId: string;
  capability: string;
  status: SchedulerAssignmentStatus;
  attempts: number;
  lastCompletedAt: string | null;
}

export interface SchedulerRunSummary {
  mode: SchedulerMode;
  recovery: SchedulerRecoveryConfig;
  assignments: SchedulerRunSummaryAssignment[];
}
