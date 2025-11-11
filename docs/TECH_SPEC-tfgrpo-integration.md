# Technical Spec — Training-Free GRPO Integration (Task 0506)

## Overview
- Objective: Embed a training-free Group Relative Policy Optimization (TF-GRPO) loop inside the orchestrator so three-epoch cohorts with G≥2 actors can reuse stamped experiences, prompt packs, rewarders, and per-epoch metrics without leaving this repo.
- In Scope: Experience Store on top of `TaskStateStore`, prompt-pack loader changes, trajectory summary and optimizer plumbing inside `orchestrator/src/cli/exec/command.ts:132-218`, evaluation rewarders (`evaluation/harness/index.ts:214-329`, `evaluation/harness/types.ts:15-77`), scheduler/manager updates, config guardrails, telemetry, and the `tfgrpo-learning` pipeline stub in `codex.orchestrator.json:1-37`.
- Out of Scope: Persisting experiences outside filesystem-based snapshots, UI dashboards, or training ML models.

## Architecture & Design
### Experience Store Module
- **Location:** `orchestrator/src/persistence/ExperienceStore.ts` (new) co-located with `TaskStateStore` (`orchestrator/src/persistence/TaskStateStore.ts:57-175`).
- **Interfaces:**
  ```ts
  export interface ExperienceRecord {
    runId: string;
    taskId: string;
    epoch: number; // 1..3
    groupId: string; // derived from scheduler assignment id
    summary32: string; // <=32 words, enforced before persist
    reward: {
      gtScore: number;
      relativeRank: number;
    };
    toolStats: Array<{ tool: string; tokens: number; latencyMs: number; costUsd: number }>;
    stampSignature: string; // sha256 of source prompt pack + manifest timestamp
    createdAt: string;
  }

  export interface ExperienceStore {
    recordBatch(records: ExperienceRecord[], manifestPath: string): Promise<void>;
    fetchTop(params: { domain: string; limit: number; minReward?: number }): Promise<ExperienceRecord[]>;
    verifyStamp(record: ExperienceRecord): boolean;
  }
  ```
- **Behavior:** `recordBatch` reuses `TaskStateStore.writeAtomic` to append to `out/<task>/experiences.jsonl`, rejecting unstamped or >32-word summaries. `fetchTop` filters by domain/prompt-pack tags and enforces `experience_max_words=32`. `verifyStamp` checks the stamp header added by prompt packs before injection.

### Prompt Packs & Loader Routing
- **Location:** `packages/orchestrator/src/instructions/promptPacks.ts` (new) plus updates to `packages/orchestrator/src/instructions/loader.ts:16-40`.
- **Data:** Add `prompt-packs/<pack-id>/manifest.json` with stamped metadata, referencing `.agent/prompts/**` sources (e.g., `.agent/prompts/hotswap-implementation.md:7-44`).
- **Interfaces:**
  ```ts
  export interface PromptPackManifest {
    id: string;
    domain: string;
    stamp: string; // sha256 of sources
    system: string;
    inject: string[];
    experienceSlots: number;
  }

  export async function loadPromptPack(domain: string, repoRoot: string): Promise<PromptPackManifest>;
  export async function mergeExperiences(manifest: PromptPackManifest, experiences: ExperienceRecord[]): Promise<string>;
  ```
- **Routing:** `loadInstructionSet` now collects prompt packs per domain (e.g., diagnostics vs implementation) and merges experiences returned by the Experience Store if and only if the manifest stamp matches. Only stamped prompts are eligible for injection, satisfying the “stamped experiences only” guardrail.

### Trajectory Summarizer / Experience Extractor / Optimizer
- **Location:** `orchestrator/src/cli/exec/experience.ts` (new helper) invoked from `orchestrator/src/cli/exec/command.ts:132-218` once `execEvents` flush.
- **Structure:**
  ```ts
  export interface TrajectoryFrame {
    event: ExecEvent;
    tokens: number;
    costUsd: number;
    latencyMs: number;
  }

  export function summarizeTrajectory(frames: TrajectoryFrame[]): ExperienceRecord;
  export function optimizeExperience(record: ExperienceRecord, policy: TfgrpoPolicyConfig): ExperienceRecord;
  ```
