# ACTION_PLAN - CO-295 Linear PR attachment ownership truth

## Added by Bootstrap (refresh as needed)
- PRD: `docs/PRD-linear-994efebc-e1e4-4e00-8046-c60143813251.md`
- TECH_SPEC: `tasks/specs/linear-994efebc-e1e4-4e00-8046-c60143813251.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-994efebc-e1e4-4e00-8046-c60143813251.md`
- Task checklist: `tasks/tasks-linear-994efebc-e1e4-4e00-8046-c60143813251.md`
- `.agent` mirror: `.agent/task/linear-994efebc-e1e4-4e00-8046-c60143813251.md`

## Summary
- Goal: prevent unrelated issues from adopting another issue's current PR and provide a safe repair/reconcile path for already-misbound Linear PR attachments.
- Scope:
  - docs-first packet, task registry, freshness registry, and checklist mirrors
  - attachment ownership classification in `providerLinearWorkflowFacade.ts`
  - focused regressions in `ProviderLinearWorkflowFacade.test.ts`
  - explicit operator-safe repair/reconcile helper behavior
- Assumptions:
  - attachment title, PR title, or PR head branch containing an explicit different `CO-###` identifier is authoritative enough to reject current ownership for the inspected issue
  - absent issue identifier evidence should keep existing conservative ambiguity behavior
  - live PR #575 is not a CO-295 implementation branch

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-244`, `CO-289`, `PR #532`, `PR #575`, `pull_request_attachments.current`, `pull_request_attachments.historical`, `current`, `historical`, `conflicting`, `unknown`, `linear issue-context`, `linear attach-pr`, `provider-linear-issue-context-cache.json`, `provider-linear-worker-linear-audit.jsonl`, `provider-intake-state.json`, `provider_issue_released:not_active`, `Done`.
- Not done if:
  - a completed issue can still adopt another issue's live PR as current
  - issue-context can still present duplicated current ownership across unrelated issues
  - the fix is display-only
  - historical/current state is overwritten by unrelated later attachments
  - already-misbound issues lack a safe repair/reconcile path
- Pre-implementation issue-quality review:
  - accepted on 2026-04-22: the issue is not narrower than the user request because the docs packet covers current selection, reconciliation preservation, duplicated ownership visibility, and operator repair; it explicitly rejects manual cleanup or display-only output.

## Milestones & Sequencing
1. Finish docs-first packet and run docs-review before implementation.
2. Inspect current attachment hydration/classification and repair/helper seams.
3. Add focused regression for CO-244/CO-289 duplicate-current misbinding and valid CO-289 current ownership.
4. Implement the smallest ownership guard and repair/reconcile output path.
5. Run focused tests, full validation floor, standalone review, and elegance pass.
6. Open/attach PR, merge latest `origin/main`, drain automated feedback, refresh workpad, and hand off to `In Review` only after green status.

## Dependencies
- Clean CO-295 worktree: local per-issue worktree, intentionally not recorded as a durable tracked path.
- Linear issue id: `994efebc-e1e4-4e00-8046-c60143813251`
- Existing PR sweep: PR #575 is merged CO-289 work with no unresolved actionable feedback.
- Child-lane provenance: launch failed with `provider_worker_child_lane_provenance_invalid`; parent owns test work.

## Validation
- Checks / tests:
  - protected-term grep over packet and mirrors
  - focused `ProviderLinearWorkflowFacade` regression for duplicate current ownership
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed forced standalone review
  - explicit elegance/minimality pass
  - `npm run pack:smoke` if downstream CLI/package surfaces are touched
- Rollback plan:
  - revert the CO-295 branch before handoff if ownership filtering causes legitimate current PRs to be rejected
  - keep live CO-244/CO-289 attachments untouched during tests

## Risks & Mitigations
- Risk: overly strict identifier matching rejects valid current PRs with incomplete metadata.
  - Mitigation: reject only explicit different issue identifiers; use existing ambiguity handling when evidence is absent.
- Risk: repair path mutates live Linear state unexpectedly.
  - Mitigation: keep repair output dry-run/safe by default and require explicit command intent for mutation.
- Risk: child-lane requirements are not satisfiable in this shell.
  - Mitigation: record the provenance failure exactly in the workpad and task docs; do not fabricate child evidence.

## Approvals
- Reviewer: pending standalone review
- Date: 2026-04-22
