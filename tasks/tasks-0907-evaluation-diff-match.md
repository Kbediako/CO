# Task 0907 — Evaluation Harness `diff-match` Assertions

- MCP Task ID: `0907-evaluation-diff-match`
- Primary PRD: `docs/PRD-evaluation-diff-match.md`
- Tech Spec: `docs/TECH_SPEC-evaluation-diff-match.md`
- Action Plan: `docs/ACTION_PLAN-evaluation-diff-match.md`
- Mini-spec: `tasks/specs/0907-evaluation-diff-match.md`
- Run Manifest (latest implementation gate): `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-06-46-905Z-070fcac1/manifest.json`
- Additional manifests:
  - Diagnostics: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-00-54-205Z-86e8e277/manifest.json`
  - Diagnostics with eval: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-08-54-880Z-a2571bb6/manifest.json`
- Metrics/State: `.runs/0907-evaluation-diff-match/metrics.json`, `out/0907-evaluation-diff-match/state.json` (expected once pipelines run).

## Checklist
### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0907-evaluation-diff-match.md`, `tasks/index.json`) — Evidence: this PR.

### Validation (current state)
- [x] Confirm `diff-match` is silently skipped by the harness — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm `agentTask` is currently unused/no-op — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm fixture mismatch for `backend-api-opt` (missing `package.json` / npm scripts) — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Capture `npm run eval:test` baseline result — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-08-54-880Z-a2571bb6/manifest.json`.

### Implementation (planned; do not implement in this PR)
- [ ] Add `diff-match` to `evaluation/harness/types.ts` (runtime + TS types) — Acceptance: scenarios can declare `diff-match` without type drift.
- [ ] Make unknown assertion types fail loudly (no silent skips) — Acceptance: `patternAssertions` includes a failed result (or scenario fails fast) for unknown types.
- [ ] Implement `diff-match` evaluator:
  - Diff baseline vs final contents for the scoped path.
  - Normalize unified diff headers (support `@@ ... @@` placeholder).
  - Match policy documented (`substring` vs `exact`) and tested.
- [ ] Add `agentTask` support (minimal `WRITE|path|content` interpreter) — Acceptance: scenario can apply deterministic edits before running adapter goals.
- [ ] Update scenario loader validation for `patternAssertions` and `agentTask` shape — Acceptance: invalid scenarios error with actionable messages.
- [ ] Add unit tests for `diff-match` normalization/matching and unknown assertion types.

### Fixture + scenario alignment (planned; do not implement in this PR)
- [ ] Bring `evaluation/fixtures/node-api-nplus1` to parity with adapter expectations:
  - Add `package.json` + `npm run test` script.
  - Add baseline N+1 implementation plus tests that fail until optimized.
- [ ] Align `evaluation/scenarios/backend-api-opt.json` to the fixture:
  - Ensure `expectedDiff` matches the actual diff produced by the `agentTask` edit.
  - Ensure `agentTask` uses the fixture’s module format (`.js` extensions, TypeScript typing conventions) or update the fixture to match.
- [ ] Add/extend `evaluation/tests/harness.test.ts` so `backend-api-opt` is exercised (and fails prior to implementation, passes after).

### Guardrails & handoff (required before requesting review)
- [x] Run orchestrator diagnostics with `MCP_RUNNER_TASK_ID=0907-evaluation-diff-match` and record the manifest path — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-00-54-205Z-86e8e277/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-06-46-905Z-070fcac1/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-06-46-905Z-070fcac1/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-06-46-905Z-070fcac1/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-06-46-905Z-070fcac1/manifest.json`.
- [x] `npm run eval:test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-08-54-880Z-a2571bb6/manifest.json`.
- [x] `npm run docs:check` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-06-46-905Z-070fcac1/manifest.json`.
- [x] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-06-46-905Z-070fcac1/manifest.json`.