- **Details:** The summarizer enforces ≤32-word summaries by tokenizing `stdout` truncations. Optimizer applies TF-GRPO heuristics (relative ranks, reward thresholds) before writing to the store. Summaries reference group IDs from scheduler assignments.

### Rewarders (GT + Relative Ranking)
- **Location:** `evaluation/harness/rewarders/gtRewarder.ts` and `evaluation/harness/rewarders/relativeRankRewarder.ts` (new), registered inside `evaluation/harness/index.ts:214-329`.
- **API:**
  ```ts
  export interface RewardContext {
    fixturePath: string;
    outputs: ScenarioGoalResult[];
    experiences: ExperienceRecord[];
  }

  export interface RewardScore {
    rewarderId: 'gt' | 'relative';
    score: number;
    evidence: string;
  }
  ```
- **Flow:** GT rewarder compares outputs against deterministic fixtures; relative ranking compares ≥2 items per cohort sorted by evaluation reward (temperature 0.3). Reward scores feed back into `ExperienceRecord.reward` and evaluation manifests.

### Metrics (Per-Tool & Per-Epoch)
- **Instrumentation:**
  - Extend `orchestrator/src/cli/exec/command.ts:138-217` to emit `ToolMetricEvent` per tool call with `epoch`, `groupId`, `tokens`, `costUsd`, and `latencyMs`.
  - Update `orchestrator/src/cli/metrics/metricsRecorder.ts:45-88` to append `epoch` and aggregated per-tool stats, writing to `metrics.jsonl` grouped by epoch.
  - Enhance `orchestrator/src/cli/metrics/metricsAggregator.ts:74-157` to compute per-epoch averages and write `per-epoch.json`.
  - Expand `packages/orchestrator/src/telemetry/otel-exporter.ts:1-156` payloads with `tfgrpo_epoch`, `group_size`, `tool_cost_usd`, and `latency_ms` dimensions prior to OTEL export.

### Learning Schedule Hooks
- **Location:** `evaluation/harness/index.ts:276-319` and `evaluation/harness/types.ts:15-77`.
- **Behavior:** Wrap the existing plan loop in a `for (let epoch = 1; epoch <= config.epochs; epoch += 1)` structure, adjusting `TFGRPO_TRAIN_TEMP=0.7` for epochs <3 and `TFGRPO_EVAL_TEMP=0.3` for the evaluation sweep. Approximately 100 items (`sample_size`) are distributed per epoch, with sampling metadata logged for rewarders and metrics.

### Config Guardrails
- **Request Builder:** Update `orchestrator/src/control-plane/request-builder.ts:63-105` to read `tfgrpo.groupSize` (default 2) and throw if `< 2`. Also tag `schedule.minInstances`/`maxInstances` with group size.
- **Instruction Loader:** Only accept instruction or experience files carrying an approved stamp header; add `InstructionStampVerifier` in `packages/orchestrator/src/instructions/loader.ts:16-40`.
- **Config Keys & Flags:**
  - `FEATURE_TFGRPO_GROUP` (env or config) toggles grouped execution paths inside `TaskManager`.
  - `tfgrpo.groupSize` (default 2), `tfgrpo.epochs` (3), `tfgrpo.sample_size` (~100), `tfgrpo.temperature.train` (0.7), `tfgrpo.temperature.eval` (0.3), `tfgrpo.experience_max_words` (32).
  - CLI env overrides: `TFGRPO_GROUP_SIZE`, `TFGRPO_EPOCHS`, `TFGRPO_SAMPLE_SIZE`, `TFGRPO_TRAIN_TEMP`, `TFGRPO_EVAL_TEMP` (used by the pipeline stub).

### Group Runner (Feature Flag)
- **TaskManager:** Extend `orchestrator/src/manager.ts:100-157` so `selectExecutableSubtask` returns an array when `FEATURE_TFGRPO_GROUP` is enabled. New helper `executeGroup(task, plan, groupItems)` sequentially (or concurrently) runs builder/test/review per item while sharing prompt-pack refresh hooks.
- **Scheduler:** Update `orchestrator/src/scheduler/plan.ts:19-122` to honor the requested group size by increasing target assignments. Each assignment’s `metadata.weight` records the group index for manifest traceability.
- **Safety:** Feature flag defaults to `false`. When disabled, behavior matches current single-subtask flow.

