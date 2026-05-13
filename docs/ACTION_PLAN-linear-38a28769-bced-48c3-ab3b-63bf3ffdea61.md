# ACTION_PLAN - linear-38a28769-bced-48c3-ab3b-63bf3ffdea61

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: finish `CO-154` with a truthful docs-first packet and a bounded `attach-pr` mutability fix that matches current live behavior.
- Scope: packet creation, docs-review, attach-path repair, focused regressions, workpad refresh, and standard validation/review gates.
- Assumptions:
  - fresh mutable workpad creation is already good on current main
  - the remaining live defect is archived/trashed `attach-pr` mutability handling

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `linear upsert-workpad`, `linear attach-pr`, `commentCreate`, `attachmentLinkURL`, `Entity not found: Issue`, `issue-context`, `transition`, and `CO-36`
- Not done if:
  - raw `attachmentLinkURL` errors still leak for archived/trashed issues
  - mutable attach or workpad/transition regress
  - the packet hides the live fresh-issue non-repro
- Pre-implementation issue-quality review:
  - accepted on 2026-04-11 after live `CO-154` non-repro and live `CO-36` archived/trashed reproduction narrowed the real seam to `attach-pr`

## Milestones & Sequencing
1) Create the `CO-154` PRD, TECH_SPEC, ACTION_PLAN, checklist mirrors, workpad source, and registry updates; refresh the live workpad with the narrowed diagnosis.
2) Run audited `linear child-stream --pipeline docs-review` and record the manifest or truthful fallback before source edits.
3) Implement the bounded `attach-pr` mutability/noop parity fix in `providerLinearWorkflowFacade.ts` plus focused `ProviderLinearWorkflowFacade.test.ts` coverage.
4) Run targeted/live validation, refresh the same workpad, and only then decide on PR/review handoff.

## Dependencies
- Live packaged-helper reads/writes for issue/workpad state
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- repo docs/task registries

## Validation
- Checks / tests:
  - live `issue-context`, `transition`, `upsert-workpad`, and archived `attach-pr` probes captured in the workpad
  - focused facade regressions
  - required repo validation floor once the final diff size is known
  - standalone review then elegance review before any review handoff
- Rollback plan:
  - revert the bounded `attach-pr` guard/test changes if mutable attachment behavior regresses

## Risks & Mitigations
- Risk: the issue wording could push the lane toward a stale fresh-issue hypothesis.
  - Mitigation: keep the original wording in the packet but anchor all implementation decisions to the 2026-04-11 live proofs.
- Risk: docs/TASKS is already at the line budget.
  - Mitigation: update the snapshot entry and archive older snapshot lines with the repo-supported task-archive workflow before final validation.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
