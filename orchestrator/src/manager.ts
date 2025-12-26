import { EventBus } from './events/EventBus.js';
import type {
  BuilderAgent,
  BuilderInput,
  ExecutionMode,
  PlanItem,
  PlanResult,
  PlannerAgent,
  ReviewResult,
  RunGroupEntry,
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
import { sanitizeRunId } from './persistence/sanitizeRunId.js';
import { normalizeErrorMessage } from './utils/errorMessage.js';
import { MANAGER_EXECUTION_MODE_PARSER, resolveRequiresCloudPolicy } from './utils/executionMode.js';
import { EnvUtils } from '../../packages/shared/config/index.js';

export type ModePolicy = (task: TaskContext, subtask: PlanItem) => ExecutionMode;
export type RunIdFactory = (taskId: string) => string;

interface PipelineRunResult {
  target: PlanItem;
  mode: ExecutionMode;
  build: BuildResult;
  test: TestResult;
  review: ReviewResult;
  summary: RunSummary;
}

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
  const requiresCloudFlag = resolveRequiresCloud(subtask);
  if (requiresCloudFlag) {
    return 'cloud';
  }
  if (task.metadata?.execution?.parallel) {
    return 'cloud';
  }
  return 'mcp';
};

function resolveRequiresCloud(subtask: PlanItem): boolean {
  const requiresCloudFlag = resolveRequiresCloudPolicy({
    boolFlags: [subtask.requires_cloud, subtask.requiresCloud],
    metadata: {
      mode: typeof subtask.metadata?.mode === 'string' ? subtask.metadata.mode : null,
      executionMode:
        typeof subtask.metadata?.executionMode === 'string'
          ? subtask.metadata.executionMode
          : null
    },
    metadataOrder: ['mode', 'executionMode'],
    parseMode: MANAGER_EXECUTION_MODE_PARSER
  });
  return requiresCloudFlag ?? false;
}

const defaultRunIdFactory: RunIdFactory = (taskId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return sanitizeRunId(`${taskId}-${timestamp}`);
};

export class TaskManager {
  private readonly eventBus: EventBus;
  private readonly modePolicy: ModePolicy;
  private readonly runIdFactory: RunIdFactory;
  private readonly _persistenceCoordinator?: PersistenceCoordinator;
  private readonly groupExecutionEnabled: boolean;

  constructor(private readonly options: ManagerOptions) {
    this.eventBus = options.eventBus ?? new EventBus();
    this.modePolicy = options.modePolicy ?? defaultModePolicy;
    this.runIdFactory = options.runIdFactory ?? defaultRunIdFactory;
    this.groupExecutionEnabled = EnvUtils.getBoolean('FEATURE_TFGRPO_GROUP');
    if (options.persistence) {
      const stateStore = options.persistence.stateStore ?? new TaskStateStore();
      const manifestWriter = options.persistence.manifestWriter ?? new RunManifestWriter();
      const coordinatorOptions = options.persistence.coordinatorOptions;
      this._persistenceCoordinator = new PersistenceCoordinator(
        this.eventBus,
        stateStore,
        manifestWriter,
        coordinatorOptions
      );
      if (options.persistence.autoStart !== false) {
        this._persistenceCoordinator.start();
      }
    }
  }

  get bus(): EventBus {
    return this.eventBus;
  }

  startPersistence(): void {
    this._persistenceCoordinator?.start();
  }

  stopPersistence(): void {
    this._persistenceCoordinator?.stop();
  }

  dispose(): void {
    this.stopPersistence();
  }

  get persistenceCoordinator(): PersistenceCoordinator | undefined {
    return this._persistenceCoordinator;
  }

  async execute(task: TaskContext): Promise<RunSummary> {
    const runId = this.runIdFactory(task.id);
    const { plan, failed, error } = await this.executePlanner(task, runId);
    if (failed) {
      return this.completeFromPlannerFailure(task, plan, runId, error);
    }
    const targets = this.selectExecutableSubtasks(plan);
    const shouldRunGroup = this.groupExecutionEnabled && targets.length > 1;
    const result = shouldRunGroup
      ? await this.executeGroup(task, plan, targets, runId)
      : await this.runPipelineStages(task, plan, targets[0]!, runId);

    this.eventBus.emit({ type: 'run:completed', payload: result.summary });

    return result.summary;
  }

  private selectExecutableSubtasks(plan: PlanResult): PlanItem[] {
    if (!this.groupExecutionEnabled) {
      return [this.selectSingleSubtask(plan)];
    }
    if (plan.items.length === 0) {
      throw new Error('Planner returned no executable subtasks.');
    }
    const runnable = plan.items.filter((item) => item.runnable !== false);
    if (runnable.length === 0) {
      throw new Error(
        'Planner returned no runnable subtasks after applying selection and target hints.'
      );
    }
    return this.prioritizeGroupTargets(plan, runnable);
  }

