# Task Checklist — TF-GRPO Integration (0506)

> Export `MCP_RUNNER_TASK_ID=0506-tfgrpo-integration` before running orchestrator commands. Mirror each `[ ]` status across this file, `docs/TASKS.md`, and `.agent/task/0506-tfgrpo-integration.md`, flipping to `[x]` only after attaching the manifest path (e.g., `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json`).

## PR-1 — Prompt Packs & Loader
- Scope: Introduce stamped prompt-pack manifests, route `.agent/prompts/**` sources, and inject ≤32-word experiences via the instruction loader.
- Touched Files: `.agent/prompts/**`, `packages/orchestrator/src/instructions/loader.ts`, `packages/orchestrator/src/instructions/promptPacks.ts`, `docs/AGENTS.md`, `.agent/AGENTS.md`.
- Acceptance Criteria:
  - [ ] Loader selects prompt packs per domain, verifies stamp signatures, and exposes experience slots reflected in manifests.
  - [ ] Prompt packs enumerate system/inject/summarize/extract/optimize prompts, each referencing stamped files.
  - [ ] CLI manifests log the prompt-pack hash used in each TF-GRPO epoch.
- Tests:
  - [ ] `packages/orchestrator/tests/instructions/PromptPackLoader.test.ts` (PromptPackLoader.test.ts).
  - [ ] `orchestrator/tests/InstructionsLoader.test.ts` (PromptTemplateContract.test.ts).

## PR-2 — Metrics (Per-Tool & Per-Epoch, Cost/Latency)
- Scope: Emit per-tool, per-epoch token/cost/latency metrics from exec events through the recorder, aggregator, and OTEL exporter.
- Touched Files: `orchestrator/src/cli/exec/command.ts`, `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/metrics/metricsAggregator.ts`, `packages/orchestrator/src/telemetry/otel-exporter.ts`, manifest schemas.
- Acceptance Criteria:
  - [ ] Each epoch writes `tool_calls`, `token_total`, `cost_usd`, and `latency_ms` to `metrics.jsonl` plus roll-up JSON.
  - [ ] OTEL payloads include `tfgrpo_epoch`, `group_size`, and per-tool cost counters to feed dashboards.
  - [ ] TF-GRPO manifests show per-tool metrics aligned with Experience Store entries.
- Tests:
  - [ ] `orchestrator/tests/MetricsAggregator.test.ts` (ToolEfficiencyMetrics.test.ts).
  - [ ] `orchestrator/tests/ExecCommand.test.ts` (ExecToolStatsEmission.test.ts).

## PR-3 — Experience Store & Injection
- Scope: Layer an Experience Store atop `TaskStateStore`, enforce ≤32-word summaries, and wire experience injection into prompt packs.
- Touched Files: `orchestrator/src/persistence/TaskStateStore.ts`, `orchestrator/src/persistence/ExperienceStore.ts` (new), `orchestrator/src/cli/exec/experience.ts`, `.agent/prompts/hotswap-implementation.md` references.
- Acceptance Criteria:
  - [ ] Experiments write stamped `ExperienceRecord` entries per epoch with reward + tool stats metadata.
  - [ ] Prompt packs fetch the top-N stamped experiences for injection, limited to stamped sources only.
  - [ ] Experience files live under `out/0506-tfgrpo-integration/experiences.jsonl` with manifest references.
- Tests:
  - [ ] `orchestrator/tests/ExperienceStore.test.ts` (ExperienceStore.test.ts & ExperienceMergeOps.test.ts cases).
  - [ ] `orchestrator/tests/PromptExperienceInjection.test.ts` (PromptExperienceInjection.test.ts).

## PR-4 — Trajectory Summary, Extractor, Optimizer
- Scope: Convert exec event streams into trajectory summaries, extract ≤32-word experiences, and optimize them before persistence.
- Touched Files: `orchestrator/src/cli/exec/command.ts`, `orchestrator/src/cli/exec/experience.ts`, manifest serializers, notification sinks.
- Acceptance Criteria:
  - [ ] Exec events accumulate per-tool frames and emit trajectory summaries tagged with epoch + group info.
  - [ ] Optimizer enforces 32-word cap, stamps summaries, and blocks unstamped prompts.
  - [ ] Manifests reference the exact experience IDs injected into subsequent epochs.
