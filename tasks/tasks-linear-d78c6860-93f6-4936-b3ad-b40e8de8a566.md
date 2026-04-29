# Task Checklist - linear-d78c6860-93f6-4936-b3ad-b40e8de8a566

- Linear Issue: `CO-427` / `d78c6860-93f6-4936-b3ad-b40e8de8a566`
- Primary PRD: `docs/PRD-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md`
- TECH_SPEC: `tasks/specs/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Docs-First
- [x] CO-427 packet drafted with protected terms, non-goals, Not Done If, acceptance criteria, and parity matrix. Evidence: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, and mirrors above.
- [x] Packet-only scope recorded. Evidence: packet states no `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, CO-330 behavior, CO-408 workspace, code, package, or validation-script changes in this PR.
- [x] Current owner lineage preserved. Evidence: packet references `CO-425`, `configured_owner_terminal`, `freshness_decision=block_unowned_repo_debt`, `blocking_changed_paths=[]`, rolling March 28 task-packet/mirror cohort, and source CO-330 maintenance report.

## Registration
- [x] `tasks/index.json` registration added. Evidence: item `20260429-linear-d78c6860-93f6-4936-b3ad-b40e8de8a566`.
- [x] `docs/TASKS.md` snapshot added. Evidence: CO-427 top snapshot.
- [x] `docs/docs-freshness-registry.json` packet rows added. Evidence: six rows for CO-427 packet and mirror files.

## Implementation
- [ ] Live owner re-home, refresh, archive, or reclassification selected and implemented. Evidence: pending future CO-427 active lane.
- [ ] `docs/docs-catalog.json` owner metadata updated if owner re-home is the chosen maintenance path. Evidence: pending future CO-427 active lane.
- [ ] Retained rolling cohort reviewed, archived, reclassified, or kept under a live owner with policy evidence. Evidence: pending future CO-427 active lane.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: `node -e "JSON.parse(...)"` passed.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(...)"` passed.
- [x] Targeted packet path scan. Evidence: `rg` check for `linear-d78c6860-93f6-4936-b3ad-b40e8de8a566` and `CO-427` across packet, registry, and task mirrors.
- [x] Targeted protected-term scan. Evidence: `rg` check for `docs:freshness:maintain`, `docs:freshness`, `CO-425`, `blocking_changed_paths=[]`, and the canonical owner marker across packet, registry, and task mirrors.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 4963 docs, 4966 registry entries`; rolling cohort `CO-425: 33 docs`.
- [x] `npm run docs:freshness:maintain -- --format json` baseline owner check. Evidence: `out/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566/post-packet-docs-freshness-maintenance.json` still reports `freshness_decision=block_unowned_repo_debt`, `owner_issue=CO-425`, `reason=configured_owner_terminal`, `state=Done`, `state_type=completed`, `usable=false`, and `blocking_changed_paths=[]` as expected until implementation.

## Handoff
- [ ] Draft PR opened from `kb/co-427-docs-freshness-owner-packet`.
- [ ] PR attached to Linear issue if helper/API permits.
- [ ] Linear issue remains in `Backlog`; parent/provider workflow owns future transition.

## Notes
- This packet intentionally does not fix `docs:freshness:maintain`; it creates the prerequisite issue packet and mirrors before active owner work.
- The current baseline blocker is terminal `CO-425` owner debt with `blocking_changed_paths=[]`.
- This packet intentionally does not touch CO-408, CO-405, CO-330 product behavior, or the dirty shared root checkout.
