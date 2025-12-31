# Task Archive — 2025

- Generated: 2025-12-31T03:19:11.179Z
- Source: docs/TASKS.md on main
- Policy: docs/tasks-archive-policy.json
# Task List Snapshot — Docs Hygiene Automation & Review Handoff Gate (0906)

- **Update — Implementation complete:** Deterministic `docs:check`/`docs:sync` tooling landed and CI-gated; workflow docs require `npm run docs:check` then `npm run review` after validations — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0906-docs-hygiene-automation` before orchestrator commands. Guardrails required (in order): `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run review`.

<!-- docs-sync:begin 0906-docs-hygiene-automation -->
## Checklist Mirror
Mirror status with `tasks/tasks-0906-docs-hygiene-automation.md` and `.agent/task/0906-docs-hygiene-automation.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this commit.
- [x] Capture implementation gate manifest — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0906-docs-hygiene-automation/metrics.json`, `out/0906-docs-hygiene-automation/state.json`.
- [x] Mirrors updated with manifest links (`docs/TASKS.md`, `.agent/task/0906-docs-hygiene-automation.md`, `tasks/index.json`) — Evidence: this commit + `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.

### Docs hygiene tool
- [x] Add `docs:check` (deterministic lint for agentic docs) — Files: `scripts/**`, `package.json`, `.github/workflows/core-lane.yml`; Acceptance: CI fails on doc drift; Evidence: this commit.
- [x] Add `docs:sync` (safe mirror sync for active task only) — Acceptance: updates `.agent/task/<task-id>.md` and `docs/TASKS.md` idempotently; Evidence: this commit.

### Workflow docs (review handoff gate)
- [x] Require `npm run review` after implementation guardrails in the agent-facing workflow docs — Acceptance: `AGENTS.md`, `.agent/system/conventions.md`, `.ai-dev-tasks/process-task-list.md` all reflect the same sequence; Evidence: this commit.

### Guardrails & handoff
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run docs:check` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
<!-- docs-sync:end 0906-docs-hygiene-automation -->

# Task List Snapshot — PlusX 15th Anniversary Hi-Fi Clone (0520-15th-plus-hi-fi)

- **Update — 2025-11-14:** Toolkit re-run captured https://15th.plus-ex.com with runtime canvas/font propagation, ScrollSmoother loader macro, and manifest `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`.
- **Update — Archive refreshed:** `.runs/.../artifacts` copied into `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` before pruning the run directory; README + loader script live in `reference/plus-ex-15th/`.
- **Notes:** Compliance permit `plus-ex-15th-2025-11-14` allows live asset mirroring+ScrollSmoother unlock for localhost validation only.

## Checklist Mirror
Mirror status with `tasks/0520-15th-plus-hi-fi.md` and `.agent/task/0520-15th-plus-hi-fi.md`. Cite the manifest + archive when flipping statuses.

### Capture & Runtime Propagation
- [x] Hi-fi toolkit run — `npx codex-orchestrator start hi-fi-design-toolkit --task 0520-15th-plus-hi-fi --format json`; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`.
- [x] Runtime metadata — `design/state.json` shows `runtimeCanvasColors`, `resolvedFonts`, `interactionScriptPath`, `interactionWaitMs` for plus-ex-15th; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/design/state.json`.

### Archive & Reference
- [x] Artifacts mirrored — `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` retains `design-toolkit/{context,tokens,styleguide,reference,diffs,motion}`; `.runs/.../artifacts` pruned for hygiene.
- [x] Reference README + loader — `reference/plus-ex-15th/README.md` documents serve command + archive pointer, `reference/plus-ex-15th/scripts/loader-scroll-macro.js` ships DOM-ready ScrollSmoother unlock.

### Validation & Doc Mirrors
- [x] Local validation — `npx serve ... -l 4173` + Playwright probe logged `{\"unlocked\":\"true\",\"sectionCount\":40}`; grep confirms no `/assets/assets/**` references.
- [x] Mirrors updated — `tasks/index.json`, `tasks/0520-15th-plus-hi-fi.md`, `.agent/task/0520-15th-plus-hi-fi.md`, `docs/design/notes/2025-11-13-15th-plus.md`, and `docs/TASKS.md` cite manifest + archive.

<!-- docs-sync:begin 0907-evaluation-diff-match -->
## Checklist Mirror
Mirror status with `tasks/tasks-0907-evaluation-diff-match.md` and `.agent/task/0907-evaluation-diff-match.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0907-evaluation-diff-match.md`, `tasks/index.json`) — Evidence: this PR.

