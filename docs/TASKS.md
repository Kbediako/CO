# Task List Snapshot — Orchestrator Workspace

- **Update — 2025-11-06:** Snakes Arena game assets were extracted from this repository and archived under `/Users/asabeko/Documents/snakes-arena-backup`; the remaining pipelines cover orchestrator diagnostics, linting, testing, and spec guard validation only.

## Checklist Mirror
The Snakes Arena checklist has been retired from this workspace; reference the archived manifests in `/Users/asabeko/Documents/snakes-arena-backup/.runs/` if historical evidence is needed.

> _Guardrail note:_ Minimal diagnostics or smoke-test pipelines can opt out of spec-guard enforcement by setting `guardrailsRequired: false` in their pipeline definition (e.g., inside `codex.orchestrator.json`). Standard design pipelines keep `node scripts/spec-guard.mjs --dry-run` inline so manifests such as `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json` continue to record guardrail evidence automatically.

# Task List Snapshot — Design Reference Pipeline (0401-design-reference)

- **Update — Pending kickoff:** Await first diagnostics run to seed `.runs/0401-design-reference/cli/<run-id>/manifest.json` and `out/0401-design-reference/design/runs/<run>.json`.
- **Update — Configuration planning:** `design.config.yaml` schema drafted alongside pipeline toggles documentation; manifest placeholder `<manifest-path>` to be swapped in once reviewed.
- **Notes:** Optional tool setup lives behind `npm run setup:design-tools`; retention/expiry policies will reference `design.config.yaml > metadata.design.retention`.

## Checklist Mirror
Mirror status with `tasks/design-reference-pipeline.md` and `.agent/task/design-reference-pipeline.md`. Keep `[ ]` until a manifest path such as `.runs/0401-design-reference/cli/<run-id>/manifest.json` is recorded.

### Foundation
- [ ] Collateral synchronized — `docs/design/PRD-design-reference-pipeline.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/index.json`, `.agent/task/design-reference-pipeline.md`, `docs/TASKS.md`; Evidence: `<manifest-path>`.
- [x] Pipeline toggles wired — `design.config.yaml` template + CLI/ENV triggers (`--pipeline design-reference`, `DESIGN_PIPELINE=1`) documented; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Setup tooling — `npm run setup:design-tools` captures Playwright/FFmpeg optional installs without impacting baseline CI; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Pipeline Stages
- [x] Playwright extractor implemented — stages DOM/CSS/screenshots with privacy approvals logged; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reference page builder shipped — `motherduck.html` staged under `design/reference/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Componentization stage delivered — `packages/design-system` assets staged under `design/components/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Advanced assets optionality — Framer Motion + FFmpeg outputs gated by config quotas; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Manifest & Guardrails
- [x] Manifest schema updates — `packages/shared/manifest/types.ts` + `packages/shared/manifest/writer.ts` persist `design_artifacts`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] DesignArtifactWriter output — `out/0401-design-reference/design/runs/<run>.json` summary written with retention/privacy fields; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Retention & privacy controls — expiry automation/docs and approval logging established; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Guardrail integration — `scripts/spec-guard.mjs` covers `docs/design/specs/**`; `npm --prefix packages/design-system run test:visual` hooked into pipeline; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Verification & Approvals
- [x] Visual regression evidence — diff artifacts + pass/fail summaries staged under `design/visual-regression/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start diagnostics --pipeline design-reference --format json`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [ ] Reviewer hand-off — `npm run review` references latest design-reference manifest and approvals; Evidence: `<manifest-path>`.

# Task List Snapshot — Hi-Fi Design Toolkit (0410-hi-fi-design-toolkit)

- **Update — Pending kickoff:** PRD, spec, and task mirrors drafted; awaiting diagnostics run to capture `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json`.
- **Update — External toolkit:** Autonomous hi-fi design starter will be synchronized into this repo with compliance permits before extractor work begins.
- **Notes:** Always export `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` so manifests, metrics, and out files land under the correct directories.

## Checklist Mirror
Mirror status with `tasks/hi-fi-design-toolkit.md` and `.agent/task/hi-fi-design-toolkit.md`. Keep `[ ]` until a manifest path such as `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` is recorded.

