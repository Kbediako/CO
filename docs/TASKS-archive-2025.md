# Task Archive — 2025

- Generated: 2025-12-31T06:15:38.865Z
- Source: docs/TASKS.md on main
- Policy: docs/tasks-archive-policy.json
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


# Task List Snapshot — Orchestrator Issue Validation & Prioritization (0901)

- **Update — Planning:** Validation docs prepared; awaiting first diagnostics/plan manifest under `.runs/0901-orchestrator-issue-validation/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0901-orchestrator-issue-validation` before orchestrator commands. Validation runs should keep guardrails on: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0901-orchestrator-issue-validation.md` and `.agent/task/<id>-<slug>.md` (create if automation requires). Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.
- [x] PRD/spec/tasks mirrors updated with manifest links — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.

### Validation
- [x] Issue #1 validated (sub‑pipeline error finalization) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #2 validated (CLI exec args passthrough) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #3 validated (session env override on reuse) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #4 validated (retry config clobbering) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #5 validated (`isIsoDate` strictness) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #6 validated (instruction stamp guard behavior) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #7 validated (timeout kill cross‑platform) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #8 validated (temp dir cleanup) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #9 validated (eslint plugin side‑effect build) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.

### Follow‑up Plan
- [x] Prioritized fix backlog created (new task/PR) with acceptance criteria — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.



# Task List Snapshot — Orchestrator Reliability Fixes (0902)

- **Update — Planning:** Follow‑on hardening task from 0901; implementation underway.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0902-orchestrator-reliability-fixes` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0902-orchestrator-reliability-fixes.md` and `.agent/task/0902-orchestrator-reliability-fixes.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0902-orchestrator-reliability-fixes/metrics.json`, `out/0902-orchestrator-reliability-fixes/state.json`.
- [x] PRD/spec/task mirrors updated with manifest links — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.

### Fixes
- [x] Issue #1 fixed: sub‑pipeline exceptions finalize parent manifests/stages — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #2 fixed: CLI exec executor forwards unified exec args — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #3 fixed: session reuse applies env overrides — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #4 fixed: retry defaults not clobbered by `undefined` spreads — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #5 fixed: `isIsoDate` enforces strict ISO‑8601 expectations — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #6 fixed: instruction loader warns+skips unstamped optional candidates — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #7 fixed: timeout kill is cross‑platform/Windows‑safe — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #8 fixed: temp dirs cleaned in crystalizer and SDK exec — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #9 fixed: eslint plugin no longer runs builds as side effects — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.


# Task List Snapshot — TaskStateStore Run History File Fix (0903)

- **Update — Planning:** Follow‑on from 0902 to remove TaskStateStore/metrics `state.json` collision.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0903-taskstate-store-run-history-fix` before orchestrator commands. Guardrails required.

## Checklist Mirror
Mirror status with `tasks/tasks-0903-taskstate-store-run-history-fix.md` and `.agent/task/0903-taskstate-store-run-history-fix.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0903-taskstate-store-run-history-fix/metrics.json`, `out/0903-taskstate-store-run-history-fix/state.json`.
- [x] PRD/spec/task mirrors updated with manifest links — Evidence: `tasks/tasks-0903-taskstate-store-run-history-fix.md`.

### Fix
- [x] TaskStateStore run history uses `runs.json` without overwriting metrics `state.json`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.


# Task List Snapshot — README vs Codebase Alignment (0904)

- **Update — Completed:** Diagnostics + guardrails captured at `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`; README/SOP docs aligned to current code behavior.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0904-readme-codebase-alignment` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0904-readme-codebase-alignment.md` and `.agent/task/0904-readme-codebase-alignment.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0904-readme-codebase-alignment/metrics.json`, `out/0904-readme-codebase-alignment/state.json`.
- [x] PRD/spec/tasks mirrors drafted — Evidence: this commit.

### Findings
- [x] High-impact mismatches reconciled (lint, stage targeting, review workflow) — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Remaining mismatches reconciled (paths, hi-fi toolkit docs, mirror workflow docs, cloud sync docs) — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.


# Task List Snapshot — Agentic Coding Readiness & Onboarding Hygiene (0905)

