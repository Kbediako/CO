# Technical Spec — Orchestrator Issue Validation & Prioritization (Task 0901)

## Objective
Confirm, characterize, and prioritize nine reliability issues found in review, without implementing fixes yet. Produce reproducible evidence and clear acceptance criteria for a follow‑on hardening task.

## Validation Approach
For each issue, capture: reproduction steps, expected vs. actual behavior, severity/impact, and suggested fix direction. Evidence should be attached via manifests or targeted unit tests.

### 1) Sub‑pipeline error leaves manifest “running”
- **Hypothesis:** Exceptions thrown by `CodexOrchestrator.start()` in sub‑pipelines are not caught, leaving the parent `commands[i]` entry and manifest in an inconsistent state.
- **Validation:** Create a minimal pipeline with a subpipeline stage that throws (e.g., invalid pipeline id). Run `codex-orchestrator start <pipeline> --format json` and inspect parent manifest for a stuck `commands[].status === "running"` or missing finalization.
- **Expected:** Parent stage should be marked failed/skipped and manifest finalized with status/detail.

### 2) CLI exec ignores args
- **Hypothesis:** `cliExecutor` drops `request.args` when spawning.
- **Validation:** Run `codex-orchestrator exec -- echo foo bar` (and/or a unit test that passes args through `UnifiedExecRunner`) and verify only the base command is executed.
- **Expected:** Args should be passed to the spawned process or concatenated into shell correctly.

### 3) Reused sessions ignore env overrides
- **Hypothesis:** Reusing an existing session returns stale `envSnapshot`.
- **Validation:** Use unified exec with a persistent session id, first with `FOO=1`, then reuse with `FOO=2`; verify env observed by command remains `FOO=1`.
- **Expected:** Reuse should apply latest overrides or be explicitly documented as immutable.

### 4) Lock retry options clobbered by `undefined`
- **Hypothesis:** Spreading partial retry config overwrites defaults with `undefined`.
- **Validation:** Add/extend unit tests for `TaskStateStore` and `ExperienceStore` passing `{ lockRetry: { maxAttempts: undefined } }` and assert retries still use defaults.
- **Expected:** Undefined fields should not override defaults.

### 5) `isIsoDate` too permissive
- **Hypothesis:** Non‑ISO but parseable dates pass validation.
- **Validation:** Unit test `isIsoDate("01/02/2025")` and similar; verify current behavior vs. intended strictness in callers.
- **Expected:** `isIsoDate` returns `true` for at least one non‑ISO but parseable date string (e.g., `"01/02/2025"`), confirming a mismatch with callers that assume strict ISO‑8601.

### 6) Instruction loader hard‑fails on missing stamps
- **Hypothesis:** Any present but unstamped AGENTS file bricks startup.
- **Validation:** Create a fixture repo with an unstamped `docs/AGENTS.md`; run instruction loader and confirm it throws. Evaluate desired behavior (warn+skip vs hard fail).
- **Expected:** Loader should follow guardrail policy; likely warn+skip for optional candidates.

### 7) Evaluation harness SIGKILL not Windows‑safe
- **Hypothesis:** `SIGKILL` is invalid or unreliable on Windows.
- **Validation:** Simulate Windows by forcing `process.platform === "win32"` in a unit test or run harness on Windows CI; confirm timeout path behavior.
- **Expected:** Use a cross‑platform termination strategy or fallback.

### 8) Temp dirs not cleaned
- **Hypothesis:** Temp dirs accumulate under `/tmp`.
- **Validation:** Run crystalizer and SDK exec in a loop; observe directory growth in OS temp. Confirm no cleanup hooks.
- **Expected:** Temp dirs removed on success/failure or documented as caller responsibility.

### 9) ESLint plugin builds patterns on load
- **Hypothesis:** Linting triggers `npm run build:patterns`, causing side effects and CI fragility.
- **Validation:** Run `npm run lint` in a clean/readonly environment and observe whether build is invoked; confirm failure modes.
- **Expected:** Lint should not run builds implicitly; build should be explicit prerequisite.

## Risks & Mitigations
- **Risk:** Validation changes accidentally fix behavior.
  - **Mitigation:** Keep validation to tests/scripts only; no production code changes in this task.
- **Risk:** Some issues are environment‑specific.
  - **Mitigation:** Record platform/Node version in manifests and use fixtures where needed.

## Acceptance Criteria
- A validation status (confirmed/unconfirmed/false‑positive) and evidence link for each issue.
- Updated PRD/spec/task mirrors and a prioritized follow‑up plan.

## Evidence
- Diagnostics/plan manifest: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- Metrics/state snapshots: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.