### Foundation
- [x] Collateral minted — `docs/design/PRD-hi-fi-design-toolkit.md`, `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`, `tasks/index.json`, `.agent/task/hi-fi-design-toolkit.md`, `docs/TASKS.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] External toolkit synchronized — vendored `/home/jr_ga/code/ASABEKO/autonomous-hi-fi-design-starter` with snapshot metadata in `packages/design-reference-tools/VENDOR.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] Compliance permits imported — `compliance/permit.json` mirrors upstream approvals and is referenced by docs; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.

### Pipeline Enablement
- [x] Extractor stage wired — `scripts/design/pipeline/toolkit/extract.ts` enforces permits + approvals and stages context assets; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Tokens + style guide stage — `tokens.ts` + styleguide wrapper emit token bundles + markdown docs with manifest metrics; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reference & self-correction stage — `reference.ts` + optional `self-correct` loops capture diff reductions + FFmpeg approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Publish integration — toolkit outputs merged into `packages/design-system` with `npm --prefix packages/design-system run test:visual` logged; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

### Guardrails & Evidence
- [x] Spec guard stage embedded — `design-spec-guard` runs `node scripts/spec-guard.mjs --dry-run` inside the hi-fi diagnostics pipeline before artifact writes; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Manifest/schema updates — `design_toolkit_artifacts` + summary persisted to manifests and `out/0410-hi-fi-design-toolkit/design/runs/<run>.json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Retention/privacy automation — retention window + purge command (`npm run design:purge-expired`) documented, approvals recorded; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start hi-fi-design-toolkit --format json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reviewer hand-off — `npm run review` cites latest toolkit manifest and approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

# Task List Snapshot — More Nutrition Pixel Archive (0505-more-nutrition-pixel)

- **Update — 2025-11-09:** Hi-fi design toolkit run captured https://more-nutrition.webflow.io and logged manifest `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json` with full stage telemetry (interactions enabled for scroll/slider playback).
- **Update — Archive minted:** Toolkit outputs mirrored into `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` (context, tokens, style guide, reference, diffs) for desktop + mobile snapshots. *Note: directory pruned from the working copy on 2025-11-09 to keep the repo lean; rerun hi-fi pipeline to regenerate artifacts if needed.*
- **Notes:** Automated self-correction stopped at a 2.59% residual error rate; findings captured in `docs/findings/more-nutrition.md` to track spacing + slider gaps.

## Checklist Mirror
Mirror status with `tasks/0505-more-nutrition-pixel.md` and `.agent/task/0505-more-nutrition-pixel.md`. Keep `[ ]` until manifest + archive references are recorded.

### Capture & Evidence
- [x] Hi-fi pipeline run — `npx codex-orchestrator start hi-fi-design-toolkit --task 0505-more-nutrition-pixel --format json`; Evidence: `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json`.
- [x] Toolkit summary — `out/0505-more-nutrition-pixel/design/runs/2025-11-09T12-25-49-931Z-decf5ae1.json` logs approvals, breakpoints, token counts, and self-correction deltas.

### Artifacts & Findings
- [x] Archive staged — `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` copies `design-toolkit/{context,tokens,styleguide,reference,diffs}` *(local copy removed on 2025-11-09 cleanup; rerun capture to recreate)*.
- [x] Findings doc — `docs/findings/more-nutrition.md` lists residual parity gaps, diff metrics, and next actions referencing the same manifest.

### Documentation Sync
- [x] Mirrors refreshed — `tasks/index.json`, `tasks/0505-more-nutrition-pixel.md`, `.agent/task/0505-more-nutrition-pixel.md`, `docs/PRD.md`, `docs/TECH_SPEC.md`, and `docs/ACTION_PLAN.md` cite the manifest + archive path for Task 0505.

# Task List Snapshot — Codex Orchestrator Autonomy Enhancements (0303)

- **Update — 2025-11-05:** Multi-instance autonomy upgrade validation run recorded; manifest `.runs/autonomy-upgrade/cli/2025-11-05T13-30-00Z-upgrade/manifest.json` captures control-plane enforcement, scheduler fan-out, streaming handles, and privacy guard enforcement.
- **Update — 2025-11-06:** Efficiency optimizations (guard decision pruning, replay window reuse, stdio sliding buffer, `mergeSnapshot` O(1) append) validated; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.
- **Update — 2025-11-04:** Unified exec runtime (session manager + event streaming) completed; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- **Update — 2025-11-04:** CLI command stages now emit unified exec lifecycle events with streaming logs; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`.
- **Update — 2025-11-04:** Tool orchestrator layer implemented with manifest evidence `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
- **Update — 2025-11-04:** Diagnostics run `2025-11-04T01-59-37-568Z-8065982c` captured guardrail execution; manifest at `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- **Gate Status:** Planning approved — greenlight to begin ToolOrchestrator implementation. Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-46-22-699Z-8be8efb9/manifest.json`.
- **Notes:** Upgrade metrics recorded at `.runs/autonomy-upgrade/metrics.json` with aggregates in `.runs/autonomy-upgrade/metrics/post-rollout.json`, `.runs/autonomy-upgrade/metrics/completeness.json`, and MTTR delta tracked in `out/autonomy-upgrade/metrics/mttr-delta.json`. Legacy diagnostics remain at `.runs/0303-orchestrator-autonomy/metrics.json`; state snapshot refreshed at `out/0303-orchestrator-autonomy/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0303-orchestrator-autonomy.md` and `.agent/task/0303-orchestrator-autonomy.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

