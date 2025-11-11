# PRD — Training-Free GRPO Integration (Task 0506)

## Summary
- Problem Statement: The orchestrator currently executes a single-plan run without any notion of group-based policy optimization, so past trajectories never influence future prompts, schedulers only issue one runnable subtask, rewarders are binary file checks, and metrics ignore per-epoch tool/token/cost signals. As a result, TF-GRPO experiments cannot be reproduced or audited inside this repo.
- Desired Outcome: Introduce a stamped Experience Store, prompt-pack routing, group runner plumbing, rewarders, metrics, and scheduler hooks so the orchestrator can run a three-epoch, ~100-sample TF-GRPO loop with G≥2 actors, ≤32-word experiences, training temperature 0.7, evaluation temperature 0.3, stamped experience reuse, and per-epoch tool/token/cost/latency dashboards.

### Definitions & Constraints
- **TF-GRPO cohort:** Each rollout uses group size `G` (guarded so `G ≥ 2`) to compare relative policies before updating prompt packs.
- **Stamped experiences:** Only instruction sources or experiences carrying a signed/stamped header from `.agent/prompts/**` may be injected into prompts (see `.agent/prompts/hotswap-implementation.md:7-44`).
- **Experience payload:** Each stored summary must be ≤32 words, referencing concrete run IDs and tool stats.
- **Learning cadence:** Exactly 3 epochs per run, sampling ~100 items per epoch (repeat draws allowed but logged), with `temperature_train=0.7` and `temperature_eval=0.3` fed through the learning schedule.
- **Metrics:** Per-epoch tool, token, latency, and cost counters flow from `orchestrator/src/cli/exec/command.ts:132-218` into `orchestrator/src/cli/metrics/metricsRecorder.ts:19-88` and `orchestrator/src/cli/metrics/metricsAggregator.ts:74-157`.

## Goals
- Wire an Experience Store on top of `TaskStateStore` so TF-GRPO runs can persist, stamp, and recall prior successes/failures (`orchestrator/src/persistence/TaskStateStore.ts:57-175`).
- Load stamped prompt packs and inject filtered experiences into the hot-swap prompts referenced by `.agent/prompts/hotswap-implementation.md:7-44` and `.agent/prompts/mcp-diagnostics.md:5-13` through `packages/orchestrator/src/instructions/loader.ts:16-40`.
- Allow TaskManager to schedule grouped executions by iterating runnable subtasks instead of throwing on `runnable.length > 1` (`orchestrator/src/manager.ts:100-157`) and emitting scheduler fan-out through `orchestrator/src/scheduler/plan.ts:19-122`.
- Extend the evaluation harness (`evaluation/harness/index.ts:214-329`) with TF-GRPO rewarders so golden-truth and relative ranking are scored per epoch.
- Capture per-tool, per-epoch token/cost/latency metrics via `orchestrator/src/cli/exec/command.ts:132-218`, `orchestrator/src/cli/metrics/metricsRecorder.ts:45-88`, `orchestrator/src/cli/metrics/metricsAggregator.ts:74-157`, and `packages/orchestrator/src/telemetry/otel-exporter.ts:1-156`.
- Enforce configuration guardrails so `groupSize < 2` is rejected at request-build time (`orchestrator/src/control-plane/request-builder.ts:63-105`) and so only stamped experiences flow through the instruction loader.

## Non-Goals
- Switching away from the existing file-based persistence layer or introducing a vector database.
- Building a UI for experience browsing; CLI manifests remain the single audit surface.
- Training new reward models; only deterministic golden-truth and relative ranking rewarders ship in this scope.

## Stakeholders
- Product: Platform Enablement (Alex Rivera).
- Engineering: Orchestrator Learning Systems (Jamie Chen).
- Design: CLI/DevEx (Priya Desai) — focuses on manifest readability rather than net-new UI.

## Metrics & Guardrails
- Success is defined as three consecutive TF-GRPO epochs running with at least 95% of sampled prompts producing stamped experiences and per-epoch metrics recorded under `.runs/0506-tfgrpo-integration/metrics/`.
- Guardrails: reject any `groupSize < 2` before scheduling, cap experiences at 32 words, log cost/token deltas per epoch, ensure rewarders emit both GT and relative ranking scores, and run `node scripts/spec-guard.mjs --dry-run` before each review.

## User Experience
### Users & Scenarios
- Platform engineers configure `codex.orchestrator.json` and launch `npx codex-orchestrator start --pipeline tfgrpo-learning`, expecting three epochs with stamped experiences in prompts.
- Evaluation owners run `npm run eval:test` under the new TF-GRPO env overrides to verify rewarders and metrics prior to shipping.
- Reviewers open `.runs/<task>/cli/<run-id>/manifest.json` to confirm per-epoch stats and see which experiences were injected.

