# ACTION_PLAN - CO: prevent archived or trashed Linear issues from being claimed or mutated as active provider lanes

## Added by Bootstrap 2026-04-11

## Summary
- Goal: finish the archived/trashed provider-lane hardening by adding the missing admission block, reusing the preserved CO-32 mutability work selectively, and proving restored-issue recovery plus deterministic retry suppression.
- Scope:
  - fresh docs packet and workpad
  - tracked issue mutability truth and admission block
  - intake claim truth and restored revalidation
  - transition/workpad fail-closed behavior
  - worker prompt/selected-run/proof suppression
  - focused tests and full validation/review gates
- Assumptions:
  - the preserved CO-32 patch is directionally correct for mutability truth and suppression, but not for docs packet reuse
  - client-side admission blocking is sufficient; no risky GraphQL filter-schema guesswork is required

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `archivedAt`, `trashed`, `linear_issue_not_mutable`, `issue-context/cache`, `transition`, `upsert-workpad`, `selected-run summary`, `provider proof summaries`
- Nearby wrong interpretations to reject:
  - “Only transition/workpad writes need guarding; admission can stay permissive.” Reject: archived/trashed issues must fail closed before provider claim/start admission.
  - “Cached mutability stays authoritative after restore.” Reject: restored issues must reread live mutability before resuming mutation paths.
  - “Suppression only applies to worker prompt text.” Reject: suppression must also cover selected-run and provider-proof summaries in the same attempt.
- Current / Reference / Target parity matrix:
  - Current: archived/trashed issues can still drift into active provider handling unless admission, cached mutability truth, and summary suppression are all applied together.
  - Reference: preserved CO-32 artifacts cover `linear_issue_not_mutable`, `issue-context/cache` mutability truth, and deterministic suppression, but they do not complete admission hardening or fresh docs continuity on their own.
  - Target: admission and mutation paths fail closed for archived/trashed issues, restored issues revalidate live before resuming, summaries suppress deterministic same-attempt retries, and the supported archive flow preserves the `docs/TASKS.md` `CO-68` snapshot.
- Not done if:
  - archived/trashed issues are still claimable or startable
  - restored issues stay blocked behind stale cached mutability
  - deterministic suppression is missing from worker prompt or selected-run/proof summary
  - `docs/TASKS.md` loses the existing `CO-68` snapshot
- Pre-implementation issue-quality review:
  - Approved on 2026-04-11 after live state inspection, branch creation, workpad bootstrap, preserved-patch audit, and current-main seam review. The issue is not narrower than mutation classification alone because the live gap is admission plus mutability truth, but it is still bounded away from generic provider-worker refactors.

## Milestones & Sequencing
1. Docs and audited design gate
   - Create PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, registry entries, and `docs/TASKS.md` snapshot under the fresh CO-153 task id.
   - Run `linear child-stream --pipeline docs-review` and record the manifest or truthful packet-local fallback.
2. Admission and mutability implementation
   - Extend tracked issue/query truth and intake claim persistence with `archived_at` / `trashed`.
   - Block archived/trashed issues from fresh dispatch and handoff/start eligibility with explicit not-mutable reasons.
   - Re-home the workflow-facade mutability checks and restored-cache revalidation from the preserved CO-32 work.
   - Extend deterministic retry suppression for worker prompt and selected-run/proof summaries.
3. Tests, review, and handoff
   - Add focused regressions for live archived failure, cached archived revalidation, restored success, idempotent archived noops, prompt/summary suppression, and admission exclusion.
   - Run required validation, standalone review, elegance review, later successful child-lane integration if needed for the earlier stalled launch, then move to PR/review handoff.

## Dependencies
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
- `orchestrator/tests/LinearDispatchSource.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/SelectedRunProjection.test.ts`

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused Vitest runs for dispatch/handoff/facade/worker/selected-run
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `DIFF_BUDGET_OVERRIDE_REASON="CO-153 requires a fresh docs-first packet plus bounded source and regression coverage for archived/trashed admission, mutability revalidation, and summary suppression in one reviewable lane." node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the mutability/admission fields and checks as one bounded slice while keeping the docs packet and validation evidence for follow-up.

## Risks & Mitigations
- Risk: treating archived issues as inactive could hide the real reason in proofs.
  - Mitigation: keep explicit `provider_issue_not_mutable` claim reasons and `linear_issue_not_mutable` mutation errors.
- Risk: stale persisted claims without mutability fields behave differently from new claims.
  - Mitigation: normalize missing fields to mutable defaults and prefer live rereads where available.
- Risk: the initial appserver child-lane launch never produces a patch bundle.
  - Mitigation: do not stall the lane; finish docs-first in the parent and ensure a later disjoint child lane completes successfully before handoff.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
