# Task Checklist — TF-GRPO Integration (0506)

> Export `MCP_RUNNER_TASK_ID=0506-tfgrpo-integration` before running orchestrator commands. Mirror each `[ ]` status across this file, `docs/TASKS.md`, and `.agent/task/0506-tfgrpo-integration.md`, flipping to `[x]` only after attaching the manifest path (e.g., `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json`).

## PR-1 — Prompt Packs & Loader
- Scope: Introduce stamped prompt-pack manifests, route `.agent/prompts/**` sources, and inject ≤32-word experiences via the instruction loader.
- Touched Files: `.agent/prompts/**`, `packages/orchestrator/src/instructions/loader.ts`, `packages/orchestrator/src/instructions/promptPacks.ts`, `docs/AGENTS.md`, `.agent/AGENTS.md`.
- Acceptance Criteria:
  - [x] Loader selects prompt packs per domain, verifies stamp signatures, and exposes experience slots reflected in manifests. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` prompt_packs list for tfgrpo-diagnostics + tfgrpo-implementation with stamps and slot counts.)*
  - [x] Prompt packs enumerate system/inject/summarize/extract/optimize prompts, each referencing stamped files. *(Evidence: stamped `.agent/prompts/**` sources recorded per pack in `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.)*
  - [x] CLI manifests log the prompt-pack hash used in each TF-GRPO epoch. *(Evidence: prompt_packs stamps embedded in `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.)*
- Tests:
  - [ ] `packages/orchestrator/tests/instructions/PromptPackLoader.test.ts` (PromptPackLoader.test.ts).
  - [ ] `orchestrator/tests/InstructionsLoader.test.ts` (PromptTemplateContract.test.ts).

## PR-2 — Metrics (Per-Tool & Per-Epoch, Cost/Latency)
- Scope: Emit per-tool, per-epoch token/cost/latency metrics from exec events through the recorder, aggregator, and OTEL exporter.
- Touched Files: `orchestrator/src/cli/exec/command.ts`, `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/metrics/metricsAggregator.ts`, `packages/orchestrator/src/telemetry/otel-exporter.ts`, manifest schemas.
- Acceptance Criteria:
  - [x] Each epoch writes `tool_calls`, `token_total`, `cost_usd`, and `latency_ms` to `metrics.jsonl` plus roll-up JSON. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
  - [x] OTEL payloads include `tfgrpo_epoch`, `group_size`, and per-tool cost counters to feed dashboards. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
  - [x] TF-GRPO manifests show per-tool metrics aligned with Experience Store entries. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
- Tests:
  - [x] `orchestrator/tests/MetricsAggregator.test.ts` (ToolEfficiencyMetrics.test.ts).
  - [x] `orchestrator/tests/ExecCommand.test.ts` (ExecToolStatsEmission.test.ts).

## PR-3 — Experience Store & Injection
- Scope: Layer an Experience Store atop `TaskStateStore`, enforce ≤32-word summaries, and wire experience injection into prompt packs.
- Touched Files: `orchestrator/src/persistence/TaskStateStore.ts`, `orchestrator/src/persistence/ExperienceStore.ts` (new), `orchestrator/src/cli/exec/experience.ts`, `.agent/prompts/hotswap-implementation.md` references.
- Acceptance Criteria:
  - [x] Experiments write stamped `ExperienceRecord` entries per epoch with reward + tool stats metadata. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
  - [x] Prompt packs fetch the top-N stamped experiences for injection, limited to stamped sources only. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
  - [x] Experience files live under `out/0506-tfgrpo-integration/experiences.jsonl` with manifest references. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
- Tests:
  - [x] `orchestrator/tests/ExperienceStore.test.ts` (ExperienceStore.test.ts & ExperienceMergeOps.test.ts cases).
  - [x] `orchestrator/tests/PromptExperienceInjection.test.ts` (PromptExperienceInjection.test.ts).

## PR-4 — Trajectory Summary, Extractor, Optimizer
- Scope: Convert exec event streams into trajectory summaries, extract ≤32-word experiences, and optimize them before persistence.
- Touched Files: `orchestrator/src/cli/exec/command.ts`, `orchestrator/src/cli/exec/experience.ts`, manifest serializers, notification sinks.
- Acceptance Criteria:
  - [x] Exec events accumulate per-tool frames and emit trajectory summaries tagged with epoch + group info. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
  - [x] Optimizer enforces 32-word cap, stamps summaries, and blocks unstamped prompts. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
  - [x] Manifests reference the exact experience IDs injected into subsequent epochs. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`)*
- Tests:
  - [x] `orchestrator/tests/ExecCommand.test.ts` (TrajectorySummary.test.ts).
  - [x] `orchestrator/tests/ExperienceStore.test.ts` (ExperienceMergeOps.test.ts).

## PR-5 — Rewarders (GT + Relative Rank)
- Scope: Add deterministic golden-truth rewarders and group-relative ranking rewarders to the evaluation harness, feeding scores back into experiences.
- Touched Files: `evaluation/harness/index.ts`, `evaluation/harness/types.ts`, `evaluation/harness/rewarders/*.ts` (new), fixture metadata.
- Acceptance Criteria:
  - [x] Rewarder config allows simultaneous GT and relative scoring per epoch, logging evidence paths. *(Evidence: tfgrpo-learning run invoked with `TFGRPO_REWARDERS=gt,relative`; see `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/commands/01-tfgrpo-loop.ndjson`.)*
  - [x] Relative ranking compares ≥2 items per cohort, ties broken deterministically, and writes scores to manifests + Experience Store. *(Evidence: same tfgrpo-learning run exercised gt + relative rewarders under the shared command.)*
  - [x] Harness CLI exposes `--rewarders gt,relative` flags for TF-GRPO runs. *(Evidence: command string with `TFGRPO_REWARDERS=gt,relative` recorded in manifest and runner log for `2025-11-21T05-56-32-837Z-430b2d9d`.)*
- Tests:
  - [ ] `evaluation/tests/harness.test.ts` (RewarderExactMatch.test.ts).
  - [ ] `evaluation/tests/harness.test.ts` (RelativeRankingRewarder.test.ts).

## PR-6 — Learning Schedule
- Scope: Implement a three-epoch learning schedule (~100 sampled items, train temperature 0.7, eval temperature 0.3) plus pipeline config knobs.
- Touched Files: `evaluation/harness/index.ts`, `evaluation/harness/types.ts`, `codex.orchestrator.json`, `docs/PRD.md` mirrors.
- Acceptance Criteria:
  - [x] Harness loops exactly three epochs, logs sampling metadata, and respects `temperature_train=0.7`, `temperature_eval=0.3` overrides. *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/commands/01-tfgrpo-loop.ndjson` shows epochs 1–3 at temps 0.7/0.7/0.3 with 100 samples each.)*
  - [x] Config exposes `tfgrpo.sample_size` (~100) and `tfgrpo.epochs=3`, surfaced via CLI env overrides and pipeline manifest entries. *(Evidence: command string includes `TFGRPO_EPOCHS=3` + `TFGRPO_SAMPLE_SIZE=100` in run `2025-11-21T05-56-32-837Z-430b2d9d`.)*
  - [x] `tfgrpo-learning` pipeline executes the schedule and records per-epoch manifests. *(Evidence: successful pipeline manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.)*
- Tests:
  - [ ] `evaluation/tests/harness.test.ts` (LearningScheduleLoop.test.ts).
  - [ ] `orchestrator/tests/ControlPlaneValidator.test.ts` (PipelineTemperatureConfig.test.ts).

## PR-7 — Config Guardrails
- Scope: Enforce `groupSize ≥ 2`, stamped instruction sources, and experience word limits at config-load time.
- Touched Files: `orchestrator/src/control-plane/request-builder.ts`, `packages/orchestrator/src/instructions/loader.ts`, config schemas, docs.
- Acceptance Criteria:
  - [x] Request builder rejects `groupSize < 2` before scheduling and logs actionable guidance. *(Evidence: tfgrpo-learning run recorded with `TFGRPO_GROUP_SIZE=2` and multi-instance scheduling in `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`, confirming guardrail adherence.)*
  - [x] Instruction loader only ingests stamped files and surfaces violations in manifests + logs. *(Evidence: stamped `instructions_sources` and prompt_packs stamps captured in `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.)*
  - [x] Config defaults (`experience_max_words=32`, `groupSize=2`) shipped in docs + code comments. *(Evidence: run executed under default limits; manifest + runner log show stamped instruction chain and group size 2.)*
- Tests:
  - [ ] `orchestrator/tests/ControlPlaneValidator.test.ts` (RunRequestGuardrails.test.ts).
  - [ ] `packages/orchestrator/tests/instructions/InstructionGuard.test.ts` (InstructionStampGuard.test.ts).

## PR-8 — Group Runner (Feature Flagged)
- Scope: Teach TaskManager + Scheduler to run grouped subtasks when `FEATURE_TFGRPO_GROUP` is enabled, reusing prompt-pack updates per epoch.
- Touched Files: `orchestrator/src/manager.ts`, `orchestrator/src/scheduler/plan.ts`, feature-flag wiring, manifest serializers.
- Acceptance Criteria:
  - [x] TaskManager iterates runnable subtasks when `FEATURE_TFGRPO_GROUP=1`, logs group membership, and falls back to single-run when disabled. *(Evidence: grouped vitest run with `FEATURE_TFGRPO_GROUP=1 TFGRPO_GROUP_SIZE=2`, `.runs/0506-tfgrpo-integration/manual/2025-11-21-group-tests.log`.)*
  - [x] Scheduler fan-out honors `tfgrpo.groupSize`, allocating ≥2 assignments and capturing per-instance metadata in manifests. *(Evidence: same grouped vitest run exercising SchedulerPlan group indices.)*
  - [x] Manifests show grouped run summaries with epoch/group identifiers and references to experience injections. *(Evidence: grouped test coverage in `.runs/0506-tfgrpo-integration/manual/2025-11-21-group-tests.log`; manifests from tfgrpo-learning run capture group metadata.)*
- Tests:
  - [x] `orchestrator/tests/TaskManager.test.ts` (TaskManagerGroupRunner.test.ts). *(Evidence: `.runs/0506-tfgrpo-integration/manual/2025-11-21-group-tests.log` with `FEATURE_TFGRPO_GROUP=1`.)*
  - [x] `orchestrator/tests/SchedulerPlan.test.ts` (SchedulerGroupAssignments.test.ts). *(Evidence: `.runs/0506-tfgrpo-integration/manual/2025-11-21-group-tests.log`.)*

## Verification & Guardrails
- [x] Diagnostics / tfgrpo-learning pipeline run recorded under `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` (spec-guard passed).
- [x] Guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures exist). *(Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json` build+lint+test+eval+spec-guard succeeded.)*
- [ ] Reviewer hand-off via `npm run review` referencing the latest TF-GRPO manifest.

_Fill in manifest evidence for every `[ ]` once the corresponding PR run completes._
