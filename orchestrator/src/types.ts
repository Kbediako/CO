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
}

export interface PlanResult {
  items: PlanItem[];
  notes?: string;
}

export interface BuilderInput {
  task: TaskContext;
  plan: PlanResult;
  target: PlanItem;
  mode: ExecutionMode;
}

export interface BuildArtifact {
  path: string;
  description: string;
}

export interface BuildResult {
  subtaskId: string;
  artifacts: BuildArtifact[];
  mode: ExecutionMode;
  notes?: string;
}

export interface TestInput {
  task: TaskContext;
  build: BuildResult;
  mode: ExecutionMode;
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
}

export interface ReviewInput {
  task: TaskContext;
  plan: PlanResult;
  build: BuildResult;
  test: TestResult;
  mode: ExecutionMode;
}

export interface ReviewDecision {
  approved: boolean;
  feedback?: string;
}

export interface ReviewResult {
  summary: string;
  decision: ReviewDecision;
}

export interface RunSummary {
  taskId: string;
  runId: string;
  mode: ExecutionMode;
  plan: PlanResult;
  build: BuildResult;
  test: TestResult;
  review: ReviewResult;
  timestamp: string;
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
    plan: PlanResult;
  };
}

export interface BuildCompletedEvent {
  type: 'build:completed';
  payload: {
    task: TaskContext;
    build: BuildResult;
    plan: PlanResult;
  };
}

export interface TestCompletedEvent {
  type: 'test:completed';
  payload: {
    task: TaskContext;
    test: TestResult;
    build: BuildResult;
  };
}

export interface ReviewCompletedEvent {
  type: 'review:completed';
  payload: {
    task: TaskContext;
    review: ReviewResult;
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
