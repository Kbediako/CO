# Task Checklist — TF-GRPO Integration (0506)

## Context
- PRD: `tasks/0506-prd-tfgrpo-integration.md`
- Tech Spec: `docs/TECH_SPEC-tfgrpo-integration.md`
- Summary: Enable training-free GRPO by combining stamped experience storage, prompt packs, rewarders, per-epoch metrics, and grouped execution guardrails.

### Checklist Convention
- Keep `[ ]` until the acceptance criteria is satisfied and a manifest under `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json` proves it. Flip to `[x]` only after linking the evidentiary manifest.

## Parent Tasks
1. **PR-1 — Prompt Packs & Loader**
   - Scope: Stamped prompt-pack manifests, instruction loader routing, and experience slot injection.
   - Files: `.agent/prompts/**`, `packages/orchestrator/src/instructions/loader.ts`, `packages/orchestrator/src/instructions/promptPacks.ts`.
   - Tests: `packages/orchestrator/tests/instructions/PromptPackLoader.test.ts`, `orchestrator/tests/InstructionsLoader.test.ts`.
   - [x] Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` (prompt_packs stamps recorded).
2. **PR-2 — Metrics (Per-Tool & Per-Epoch)**
   - Scope: Emit tool/token/cost/latency metrics tagged by epoch and group.
   - Files: `orchestrator/src/cli/exec/command.ts`, `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/metrics/metricsAggregator.ts`, `packages/orchestrator/src/telemetry/otel-exporter.ts`.
   - Tests: `orchestrator/tests/MetricsAggregator.test.ts`, `orchestrator/tests/ExecCommand.test.ts`.
   - [x] Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.
3. **PR-3 — Experience Store & Injection**
   - Scope: ExperienceStore module, ≤32-word enforcement, stamped persistence, and prompt injection.
   - Files: `orchestrator/src/persistence/TaskStateStore.ts`, `orchestrator/src/persistence/ExperienceStore.ts`, `orchestrator/src/cli/exec/experience.ts`.
   - Tests: `orchestrator/tests/ExperienceStore.test.ts`, `orchestrator/tests/PromptExperienceInjection.test.ts`.
   - [x] Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.
4. **PR-4 — Trajectory Summary / Optimizer**
   - Scope: Convert exec events into trajectory summaries, stamp, and optimize before persistence.
   - Files: `orchestrator/src/cli/exec/command.ts`, `orchestrator/src/cli/exec/experience.ts`.
   - Tests: `orchestrator/tests/ExecCommand.test.ts`, `orchestrator/tests/ExperienceStore.test.ts`.
   - [x] Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.
5. **PR-5 — Rewarders (GT + Relative Rank)**
   - Scope: Plug deterministic GT and relative ranking rewarders into the evaluation harness.
   - Files: `evaluation/harness/index.ts`, `evaluation/harness/types.ts`, `evaluation/harness/rewarders/*.ts`.
   - Tests: `evaluation/tests/harness.test.ts` (RewarderExactMatch, RelativeRankingRewarder suites).
   - [x] Evidence: tfgrpo-learning run with `TFGRPO_REWARDERS=gt,relative` — `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` (runner log).
6. **PR-6 — Learning Schedule**
   - Scope: Three-epoch (~100 sample) schedule with temperature overrides plus pipeline wiring.
   - Files: `evaluation/harness/index.ts`, `evaluation/harness/types.ts`, `codex.orchestrator.json`.
   - Tests: `evaluation/tests/harness.test.ts` (LearningScheduleLoop), `orchestrator/tests/ControlPlaneValidator.test.ts` (PipelineTemperatureConfig).
   - [x] Evidence: tfgrpo-learning schedule completed (temps 0.7/0.7/0.3, 3×100 samples); manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.
7. **PR-7 — Config Guardrails**
   - Scope: Enforce `groupSize ≥ 2`, stamped instruction sources, and `experience_max_words=32` defaults.
   - Files: `orchestrator/src/control-plane/request-builder.ts`, `packages/orchestrator/src/instructions/loader.ts`.
   - Tests: `orchestrator/tests/ControlPlaneValidator.test.ts`, `packages/orchestrator/tests/instructions/InstructionGuard.test.ts`.
   - [x] Evidence: manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` captures stamped instruction chain + prompt-pack stamps; run executed with `TFGRPO_GROUP_SIZE=2`.
8. **PR-8 — Group Runner (Feature Flagged)**
   - Scope: TaskManager + Scheduler support for grouped subtasks under `FEATURE_TFGRPO_GROUP`.
   - Files: `orchestrator/src/manager.ts`, `orchestrator/src/scheduler/plan.ts`.
   - Tests: `orchestrator/tests/TaskManager.test.ts`, `orchestrator/tests/SchedulerPlan.test.ts`.
   - [x] Evidence: grouped vitest run (`FEATURE_TFGRPO_GROUP=1 TFGRPO_GROUP_SIZE=2`) covering TaskManagerGroupRunner + SchedulerGroupAssignments — `.runs/0506-tfgrpo-integration/manual/2025-11-21-group-tests.log`.

## Verification & Guardrails
- Diagnostics pipeline: `npx codex-orchestrator start diagnostics --pipeline tfgrpo-learning --format json`; Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` (spec-guard passed, prompt-pack stamps recorded).
- Guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures exist). Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json` (build+lint+test+eval+spec-guard succeeded).
- Reviewer hand-off: `npm run review` referencing latest `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json`.

## Notes
- Export `MCP_RUNNER_TASK_ID=0506-tfgrpo-integration` before running orchestrator commands.
- Log any approvals/escalations in the associated run manifest under `.runs/0506-tfgrpo-integration/cli/`.
