# Task Checklist — Evaluation Harness `diff-match` Assertions (0907)

> Set `MCP_RUNNER_TASK_ID=0907-evaluation-diff-match` for orchestrator commands. Mirror status with `tasks/tasks-0907-evaluation-diff-match.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0907-evaluation-diff-match/cli/<run-id>/manifest.json`).

## Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0907-evaluation-diff-match.md`, `tasks/index.json`) — Evidence: this PR.

## Validation (current state)
- [x] Confirm `diff-match` is silently skipped by the harness — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm `agentTask` is currently unused/no-op — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm fixture mismatch for `backend-api-opt` (missing `package.json` / npm scripts) — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Capture `npm run eval:test` baseline result — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-08-54-880Z-a2571bb6/manifest.json`.

## Implementation
- [x] Add `diff-match` to `evaluation/harness/types.ts` (runtime + TS types) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-13-49-854Z-521d98c7/manifest.json`.
- [x] Make unknown assertion types fail loudly (no silent skips) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.
- [x] Implement `diff-match` evaluator — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.
  - Diff baseline vs final contents for the scoped path.
  - Normalize unified diff headers (support `@@ ... @@` placeholder).
  - Match policy documented (`substring` vs `exact`) and tested.
- [x] Add `agentTask` support (minimal `WRITE|path|content` interpreter) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.
- [x] Update scenario loader validation for `patternAssertions` and `agentTask` shape — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.
- [x] Add unit tests for `diff-match` normalization/matching and unknown assertion types — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.

## Fixture + scenario alignment
- [x] Bring `evaluation/fixtures/node-api-nplus1` to parity with adapter expectations — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.
  - Add `package.json` + `npm run test` script.
  - Add baseline N+1 implementation plus tests that fail until optimized.
- [x] Align `evaluation/scenarios/backend-api-opt.json` to the fixture — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.
  - Ensure `expectedDiff` matches the actual diff produced by the `agentTask` edit.
  - Ensure `agentTask` uses the fixture’s module format (`.js` extensions, TypeScript typing conventions) or update the fixture to match.
- [x] Add/extend `evaluation/tests/harness.test.ts` so `backend-api-opt` is exercised (and fails prior to implementation, passes after) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.

## Guardrails & handoff (required before requesting review)
- [x] Run orchestrator diagnostics with `MCP_RUNNER_TASK_ID=0907-evaluation-diff-match` and record the manifest path — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-00-54-205Z-86e8e277/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-13-49-854Z-521d98c7/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-13-49-854Z-521d98c7/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-13-49-854Z-521d98c7/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-13-49-854Z-521d98c7/manifest.json`.
- [x] `npm run eval:test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-10-44-525Z-f81918da/manifest.json`.
- [x] `npm run docs:check` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-13-49-854Z-521d98c7/manifest.json`.
- [x] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-13-49-854Z-521d98c7/manifest.json`.