  private selectSingleSubtask(plan: PlanResult): PlanItem {
    if (plan.items.length === 0) {
      throw new Error('Planner returned no executable subtasks.');
    }
    const selected = plan.items.find((item) => item.selected === true);
    if (selected) {
      return selected;
    }
    if (plan.targetId) {
      const targeted = plan.items.find((item) => item.id === plan.targetId);
      if (targeted) {
        return targeted;
      }
    }
    const runnable = plan.items.filter((item) => item.runnable !== false);
    if (runnable.length === 1) {
      return runnable[0]!;
    }
    if (runnable.length > 1) {
      const available = runnable.map((item) => item.id).join(', ');
      throw new Error(
        `Planner returned multiple runnable subtasks without a selection (${available}). ` +
        'Specify a target stage or update the planner configuration.'
      );
    }
    throw new Error(
      'Planner returned no runnable subtasks after applying selection and target hints.'
    );
  }

  private prioritizeGroupTargets(plan: PlanResult, runnable: PlanItem[]): PlanItem[] {
    const prioritized: PlanItem[] = [];
    const seen = new Set<string>();
    const preferred =
      (plan.targetId ? runnable.find((item) => item.id === plan.targetId) : undefined) ??
      plan.items.find((item) => item.selected === true && item.runnable !== false);
    if (preferred) {
      prioritized.push(preferred);
      seen.add(preferred.id);
    }
    for (const item of runnable) {
      if (!seen.has(item.id)) {
        prioritized.push(item);
        seen.add(item.id);
      }
    }
    return prioritized;
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

  private async runPipelineStages(
    task: TaskContext,
    plan: PlanResult,
    target: PlanItem,
    runId: string
  ): Promise<PipelineRunResult> {
    const mode = this.modePolicy(task, target);
    const build = await this.executeBuilder(task, plan, target, mode, runId);
    if (!build.success) {
      const skippedTest = this.createSkippedTestResult(build, runId);
      const skippedReview = this.createSkippedReviewResult('build-failed');
      const summary = this.createRunSummary(task, mode, plan, build, skippedTest, skippedReview, runId);
      return { target, mode, build, test: skippedTest, review: skippedReview, summary };
    }
    const test = await this.executeTester(task, build, mode, runId);
    if (!test.success) {
      const skippedReview = this.createSkippedReviewResult('test-failed');
      const summary = this.createRunSummary(task, mode, plan, build, test, skippedReview, runId);
      return { target, mode, build, test, review: skippedReview, summary };
    }
    const review = await this.executeReviewer(task, plan, build, test, mode, runId);
    const summary = this.createRunSummary(task, mode, plan, build, test, review, runId);
    return { target, mode, build, test, review, summary };
  }

  private async executeGroup(
    task: TaskContext,
    plan: PlanResult,
    targets: PlanItem[],
    runId: string
  ): Promise<PipelineRunResult> {
    const entries: RunGroupEntry[] = [];
    const buildResults: BuildResult[] = [];
    const testResults: TestResult[] = [];
    const reviewResults: ReviewResult[] = [];
    let finalResult: PipelineRunResult | null = null;
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!;
      const result = await this.runPipelineStages(task, plan, target, runId);
      buildResults.push(result.build);
      testResults.push(result.test);
      reviewResults.push(result.review);
      entries.push({
        index: index + 1,
        subtaskId: target.id,
        mode: result.mode,
        buildSuccess: result.build.success,
        testSuccess: result.test.success,
        reviewApproved: Boolean(result.review.decision?.approved),
        status: result.build.success && result.test.success ? 'succeeded' : 'failed'
      });
      finalResult = result;
      if (!result.build.success || !result.test.success) {
        break;
      }
    }
    if (!finalResult) {
      throw new Error('Group execution produced no runnable subtasks.');
    }
    const groupMode = entries.some((entry) => entry.mode === 'cloud') ? 'cloud' : finalResult.mode;
    finalResult.summary.mode = groupMode;
    finalResult.summary.group = {
      enabled: true,
      size: targets.length,
      processed: entries.length,
      entries
    };
    finalResult.summary.builds = buildResults;
    finalResult.summary.tests = testResults;
    finalResult.summary.reviews = reviewResults;
    return finalResult;
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

  private createSkippedTestResult(build: BuildResult, runId: string): TestResult {
    return {
      subtaskId: build.subtaskId,
      success: false,
      reports: [
        {
          name: 'tests',
          status: 'failed',
          details: 'Skipped because the build stage failed.'
        }
      ],
      runId
    };
  }

  private createSkippedReviewResult(reason: 'build-failed' | 'test-failed'): ReviewResult {
    if (reason === 'build-failed') {
      return {
        summary: 'Review skipped: build stage failed.',
        decision: {
          approved: false,
          feedback: 'Build stage failed; review skipped.'
        }
      };
    }
    return {
      summary: 'Review skipped: tests failed.',
      decision: {
        approved: false,
        feedback: 'Tests failed; review skipped.'
      }
    };
  }

  private async executePlanner(
    task: TaskContext,
    runId: string
  ): Promise<{ plan: PlanResult; failed: boolean; error: unknown | null }> {
    try {
      const plan = await this.options.planner.plan(task);
      this.eventBus.emit({
        type: 'plan:completed',
        payload: { task, plan, runId }
      });
      return { plan, failed: false, error: null };
    } catch (error) {
      const plan = this.createPlannerFailurePlan(error);
      this.eventBus.emit({
        type: 'plan:completed',
        payload: { task, plan, runId }
      });
      return { plan, failed: true, error };
    }
  }

  private async executeBuilder(
    task: TaskContext,
    plan: PlanResult,
    target: PlanItem,
    mode: ExecutionMode,
    runId: string
  ): Promise<BuildResult> {
    const input: BuilderInput = { task, plan, target, mode, runId };
    try {
      const build = this.normalizeBuildResult(await this.options.builder.build(input), mode, runId);
      this.eventBus.emit({
        type: 'build:completed',
        payload: { task, plan, build, runId }
      });
      return build;
    } catch (error) {
      const failure = this.createBuilderErrorResult(target.id, mode, runId, error);
      this.eventBus.emit({
        type: 'build:completed',
        payload: { task, plan, build: failure, runId }
      });
      return failure;
    }
  }

  private async executeTester(
    task: TaskContext,
    build: BuildResult,
    mode: ExecutionMode,
    runId: string
  ): Promise<TestResult> {
    try {
      const test = this.normalizeTestResult(await this.options.tester.test({ task, build, mode, runId }), runId);
      this.eventBus.emit({
        type: 'test:completed',
        payload: { task, build, test, runId }
      });
      return test;
    } catch (error) {
      const failure = this.createTesterErrorResult(build.subtaskId, runId, error);
      this.eventBus.emit({
        type: 'test:completed',
        payload: { task, build, test: failure, runId }
      });
      return failure;
    }
  }

  private async executeReviewer(
    task: TaskContext,
    plan: PlanResult,
    build: BuildResult,
    test: TestResult,
    mode: ExecutionMode,
    runId: string
  ): Promise<ReviewResult> {
    try {
      const review = await this.options.reviewer.review({ task, plan, build, test, mode, runId });
      this.eventBus.emit({
        type: 'review:completed',
        payload: { task, review, runId }
      });
      return review;
    } catch (error) {
      const failure = this.createReviewerErrorResult(error);
      this.eventBus.emit({
        type: 'review:completed',
        payload: { task, review: failure, runId }
      });
      return failure;
    }
  }

  private completeFromPlannerFailure(
    task: TaskContext,
    plan: PlanResult,
    runId: string,
    error: unknown | null
  ): RunSummary {
    const mode: ExecutionMode = 'mcp';
    const cause = error ?? new Error('Planner stage failed without an error payload');
    const build = this.createBuilderErrorResult('planner-unavailable', mode, runId, cause);
    const skippedTest = this.createSkippedTestResult(build, runId);
    const skippedReview = this.createSkippedReviewResult('build-failed');
    const summary = this.createRunSummary(task, mode, plan, build, skippedTest, skippedReview, runId);
    this.eventBus.emit({ type: 'run:completed', payload: summary });
    return summary;
  }

  private createPlannerFailurePlan(error: unknown): PlanResult {
    return {
      items: [],
      notes: this.formatStageError('planner', error),
      targetId: null
    };
  }

  private createBuilderErrorResult(
    subtaskId: string | null,
    mode: ExecutionMode,
    runId: string,
    error: unknown
  ): BuildResult {
    return {
      subtaskId: subtaskId ?? 'unknown',
      artifacts: [],
      mode,
      runId,
      success: false,
      notes: this.formatStageError('builder', error)
    };
  }

  private createTesterErrorResult(subtaskId: string, runId: string, error: unknown): TestResult {
    return {
      subtaskId,
      success: false,
      reports: [
        {
          name: 'tests',
          status: 'failed',
          details: this.formatStageError('tester', error)
        }
      ],
      runId
    };
  }

  private createReviewerErrorResult(error: unknown): ReviewResult {
    const summary = this.formatStageError('reviewer', error);
    return {
      summary,
      decision: {
        approved: false,
        feedback: summary
      }
    };
  }

  private formatStageError(stage: string, error: unknown): string {
    const message = normalizeErrorMessage(error);
    const normalizedStage = stage.charAt(0).toUpperCase() + stage.slice(1);
    return `${normalizedStage} stage error: ${message}`;
  }
}
