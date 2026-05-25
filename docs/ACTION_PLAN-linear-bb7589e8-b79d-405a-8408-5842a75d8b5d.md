# ACTION_PLAN - CO-584 docs freshness registry lifecycle integrity hard block

## Added by Bootstrap 2026-05-25

## Summary
- Goal: Repair the current docs-freshness registry lifecycle contradiction and prevent recurrence.
- Scope: Docs-first packet, registry integrity fixture, implementation repair, validation, PR review, and Linear handoff.
- Assumptions: CO-583 continues to own the degraded control-host status plane; CO-584 can proceed manually in an isolated worktree.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness`, `docs:freshness:maintain`, `block_missing_or_invalid_registry`, `docs/docs-freshness-registry.json`, `status: archived`, `lifecycle_state: active`, `terminal_pending_archive`, `preserved_historical_stub`, `canonical_owner_key`, `CO-579`, `CO-580`, `CO-581`, `CO-569`, `CO-429`.
- Not done if: invalid archived/active rows remain, `last_review` is blindly changed, capacity debt is hidden, or exact owner routes are broadened.
- Pre-implementation issue-quality review: Live evidence and GPT Pro review agree registry integrity must be fixed before owner/capacity routing can be trusted.
- Fallback / refactor decision: This touches stale lifecycle encoding. Decision: remove fallback; archived registry rows must not carry active lifecycle state.
- Durable retention evidence: Not applicable; no retained fallback is allowed for the archived/active contradiction.
- Large-refactor check: CO-580 already provided the larger shared resolver/finalizer boundary. CO-584 is a focused repair on that boundary.

## Milestones & Sequencing
1. Register docs-first packet and freshness registry rows for CO-584.
2. Add focused RED tests that capture the archived/active contradiction and maintain decision priority.
3. Repair the lifecycle data and implementation path that allowed contradictory rows.
4. Validate with focused tests, JSON checks, spec guard, docs checks, freshness commands, and maintain check.
5. Run standalone review/elegance, open PR, confirm Codex and CodeRabbit review, and complete Linear handoff only after review drain.

## Dependencies
- CO-583 status-plane degradation affects provider-worker admission only; it does not block local isolated implementation.
- CO-579 remains the global docs-freshness controller.
- CO-581 and CO-569 remain exact rolling cohort owners.

## Validation
- Checks / tests: focused docs-freshness tests, focused maintain tests, `jq empty`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/docs-freshness-maintain.mjs --check`.
- Rollback plan: Revert the CO-584 branch. Do not mutate shared root directly.

## Risks & Mitigations
- Risk: Repairing registry rows could hide capacity debt. Mitigation: require maintain output to preserve secondary capacity diagnostics after registry repair.
- Risk: Another migration path emits the same contradiction. Mitigation: add failing regression coverage before implementation.
- Risk: Control-host remains unhealthy. Mitigation: keep work isolated and update CO-583 with evidence rather than launching provider workers.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-25.