### Validation (current state)
- [x] Confirm `diff-match` is silently skipped by the harness — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm `agentTask` is currently unused/no-op — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm fixture mismatch for `backend-api-opt` (missing `package.json` / npm scripts) — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Capture `npm run eval:test` baseline result — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-08-54-880Z-a2571bb6/manifest.json`.

### Implementation
- [x] Add `diff-match` to `evaluation/harness/types.ts` (runtime + TS types) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] Make unknown assertion types fail loudly (no silent skips) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Implement `diff-match` evaluator — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Diff baseline vs final contents for the scoped path.
  - Normalize unified diff headers (support `@@ ... @@` placeholder).
  - Match policy documented (`substring` vs `exact`) and tested.
- [x] Add `agentTask` support (minimal `WRITE|path|content` interpreter) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Update scenario loader validation for `patternAssertions` and `agentTask` shape — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Add unit tests for `diff-match` normalization/matching and unknown assertion types — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.

### Fixture + scenario alignment
- [x] Bring `evaluation/fixtures/node-api-nplus1` to parity with adapter expectations — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Add `package.json` + `npm run test` script.
  - Add baseline N+1 implementation plus tests that fail until optimized.
- [x] Align `evaluation/scenarios/backend-api-opt.json` to the fixture — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Ensure `expectedDiff` matches the actual diff produced by the `agentTask` edit.
  - Ensure `agentTask` uses the fixture’s module format (`.js` extensions, TypeScript typing conventions) or update the fixture to match.
- [x] Add/extend `evaluation/tests/harness.test.ts` so `backend-api-opt` is exercised (and fails prior to implementation, passes after) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.

### Guardrails & handoff (required before requesting review)
- [x] Run orchestrator diagnostics with `MCP_RUNNER_TASK_ID=0907-evaluation-diff-match` and record the manifest path — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-00-54-205Z-86e8e277/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run eval:test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] `npm run docs:check` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
<!-- docs-sync:end 0907-evaluation-diff-match -->

# Task List Snapshot — PlusX 15th Anniversary Hi-Fi Clone (0520-15th-plus-hi-fi)

- **Update — 2025-11-14:** Toolkit re-run captured https://15th.plus-ex.com with runtime canvas/font propagation, ScrollSmoother loader macro, and manifest `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`.
- **Update — Archive refreshed:** `.runs/.../artifacts` copied into `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` before pruning the run directory; README + loader script live in `reference/plus-ex-15th/`.
- **Notes:** Compliance permit `plus-ex-15th-2025-11-14` allows live asset mirroring+ScrollSmoother unlock for localhost validation only.

## Checklist Mirror
Mirror status with `tasks/0520-15th-plus-hi-fi.md` and `.agent/task/0520-15th-plus-hi-fi.md`. Cite the manifest + archive when flipping statuses.

### Capture & Runtime Propagation
- [x] Hi-fi toolkit run — `npx codex-orchestrator start hi-fi-design-toolkit --task 0520-15th-plus-hi-fi --format json`; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`.
- [x] Runtime metadata — `design/state.json` shows `runtimeCanvasColors`, `resolvedFonts`, `interactionScriptPath`, `interactionWaitMs` for plus-ex-15th; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/design/state.json`.

### Archive & Reference
- [x] Artifacts mirrored — `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` retains `design-toolkit/{context,tokens,styleguide,reference,diffs,motion}`; `.runs/.../artifacts` pruned for hygiene.
- [x] Reference README + loader — `reference/plus-ex-15th/README.md` documents serve command + archive pointer, `reference/plus-ex-15th/scripts/loader-scroll-macro.js` ships DOM-ready ScrollSmoother unlock.

### Validation & Doc Mirrors
- [x] Local validation — `npx serve ... -l 4173` + Playwright probe logged `{\"unlocked\":\"true\",\"sectionCount\":40}`; grep confirms no `/assets/assets/**` references.
- [x] Mirrors updated — `tasks/index.json`, `tasks/0520-15th-plus-hi-fi.md`, `.agent/task/0520-15th-plus-hi-fi.md`, `docs/design/notes/2025-11-13-15th-plus.md`, and `docs/TASKS.md` cite manifest + archive.

<!-- docs-sync:begin 0907-evaluation-diff-match -->
## Checklist Mirror
Mirror status with `tasks/tasks-0907-evaluation-diff-match.md` and `.agent/task/0907-evaluation-diff-match.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0907-evaluation-diff-match.md`, `tasks/index.json`) — Evidence: this PR.

