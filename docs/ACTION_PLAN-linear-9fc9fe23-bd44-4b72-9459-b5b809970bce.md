# ACTION_PLAN - CO: stop review-handoff promotion from parking `In Review` issues on `multiple_attached_prs`

## Summary
- Goal: give the parent lane a bounded implementation plan for the `CO-237` review-handoff multiple-attachment seam across the `CO-196` and `CO-219` incident checksums.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned current-candidate repair, and parent-owned focused validation.
- Assumptions:
  - the shared source payload itself is absent in this child checkout
  - fallback source anchor `ctx:sha256:8391bf9a067e2de9c1d2651dbe67acb9d3c43cf6bde71c5639ee057b9ca37dfc#chunk:c000001` plus current repo seams are authoritative for this docs lane
  - the smallest correct fix is one bounded current-candidate distinction that separates true ambiguity from bounded non-primary same-repo attachments without weakening `multiple_attached_prs`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider_issue_review_promotion_action_required`
  - `multiple_attached_prs`
  - `In Review`
  - `review-handoff promotion`
  - `providerMergeCloseout.ts`
  - `providerIssueHandoff.ts`
  - `CO-196`
  - `CO-219`
  - `#515`
  - `closed #508`
  - `#523`
  - `#522`
- Not done if:
  - `CO-196` or `CO-219` style incidents still park the issue in `In Review` on generic `multiple_attached_prs` when one truthful current candidate exists
  - the lane widens into "just `CO-104` again", "only a `Merging` bug", "only `CO-154`", or "only `CO-226`"
  - manual attachment cleanup remains the intended steady state
- Pre-implementation issue-quality review:
  - 2026-04-18: accepted framing is review-handoff multiple-attached-PR truth across `CO-196` and `CO-219`
  - rejected framings are `CO-104` reopening, `Merging`-only redesign, `CO-154`, `CO-226`, and manual cleanup as product behavior

## Milestones & Sequencing
1. Create the docs-first packet and bounded registry mirrors for `CO-237` within the declared docs scope.
2. Parent reproduces the `CO-196` checksum with closed `#508` / `#515` and the `CO-219` checksum with `#523` / `#522` from the protected issue wording and current repo seams.
3. Parent identifies the smallest truthful current-candidate distinction that lets review-handoff promotion separate bounded non-primary same-repo attachments from real ambiguity.
4. Parent applies that distinction at the shared candidate-selection and review-handoff promotion seam so `provider_issue_review_promotion_action_required` is not persisted for bounded non-primary baggage.
5. Parent preserves explicit `multiple_attached_prs` truth when more than one real current candidate remains, and keeps `CO-104` historical merged-attachment semantics intact.
6. Parent adds focused regressions proving:
   - `CO-196` style closed superseded attachments no longer park the issue in `In Review`
   - `CO-219` style auxiliary attachments no longer park the issue in `In Review`
   - true ambiguity still remains explicit as `multiple_attached_prs`
   - the repair does not drift into `CO-104`, `CO-154`, or `CO-226`

## Dependencies
- Shared source anchor: `ctx:sha256:8391bf9a067e2de9c1d2651dbe67acb9d3c43cf6bde71c5639ee057b9ca37dfc#chunk:c000001`
- Origin manifest: `.runs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce-co237-docs-packet/cli/2026-04-18T01-48-20-327Z-dbdc245e/manifest.json`
- Parent prompt payload reference (absent in this checkout): `.runs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce-co237-docs-packet/cli/2026-04-18T01-48-20-327Z-dbdc245e/memory/source-0/source.txt`
- Likely parent implementation seams:
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts` only if additive proof changes are needed
- Likely parent focused tests:
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts` only if proof output changes

## Validation
- Child lane only:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `rg -n "provider_issue_review_promotion_action_required|multiple_attached_prs|In Review|review-handoff promotion|providerMergeCloseout.ts|providerIssueHandoff.ts|CO-196|CO-219|#515|closed #508|#523|#522|CO-104|CO-154|CO-226|manual attachment cleanup" docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/tasks-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md .agent/task/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
  - `git diff --check -- docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/tasks-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md .agent/task/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation lane:
  - focused `ProviderMergeCloseout` and `ProviderIssueHandoff` regressions for `CO-196` and `CO-219`
  - proof or observability coverage only if additive review-promotion fields change
  - parent-owned docs-review before implementation
  - parent-owned `node scripts/spec-guard.mjs --dry-run` after packet acceptance
- Rollback plan:
  - revert the bounded current-candidate rule if it hides real ambiguity or broadens into `CO-104`, `CO-154`, or `CO-226`

## Risks & Mitigations
- Risk: the parent overfits to the concrete PR numbers and misses the actual bounded class of non-primary attachments.
  - Mitigation: keep the packet framed around the incident class plus the concrete checksum examples.
- Risk: the parent weakens true ambiguity while trying to avoid manual cleanup.
  - Mitigation: keep `multiple_attached_prs` explicit when more than one real current candidate remains.
- Risk: the lane is reframed as generic attachment or test infrastructure work.
  - Mitigation: preserve explicit rejected framings in every packet artifact.

## Approvals
- Docs packet child lane: `.runs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce-co237-docs-packet/cli/2026-04-18T01-48-20-327Z-dbdc245e/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
