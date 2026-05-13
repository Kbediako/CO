# ACTION_PLAN - linear-aa307fdc-53a1-4225-8d09-28457165fbc8

## Summary
- Goal: prevent fallback-only `linear-*` task ids from appearing as running issue identifiers in `CO STATUS`.
- Scope: docs-first packet, audited `docs-review` child stream, bounded projection or runtime identity repair, focused regressions, and the standard validation and review gates.
- Assumptions:
  - the synthetic row is caused by fallback identity promotion plus overly permissive running-source admission, not by a second real issue
  - tracked issue or intake-claim identity can safely rebind at least some fallback-only provider-worker manifests

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `selectedRunProjection.ts`, `controlRuntime.ts`, `compatibilityIssuePresenter.ts`, `operatorDashboardPresenter.ts`, `issueIdentifier`, `issueId`, `task_id`, and `linear-*`.
- Not done if: a fallback-only `linear-*` task id still renders as a running issue row, or a real canonical issue row disappears because rebinding or suppression is incomplete.
- Pre-implementation issue-quality review: approved. The bounded seam is projection identity repair and authoritative running-row admission, not dashboard redesign or EVENT provenance.

## Milestones & Sequencing
1. Create the `CO-146` docs packet, task mirrors, registry entries, and initial workpad source, then reconcile the `docs/TASKS.md` line budget.
2. Run audited `linear child-stream --pipeline docs-review --stream co-146-docs-review --format json` and fold any findings back into the packet before code changes.
3. Patch selected-run and compatibility source identity handling so fallback-only `linear-*` task ids no longer count as canonical issue identity.
4. Rebind fallback-only sources from tracked issue or matched claim where possible; otherwise suppress them from running issue presentation.
5. Add focused regressions covering selected fallback suppression and claim or tracked rebinding.
6. Run the required validation floor, standalone review, explicit elegance review, and refresh the workpad before any review handoff.

## Dependencies
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- `orchestrator/tests/SelectedRunProjection.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `orchestrator/tests/CompatibilityIssuePresenter.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-aa307fdc-53a1-4225-8d09-28457165fbc8 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/opt/homebrew/lib/node_modules/@kbediako/codex-orchestrator/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-146-docs-review --format json`
  - focused regressions for fallback-only selected or discovered identity and canonical rebinding
  - required repo validation floor after implementation
  - manifest-backed standalone review and explicit elegance review before handoff
- Rollback plan:
  - revert the identity-rebinding and running-source-admission changes together so fallback classification returns to the pre-CO-146 behavior without half-fixed grouping

## Risks & Mitigations
- Risk: a fallback classifier suppresses legitimate non-provider rows.
  - Mitigation: keep the change tightly scoped to fallback-only synthetic `linear-*` task-id identity and prove canonical explicit-identity rows still render.
- Risk: claim or tracked rebinding picks the wrong issue.
  - Mitigation: only rebind from already matched authoritative tracked or claim identity and preserve fallback aliases for debugging.
- Risk: fixing the running issue table only in the renderer leaves other presentation paths inconsistent.
  - Mitigation: repair identity in projection or runtime layers first and keep presenter changes minimal.

## Approvals
- Reviewer: audited `docs-review` child stream completed cleanly at `.runs/linear-aa307fdc-53a1-4225-8d09-28457165fbc8-co-146-docs-review/cli/2026-04-10T10-16-52-254Z-b5b0371e/manifest.json`
- Date: 2026-04-10
