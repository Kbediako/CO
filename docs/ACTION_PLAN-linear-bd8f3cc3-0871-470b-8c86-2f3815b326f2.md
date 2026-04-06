# ACTION_PLAN - CO STATUS: make live attach scrolling work without accumulated full-frame history

## Added by Bootstrap 2026-04-06

## Summary
- Goal: land the smallest truthful fix set that keeps live attach on `primary scrollback`, stops accumulated duplicate full-frame history, and improves the bounded live operator readability/truth surfaces called out in `CO-97`.
- Scope: docs-first packet, audited docs-review child stream, pinned live-primary attach redraw semantics, bounded countdown/rate-limit/event/retry readability fixes, optional presenter freshness fix only if reproduced, focused tests, real-device proof, and the normal validation/review gates.
- Assumptions:
  - the primary defect is still the attach writer strategy in `controlStatusDashboard.ts`
  - most requested readability fixes can stay inside dashboard-local formatting helpers
  - stale `Merging` / retry projection might already be covered by current presenter freshness guards and should be treated as evidence-driven scope

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `co-status attach`, `primary scrollback`, `alternate screen`, `controlStatusDashboard.ts`, `coStatusAttachCliShell.ts`, `ControlStatusDashboard.test.ts`, and `CoStatusAttachCliShell.test.ts`; reject alternate-screen fallback, pause-duplication-only framing, docs-only fixes, and silent telemetry-lane widening.
- Not done if:
  - live attach still stacks historical full-frame copies
  - attach is "fixed" only by moving back to alternate screen
  - long countdown / rate-limit / event / retry text remains operator-hostile on the protected surfaces
  - real screenshot proof, visual inspection, or authoritative payload cross-checks are missing
- Pre-implementation issue-quality review: approved. This lane is intentionally broader than one cursor-control tweak because the same operator-facing live surface still has the exact bounded readability/truth defects listed on the issue.

## Milestones & Sequencing
1. Bootstrap the docs packet, task mirrors, registry entries, and single workpad for `CO-97`.
2. Run the audited `docs-review` child stream and fold back any packet corrections or explicit fallback notes.
3. Implement the pinned live-primary attach redraw strategy in `controlStatusDashboard.ts` without regressing launch-mode alternate-screen behavior.
4. Tighten the dashboard-local duration, rate-limit, retry, and event formatting helpers to match the requested live operator readability semantics.
5. Reproduce and fix stale stage/read-model truth only if it still survives the current presenter freshness guards.
6. Update focused tests, capture real-device screenshot proof with cleanup, and run the validation/review/elegance gates before handoff.

## Dependencies
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/src/cli/coStatusAttachCliShell.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/tests/ControlStatusDashboard.test.ts`
- `orchestrator/tests/CoStatusAttachCliShell.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-97-docs-review --format json`
  - focused Vitest coverage for live attach redraw semantics, launch-mode non-regression, readable duration formatting, requested rate-limit formatting, and event/retry summaries
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2 npm run pack:smoke`
- Rollback plan:
  - revert the pinned-primary attach redraw changes if they prove untruthful or prompt-hostile
  - keep any evidence-only stale-stage audit as notes if it does not require code changes
  - file a follow-up instead of silently widening beyond the bounded attach/view truth lane

## Risks & Mitigations
- Risk: a live primary redraw change regresses the launched alternate-screen monitor.
  - Mitigation: keep attach-vs-launch behavior explicit and add targeted tests for both surfaces.
- Risk: duration/rate-limit formatting changes accidentally change source truth rather than only presentation.
  - Mitigation: keep source selection untouched unless reproduced evidence requires a bounded presenter fix.
- Risk: event/retry text still remains generic because the better source is not actually available.
  - Mitigation: prefer richer existing event/action/proof text, and record explicit proof if the current dataset is still insufficient.
- Risk: proof capture leaves behind temporary sessions/windows.
  - Mitigation: make cleanup part of the validation checklist and workpad proof notes.

## Approvals
- Reviewer: pending docs-review child stream
- Date: pending
