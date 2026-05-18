# ACTION_PLAN - CO-206 operator-autopilot local_rollout lifecycle

## Added by Docs Child Lane 2026-04-17

## Summary
- Goal: define and implement a durable acknowledge/clear/dismiss lifecycle for `operator-autopilot` `local_rollout` pending actions.
- Scope: docs-first packet, lifecycle state/identity for `ProviderOperatorAutopilotPendingActionRecord`, operator transition path, audit/read-model projection, and focused tests.
- Assumptions:
  - Parent lane will reconcile the full Linear issue description and workpad before implementation.
  - `local_rollout` remains a post-merge operator follow-up, not an automated rollout executor.
  - Merge-closeout and provider-intake records remain historical truth even after a rollout action is cleared or dismissed.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `operator-autopilot`
  - `local_rollout`
  - `ProviderOperatorAutopilotPendingActionRecord`
  - `acknowledge/clear/dismiss lifecycle`
  - `pending_actions`
  - `provider-operator-autopilot.jsonl`
- Not done if:
  - acknowledge, clear, and dismiss are not explicit lifecycle transitions
  - acknowledge removes unresolved rollout work
  - clear/dismiss lack durable audit evidence
  - cleared/dismissed actions reappear for the same rollout identity
  - config-disable or stale-claim cleanup is treated as explicit operator clear/dismiss
  - implementation mutates Linear state or automates local rollout execution
- Pre-implementation issue-quality review:
  - The issue is specific to `operator-autopilot` `local_rollout` lifecycle semantics.
  - Protected terms and non-goals are explicit enough for parent implementation.
  - This child lane is docs-only and should not implement source changes.

## Milestones & Sequencing
1. Parent imports this docs-first packet and reconciles it against the authoritative Linear issue/workpad source.
2. Parent runs docs-review or records a bounded docs-review fallback before source edits.
3. Define stable `local_rollout` action identity and lifecycle metadata shape.
4. Add acknowledge, clear, and dismiss transition handling with fail-closed matching and append-only audit.
5. Project lifecycle state through the latest operator-autopilot result/read-model surface.
6. Add focused tests for lifecycle transitions, persistence across refresh/restart, idempotency, same-identity suppression, and stale cleanup separation.
7. Run scoped then required parent validation, standalone review, and elegance pass before PR handoff.

## Dependencies
- Source surfaces:
  - `orchestrator/src/cli/control/providerOperatorAutopilot.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
- Test surfaces:
  - `orchestrator/tests/ProviderOperatorAutopilot.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
- Docs/registry surfaces:
  - `docs/PRD-linear-642e622a-b02e-4766-85c2-6f2fc47b1f44.md`
  - `tasks/specs/linear-642e622a-b02e-4766-85c2-6f2fc47b1f44.md`
  - `docs/ACTION_PLAN-linear-642e622a-b02e-4766-85c2-6f2fc47b1f44.md`
  - `tasks/tasks-linear-642e622a-b02e-4766-85c2-6f2fc47b1f44.md`
  - `tasks/index.json`
  - `docs/TASKS.md`

## Validation
- Checks / tests:
  - child lane scoped checks:
    - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8'))"`
    - protected-term scan across the four CO-206 packet files
  - parent implementation checks:
    - focused Vitest tests for operator-autopilot lifecycle behavior
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - repo build/lint/test/docs gates per parent scope
    - manifest-backed standalone review and elegance pass
- Rollback plan:
  - Revert lifecycle source/test changes together.
  - Preserve docs packet only if parent chooses to keep CO-206 open for a corrected follow-up.
  - Do not delete merge-closeout or provider-intake evidence during rollback.

## Risks & Mitigations
- Risk: action identity is too broad and clears a later rollout. Mitigation: include issue identity plus merge-closeout/action fields and fail closed when ambiguous.
- Risk: acknowledge is mistaken for completion. Mitigation: model acknowledge as unresolved and visible.
- Risk: dismiss hides required local rollout work. Mitigation: require durable reason/provenance and keep dismissed actions audit-visible.
- Risk: lifecycle decisions corrupt source-of-truth merge-closeout records. Mitigation: store lifecycle metadata separately from merge-closeout history or as additive metadata only.
- Risk: implementation expands into rollout automation. Mitigation: keep execution automation as an explicit non-goal and validate only lifecycle state.

## Approvals
- Reviewer: pending parent lane docs-review.
- Date: pending.
