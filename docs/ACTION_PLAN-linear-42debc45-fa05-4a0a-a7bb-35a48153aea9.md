# ACTION_PLAN - Run artifact truth: reconcile orphaned active manifests and child-lane placeholders after release/invalidation

## Summary
- Goal: give the parent lane a bounded implementation plan for `CO-241`, where `.runs/**/manifest.json` records with `status=in_progress` or `status=launching` must be reconciled against `provider-intake-state.json` lifecycle truth and child-lane ledger truth after `orphaned / released / removed / invalidated / rejected` outcomes.
- Scope: docs-first packet, `tasks/index.json` registration, parent-owned run artifact truth reconciliation, parent-owned focused validation.
- Assumptions:
  - the shared source payload itself is absent in this child checkout
  - the protected parent prompt wording is the authoritative checksum for this documentation phase
  - the smallest correct fix is a reconciliation/classification contract, not artifact deletion

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `.runs/**/manifest.json`
  - `status=in_progress`
  - `status=launching`
  - `provider-intake-state.json`
  - `orphaned / released / removed / invalidated / rejected`
  - `file-based audit truth`
  - `child-lane ledger truth`
- Not done if:
  - active projections still count orphaned active-looking manifests as live work
  - `released` or `removed` provider truth still contradicts retained manifest status
  - `invalidated` or `rejected` child-lane ledger truth still leaves child lanes active
  - stale `status=launching` placeholders still block capacity after reconciliation
  - the fix deletes historical artifacts instead of preserving file-based audit truth
- Pre-implementation issue-quality review:
  - 2026-04-18: the lane prompt makes this a run artifact truth and child-lane ledger truth reconciliation lane. The packet rejects widening into Linear mutation, scheduler redesign, destructive state cleanup, or artifact deletion.

## Milestones & Sequencing
1. Completed in this child lane: create the PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `tasks/index.json` entry for `CO-241`.
2. Parent refreshes current live evidence because the source payload path is absent in this child checkout.
3. Parent audits `.runs/**/manifest.json` discovery and active-status projection for `status=in_progress` and `status=launching`.
4. Parent audits `provider-intake-state.json` lifecycle truth for `released` and `removed` provider claims.
5. Parent audits child-lane ledger truth for `invalidated`, `rejected`, and stale placeholder records.
6. Parent defines the smallest reconciliation contract that preserves file-based audit truth while preventing stale active-work projection.
7. Parent implements focused changes in the smallest existing seam.
8. Parent validates with focused tests and carries the packet into docs-review, implementation review, PR, and merge.

## Dependencies
- Shared source anchor: `ctx:sha256:63b0749832e8a186a955a92d8fd3c5f60eb8d06d28e3a02f3006b2838e802175#chunk:c000001`
- Origin manifest: `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-packet/cli/2026-04-18T15-12-30-748Z-ea3efd2f/manifest.json`
- Expected source payload path, absent in this child checkout: `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-packet/cli/2026-04-18T15-12-30-748Z-ea3efd2f/memory/source-0/source.txt`
- Likely parent seam inventory:
  - `scripts/lib/run-manifests.js`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
- Likely parent focused tests:
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - nearby status/read-model projection tests selected by the parent

## Validation
- Child lane only:
  - `python3 -m json.tool tasks/index.json >/tmp/co-241-index.json`
  - `rg -n "\\.runs/\\*\\*/manifest\\.json|status=in_progress|status=launching|provider-intake-state\\.json|orphaned|released|removed|invalidated|rejected|file-based audit truth|child-lane ledger truth" docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md tasks/tasks-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
  - `git diff --check -- docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md tasks/tasks-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md tasks/index.json`
  - `for f in docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md tasks/tasks-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md; do git diff --check --no-index -- /dev/null "$f" >/tmp/co-241-diff-check-one.log 2>&1; code=$?; if [ "$code" -gt 1 ]; then cat /tmp/co-241-diff-check-one.log; exit "$code"; fi; done`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
- Parent implementation lane:
  - focused child-lane placeholder and invalidation/rejection tests
  - focused provider-run manifest orphan classification tests
  - focused active projection/status tests proving genuine live runs stay visible
  - parent docs-review before implementation
  - parent-selected scoped validation after source edits
- Rollback plan:
  - revert the bounded reconciliation seam if it hides genuinely live `status=in_progress` or `status=launching` runs, deletes audit artifacts, or weakens child-lane ledger truth.

## Risks & Mitigations
- Risk: the fix undercounts active work by treating all `status=in_progress` or `status=launching` manifests as stale.
  - Mitigation: require lifecycle corroboration from `provider-intake-state.json` or child-lane ledger truth before orphan classification.
- Risk: the fix deletes audit artifacts to make projections clean.
  - Mitigation: file-based audit truth is a protected term and historical artifact deletion is a non-goal.
- Risk: invalidation/rejection truth is lost when child output arrives after parent decision.
  - Mitigation: preserve child-lane ledger truth as the authority for `invalidated` and `rejected` decisions.

## Approvals
- Docs packet child lane: `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-packet/cli/2026-04-18T15-12-30-748Z-ea3efd2f/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