### Validation (current state)
- [x] Confirm `diff-match` is silently skipped by the harness — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm `agentTask` is currently unused/no-op — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm fixture mismatch for `backend-api-opt` (missing `package.json` / npm scripts) — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Capture `npm run eval:test` baseline result — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-08-54-880Z-a2571bb6/manifest.json`.

### Implementation
- [x] Add `diff-match` to `evaluation/harness/types.ts` (runtime + TS types) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] Make unknown assertion types fail loudly (no silent skips) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Implement `diff-match` evaluator — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Diff baseline vs final contents for the scoped path.
  - Normalize unified diff headers (support `@@ ... @@` placeholder).
  - Match policy documented (`substring` vs `exact`) and tested.
- [x] Add `agentTask` support (minimal `WRITE|path|content` interpreter) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Update scenario loader validation for `patternAssertions` and `agentTask` shape — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Add unit tests for `diff-match` normalization/matching and unknown assertion types — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.

### Fixture + scenario alignment
- [x] Bring `evaluation/fixtures/node-api-nplus1` to parity with adapter expectations — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Add `package.json` + `npm run test` script.
  - Add baseline N+1 implementation plus tests that fail until optimized.
- [x] Align `evaluation/scenarios/backend-api-opt.json` to the fixture — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Ensure `expectedDiff` matches the actual diff produced by the `agentTask` edit.
  - Ensure `agentTask` uses the fixture’s module format (`.js` extensions, TypeScript typing conventions) or update the fixture to match.
- [x] Add/extend `evaluation/tests/harness.test.ts` so `backend-api-opt` is exercised (and fails prior to implementation, passes after) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.

### Guardrails & handoff (required before requesting review)
- [x] Run orchestrator diagnostics with `MCP_RUNNER_TASK_ID=0907-evaluation-diff-match` and record the manifest path — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-00-54-205Z-86e8e277/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run eval:test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] `npm run docs:check` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
<!-- docs-sync:end 0907-evaluation-diff-match -->

<!-- docs-sync:begin 0908-diff-budget-followups -->
## Checklist Mirror
Mirror status with `tasks/tasks-0908-diff-budget-followups.md` and `.agent/task/0908-diff-budget-followups.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Validation report captured — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0908-diff-budget-followups.md`) — Evidence: this PR.

### Validation (baseline)
- [x] Confirm CI runs diff budget but has no explicit label-based override wiring — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Confirm no automated tests exist for `scripts/diff-budget.mjs` — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Confirm `README.md` does not document diff-budget expectations or the recommended `NOTES="<goal + summary + risks>" npm run review` invocation — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.

### Follow-ups (implementation)

#### CI override path (without weakening default gate)
- [x] Add an explicit CI override path for diff-budget (PR label + required reason surfaced in logs). — Evidence: `.github/workflows/core-lane.yml:29`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `.github/workflows/core-lane.yml`, `scripts/diff-budget.mjs`
  - Acceptance:
    - With no override label, diff-budget failure fails CI (default gate stays strict).
    - With override label + reason present, CI exports `DIFF_BUDGET_OVERRIDE_REASON` and diff-budget exits successfully (with the override reason visible in logs).
    - With override label present but reason missing/empty, CI fails loudly with an actionable message.
  - Verification:
    - Add workflow-level checks (e.g., `echo` step summary) so the override is auditable from the run logs.

#### Diff-budget test coverage
- [x] Add tests for `scripts/diff-budget.mjs` (commit-scoped mode, untracked-too-large failure, ignore list, override reason). — Evidence: `tests/diff-budget.spec.ts:1`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `scripts/diff-budget.mjs`, `tests/` (new test file)
  - Acceptance:
    - Tests cover:
      - `--commit <sha>` mode
      - untracked-too-large measurement issue handling
      - ignore list behavior (`package-lock.json`, `.runs/`, `out/`, etc.)
      - override reason behavior (`DIFF_BUDGET_OVERRIDE_REASON`)
    - Tests run under `npm run test` and would fail if diff-budget regresses.

#### README updates (diff-budget + review handoff)
- [x] Update `README.md` to document diff-budget expectations and the recommended `NOTES="<goal + summary + risks>" npm run review` invocation. — Evidence: `README.md:154`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `README.md`, `scripts/run-review.ts`
  - Acceptance:
    - README documents: what diff-budget is, how CI selects base (`BASE_SHA`), how to run locally, and how to override with `DIFF_BUDGET_OVERRIDE_REASON`.
    - README documents the recommended `NOTES="<goal + summary + risks>" npm run review` handoff pattern.

### Guardrails & handoff (required before requesting review)
- [x] Implementation-gate run captured (spec-guard/build/lint/test/docs:check + review) — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
- [x] Guardrails pass — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
- [x] Reviewer handoff uses explicit context — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
<!-- docs-sync:end 0908-diff-budget-followups -->

# Task List Snapshot — Orchestrator Run Reporting Consistency (0909)

- Update - Implementation in progress: implementation-gate/guardrails captured at `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0909-orchestrator-run-reporting-consistency` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0909-orchestrator-run-reporting-consistency.md` and `.agent/task/0909-orchestrator-run-reporting-consistency.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Implementation-gate/guardrails manifest captured — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
- [x] PRD/spec/tasks mirrors updated — Evidence: this commit.
- [x] Mini-spec reviewed and approved — Evidence: `tasks/specs/0909-orchestrator-run-reporting-consistency.md`, `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.

