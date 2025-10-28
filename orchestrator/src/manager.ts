import { EventBus } from './events/EventBus.js';
import type {
  BuilderAgent,
  BuilderInput,
  ExecutionMode,
  PlanItem,
  PlanResult,
  PlannerAgent,
  ReviewResult,
  RunSummary,
  TaskContext,
  TesterAgent,
  TestResult,
  ReviewerAgent,
  BuildResult
} from './types.js';
import type { PersistenceCoordinatorOptions } from './persistence/PersistenceCoordinator.js';
import { PersistenceCoordinator } from './persistence/PersistenceCoordinator.js';
import { TaskStateStore } from './persistence/TaskStateStore.js';
import { RunManifestWriter } from './persistence/RunManifestWriter.js';

export type ModePolicy = (task: TaskContext, subtask: PlanItem) => ExecutionMode;
export type RunIdFactory = (taskId: string) => string;

export interface ManagerOptions {
  planner: PlannerAgent;
  builder: BuilderAgent;
  tester: TesterAgent;
  reviewer: ReviewerAgent;
  eventBus?: EventBus;
  modePolicy?: ModePolicy;
  runIdFactory?: RunIdFactory;
  persistence?: {
    stateStore?: TaskStateStore;
    manifestWriter?: RunManifestWriter;
    coordinatorOptions?: PersistenceCoordinatorOptions;
    autoStart?: boolean;
  };
}

const defaultModePolicy: ModePolicy = (task, subtask) => {
  const requiresCloud = subtask.requires_cloud ?? subtask.requiresCloud;
  if (requiresCloud) {
    return 'cloud';
  }
  if (task.metadata?.execution?.parallel) {
    return 'cloud';
  }
  return 'mcp';
};

const defaultRunIdFactory: RunIdFactory = (taskId) => {
  const timestamp = new Date().toISOString();
  return `${taskId}-${timestamp}`;
};

export class TaskManager {
  private readonly eventBus: EventBus;
  private readonly modePolicy: ModePolicy;
  private readonly runIdFactory: RunIdFactory;
  private readonly persistenceCoordinator?: PersistenceCoordinator;

  constructor(private readonly options: ManagerOptions) {
    this.eventBus = options.eventBus ?? new EventBus();
    this.modePolicy = options.modePolicy ?? defaultModePolicy;
    this.runIdFactory = options.runIdFactory ?? defaultRunIdFactory;
    if (options.persistence) {
      const stateStore = options.persistence.stateStore ?? new TaskStateStore();
      const manifestWriter = options.persistence.manifestWriter ?? new RunManifestWriter();
      const coordinatorOptions = options.persistence.coordinatorOptions;
      this.persistenceCoordinator = new PersistenceCoordinator(
        this.eventBus,
        stateStore,
        manifestWriter,
        coordinatorOptions
      );
      if (options.persistence.autoStart !== false) {
        this.persistenceCoordinator.start();
      }
    }
  }

  get bus(): EventBus {
    return this.eventBus;
  }

  startPersistence(): void {
    this.persistenceCoordinator?.start();
  }

  stopPersistence(): void {
    this.persistenceCoordinator?.stop();
  }

  dispose(): void {
    this.stopPersistence();
  }

  async execute(task: TaskContext): Promise<RunSummary> {
    const runId = this.runIdFactory(task.id);
    const plan = await this.options.planner.plan(task);
    const subtask = this.selectExecutableSubtask(plan);
    const mode = this.modePolicy(task, subtask);

    this.eventBus.emit({
      type: 'plan:completed',
      payload: { task, plan, runId }
    });

    const buildInput: BuilderInput = {
      task,
      plan,
      target: subtask,
      mode,
      runId
    };
    const build = this.normalizeBuildResult(await this.options.builder.build(buildInput), mode, runId);

    this.eventBus.emit({
      type: 'build:completed',
      payload: { task, plan, build, runId }
    });

    const test = this.normalizeTestResult(
      await this.options.tester.test({ task, build, mode, runId }),
      runId
    );

    this.eventBus.emit({
      type: 'test:completed',
      payload: { task, build, test, runId }
    });

    const review = await this.options.reviewer.review({ task, plan, build, test, mode, runId });

    this.eventBus.emit({
      type: 'review:completed',
      payload: { task, review, runId }
    });

    const runSummary = this.createRunSummary(task, mode, plan, build, test, review, runId);

    this.eventBus.emit({ type: 'run:completed', payload: runSummary });

    return runSummary;
  }

  private selectExecutableSubtask(plan: PlanResult): PlanItem {
    const [first] = plan.items;
    if (!first) {
      throw new Error('Planner returned no executable subtasks.');
    }
    return first;
  }

  private createRunSummary(
    task: TaskContext,
    mode: ExecutionMode,
    plan: PlanResult,
    build: BuildResult,
    test: TestResult,
    review: ReviewResult,
    runId: string
  ): RunSummary {
    const timestamp = new Date().toISOString();
    return {
      taskId: task.id,
      runId,
      mode,
      plan,
      build,
      test,
      review,
      timestamp
    };
  }

  private normalizeBuildResult(build: BuildResult, mode: ExecutionMode, runId: string): BuildResult {
    if (typeof build.success !== 'boolean') {
      throw new Error('Builder result missing success flag');
    }
    return { ...build, mode, runId };
  }

  private normalizeTestResult(test: TestResult, runId: string): TestResult {
    return { ...test, runId };
  }
}
