# ACTION_PLAN - CO-560 prevent provider-worker review-handoff false retry after clean nested review evidence

## Summary
- Goal: add explicit governed nested review evidence resolution so successful provider-worker review handoff does not become a false retry when parent telemetry is absent.
- Scope: provider-worker review evidence resolution, CO-515-shaped regression fixtures, control-host/co-status retry projection for handed-off issues, docs packet, validation, review, and PR handoff.
- Assumptions: no PR is attached at start; live Linear state was `Ready` and has been moved to `In Progress`; top-level missing telemetry remains fail-closed unless explicit clean governed evidence exists elsewhere.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider-linear-worker-proof.json`, `owner_status=succeeded`, `end_reason=issue_review_handoff`, `review/telemetry.json`, `implementation-gate`, `review_verdict`, `contract_validation`, `contract_overall_verdict`, `provider_linear_worker_review_unknown`, `provider-intake-state.json`, `co-status --format json`, `In Review`, `PR #836`, `CO-515`.
- Not done if: clean nested evidence still emits `provider_linear_worker_review_unknown`; missing evidence is accepted as clean; status queues the contained handoff shape as active/retrying; the fix relies on manual JSON edits, run deletion, or manifest quarantine.
- Pre-implementation issue-quality review: CO-560 is a bounded product bug with explicit evidence, non-goals, positive acceptance, and fail-closed negative controls.
- Fallback / refactor decision: touches a provider-worker review evidence seam. Remove the top-level-only telemetry authority for explicitly bound clean governed nested/child evidence; retain the non-expiring fail-closed contract for missing or unknown evidence.
- Durable retention evidence: fail-closed governed review evidence remains supported safety behavior, owned by provider-worker review contract handling, and validated by negative regressions.
- Large-refactor check: do not broaden into CO-478/CO-506 parser behavior; the bounded fix should use existing review telemetry/contract validation semantics.

## Milestones & Sequencing
1. Register docs-first packet, task mirrors, and freshness registry entries; run pre-implementation docs review.
2. Inspect current provider-worker review contract code and control-host rehydration/status projection.
3. Add focused CO-515-shaped positive and negative regression fixtures.
4. Implement explicit governed review evidence convergence and status retry suppression for already-handed-off issues.
5. Run focused tests and full required validation gates.
6. Run manifest-backed standalone review, address findings, run elegance pass, open/attach PR, drain `ready-review`, and transition to `In Review` only when clean.

## Dependencies
- Live Linear issue-context for CO-560.
- Existing review telemetry semantics from CO-478/CO-506.
- Current control-host/co-status fixture helpers.
- PR #836 / CO-515 evidence shape from issue text.

## Validation
- Checks / tests: focused provider-worker review evidence tests, focused control-host/co-status status projection tests, `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, manifest-backed `codex-orchestrator review`, elegance pass, and `npm run pack:smoke` if CLI/package review-wrapper paths require it.
- Rollback plan: revert the CO-560 branch/PR; fail-closed top-level telemetry behavior remains conservative, and local containment remains only an emergency operator action, not product behavior.

## Risks & Mitigations
- Risk: accepting clean from an unbound nested manifest. Mitigation: require explicit binding to worker proof/audit/child manifest and validate semantic/contract fields.
- Risk: hiding real failed active provider runs. Mitigation: keep the status suppression narrow to successful `issue_review_handoff` plus live review state and explicit clean evidence.
- Risk: weakening review parser semantics. Mitigation: do not modify clean/finding/unknown parser rules unless implementation proves the same root cause, and keep negative coverage for unknown/empty evidence.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-05-19.
