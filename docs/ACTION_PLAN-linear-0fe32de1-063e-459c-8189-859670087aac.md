# ACTION_PLAN - CO-527 reconcile create-follow-up partial-success retries

## Summary
- Goal: stop duplicate follow-up creation after partial Linear create success by reusing and repairing the created follow-up issue.
- Scope: docs-first packet, root-cause code inspection, failing focused regression, minimal create-follow-up reconciliation fix, validation, PR lifecycle.
- Assumptions: current `origin/main` contains CO-582 and the lane runs in an isolated worktree because the shared root is dirty/stale.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `linear_follow_up_description_update_incomplete`, `follow_up_issue_id`, `create-follow-up`, `partial-success`, `same-attempt retry`, `relation creation`, `packet traceability`, `canonical owner evidence`, `CO-522`, `CO-523`, `CO-525`, `CO-526`.
- Not done if: same-attempt retry can create a duplicate issue after the previous attempt returned a created follow-up id; relation/traceability repair is skipped; existing canonical-owner retry suppression regresses.
- Pre-implementation issue-quality review: parent reviewed live CO-527 issue context, memory evidence for the same failure family, and selected a bounded P1 bug lane over broader CO-520 feature work.
- Fallback / refactor decision: this task touches a retry/reconciliation seam and removes the blind duplicate-create fallback. It does not retain a temporary fallback.
- Durable retention evidence: not applicable; the seam is removed rather than retained.
- Large-refactor check: a targeted fix is acceptable because the authority split is limited to the create-follow-up partial-success path and existing helper boundaries already own follow-up repair/verification.

## Decomposition Matrix

| Candidate lane | File / phase scope | Dependencies | Overlap risk | Expected validation artifact | Child-lane owner | Cap-slot use |
| --- | --- | --- | --- | --- | --- | --- |
| root-cause research | `providerLinearWorkflowFacade` and create-follow-up tests | live issue contract and memory evidence | High: same files as implementation/tests | evidence notes in workpad and failing regression target | parent | 0 |
| docs-first packet | PRD, TECH_SPEC, ACTION_PLAN, task checklist, agent mirror | issue contract and fallback decision | Medium: docs must match implementation | docs packet + registry entries | parent | 0 |
| implementation/tests | create-follow-up facade/shell and focused tests | failing regression first | High: same failure contract as research | focused test red/green output | parent | 0 |
| review/validation | deterministic gates, review/PR lifecycle | final diff | Medium: may be quota-blocked | gate logs and ready-review evidence | parent | 0 |

Decision: `stay_serial` / `overlapping_scope`. Model-backed child lanes are quota-blocked in this run, and the separable slices depend on the same narrow failure contract.

## Milestones & Sequencing
1. Create docs-first packet and run docs-review or record quota/degraded evidence.
2. Trace create-follow-up partial-success flow from issue creation through description verification and relation creation.
3. Write failing regression proving duplicate create is attempted or not suppressed after `linear_follow_up_description_update_incomplete` with `follow_up_issue_id`.
4. Implement minimal reconciliation/reuse behavior.
5. Validate focused tests first, then required repo gates, review, PR, ready-review, and merge when available.

## Dependencies
- Linear API helper/facade behavior for issue re-read, description update, labels, and relations.
- Existing retry-suppression and canonical-owner follow-up contracts.
- Codex model-backed review is currently quota-limited until 2026-05-31T07:51 local per CLI error; deterministic validation can continue.

## Validation
- Checks / tests: focused provider Linear workflow facade tests, explicit core-lane coverage with `npm run test:core -- orchestrator/tests/LinearCliShell.test.ts`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, full core lane via `npm run test`, diff budget, review/ready-review as quota allows.
- Rollback plan: revert CO-527 branch before PR merge; no Linear follow-up mutations are required for local tests.

## Risks & Mitigations
- Risk: repair path hides incomplete follow-up setup. Mitigation: fail closed unless description, labels, relations, and traceability are verified or explicit action evidence is emitted.
- Risk: fix collides with canonical-owner retry behavior. Mitigation: focused regression coverage for existing canonical-owner suppression paths.
- Risk: model-backed review unavailable. Mitigation: record quota evidence and keep deterministic gates exhaustive before PR handoff.

## Approvals
- Reviewer: parent CO orchestrator
- Date: 2026-05-26