### Fixes
- [x] Grouped run summaries reflect overall outcome.
- [x] Scheduler finalization avoids completed timestamps for running.
- [x] Metrics aggregation serialized per task with per-entry pending queue + stale lock cleanup.
- [x] Regression tests updated or added.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Build passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Docs check passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Diff budget passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Review run captured — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.

# Task List Snapshot - Docs Review Gate (0910)

- Update - Planning: PRD/tech spec/action plan/checklist drafted; docs-review manifest captured at `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0910-docs-review-gate` before orchestrator commands. Docs-review will run spec-guard, docs:check, and review with `SKIP_DIFF_BUDGET=1`.

<!-- docs-sync:begin 0910-docs-review-gate -->
## Checklist Mirror
Mirror status with `tasks/tasks-0910-docs-review-gate.md` and `.agent/task/0910-docs-review-gate.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: this commit.
- [x] Mirrors created (`docs/TASKS.md`, `.agent/task/0910-docs-review-gate.md`, `tasks/index.json`) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0910-docs-review-gate/metrics.json`, `out/0910-docs-review-gate/state.json`.
- [x] `tasks/index.json` gate metadata updated with docs-review manifest - Evidence: `tasks/index.json`, `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.

### Docs-review pipeline
- [x] Add docs-review pipeline to `codex.orchestrator.json` (spec-guard, docs:check, review). - Evidence: `codex.orchestrator.json`.
- [x] Set `SKIP_DIFF_BUDGET=1` for the docs-review review stage. - Evidence: `codex.orchestrator.json`.
- [x] Confirm docs-review runs capture the manifest evidence for the pre-implementation review. - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.

### Workflow docs and templates
- [x] Update `docs/AGENTS.md` to require docs-review evidence before implementation. - Evidence: `docs/AGENTS.md`.
- [x] Update task checklist templates to include docs-review and implementation review items. - Evidence: `.agent/task/templates/tasks-template.md`.
- [x] Update `.agent/system/conventions.md` and `.ai-dev-tasks/process-task-list.md` if needed for consistency. - Evidence: `.agent/system/conventions.md`, `.ai-dev-tasks/process-task-list.md`.

### Review handoffs
- [x] Pre-implementation docs review completed and recorded. - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.
- [x] Post-implementation review completed and recorded. - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T14-10-10-712Z-5c987b7e/manifest.json`.
<!-- docs-sync:end 0910-docs-review-gate -->