### Foundation
- [x] Synchronize collateral — `tasks/index.json`, `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md` reference Task 0303; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json` (diagnostics run 2025-11-03T23:58:59Z).
- [x] Prepare run directories — Initialize `.runs/0303-orchestrator-autonomy/cli/` via diagnostics run; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json`.
- [x] Environment defaults — `MCP_RUNNER_TASK_ID` exported in shell / CI and recorded in diagnostics manifest task id + approval profile; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (manifest records `approval_policy: read/edit/run/network`).

### Tool Orchestrator Layer
- [x] Implement centralized `ToolOrchestrator` service with approval cache reuse and sandbox retry policy; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
- [x] Persist approval/retry metadata into manifests (`toolRuns[].approvalSource`, `toolRuns[].retryCount`, `toolRuns[].sandboxState`) with unit coverage; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.

### Unified Exec Runtime
- [x] Build `ExecSessionManager` supporting reusable PTY handles, opt-out flows, and environment snapshots; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- [x] Update unified exec runner to emit `exec:begin|chunk|end` events, stream stdout/stderr under 64 KiB caps, and honor sandbox retries; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.

### CLI & SDK Interfaces
- [x] Ship `codex-orchestrator exec` command with `--json`, `--jsonl`, `--otel-endpoint`, and `--notify` support mirroring Codex CLI; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Extend Node.js SDK to spawn the exec command, stream JSONL events, and expose resume/retry helpers; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Telemetry & Notifications
- [x] Implement OTEL exporter module with graceful retry/backoff and manifest metrics; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Add notification hooks for summarized run events with configuration precedence (CLI > env > config); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Instruction Hierarchy & Schema
- [x] Deliver hierarchical instruction loader merging `AGENTS.md` → `docs/AGENTS.md` → `.agent/AGENTS.md`, recording hashes in manifest metadata; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Update manifest/config schemas for new fields and document JSONL event format; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Efficiency Optimizations
- [x] Prune `handle.decisions` along with the frame buffer to keep guard metadata bounded; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
- [x] Replay subscriptions and snapshots reuse the stored frame window (O(replayed frames) per observer); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
- [x] Replace quadratic stdio concatenation with an O(chunk) sliding window; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/shared/tests/StdioTracker.test.ts`.
- [x] Make `TaskStateStore.mergeSnapshot` O(1) for append-only runs while keeping replacements ordered; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `orchestrator/tests/TaskStateStore.test.ts`.
- [x] Diagnostics + guardrails rerun after efficiency fixes (`npm run test`, `node scripts/spec-guard.mjs --dry-run`); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.

### Verification & Guardrails
- [x] Run diagnostics (`npx codex-orchestrator start diagnostics --format json`) and record manifest link; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-44-59-137Z-de57c4d7/manifest.json`.
- [x] Guardrails — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures ready); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json` (diagnostics run captures guardrail execution summary).
- [x] Reviewer hand-off — Execute `npm run review` using latest manifest; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (review outcome “Skip for now” logged).

---

# Task List Snapshot — Orchestrator Resilience Hardening (0202)

- **Update — 2025-10-31:** Diagnostics run `2025-10-31T22-56-34-431Z-9574035c` succeeded; manifest recorded under `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- **Gate Status:** Resilience enhancements implemented; awaiting reviewer sign-off.
- **Notes:** Metrics appended to `.runs/0202-orchestrator-hardening/metrics.json`; state snapshot refreshed at `out/0202-orchestrator-hardening/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0202-orchestrator-hardening.md` and `.agent/task/0202-orchestrator-hardening.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

- Documentation Sync — `[x]` Collateral references Task 0202 and ties to diagnostics manifest; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Persistence Reliability — `[x]` Lock retry/backoff shipped with passing tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Heartbeat Safety — `[x]` Awaited heartbeat queue implemented; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Output Bounding — `[x]` Command buffer and error truncation verified via tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Guardrails & Review — `[x]` `spec-guard`, `npm run lint`, `npm run test`, and `npm run review` executed; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.

Update checklist entries with the exact `.runs/0202-orchestrator-hardening/cli/<run-id>/manifest.json` path once runs complete.

# Task List Snapshot — TF-GRPO Integration (0506)

- **Update — 2025-11-11:** Planning collateral (PRD, Tech Spec, checklist) drafted; waiting on first `tfgrpo-learning` diagnostics run to seed `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json` and metrics snapshots.
- **Gate Status:** TF-GRPO enablement in planning; implementation gated on Experience Store + prompt pack landing behind `FEATURE_TFGRPO_GROUP`.
- **Guardrails:** Enforce `G ≥ 2`, ≤32-word experiences, three epochs (~100 samples) with train temp 0.7 / eval temp 0.3, stamped instruction sources only, and `node scripts/spec-guard.mjs --dry-run` before review.

## Checklist Mirror
Mirror status with `tasks/tasks-0506-tfgrpo.md` and `.agent/task/0506-tfgrpo-integration.md`. Flip `[ ]` to `[x]` only after attaching the manifest path (e.g., `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json`).

### PR-1 Prompt Packs & Loader
- [ ] Stamped prompt-pack manifests wired into `packages/orchestrator/src/instructions/loader.ts`; tests: `packages/orchestrator/tests/instructions/PromptPackLoader.test.ts`, `orchestrator/tests/InstructionsLoader.test.ts`. Evidence pending first tfgrpo-learning dry run.

### PR-2 Metrics (Per-Tool & Per-Epoch)
- [x] Emit per-tool, per-epoch token/cost/latency metrics via exec command → recorder/aggregator/OTEL; tests: `orchestrator/tests/MetricsAggregator.test.ts`, `orchestrator/tests/ExecCommand.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-3 Experience Store & Injection
- [x] Persist ≤32-word stamped experiences and inject them into prompt packs; tests: `orchestrator/tests/ExperienceStore.test.ts`, `orchestrator/tests/PromptExperienceInjection.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-4 Trajectory Summary & Optimizer
- [x] Summarize exec events into trajectory frames, stamp, and re-inject; tests: `orchestrator/tests/ExecCommand.test.ts`, `orchestrator/tests/ExperienceStore.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-5 Rewarders (GT + Relative Rank)
- [ ] Evaluation harness exposes deterministic GT + relative ranking rewarders; tests: `evaluation/tests/harness.test.ts` (RewarderExactMatch, RelativeRankingRewarder suites).

