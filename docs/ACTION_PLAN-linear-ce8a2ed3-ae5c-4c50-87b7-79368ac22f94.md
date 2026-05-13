# ACTION_PLAN - CO-525 docs freshness preventive lifecycle automation

## Summary
- Goal: make docs freshness preventive and lifecycle-driven instead of date-bound cleanup.
- Scope: docs packet metadata, terminal packet lifecycle classification, archive/self-heal dry-runs, public/current pre-expiry routing, scheduled docs truthfulness actions, repo-gate status projection, provider intake/handoff context, and guide/catalog parity checks.
- Assumptions: existing strict gates remain authoritative; current baseline debt is real and must stay visible until lifecycle automation routes or fixes it.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, `terminal task lifecycle`, `docs freshness registry`, `docs catalog`, `implementation-docs archive automation`, `terminal_pending_archive`, `preserved_historical_stub`, `repo_gates.docs_freshness_maintain`, `canonical owner key`, `CO-431`, `CO-522`, `CO-519`, `CO-516`, `block_policy_over_budget`, `block_diff_local`, `blocking_changed_paths=[]`.
- Not done if: completed task packets can remain ordinary active stale rows, scheduled docs truthfulness is warn-only, status/provider surfaces lack repo-gate context, public/current docs enter rolling deferral, guide/catalog drift can recur, or the fix is another cap/window/date patch.
- Pre-implementation issue-quality review: self-approved on 2026-05-13 after live `linear issue-context`; issue includes protected terms, non-goals, parity matrix, not-done-if, and concrete acceptance criteria for the root lifecycle refactor.
- Fallback / refactor decision: this task touches stale and report-only seams. Decision is `remove fallback` for warn-only scheduled maintenance, ordinary active terminal packet rows, and late repo-gate discovery. The large-refactor preference applies and is the chosen approach.
- Durable retention evidence: no new retained temporary fallback is intended. Any dry-run path must be a supported deterministic mode, not an expiring fallback.
- Large-refactor check: required because authority is split across registry/catalog state, terminal task/Linear state, archive automation, scheduled workflows, and status/provider reporting.

## Milestones & Sequencing
1. Seed docs-first packet, registry mirrors, workpad, baseline artifacts, and docs-review evidence.
2. Map existing freshness, maintenance, archive, status, provider, and workflow code paths; select the central lifecycle/action module boundary.
3. Implement lifecycle metadata/classification and tests for terminal packet surfaces.
4. Implement mechanical archive/reclassification dry-run/self-heal action planning and scheduled docs truthfulness action routing.
5. Implement public/current direct pre-expiry action routing and guide/catalog parity checks.
6. Implement `repo_gates.docs_freshness_maintain` in status JSON/UI and provider intake/handoff context.
7. Run focused and full validation, standalone review, elegance pass, PR attachment, ready-review drain, and Linear handoff.

## Dependencies
- Live Linear issue context for terminal task/owner state.
- Existing `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, implementation-docs archive, status UI, and provider workflow helpers.
- CO-431 canonical-owner routing, CO-522 live maintenance owner, CO-519 deterministic issue labels/relations, and CO-516 provider-intake closeout cleanup as adjacent but not expanded scopes.

## Validation
- Checks / tests:
  - Baseline: `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`, `node scripts/spec-guard.mjs --dry-run`, implementation-docs archive dry-run, `npm run repo:stewardship`, guide/catalog parity evidence.
  - Focused tests: docs freshness lifecycle, maintenance action routing, archive self-heal, public/current strict routing, status projection, provider intake/handoff.
  - Full gates: delegation guard, spec-guard, build, lint, full test, docs:check, docs:freshness, docs:freshness:maintain, repo:stewardship, diff-budget, standalone review, elegance pass, pack:smoke if CLI/package/review-wrapper surfaces change.
- Rollback plan: revert lifecycle/action module and callers as one PR if strict gates regress; do not mask failures with cap/window/date changes.

## Risks & Mitigations
- Risk: broad scope crosses many orchestration surfaces. Mitigation: centralize classification/action output and keep callers thin.
- Risk: legacy registry rows lack new metadata. Mitigation: support compatibility reads while making new creation/validation fail closed for missing canonical metadata.
- Risk: scheduled self-heal PR behavior may depend on credentials. Mitigation: deterministic dry-run/action output remains required and workflow PR creation is separately gated.
- Risk: public/current docs accidentally enter rolling deferral. Mitigation: explicit fail-closed tests.

## Approvals
- Reviewer: Provider worker pre-implementation review.
- Date: 2026-05-13.