- **Update — Completed:** Diagnostics + guardrails captured at `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`; onboarding placeholders replaced and core CI lane enabled.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0905-agentic-coding-readiness` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0905-agentic-coding-readiness.md` and `.agent/task/0905-agentic-coding-readiness.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0905-agentic-coding-readiness/metrics.json`, `out/0905-agentic-coding-readiness/state.json`.
- [x] PRD/spec/tasks mirrors updated with manifest links — Evidence: this commit + `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.

### Deliverables
- [x] Replace `.agent/system/*` placeholders with repo-specific content — Evidence: this commit.
- [x] Replace `.ai-dev-tasks/*` placeholders with canonical workflow docs — Evidence: this commit.
- [x] Remove stale/non-standard subagent docs; ensure guidance is Codex-first and self-consistent — Evidence: this commit.
- [x] Enable CI workflow for core lane (build/lint/test/spec-guard) — Evidence: `.github/workflows/core-lane.yml`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Build passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.



# Task List Snapshot — Review Loop + DevTools Review Gate (0912)

- Update - Implementation complete: implementation-gate-devtools manifest captured at `.runs/0912-review-loop-devtools-gate/cli/2025-12-24T08-56-47-578Z-9b49e1ee/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0912-review-loop-devtools-gate` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0912-review-loop-devtools-gate.md` and `.agent/task/0912-review-loop-devtools-gate.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Implementation-gate-devtools manifest captured — Evidence: `.runs/0912-review-loop-devtools-gate/cli/2025-12-24T08-56-47-578Z-9b49e1ee/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0912-review-loop-devtools-gate/metrics.json`, `out/0912-review-loop-devtools-gate/state.json`.
- [x] Mirrors updated — Evidence: this commit + manifest above.

### Workflow updates
- [x] DevTools review gate pipeline wired — Evidence: `codex.orchestrator.json`, `scripts/run-review.ts`, `scripts/codex-devtools.sh`.
- [x] Review-loop SOP added and linked in agent docs — Evidence: `.agent/SOPs/review-loop.md`, `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.
- [x] NOTES required for review handoff with optional questions template — Evidence: `scripts/run-review.ts`, `README.md`, `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/review-loop.md`.
- [x] Prompt installer added for onboarding — Evidence: `scripts/setup-codex-prompts.sh`, `README.md`.

### Guardrails & handoff
- [x] Spec-guard/build/lint/test/docs:check/diff-budget/review recorded — Evidence: `.runs/0912-review-loop-devtools-gate/cli/2025-12-24T08-56-47-578Z-9b49e1ee/manifest.json`.


# Task List Snapshot — Orchestrator Refactor Roadmap (0913)

- Notes: Export `MCP_RUNNER_TASK_ID=0913-orchestrator-refactor-roadmap` before orchestrator commands.

<!-- docs-sync:begin 0913-orchestrator-refactor-roadmap -->
## Checklist Mirror
Mirror status with `tasks/tasks-0913-orchestrator-refactor-roadmap.md` and `.agent/task/0913-orchestrator-refactor-roadmap.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0913-orchestrator-refactor-roadmap.md`, `tasks/index.json`) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0913-orchestrator-refactor-roadmap/metrics.json` (JSONL), `out/0913-orchestrator-refactor-roadmap/state.json`.
- [x] `tasks/index.json` gate metadata updated with implementation gate manifest - Evidence: `tasks/index.json`, `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T09-46-07-459Z-704d0f35/manifest.json`.

### Refactor phases (implementation roadmap)
- [x] Phase 1: Manifest correctness + atomic write safety (tests first, then refactor). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-33-05-345Z-a9de5673/manifest.json`.
- [x] Phase 2: Single-writer manifest persistence (coalescing persister; route direct `saveManifest` calls through it). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T09-10-07-477Z-d616c709/manifest.json`.
- [x] Phase 3: Bounded exec event capture (opt-in first; preserve full `.ndjson` logs/handles). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T09-21-58-308Z-786b9c13/manifest.json`.
- [x] Phase 4: Execution mode resolution consolidation (no behavior change; keep existing precedence). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T09-30-43-115Z-c8450274/manifest.json`.
- [x] Phase 5: Metrics + env hygiene (reduce metrics bloat; remove `process.env` leakage with compatibility window). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json`.

### Guardrails (for future implementation PRs)
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run build` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run lint` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run test` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run docs:check` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
<!-- docs-sync:end 0913-orchestrator-refactor-roadmap -->

# Task List Snapshot — Frontend Testing as Core Orchestrator Capability (0915)

- Update - Implementation complete: implementation-gate manifest captured at `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0915-frontend-testing-core` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0915-frontend-testing-core.md` and `.agent/task/0915-frontend-testing-core.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-frontend-testing-core.md`, `docs/TECH_SPEC-frontend-testing-core.md`, `docs/ACTION_PLAN-frontend-testing-core.md`, `tasks/specs/0915-frontend-testing-core.md`, `tasks/tasks-0915-frontend-testing-core.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T02-03-32-483Z-e2d52977/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0915-frontend-testing-core/metrics.json`, `out/0915-frontend-testing-core/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0915-frontend-testing-core.md`, and `tasks/index.json` - Evidence: `docs/TASKS.md`, `.agent/task/0915-frontend-testing-core.md`, `tasks/index.json`.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.

### Frontend Testing Surface
- [x] Add frontend testing pipelines (`frontend-testing`, `frontend-testing-devtools`) - Evidence: `codex.orchestrator.json`, manifest.
- [x] Add a frontend testing CLI entrypoint (compiled into `dist/**`).

### DevTools Enablement (Packaged)
- [x] Move devtools helper logic into runtime modules shipped in the npm package.

### Doctor Readiness
- [x] Extend `codex-orchestrator doctor` with DevTools readiness checks.

### Documentation
- [x] Update README and agent docs with frontend testing commands and enablement rules.

### Tests
- [x] Add tests for devtools default-off / explicit-on behavior.

### Guardrails & Handoff (post-implementation)
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.


# Task List Snapshot — Codex Orchestrator NPM Companion Package Publishability (0916)

- Update - Implementation complete: implementation-gate manifest captured at `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`; pack audit manifest at `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`; pack smoke manifest at `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-23-421Z-7c7bab9e/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0916-npm-companion-package-publishability` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0916-npm-companion-package-publishability.md` and `.agent/task/0916-npm-companion-package-publishability.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-npm-companion-package-publishability.md`, `docs/TECH_SPEC-npm-companion-package-publishability.md`, `docs/ACTION_PLAN-npm-companion-package-publishability.md`, `tasks/specs/0916-npm-companion-package-publishability.md`, `tasks/tasks-0916-npm-companion-package-publishability.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-40-22-001Z-96dbf5f0/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0916-npm-companion-package-publishability/metrics.json`, `out/0916-npm-companion-package-publishability/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0916-npm-companion-package-publishability.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-40-22-001Z-96dbf5f0/manifest.json`.

### Packaging & Tarball Controls
- [x] Update package publish metadata and allowlist - Evidence: `package.json`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] Add LICENSE file for publication - Evidence: `LICENSE`, manifest.
- [x] Add clean step and pack audit script - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
- [x] Tighten pack audit dist allowlist to runtime subtrees - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
- [x] Add pack smoke test for the tarball - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-23-421Z-7c7bab9e/manifest.json`.
- [x] Add CI gate for pack audit and smoke test - Evidence: `.github/workflows/release.yml`.

### Schema Resolution & Runtime Assets
- [x] Implement Pattern A resolver with fallback - Evidence: code + tests.
- [x] Ensure `schemas/manifest.json` is shipped and validated - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.

### CLI Companion Surface
- [x] Add `codex-orchestrator mcp serve`.
- [x] Enforce or verify downstream `codex` stdout stays protocol-only for `mcp serve`.
- [x] Replace user-facing MCP scripts with CLI subcommands - Evidence: CLI + docs updates.
- [x] Add `codex-orchestrator self-check --format json` - Evidence: CLI implementation + tests.
- [x] Add `codex-orchestrator --version` output - Evidence: CLI implementation + tests.
- [x] Verify shebang preservation and ESM consistency - Evidence: tests.
- [x] Enforce user-controlled run dirs for all CLI outputs - Evidence: code review + tests.
- [x] Ensure telemetry/network calls are disabled by default - Evidence: tests.

### Templates & Init
- [x] Add `templates/` with README disclaimer + version markers - Evidence: new templates.
- [x] Add `codex-orchestrator init codex` - Evidence: CLI implementation + tests.

### Optional Dependencies + Doctor
- [x] Move Playwright-class deps to optional peer deps and add dynamic loader - Evidence: package metadata + tests.
- [x] Add `codex-orchestrator doctor` - Evidence: CLI implementation + tests.

### Release Workflow
- [x] Add tag-driven release workflow - Evidence: workflow + release run.
- [x] Document release asset download fallbacks - Evidence: spec update.
- [x] Update README with companion package usage and release flow - Evidence: README change + manifest.

### Guardrails & Handoff (post-implementation)
- [x] `npm run review` is non-interactive in CI (flag/env enforced; fails fast on prompts).
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.


# Task List Snapshot — DevTools Readiness + Orchestrator Usage Discipline (0917)

- Update - Implementation complete: devtools readiness checks + setup helper shipped; guardrails captured at `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T23-17-34-838Z-d96e2cf4/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0917-devtools-readiness-orchestrator-usage` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0917-devtools-readiness-orchestrator-usage.md` and `.agent/task/0917-devtools-readiness-orchestrator-usage.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/metrics.json`, `out/0917-devtools-readiness-orchestrator-usage/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0917-devtools-readiness-orchestrator-usage.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`.

### Implementation
- [x] DevTools readiness checks + setup helper added — Evidence: `orchestrator/src/cli/utils/devtools.ts`, `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/devtoolsSetup.ts`, `bin/codex-orchestrator.ts`.
- [x] Orchestrator-first SOP + agent docs updated — Evidence: `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/AGENTS.md`, `docs/AGENTS.md`, `AGENTS.md`.
- [x] Tests added for readiness + setup flows — Evidence: `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/DevtoolsSetup.test.ts`, `orchestrator/tests/FrontendTestingRunner.test.ts` (vitest run 2025-12-30).
- [x] Guardrails complete — Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T23-17-34-838Z-d96e2cf4/manifest.json`.


# Task List Snapshot — Repo-wide Refactor Plan (0919)

- Update - Refactor plan drafted at `docs/REFRACTOR_PLAN.md`; docs-review manifest captured at `.runs/0919-refactor-plan/cli/2025-12-30T21-31-09-111Z-12be34c7/manifest.json`; implementation-gate manifest captured at `.runs/0919-refactor-plan/cli/2025-12-30T21-51-39-458Z-a9a82bc7/manifest.json`.



# Task List Snapshot — Subagent Delegation Enforcement (0918)

- Update - Implementation complete: docs-review + implementation gate captured at `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-39-51-110Z-97be9496/manifest.json` and `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0918-subagent-delegation-enforcement` before orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0918-subagent-delegation-enforcement.md` and `.agent/task/0918-subagent-delegation-enforcement.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: this commit.
- [x] Subagent docs-review run captured - Evidence: `.runs/0918-subagent-delegation-enforcement-docs/cli/2025-12-30T16-38-34-482Z-000d8b75/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-39-51-110Z-97be9496/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0918-subagent-delegation-enforcement/metrics.json`, `out/0918-subagent-delegation-enforcement/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0918-subagent-delegation-enforcement.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.

### Implementation
- [x] Delegation guard script added — Evidence: `scripts/delegation-guard.mjs`.
- [x] Pipelines updated to run delegation guard — Evidence: `codex.orchestrator.json`.
- [x] Agent guidance and SOPs updated for mandatory delegation — Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/SOPs/meta-orchestration.md`.
- [x] Templates updated to require subagent evidence — Evidence: `.agent/task/templates/tasks-template.md`, `.agent/task/templates/subagent-request-template.md`.

### Guardrails & handoff
- [x] Guardrails complete — Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.


# Task List Snapshot — Documentation Freshness Sweep (0921)

- Update - Docs freshness sweep complete; post-change docs-review manifest recorded at `.runs/0921-docs-freshness-sweep/cli/2025-12-31T00-16-17-694Z-323952cf/manifest.json`.

<!-- docs-sync:begin 0921-docs-freshness-sweep -->
## Checklist Mirror
Mirror status with `tasks/tasks-0921-docs-freshness-sweep.md` and `.agent/task/0921-docs-freshness-sweep.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0921-prd-docs-freshness-sweep.md`, `docs/PRD-docs-freshness-sweep.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-docs-freshness-sweep.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-docs-freshness-sweep.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0921-docs-freshness-sweep.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0921-docs-freshness-sweep/cli/2025-12-30T23-47-14-831Z-435ea063/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0921-docs-freshness-sweep.md` - Evidence: `docs/TASKS.md`, `.agent/task/0921-docs-freshness-sweep.md`.

### Docs audit + updates
- [x] Docs-hygiene check run and issues triaged - Evidence: `.runs/0921-docs-freshness-sweep/cli/2025-12-31T00-16-17-694Z-323952cf/manifest.json`.
- [x] Stale references updated (paths/scripts/placeholders) - Evidence: `docs/TECH_SPEC-agentic-coding-readiness.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`.
- [x] Spec review metadata refreshed as needed - Evidence: `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/specs/0921-docs-freshness-sweep.md`.

### Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0921-docs-freshness-sweep/cli/2025-12-31T00-16-17-694Z-323952cf/manifest.json`.

## Relevant Files
- `docs/PRD-docs-freshness-sweep.md`
- `docs/TECH_SPEC-docs-freshness-sweep.md`
- `docs/ACTION_PLAN-docs-freshness-sweep.md`
- `tasks/specs/0921-docs-freshness-sweep.md`

## Subagent Evidence
- `.runs/0921-docs-freshness-sweep-audit/cli/2025-12-30T23-46-16-546Z-80d99bd8/manifest.json` (docs-review guardrail run).
<!-- docs-sync:end 0921-docs-freshness-sweep -->

# Task List Snapshot — Docs Freshness Systemization (0922)

- Update - Implementation complete; implementation-gate manifest captured at `.runs/0922-docs-freshness-systemization/cli/2025-12-31T01-47-16-423Z-a744a2c1/manifest.json` (diff budget override recorded).
- Update - Review agent docs-review run succeeded at `.runs/0922-docs-freshness-systemization-review/cli/2025-12-31T01-00-39-132Z-2653b56a/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0922-docs-freshness-systemization` before orchestrator commands.

<!-- docs-sync:begin 0922-docs-freshness-systemization -->
## Checklist Mirror
Mirror status with `tasks/tasks-0922-docs-freshness-systemization.md` and `.agent/task/0922-docs-freshness-systemization.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0922-prd-docs-freshness-systemization.md`, `docs/PRD-docs-freshness-systemization.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-docs-freshness-systemization.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-docs-freshness-systemization.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0922-docs-freshness-systemization.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0922-docs-freshness-systemization/cli/2025-12-31T00-42-33-187Z-aad19fd0/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0922-docs-freshness-systemization.md` - Evidence: `docs/TASKS.md`, `.agent/task/0922-docs-freshness-systemization.md`.

### Systemization design
- [x] Docs registry schema defined and seeded - Evidence: `docs/docs-freshness-registry.json`.
- [x] Freshness audit script implemented - Evidence: `scripts/docs-freshness.mjs`.
- [x] `npm run docs:freshness` wired - Evidence: `package.json`.
- [x] Freshness report output defined - Evidence: `docs/TECH_SPEC-docs-freshness-systemization.md`.

### Pipeline integration
- [x] `docs-review` includes docs-freshness stage - Evidence: `codex.orchestrator.json`.
- [x] `implementation-gate` includes docs-freshness stage - Evidence: `codex.orchestrator.json`.
- [x] Agent docs updated with the new audit step - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.

### Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0922-docs-freshness-systemization/cli/2025-12-31T01-19-09-402Z-2a0217a3/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0922-docs-freshness-systemization/cli/2025-12-31T01-47-16-423Z-a744a2c1/manifest.json`.

## Relevant Files
- `docs/PRD-docs-freshness-systemization.md`
- `docs/TECH_SPEC-docs-freshness-systemization.md`
- `docs/ACTION_PLAN-docs-freshness-systemization.md`
- `tasks/specs/0922-docs-freshness-systemization.md`

## Subagent Evidence
- `.runs/0922-docs-freshness-systemization-audit/cli/2025-12-31T00-42-01-230Z-ed54d009/manifest.json` (docs-review guardrail run).
- `.runs/0922-docs-freshness-systemization-review/cli/2025-12-31T01-00-39-132Z-2653b56a/manifest.json` (review agent docs-review run).
<!-- docs-sync:end 0922-docs-freshness-systemization -->

# Task List Snapshot — Docs Freshness Date Validation (0923)

- Update - Pre-change docs-review manifest captured at `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-34-45-786Z-8652d794/manifest.json` (delegation guard override recorded).
- Update - Post-change docs-review manifest captured at `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-40-46-229Z-1f8b81a5/manifest.json`.
- Update - Implementation-gate manifest captured at `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-41-19-365Z-8a773ab1/manifest.json`.
- Update - Review agent docs-review run succeeded at `.runs/0923-docs-freshness-date-validation-review/cli/2025-12-31T02-40-12-873Z-2ef0b53f/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0923-docs-freshness-date-validation` before orchestrator commands.

<!-- docs-sync:begin 0923-docs-freshness-date-validation -->
## Checklist Mirror
Mirror status with `tasks/tasks-0923-docs-freshness-date-validation.md` and `.agent/task/0923-docs-freshness-date-validation.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0923-prd-docs-freshness-date-validation.md`, `docs/PRD-docs-freshness-date-validation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-docs-freshness-date-validation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-docs-freshness-date-validation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0923-docs-freshness-date-validation.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-34-45-786Z-8652d794/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0923-docs-freshness-date-validation.md` - Evidence: `docs/TASKS.md`, `.agent/task/0923-docs-freshness-date-validation.md`.
- [x] Delegation guard override recorded for pre-change docs-review - Evidence: `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-34-45-786Z-8652d794/manifest.json`.

### Implementation
- [x] Strict `last_review` validation implemented - Evidence: `scripts/docs-freshness.mjs`.
- [x] Docs updated to note strict date validation - Evidence: `docs/TECH_SPEC-docs-freshness-date-validation.md`.
- [x] Docs freshness registry updated for new task docs - Evidence: `docs/docs-freshness-registry.json`.

### Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-40-46-229Z-1f8b81a5/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-41-19-365Z-8a773ab1/manifest.json`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0923-docs-freshness-date-validation-review/cli/2025-12-31T02-40-12-873Z-2ef0b53f/manifest.json`.

## Relevant Files
- `docs/PRD-docs-freshness-date-validation.md`
- `docs/TECH_SPEC-docs-freshness-date-validation.md`
- `docs/ACTION_PLAN-docs-freshness-date-validation.md`
- `tasks/specs/0923-docs-freshness-date-validation.md`

## Subagent Evidence
- `.runs/0923-docs-freshness-date-validation-review/cli/2025-12-31T02-40-12-873Z-2ef0b53f/manifest.json` (review agent docs-review run).
<!-- docs-sync:end 0923-docs-freshness-date-validation -->

# Task List Snapshot — Tasks Archive Policy (0924)

- Update - Pre-change docs-review manifest captured at `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-13-05-921Z-731779ca/manifest.json` (delegation guard override recorded).
- Update - Post-change docs-review manifest captured at `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-44-10-466Z-162524c7/manifest.json`.
- Update - Implementation-gate manifest captured at `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-44-46-114Z-0005ee2c/manifest.json` (diff budget override recorded).
- Update - Review agent docs-review run succeeded at `.runs/0924-tasks-archive-policy-review/cli/2025-12-31T03-24-18-440Z-4aef69f1/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0924-tasks-archive-policy` before orchestrator commands.

<!-- docs-sync:begin 0924-tasks-archive-policy -->
## Checklist Mirror
Mirror status with `tasks/tasks-0924-tasks-archive-policy.md` and `.agent/task/0924-tasks-archive-policy.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0924-prd-tasks-archive-policy.md`, `docs/PRD-tasks-archive-policy.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-tasks-archive-policy.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-tasks-archive-policy.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0924-tasks-archive-policy.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-13-05-921Z-731779ca/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0924-tasks-archive-policy.md` - Evidence: `docs/TASKS.md`, `.agent/task/0924-tasks-archive-policy.md`.
- [x] Delegation guard override recorded for pre-change docs-review - Evidence: `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-13-05-921Z-731779ca/manifest.json`.

### Archive policy + tooling
- [x] Archive policy config added - Evidence: `docs/tasks-archive-policy.json`.
- [x] Archive script implemented - Evidence: `scripts/tasks-archive.mjs`.
- [x] `docs/TASKS.md` archive index added and initial archive run applied - Evidence: `docs/TASKS.md`, `out/0924-tasks-archive-policy/TASKS-archive-2025.md`.
- [x] Archive branch updated with payload - Evidence: `task-archives` branch commit `e2ac1a3`.

### Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-44-10-466Z-162524c7/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-44-46-114Z-0005ee2c/manifest.json`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0924-tasks-archive-policy-review/cli/2025-12-31T03-24-18-440Z-4aef69f1/manifest.json`.

## Relevant Files
- `docs/PRD-tasks-archive-policy.md`
- `docs/TECH_SPEC-tasks-archive-policy.md`
- `docs/ACTION_PLAN-tasks-archive-policy.md`
- `tasks/specs/0924-tasks-archive-policy.md`

## Subagent Evidence
- `.runs/0924-tasks-archive-policy-review/cli/2025-12-31T03-24-18-440Z-4aef69f1/manifest.json` (review agent docs-review run).
<!-- docs-sync:end 0924-tasks-archive-policy -->

# Task List Snapshot — Tasks Archive Automation (0925)

- Update - Pre-change docs-review manifest captured at `.runs/0925-tasks-archive-automation/cli/2025-12-31T04-49-55-774Z-bf7c0600/manifest.json` (delegation guard override recorded).
- Update - Post-change docs-review manifest captured at `.runs/0925-tasks-archive-automation/cli/2025-12-31T05-04-46-898Z-82dd0288/manifest.json`.
- Update - Implementation-gate manifest captured at `.runs/0925-tasks-archive-automation/cli/2025-12-31T05-05-34-058Z-6b103aff/manifest.json`.
- Update - Review agent docs-review run succeeded at `.runs/0925-tasks-archive-automation-review/cli/2025-12-31T05-03-45-338Z-0dcb0ceb/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0925-tasks-archive-automation` before orchestrator commands.

<!-- docs-sync:begin 0925-tasks-archive-automation -->
## Checklist Mirror
Mirror status with `tasks/tasks-0925-tasks-archive-automation.md` and `.agent/task/0925-tasks-archive-automation.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0925-prd-tasks-archive-automation.md`, `docs/PRD-tasks-archive-automation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-tasks-archive-automation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-tasks-archive-automation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0925-tasks-archive-automation.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0925-tasks-archive-automation/cli/2025-12-31T04-49-55-774Z-bf7c0600/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0925-tasks-archive-automation.md` - Evidence: `docs/TASKS.md`, `.agent/task/0925-tasks-archive-automation.md`.
- [x] Delegation guard override recorded for pre-change docs-review - Evidence: `.runs/0925-tasks-archive-automation/cli/2025-12-31T04-49-55-774Z-bf7c0600/manifest.json`.

### Automation workflow
- [x] Workflow added to run the archive script and open a PR - Evidence: `.github/workflows/tasks-archive-automation.yml`.
- [x] Archive payload sync to `task-archives` branch documented - Evidence: `docs/TECH_SPEC-tasks-archive-automation.md`.
- [x] Agent guidance updated for automation and fallback - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.

### Archive safety fix
- [x] Snapshot header match check added to the archive script - Evidence: `scripts/tasks-archive.mjs`.

### Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0925-tasks-archive-automation/cli/2025-12-31T05-04-46-898Z-82dd0288/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0925-tasks-archive-automation/cli/2025-12-31T05-05-34-058Z-6b103aff/manifest.json`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0925-tasks-archive-automation-review/cli/2025-12-31T05-03-45-338Z-0dcb0ceb/manifest.json`.

## Relevant Files
- `docs/tasks-archive-policy.json`
- `scripts/tasks-archive.mjs`
- `.github/workflows/tasks-archive-automation.yml`

## Subagent Evidence
- `.runs/0925-tasks-archive-automation-review/cli/2025-12-31T05-03-45-338Z-0dcb0ceb/manifest.json` (review agent docs-review run).
<!-- docs-sync:end 0925-tasks-archive-automation -->
