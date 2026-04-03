# ACTION_PLAN - CO: Harden CO STATUS end-to-end truth agreement, visual coverage, and legacy monitor cleanup

## Added by Bootstrap 2026-04-03

## Summary
- Goal: land one bounded hardening pass that makes the current shipped `CO STATUS` surface explicitly truthful, explicitly documented, and explicitly provable across terminal, JSON, and HTTP read-side paths.
- Scope: docs-first packet, audited docs-review child stream, STATUS JSON contract clarification, coverage-matrix docs, focused tests, inline screenshot proof, and only the smallest legacy STATUS cleanup that directly reduces truth drift or naming confusion.
- Assumptions:
  - the current operator-dashboard dataset remains the correct shared STATUS truth source for terminal and `/ui/data.json`
  - `/api/v1/state` remains the comparison surface for overlapping compatibility/read-model fields
  - `control-host --format json` should keep launch-readiness semantics while `co-status --format json` becomes the explicit STATUS snapshot contract

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `co-status --format json`, `/ui/data.json`, `/api/v1/state`, `Tokens: in/out/total`, aggregate runtime, rate-limit/reset semantics, real-device screenshot proof, and legacy monitor cleanup. Reject readiness-only JSON, screenshot-substitute proof, and broader redesign interpretations.
- Not done if:
  - the STATUS JSON contract is still ambiguous
  - field/state coverage is undocumented or incomplete
  - time-relative runtime or reset semantics remain unreviewed
  - the required inline screenshots are missing
  - stale legacy naming or duplicate truth seams still obscure current authority without an explicit reason
- Pre-implementation issue-quality review: approved. This lane should stay on truth agreement, coverage, proof, and bounded cleanup rather than reopening broader STATUS design or control-host lifecycle work.

## Milestones & Sequencing
1. Register the `linear-44a18317-8afe-47e4-b4ba-5424aae86dc5` docs packet, task mirrors, and single Linear workpad with the live audit notes.
2. Run the audited `docs-review` child stream and fold back any packet corrections before code changes.
3. Implement the explicit STATUS JSON snapshot contract and any required small shared-helper refactor so `co-status --format json` and the terminal renderer consume the same operator-dashboard truth.
4. Add or tighten focused regressions plus the documented coverage matrix for summary fields, tables, state variants, time-relative semantics, snapshot/export, and any legacy cleanup touched by the new contract.
5. Capture real inline screenshots, run the full validation floor plus standalone/elegance review, and refresh the workpad for handoff.

## Dependencies
- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/coStatusAttachCliShell.ts`
- `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/uiDataController.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-76-docs-review --format json`
  - focused shell/controller/dashboard tests for:
    - `co-status --format json` returning a STATUS snapshot instead of readiness metadata
    - shared field agreement between the STATUS JSON snapshot and the terminal/dashboard dataset
    - runtime/token/rate-limit/polling/reset semantics for representative states
    - any bounded legacy naming/helper cleanup touched by the contract change
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run pack:smoke`
- Rollback plan:
  - if the new STATUS JSON contract proves too disruptive, revert to the prior CLI behavior and land only the coverage-matrix or proof work while filing a follow-up with concrete breakage evidence
  - if legacy cleanup widens unexpectedly, revert the cleanup portion and keep the hardening lane focused on explicit status agreement and proof

## Risks & Mitigations
- Risk: changing `co-status --format json` surprises any local automation expecting readiness-only output.
  - Mitigation: keep `control-host --format json` unchanged, update help/docs explicitly, and add focused shell tests for the new contract.
- Risk: runtime/reset comparisons look flaky because they are time-relative.
  - Mitigation: define the comparison contract explicitly around dataset timestamps or bounded drift and test the derived countdown behavior deterministically.
- Risk: legacy cleanup broadens into historical presenter/controller archaeology.
  - Mitigation: only remove or rename stale STATUS-era surfaces when the change is obviously bounded and directly clarifies current authority; otherwise file a follow-up.

## Approvals
- Reviewer: codex-orchestrator docs-review
- Date: 2026-04-03
- Manifest: `.runs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5-co-76-docs-review/cli/2026-04-03T10-57-30-814Z-627a7b80/manifest.json`