### PR-6 Learning Schedule
- [ ] Three-epoch (~100 sample) schedule with temperature overrides and tfgrpo-learning pipeline wiring; tests: `evaluation/tests/harness.test.ts` (LearningScheduleLoop), `orchestrator/tests/ControlPlaneValidator.test.ts` (PipelineTemperatureConfig).

### PR-7 Config Guardrails
- [ ] Request builder enforces `groupSize ≥ 2` and instruction loader filters stamped sources; tests: `orchestrator/tests/ControlPlaneValidator.test.ts`, `packages/orchestrator/tests/instructions/InstructionGuard.test.ts`.

### PR-8 Group Runner (Feature Flagged)
- [ ] TaskManager + Scheduler run grouped subtasks when `FEATURE_TFGRPO_GROUP` is set; tests: `orchestrator/tests/TaskManager.test.ts`, `orchestrator/tests/SchedulerPlan.test.ts`.

- **Update — 2025-11-11:** First exec validation for TF-GRPO metrics/experiences recorded under `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`; awaiting full tfgrpo-learning diagnostics loop to populate per-epoch metrics snapshots.

### Verification & Guardrails
- [x] Diagnostics / tfgrpo-learning pipeline run recorded under `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.
- [ ] Guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures exist).
- [ ] Reviewer hand-off via `npm run review` referencing the latest TF-GRPO manifest.