### UX Flow
1. Export `MCP_RUNNER_TASK_ID=0506-tfgrpo-integration` and run the `tfgrpo-learning` pipeline (added to `codex.orchestrator.json:1-37`).
2. The CLI schedules G≥2 instances, loops through three epochs (~100 sampled prompts), and records tool/token/cost/latency metrics each epoch.
3. After each epoch, rewarders assign absolute (GT) and relative-rank scores, the Experience Store stamps ≤32-word summaries, and prompt packs refresh before the next loop.
4. Final manifests include aggregated metrics, rewarder outcomes, and references to injected experiences.

## Technical Considerations
### Functional Requirements
- Persist a normalized `ExperienceRecord` alongside run summaries, tagged by domain, tool stats, and reward signals; reject unstamped entries.
- Load stamped prompt-pack manifests, assemble per-domain instructions, and inject top-N experiences into `.agent/prompts/**` before each builder invocation.
- Enable TaskManager to iterate `plan.items` where multiple runnable subtasks exist, gating group execution behind `FEATURE_TFGRPO_GROUP`.
- Introduce TF-GRPO learning schedule hooks in `evaluation/harness/index.ts:276-319` to loop three epochs and apply temperature schedule (0.7 train, 0.3 eval).
- Add GT and relative-ranking rewarders into `evaluation/harness/types.ts:15-77` definitions and scoring pipeline.
- Capture per-tool metrics from `orchestrator/src/cli/exec/command.ts:132-218`, emit them via metrics recorder/aggregator, and forward cost/latency to OTEL exporter.
- Reject request-builder inputs with `groupSize < 2` and set scheduler fan-out to at least two assignments before invoking `orchestrator/src/scheduler/plan.ts:19-122`.

### Non-Functional Requirements
- Experience writes must complete within 200 ms per record by reusing `TaskStateStore.writeAtomic` logic.
- Rewarder execution must not add more than 10% overhead to evaluation harness runtime.
- Metrics aggregation must remain streaming-friendly: per-epoch entries write to JSONL without requiring the full history in memory.
- Prompt pack hashing should remain deterministic so manifest diffs show concrete changes.

### Interfaces & Data
- `ExperienceRecord` (new module, extends `RunSummary`) stores `runId`, `epoch`, `groupId`, `summary32`, `reward`, `toolStats`, and `stampSignature`; persisted alongside `TaskStateSnapshot`.
- `PromptPackManifest` enumerates system/inject/summarize/extract/optimize prompts referencing stamped sources inside `.agent/prompts/**` and `packages/orchestrator/src/instructions/loader.ts:16-40`.
- Rewarders expose `evaluate(observation: RewardContext): Promise<RewardScore>` with `rewarderId`, `score`, and `evidencePath` fields recorded in manifests.
- Metrics entries add `epoch`, `group_size`, `tool_calls`, `token_total`, `cost_usd`, `latency_ms`, and per-tool breakdown arrays.

### Acceptance Criteria
- Tests listed in the TASKS checklist (see `tasks/tasks-0506-tfgrpo.md`) pass, covering prompt pack routing, experience storage, trajectory summarization, rewarders, learning schedule, guardrails, metrics, and grouped runners.
- TF-GRPO manifests include: (a) three epoch entries, (b) stamped experience references, (c) GT + relative rewards, (d) per-tool metrics, and (e) scheduler assignments ≥2.
- `codex.orchestrator.json` contains the `tfgrpo-learning` pipeline with the documented temperature/sample knobs.

### Risks & Mitigations
- **Metric inflation:** risk of duplicated per-epoch writes mitigated by gating recorder flushes on epoch IDs inside `metricsRecorder.ts`.
- **Experience drift:** storing more than 32 words could leak sensitive content; enforce truncation plus stamping verification inside the Experience Store.
- **Schedulability:** multi-instance fan-out may starve other pipelines; mitigate by making `FEATURE_TFGRPO_GROUP` opt-in and logging assignments in manifests.
- **Rewarder determinism:** relative ranking could oscillate with odd sample counts; fix by requiring ≥2 comparable items per cohort and logging tie-break rules.

## Documentation & Evidence
- Primary Doc: this file.
- Tech Spec: `docs/TECH_SPEC-tfgrpo-integration.md`.
- Checklist Mirror: `tasks/tasks-0506-tfgrpo.md` and `.agent/task/0506-tfgrpo-integration.md` (create during implementation).
- Run Manifest Link: capture first `tfgrpo-learning` execution under `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json`.
- Metrics / State Snapshots: `.runs/0506-tfgrpo-integration/metrics.json`, `out/0506-tfgrpo-integration/state.json` (populated during dry runs).

## Open Questions
- Should experience pruning be FIFO, score-weighted, or both? Current recommendation is score-weighted but needs confirmation from Product.
- Do we need per-tool cost ceilings before recording experiences, or is manifest logging sufficient?

## Approvals
- Product: Platform Enablement (target sign-off 2025-11-18).
- Engineering: Orchestrator Learning Systems (peer review scheduled with Jamie Chen, 2025-11-19).
- Design: CLI/DevEx (Priya Desai reviewing manifest examples during implementation).
