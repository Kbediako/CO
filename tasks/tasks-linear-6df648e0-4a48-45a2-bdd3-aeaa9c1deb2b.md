# Task Checklist - linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b

- Linear Issue: `CO-444` / `6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`
- Primary PRD: `docs/PRD-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- TECH_SPEC: `tasks/specs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Protected owner-key token: `canonical_owner_key=docs:freshness:maintain`
- Child manifest: `.runs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b-docs-packet/cli/2026-04-30T07-35-51-905Z-15903f69/manifest.json`
- Maintenance report: `out/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b/docs-freshness-maintenance.json`

## Docs-First
- [x] CO-444 packet drafted with protected terms, non-goals, Not Done If, acceptance criteria, and parity matrix. Evidence: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, and mirrors above.
- [x] Terminal-owner context preserved. Evidence: packet and cohort guide reference `terminal configured owner CO-441`, `block_unowned_repo_debt`, `docs:freshness:maintain`, and `canonical_owner_key=docs:freshness:maintain`.
- [x] Rolling cohort context preserved. Evidence: packet and cohort guide reference `co-420-apr-28-march-28-task-packet-mirror` and `March 28 task-packet mirror rolling cohort`.
- [x] Parent/child ownership split recorded. Evidence: child manifest owns packet setup; parent owns owner re-home, validation, PR lifecycle, Linear state, and workpad.

## Registration
- [x] `tasks/index.json` registration added. Evidence: item `20260430-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`.
- [x] `docs/TASKS.md` snapshot added. Evidence: CO-444 owner re-home top snapshot.
- [x] `docs/docs-freshness-registry.json` packet rows added. Evidence: six rows for CO-444 packet and mirror files.

## Owner Re-home
- [x] Pre-fix maintenance blocker reproduced. Evidence: `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-441`, `owner_issue_action.reason=configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, and `blocking_changed_paths=[]`.
- [x] Live owner metadata re-homed. Evidence: `docs/docs-catalog.json` rolling freshness owner issue is `CO-444`.
- [x] Cohort lineage updated. Evidence: `docs/guides/docs-freshness-cohorts.md` records terminal `CO-441` and current live `CO-444`.
- [x] Historical cohort preserved. Evidence: the March 28 rolling cohort remains `co-420-apr-28-march-28-task-packet-mirror` with no `last_review` refresh, row deletion, hiding, archive, or reclassification.

## Not Done If
- CO-444 packet or mirrors omit `docs:freshness:maintain`, `canonical_owner_key=docs:freshness:maintain`, `terminal configured owner CO-441`, `block_unowned_repo_debt`, `co-420-apr-28-march-28-task-packet-mirror`, or `March 28 task-packet mirror rolling cohort`.
- The live owner path still resolves only to terminal `CO-441`.
- `docs:freshness:maintain` still reports `block_unowned_repo_debt` for `canonical_owner_key=docs:freshness:maintain`.
- Historical evidence is deleted, hidden, blindly refreshed, archived, or reclassified to make validation pass.
- `docs:freshness`, `docs:freshness:maintain`, spec-guard, docs-catalog policy, or CO-443 behavior is weakened or broadened.

## Acceptance Criteria
- [x] A live same-project owner for `canonical_owner_key=docs:freshness:maintain` exists and is not terminal. Evidence: `docs:freshness:maintain` verifies `owner_issue=CO-444` as usable.
- [x] The `co-420-apr-28-march-28-task-packet-mirror` cohort has an intentional owner path and validation evidence. Evidence: cohort guide plus maintenance report.
- [x] Relevant repo surfaces are updated consistently. Evidence: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] `docs:freshness:maintain -- --format json` reaches `pass_with_owned_rolling_debt`. Evidence: `out/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b/docs-freshness-maintenance.json`.
- [x] Product-scope implementation lanes are not widened into recurring docs-freshness maintenance. Evidence: diff is docs/config/task metadata only.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: `node -e "JSON.parse(...tasks/index.json...)"`.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(...docs/docs-freshness-registry.json...)"`.
- [x] Targeted packet path scan for `linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b` and `CO-444`. Evidence: scoped `rg`.
- [x] Targeted protected-term scan. Evidence: scoped `rg`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `OK (1 subagent manifest(s) found)`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: command completed successfully.
- [x] `npm run build`. Evidence: command completed successfully.
- [x] `npm run lint`. Evidence: command completed successfully with existing `DelegationMcpHealth.test.ts` warnings only.
- [x] `npm run test`. Evidence: 357 files / 5049 tests passed.
- [x] `npm run docs:check`. Evidence: command completed successfully.
- [x] `npm run docs:freshness`. Evidence: 33 rolling cohort entries under `CO-444`, no stale/missing blockers.
- [x] `npm run docs:freshness:maintain -- --format json`. Evidence: `freshness_decision=pass_with_owned_rolling_debt`, `owner_issue=CO-444`, `blocking_changed_paths=[]`, `policy_capacity_status.status=within_policy`.
- [x] `npm run repo:stewardship`. Evidence: 6121 tracked files, 0 action-required.
- [x] `git diff --check`. Evidence: command completed with no output.
- [x] `node scripts/diff-budget.mjs`. Evidence: files=9/25, lines=565/1200.
- [x] Manifest-backed standalone review. Evidence: `../../.runs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b/cli/2026-04-30T07-32-29-224Z-3f053a94/review/telemetry.json`, `status=succeeded`, `review_outcome=bounded-success` after command-intent retry, no actionable issues.
- [x] Explicit elegance review. Evidence: `out/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b/manual/elegance-review.md`.
- [ ] PR checks, feedback sweep, and ready-review drain. Evidence: pending.

## Notes
- The docs child lane completed successfully; helper accept failed only because Linear updated after the child snapshot, so the parent imported the reviewed patch after `git apply --check` passed.
- CO-444 intentionally re-homes owner metadata only. It does not refresh the March 28 cohort, delete packet evidence, weaken freshness policy, or widen CO-443.
