# ACTION_PLAN - CO: Fix CO STATUS paused snapshot duplication and authoritative telemetry

## Added by Bootstrap 2026-04-02

## Summary
- Goal: land the smallest truthful `CO STATUS` fix that removes the duplicate paused handoff frame and makes running/runtime/tokens/rate limits authoritative.
- Scope: docs-first packet, pause handoff write-path correction, authoritative compatibility/runtime source selection, focused tests, screenshot proof, and the required validation or review gates.
- Assumptions:
  - the paused duplication defect is the in-flight pause race in the dashboard write path, not a need to abandon alternate-screen live rendering
  - authoritative running/runtime should come from the selected run plus active provider-intake-backed current work, not from raw historical manifest discovery
  - live provider budget state or current worker proof is sufficient to fix the rate-limit preference seam without widening into broader budgeting architecture

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `pause`, `primary snapshot`, `scrollback`, `authoritative`, `running`, `runtime`, `tokens`, `rate limits`, and `screenshot proof`; reject duplicate-frame acceptance, historical-manifest-as-current, token-zero-coercion, and rate-limit-unavailable interpretations.
- Not done if:
  - pausing still leaves duplicate paused frames in primary scrollback
  - current running/runtime still includes stale historical manifests
  - unavailable tokens still render as zero
  - rate limits still ignore authoritative live data
  - proof is not visible in Linear
- Pre-implementation issue-quality review: approved. This lane should stay focused on one operator-truthfulness surface spanning both the paused snapshot race and the authoritative telemetry seam.

## Milestones & Sequencing
1) Bootstrap docs, registry mirrors, branch, and the single Linear workpad for `CO-67`
2) Run the audited child `docs-review` stream and fold back any packet corrections
3) Implement the paused handoff duplication fix in `controlStatusDashboard.ts` with focused dashboard regressions
4) Implement authoritative current-activity and telemetry source selection in the compatibility/runtime seam with focused runtime or projection regressions
5) Capture screenshot proof, run the required validation plus standalone/elegance review, then refresh the workpad for PR handoff

## Dependencies
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/tests/ControlStatusDashboard.test.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-67-docs-review --format json`
  - focused Vitest coverage for the pause handoff race and authoritative telemetry semantics
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-f3193657-a549-43a2-8cff-50c5284df986 npm run pack:smoke`
- Rollback plan:
  - revert the pause-handoff change and restore the prior write path if the new logic proves untruthful in focused tests
  - revert source-selection changes if they break authoritative current-run selection, then file a narrower follow-up with concrete evidence instead of broadening this lane

## Risks & Mitigations
- Risk: tightening running authority hides a legitimate active run because intake metadata is incomplete.
  - Mitigation: keep the selected run authoritative and add focused regressions for active claim-backed sibling runs.
- Risk: null-aware token totals break existing render or API expectations.
  - Mitigation: keep row-level null handling aligned with existing presenter semantics and add tests for unavailable totals.
- Risk: rate-limit precedence prefers a stale proof over fresher live budget state.
  - Mitigation: make freshness ordering explicit and test both proof-only and live-budget cases.
- Risk: fixing the pause race introduces prompt-glue or paused rerender regressions.
  - Mitigation: keep the existing newline and paused-rerender tests while adding the duplicate-handoff regression.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-02
