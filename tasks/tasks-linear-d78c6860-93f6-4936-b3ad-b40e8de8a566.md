# Task Checklist - linear-d78c6860-93f6-4936-b3ad-b40e8de8a566

- Linear Issue: `CO-427` / `d78c6860-93f6-4936-b3ad-b40e8de8a566`
- Primary PRD: `docs/PRD-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md`
- TECH_SPEC: `tasks/specs/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Docs-First
- [x] CO-427 packet drafted with protected terms, non-goals, Not Done If, acceptance criteria, and parity matrix. Evidence: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, and mirrors above.
- [x] Owner re-home scope recorded. Evidence: packet, catalog, and cohort guide describe live `CO-427` owner metadata and terminal `CO-425` evidence.
- [x] Current owner lineage preserved. Evidence: packet references `CO-425`, `configured_owner_terminal`, `freshness_decision=block_unowned_repo_debt`, `blocking_changed_paths=[]`, rolling March 28 task-packet/mirror cohort, and source CO-330 maintenance report.
- [x] Current-main rebase lineage preserved. Evidence: packet and cohort guide now record that CO-430 carried the integrated owner metadata from PR #728 but is terminal `Done` and historical evidence only.

## Registration
- [x] `tasks/index.json` registration added. Evidence: item `20260429-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566`.
- [x] `docs/TASKS.md` snapshot added. Evidence: CO-427 top snapshot.
- [x] `docs/docs-freshness-registry.json` packet rows added. Evidence: six rows for CO-427 packet and mirror files.

## Implementation
- [x] Pre-fix terminal owner reproduced. Evidence: `npm run docs:freshness:maintain -- --format json` returned `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-425`, `reason=configured_owner_terminal`, `state=Done`, `state_type=completed`, and `blocking_changed_paths=[]`.
- [x] Open, stamped owner reused. Evidence: post-fix `owner_issue_verification.issue=CO-427`, `state=In Progress`, `state_type=started`, `same_project=true`, `usable=true`.
- [x] Catalog owner re-homed. Evidence: `docs/docs-catalog.json` sets `policies.rolling_freshness_cohorts.owner_issue` to `CO-427`.
- [x] Cohort guide updated. Evidence: `docs/guides/docs-freshness-cohorts.md` names `CO-427` as current owner and keeps `CO-425` and `CO-430` as terminal historical evidence.
- [x] Retained cohort preserved. Evidence: post-fix maintenance output keeps `co-420-apr-28-march-28-task-packet-mirror`, 33 rows, 28 Task Packet, 5 Task Mirror, `last_review=2026-03-28`, `cadence_days=30`, `expires_after=2026-05-04`.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: `node -e "JSON.parse(...)"` passed.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(...)"` passed.
- [x] Targeted packet path scan. Evidence: `rg` check for `linear-d78c6860-93f6-4936-b3ad-b40e8de8a566` and `CO-427` across packet, registry, and task mirrors.
- [x] Targeted protected-term scan. Evidence: `rg` check for `docs:freshness:maintain`, `docs:freshness`, `CO-425`, `blocking_changed_paths=[]`, and the canonical owner marker across packet, registry, and task mirrors.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 4963 docs, 4966 registry entries`; rolling cohort `CO-425: 33 docs`.
- [x] `npm run docs:freshness:maintain -- --format json` baseline owner check. Evidence: `out/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566/post-packet-docs-freshness-maintenance.json` still reports `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-425`, `reason=configured_owner_terminal`, `state=Done`, `state_type=completed`, `usable=false`, and `blocking_changed_paths=[]` as expected until implementation.
- [x] `npm run docs:freshness:maintain -- --format json` passed after repair. Evidence: `out/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566/docs-freshness-maintenance.json` reports `freshness_decision=pass_with_owned_rolling_debt`, `owner_issue=CO-427`, `owner_issue_verification.usable=true`, `policy_capacity_status.status=within_policy`, and `blocking_changed_paths=[]`.
- [x] `npm run docs:freshness` passed after repair. Evidence: `docs:freshness OK - 4963 docs, 4966 registry entries`; rolling cohort `CO-427: 33 docs`, `last_review=2026-03-28`, `overdue=2/7 days`.
- [x] Required repo gates and review/elegance completed before PR lifecycle. Evidence: after merging current `origin/main`, delegation guard passed with recorded single-bounded-change override; `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint` (existing `DelegationMcpHealth.test.ts` warnings only), `npm run test` (357 files / 5049 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` passed. Final manifest-backed review telemetry: `.runs/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566/cli/2026-04-29T21-28-23-361Z-7f1ccdf1/review/telemetry.json` (`review_outcome=bounded-success` via command-intent retry; not a blocker). Elegance evidence: `out/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566/manual/elegance-review.md`.

## Handoff
- [x] Draft PR opened from `kb/co-427-docs-freshness-owner-packet`. Evidence: https://github.com/Kbediako/CO/pull/727.
- [x] PR attached to Linear issue if helper/API permits. Evidence: `codex-orchestrator linear attach-pr` returned `ok=true` with attachment `3dba6d71-71c9-44b9-a0fb-5d8871d841c0`.
- [x] Linear workpad created with branch, commit, PR, and validation evidence. Evidence: Linear workpad comment `6aad5861-3130-4fbe-bdea-db847d13ea96` / https://linear.app/asabeko/issue/CO-427/re-home-live-docs-freshness-maintenance-owner-after-terminal-co-425#comment-6aad5861.
- [x] PR updated with owner-rehome patch. Evidence: final branch head includes merged `origin/main` plus CO-427 owner-rehome patch; PR push/check drain remains the next lifecycle gate.
- [x] Current-main rebase validation completed after PR #728 overlap. Evidence: delegation guard passed with parent-only override; `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test` (357 files / 5049 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`, `npm run repo:stewardship`, `git diff --check`, and `node scripts/diff-budget.mjs` with integration-overlap override passed.
- [ ] `pr ready-review` drain clean. Evidence: pending handoff.
- [ ] Linear issue moved to `In Review` only after required gates are green.

## Notes
- This lane intentionally does not refresh, delete, hide, archive, or reclassify the March 28 rolling rows.
- This lane intentionally does not change source code, package files, validation scripts, or CO-330 provider-worker code.
- `blocking_changed_paths=[]` is owner-truth evidence, not a waiver.