### Pipeline Stub
- `codex.orchestrator.json` gains a `tfgrpo-learning` pipeline whose main stage runs `node evaluation/harness/scripts/tfgrpo-runner.mjs` with env overrides (`TFGRPO_EPOCHS=3`, `TFGRPO_SAMPLE_SIZE=100`, `TFGRPO_TRAIN_TEMP=0.7`, `TFGRPO_EVAL_TEMP=0.3`). Final stage keeps `node scripts/spec-guard.mjs --dry-run` inline so manifests carry guardrail evidence.

## Operational Considerations
- **Failure Modes:** Experience writes can fail if stamps mismatch; surface as manifest warnings and skip injection. Scheduler fan-out could exceed available slots; request builder catches this and instructs operators to adjust config. Rewarder timeouts abort the epoch but still record failure metrics.
- **Performance Targets:** Experience summarization ≤50 ms per tool call, rewarder suite <2 s per 100-sample epoch, telemetry overhead <5% of run time. Metrics JSONL appends remain streaming to avoid unbounded memory.
- **Observability:** Manifests gain `tfgrpo` blocks summarizing epochs, experiences written, reward scores, and per-tool metrics. OTEL payloads carry epoch/group labels for dashboards.

### Identifier Guardrails
- Enforce `MCP_RUNNER_TASK_ID` sanitization via existing helpers plus new `validateTfgrpoConfig()` so task IDs never bleed into experience filenames.
- Instruction loader rejects files lacking stamped headers and logs the offending path; experiences referencing unstamped prompts are not persisted.
- Request builder refuses `groupSize < 2` and logs guardrail violations before hitting the scheduler.

## Testing Strategy
- Prompt Packs & Loader: `packages/orchestrator/tests/instructions/PromptPackLoader.test.ts`, `orchestrator/tests/InstructionsLoader.test.ts` (PromptTemplateContract).
- Experience Store & Injection: `orchestrator/tests/ExperienceStore.test.ts`, `orchestrator/tests/PromptExperienceInjection.test.ts`.
- Trajectory Summary / Extractor / Optimizer: `orchestrator/tests/ExecCommand.test.ts` (TrajectorySummary) plus `orchestrator/tests/ExperienceStore.test.ts` (ExperienceMergeOps).
- Rewarders: `evaluation/tests/harness.test.ts` covering `RewarderExactMatch.test.ts` and `RelativeRankingRewarder.test.ts` suites.
- Metrics: `orchestrator/tests/MetricsAggregator.test.ts` (ToolEfficiencyMetrics) and `orchestrator/tests/ExecCommand.test.ts` (ExecToolStatsEmission).
- Learning Schedule: `evaluation/tests/harness.test.ts` (LearningScheduleLoop) and `orchestrator/tests/ControlPlaneValidator.test.ts` (PipelineTemperatureConfig).
- Config Guardrails: `orchestrator/tests/ControlPlaneValidator.test.ts` (RunRequestGuardrails) and `packages/orchestrator/tests/instructions/InstructionGuard.test.ts` (InstructionStampGuard).
- Group Runner: `orchestrator/tests/TaskManager.test.ts` (TaskManagerGroupRunner) and `orchestrator/tests/SchedulerPlan.test.ts` (SchedulerGroupAssignments).

## Documentation & Evidence
- PRD: `tasks/0506-prd-tfgrpo-integration.md`.
- Task Checklist: `tasks/tasks-0506-tfgrpo.md` plus mirrors in `.agent/task/0506-tfgrpo-integration.md`.
- Run Manifests: `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json` per pipeline execution.
- Metrics / State: `.runs/0506-tfgrpo-integration/metrics.json` and `out/0506-tfgrpo-integration/state.json` once Experience Store writes execute.

## Open Questions
- Should the relative-ranking rewarder operate on raw scores or z-scored values across the cohort to dampen outliers?
- Do we need to expose `experience_max_words` as a per-domain override, or is the global 32-word cap sufficient?

## Approvals
- Engineering: Pending sign-off from Orchestrator Learning Systems owner (Jamie Chen).
- Product: Platform Enablement (Alex Rivera) review scheduled for 2025-11-18.
- Design: CLI/DevEx (Priya Desai) to approve manifest additions alongside documentation updates.
