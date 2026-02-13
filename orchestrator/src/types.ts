export type ExecutionMode = 'mcp' | 'cloud';

export interface TaskMetadata {
  execution?: {
    parallel?: boolean;
  };
  [key: string]: unknown;
}

export interface TaskContext {
  id: string;
  title: string;
  description?: string;
  metadata?: TaskMetadata;
}

export interface PlanItem {
  id: string;
  description: string;
  requires_cloud?: boolean;
  /**
   * Backwards-compatible alias for legacy planner outputs. Prefer `requires_cloud`.
   */
  requiresCloud?: boolean;
  runnable?: boolean;
  selected?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PlanResult {
  items: PlanItem[];
  notes?: string;
  targetId?: string | null;
}

export interface BuilderInput {
  task: TaskContext;
  plan: PlanResult;
  target: PlanItem;
  mode: ExecutionMode;
  runId: string;
}

export interface BuildArtifact {
  path: string;
  description: string;
}

export interface BuildResult {
  subtaskId: string;
  artifacts: BuildArtifact[];
  mode: ExecutionMode;
  runId: string;
  success: boolean;
  notes?: string;
  cloudExecution?: CloudExecutionSummary | null;
}

export interface TestInput {
  task: TaskContext;
  build: BuildResult;
  mode: ExecutionMode;
  runId: string;
}

export interface TestReport {
  name: string;
  status: 'passed' | 'failed';
  details?: string;
}

export interface TestResult {
  subtaskId: string;
  success: boolean;
  reports: TestReport[];
  runId: string;
}

export interface ReviewInput {
  task: TaskContext;
  plan: PlanResult;
  build: BuildResult;
  test: TestResult;
  mode: ExecutionMode;
  runId: string;
}

export interface ReviewDecision {
  approved: boolean;
  feedback?: string;
}

export interface ReviewResult {
  summary: string;
  decision: ReviewDecision;
}

import type { ControlPlaneRunSummary } from './control-plane/types.js';
import type { SchedulerRunSummary } from './scheduler/types.js';
import type {
  DesignArtifactRecord,
  DesignArtifactsSummary,
  ToolRunRecord
} from '../../packages/shared/manifest/types.js';

export interface RunSummary {
  taskId: string;
  runId: string;
  mode: ExecutionMode;
  plan: PlanResult;
  build: BuildResult;
  test: TestResult;
  review: ReviewResult;
  cloudExecution?: CloudExecutionSummary | null;
  builds?: BuildResult[];
  tests?: TestResult[];
  reviews?: ReviewResult[];
  timestamp: string;
  toolRuns?: ToolRunRecord[];
  controlPlane?: ControlPlaneRunSummary;
  scheduler?: SchedulerRunSummary;
  handles?: RunHandleSummary[];
  privacy?: PrivacyRunSummary;
  designArtifacts?: DesignArtifactRecord[];
  designArtifactsSummary?: DesignArtifactsSummary;
  designConfigSnapshot?: Record<string, unknown> | null;
  group?: RunGroupSummary;
}

export interface CloudExecutionSummary {
  taskId: string | null;
  environmentId: string | null;
  status: 'queued' | 'running' | 'ready' | 'error' | 'failed' | 'cancelled' | 'unknown';
  statusUrl: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  lastPolledAt: string | null;
  pollCount: number;
  pollIntervalSeconds: number;
  timeoutSeconds: number;
  attempts: number;
  diffPath: string | null;
  diffUrl: string | null;
  diffStatus: 'pending' | 'available' | 'unavailable';
  applyStatus: 'not_requested' | 'succeeded' | 'failed';
  logPath: string | null;
  error: string | null;
}

export interface RunHandleSummary {
  handleId: string;
  correlationId: string;
  stageId: string | null;
  status: 'open' | 'closed';
  frameCount: number;
  latestSequence: number;
}

export interface PrivacyRunSummary {
  mode: 'shadow' | 'enforce';
  totalFrames: number;
  redactedFrames: number;
  blockedFrames: number;
  allowedFrames: number;
}

export interface RunGroupSummary {
  enabled: boolean;
  size: number;
  processed: number;
  entries: RunGroupEntry[];
}

export interface RunGroupEntry {
  index: number;
  subtaskId: string;
  mode: ExecutionMode;
  buildSuccess: boolean;
  testSuccess: boolean;
  reviewApproved: boolean;
  status: 'succeeded' | 'failed';
}

export interface PlannerAgent {
  plan(context: TaskContext): Promise<PlanResult>;
}

export interface BuilderAgent {
  build(input: BuilderInput): Promise<BuildResult>;
}

export interface TesterAgent {
  test(input: TestInput): Promise<TestResult>;
}

export interface ReviewerAgent {
  review(input: ReviewInput): Promise<ReviewResult>;
}

export type OrchestratorEventName =
  | 'plan:completed'
  | 'build:completed'
  | 'test:completed'
  | 'review:completed'
  | 'run:completed';

export interface PlanCompletedEvent {
  type: 'plan:completed';
  payload: {
    task: TaskContext;
    runId: string;
    plan: PlanResult;
  };
}

export interface BuildCompletedEvent {
  type: 'build:completed';
  payload: {
    task: TaskContext;
    build: BuildResult;
    plan: PlanResult;
    runId: string;
  };
}

export interface TestCompletedEvent {
  type: 'test:completed';
  payload: {
    task: TaskContext;
    test: TestResult;
    build: BuildResult;
    runId: string;
  };
}

export interface ReviewCompletedEvent {
  type: 'review:completed';
  payload: {
    task: TaskContext;
    review: ReviewResult;
    runId: string;
  };
}

export interface RunCompletedEvent {
  type: 'run:completed';
  payload: RunSummary;
}

export type OrchestratorEvent =
  | PlanCompletedEvent
  | BuildCompletedEvent
  | TestCompletedEvent
  | ReviewCompletedEvent
  | RunCompletedEvent;
