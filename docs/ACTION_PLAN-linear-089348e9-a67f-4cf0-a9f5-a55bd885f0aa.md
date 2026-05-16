# ACTION_PLAN - CO-516 reconcile provider-intake terminal merge closeout truth

## Summary
- Goal: make provider-intake/control-host truth reconcile terminal merged/Done closeout claims without deleting audit history.
- Scope: CO-516 docs packet, provider-intake/provider handoff reconciliation, focused regression tests, and required validation gates.
- Assumptions: parent owns Linear/GitHub lifecycle; this worker must not mutate live Linear, GitHub, control-host artifacts, or dispatch pilot config.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider-intake-state.json`, `review_promotion`, `merge_closeout`, `provider_issue_merge_closeout_merged`, `provider_issue_released:not_active`, `CO-513`, `CO-510`, `CO-492/#793`, `In Review -> Merging -> Done`, `active non-release alarms`.
- Not done if: terminal merged/Done closeout still leaves stale `Merging` or `Blocked` metadata authoritative, audit fields are deleted, or warnings are hidden without terminal source evidence.
- Pre-implementation issue-quality review: approved locally on 2026-05-16; the contract is provider-intake terminal closeout truth and is not plausibly narrower than one projection-only suppression.
- Fallback / refactor decision: this task touches stale/cached provider-intake behavior. Decision is `remove fallback` for cached non-terminal metadata authority after terminal merged/Done truth, and `justify retaining fallback` for retained closeout audit rows.
- Durable retention evidence: retained audit row contract is provider-intake terminal closeout audit retention; owning surface is provider-intake control-host; steady-state proof is source-labeled terminal evidence without active work authority.
- Large-refactor check: broader provider-intake authority cleanup is not required for this bounded lane because it removes a stale terminal authority path rather than adding a new seam.

## Milestones & Sequencing
1. Create docs-first packet and register mirrors.
2. Run docs-review or record unrelated baseline blocker before implementation.
3. Add focused failing regression for terminal merged/Done closeout residue.
4. Implement the smallest reconciliation/classification fix.
5. Run focused tests and feasible repo gates.
6. Update checklists with command evidence and leave the worktree clean for parent lifecycle.

## Dependencies
- Existing provider handoff/intake tests.
- Existing closeout metadata helpers in provider-intake/control-host code.
- Parent-provided issue examples for CO-513, CO-510, and CO-492/#793 lineage.

## Validation
- Checks / tests:
  - focused changed Vitest tests
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `node scripts/diff-budget.mjs`
  - additional focused projection test if source changes touch status projection
- Rollback plan: revert the CO-516 source/test/doc changes; no live provider-intake, Linear, or GitHub state is mutated by this worker.

## Risks & Mitigations
- Risk: stale closeout residue is hidden too broadly.
  - Mitigation: require merged PR plus terminal Linear/source evidence in regression coverage.
- Risk: audit history is lost.
  - Mitigation: assert retained `merge_closeout` / `review_promotion` fields remain inspectable.
- Risk: implementation widens into merge policy.
  - Mitigation: keep changes in provider-intake reconciliation/projection and do not alter PR readiness or Done transition behavior.

## Approvals
- Reviewer: CO-516 manual replacement worker
- Date: 2026-05-16
