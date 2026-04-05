# ACTION_PLAN - CO STATUS: restore live root control-host Codex session, token, throughput, and 5-hour/weekly rate-limit telemetry after CO-83

## Added by Bootstrap 2026-04-05

## Summary
- Goal: repair the remaining authoritative telemetry gap so the root local control-host `CO STATUS` surface becomes truthful for token, session, throughput, and Codex usage-window telemetry during an active provider-worker run.
- Scope: docs-first packet, single Linear workpad, audited docs-review child stream, bounded telemetry-path diagnosis and fix, focused regressions, root-host screenshots, and the required review gates.
- Assumptions:
  - the terminal renderer is mostly behaving correctly for what it is currently given
  - the remaining issue is an end-to-end truth-path gap between runtime telemetry and root control-host presentation
  - `CO-83` is the closest reference lane, but `CO-98` must validate the root host directly

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `provider-linear-worker-proof.json`, `Tokens`, `TOKENS`, `SESSION`, `Throughput`, `Rate Limits`, `5-hour`, `weekly`, `providerLinearWorkerRunner.ts`, `compatibilityIssuePresenter.ts`, `controlStatusDashboard.ts`, and `events.jsonl`.
- Not done if:
  - root live header `Tokens` still shows `n/a` during a real active run that emits telemetry
  - running rows still show `TOKENS n/a` or `SESSION n/a` during a real active run that emits telemetry
  - `Throughput` does not advance from real token samples when telemetry exists
  - Codex `5-hour` / `weekly` segments remain absent while only Linear rate limits render
  - screenshots are captured from a workspace proof path instead of the root local control-host
- Pre-implementation issue-quality review: approved as one bounded root telemetry truth lane, not a layout or screenshot-only lane.

## Milestones & Sequencing
- [x] Register the `linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc` docs packet, task mirrors, and initial workpad source with the initial root-path audit notes. Evidence: `docs/PRD-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`, `docs/TECH_SPEC-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`, `docs/ACTION_PLAN-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`, `tasks/specs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`, `tasks/tasks-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`, `.agent/task/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md`, `out/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc/manual/workpad.md`.
- [ ] Run the audited `docs-review` child stream and fold back any packet fixes before implementation. Evidence: pending.
- [ ] Diagnose the remaining root control-host telemetry gap across runtime parse, proof persistence, root aggregation, and terminal rendering. Evidence: pending.
- [ ] Implement the smallest end-to-end fix for root `Tokens`, `TOKENS`, `SESSION`, `Throughput`, and Codex `5-hour` / `weekly` segments. Evidence: pending.
- [ ] Expand focused regression coverage for the repaired root-host path. Evidence: pending.
- [ ] Capture root-host screenshots, run the required validation floor plus standalone/elegance review, and refresh the workpad for PR/review handoff. Evidence: pending.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `.runs/local-mcp/cli/control-host/provider-intake-state.json`
- runtime `events.jsonl`

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-98-docs-review --format json`.
- [ ] Focused parser/projection/dashboard regressions for the repaired token/session/throughput/rate-limit path.
- [ ] Capture root local control-host screenshot proof during a real active provider-worker run and embed it directly in the Linear workpad.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc node scripts/delegation-guard.mjs`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc node scripts/spec-guard.mjs --dry-run`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run build`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run lint`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run test`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run docs:check`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run docs:freshness`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc node scripts/diff-budget.mjs`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc FORCE_CODEX_REVIEW=1 npm run review`.
- [ ] `MCP_RUNNER_TASK_ID=linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc npm run pack:smoke` if downstream-facing paths are touched.

## Risks & Mitigations
- Risk: the remaining bug only reproduces on the root live host and is not obvious from local fixture tests.
  - Mitigation: validate against the real root local control-host and record screenshot proof directly in the workpad.
- Risk: the live proof is correct and the remaining failure is in root aggregation preference.
  - Mitigation: inspect the proof, root runtime snapshot, and renderer surfaces together before widening the fix.
- Risk: Codex usage-window payload handling regresses older generic rate-limit buckets.
  - Mitigation: keep the rendering additive and cover both payload shapes in focused tests.

## Approvals
- Reviewer: pending `codex-orchestrator docs-review`
- Date: 2026-04-05
- Manifest: pending