- Tests:
  - [ ] `orchestrator/tests/ExecCommand.test.ts` (TrajectorySummary.test.ts).
  - [ ] `orchestrator/tests/ExperienceStore.test.ts` (ExperienceMergeOps.test.ts).

## PR-5 — Rewarders (GT + Relative Rank)
- Scope: Add deterministic golden-truth rewarders and group-relative ranking rewarders to the evaluation harness, feeding scores back into experiences.
- Touched Files: `evaluation/harness/index.ts`, `evaluation/harness/types.ts`, `evaluation/harness/rewarders/*.ts` (new), fixture metadata.
- Acceptance Criteria:
  - [ ] Rewarder config allows simultaneous GT and relative scoring per epoch, logging evidence paths.
  - [ ] Relative ranking compares ≥2 items per cohort, ties broken deterministically, and writes scores to manifests + Experience Store.
  - [ ] Harness CLI exposes `--rewarders gt,relative` flags for TF-GRPO runs.
- Tests:
  - [ ] `evaluation/tests/harness.test.ts` (RewarderExactMatch.test.ts).
  - [ ] `evaluation/tests/harness.test.ts` (RelativeRankingRewarder.test.ts).

## PR-6 — Learning Schedule
- Scope: Implement a three-epoch learning schedule (~100 sampled items, train temperature 0.7, eval temperature 0.3) plus pipeline config knobs.
- Touched Files: `evaluation/harness/index.ts`, `evaluation/harness/types.ts`, `codex.orchestrator.json`, `docs/PRD.md` mirrors.
- Acceptance Criteria:
  - [ ] Harness loops exactly three epochs, logs sampling metadata, and respects `temperature_train=0.7`, `temperature_eval=0.3` overrides.
  - [ ] Config exposes `tfgrpo.sample_size` (~100) and `tfgrpo.epochs=3`, surfaced via CLI env overrides and pipeline manifest entries.
  - [ ] `tfgrpo-learning` pipeline executes the schedule and records per-epoch manifests.
- Tests:
  - [ ] `evaluation/tests/harness.test.ts` (LearningScheduleLoop.test.ts).
  - [ ] `orchestrator/tests/ControlPlaneValidator.test.ts` (PipelineTemperatureConfig.test.ts).

## PR-7 — Config Guardrails
- Scope: Enforce `groupSize ≥ 2`, stamped instruction sources, and experience word limits at config-load time.
- Touched Files: `orchestrator/src/control-plane/request-builder.ts`, `packages/orchestrator/src/instructions/loader.ts`, config schemas, docs.
- Acceptance Criteria:
  - [ ] Request builder rejects `groupSize < 2` before scheduling and logs actionable guidance.
  - [ ] Instruction loader only ingests stamped files and surfaces violations in manifests + logs.
  - [ ] Config defaults (`experience_max_words=32`, `groupSize=2`) shipped in docs + code comments.
- Tests:
  - [ ] `orchestrator/tests/ControlPlaneValidator.test.ts` (RunRequestGuardrails.test.ts).
  - [ ] `packages/orchestrator/tests/instructions/InstructionGuard.test.ts` (InstructionStampGuard.test.ts).

## PR-8 — Group Runner (Feature Flagged)
- Scope: Teach TaskManager + Scheduler to run grouped subtasks when `FEATURE_TFGRPO_GROUP` is enabled, reusing prompt-pack updates per epoch.
- Touched Files: `orchestrator/src/manager.ts`, `orchestrator/src/scheduler/plan.ts`, feature-flag wiring, manifest serializers.
- Acceptance Criteria:
  - [ ] TaskManager iterates runnable subtasks when `FEATURE_TFGRPO_GROUP=1`, logs group membership, and falls back to single-run when disabled.
  - [ ] Scheduler fan-out honors `tfgrpo.groupSize`, allocating ≥2 assignments and capturing per-instance metadata in manifests.
  - [ ] Manifests show grouped run summaries with epoch/group identifiers and references to experience injections.
- Tests:
  - [ ] `orchestrator/tests/TaskManager.test.ts` (TaskManagerGroupRunner.test.ts).
  - [ ] `orchestrator/tests/SchedulerPlan.test.ts` (SchedulerGroupAssignments.test.ts).

_Fill in manifest evidence for every `[ ]` once the corresponding PR run completes._
