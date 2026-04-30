# Task Checklist - linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c

- Linear Issue: `CO-430` / `b78c98eb-8ed4-4e19-9099-81d5e34bb33c`
- Primary PRD: `docs/PRD-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- TECH_SPEC: `tasks/specs/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Docs-First
- [x] CO-430 packet drafted with protected terms, non-goals, Not Done If, and owner-boundary matrix. Evidence: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, and mirrors above.
- [x] Malformed Linear acceptance criteria normalized into real checkboxes. Evidence: this checklist and action plan acceptance criteria.
- [x] CO-430 versus CO-427 duplicate-owner posture recorded. Evidence: packet states CO-430 is the narrow live owner repair after terminal CO-425 and is not collapsed into CO-427.

## Registration
- [x] `tasks/index.json` registration added. Evidence: item `20260430-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c`.
- [x] `docs/TASKS.md` snapshot added. Evidence: CO-430 top snapshot.
- [x] `docs/docs-freshness-registry.json` packet rows added. Evidence: six rows for CO-430 packet and mirror files.

## Acceptance Criteria
- [x] Reproduce `docs:freshness:maintain` terminal-owner output. Evidence: `out/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c/before/docs-freshness-maintenance.json` records `owner_issue=CO-425`, `configured_owner_terminal`, terminal `Done`, and `blocking_changed_paths=[]`.
- [x] Reuse or create the live same-project `docs:freshness:maintain` owner. Evidence: `docs/docs-catalog.json` now points `rolling_freshness_cohorts.owner_issue` at `CO-430`; post-fix maintenance verifies `CO-430` as same-project and non-terminal.
- [x] Keep `docs:freshness` policy and rolling/candidate debt visible. Evidence: `docs/guides/docs-freshness-cohorts.md`, `out/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c/docs-freshness.json`, and post-fix maintenance output preserve the March 28 rolling cohort and March 30 candidate/spec blockers.
- [x] `docs:freshness:maintain` reports a non-terminal same-project owner or a justified replacement blocker. Evidence: post-fix `out/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c/after/docs-freshness-maintenance.json` reports `owner_issue=CO-430`, `state=Blocked`, `state_type=started`, `usable=true`, and `owner_issue_action.reason=succeeded`; the standalone lane still saw external March 30 spec/candidate debt, and the CO-428 integration branch now carries that separate repair.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: `node -e` structural parse returned `json ok`.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `node -e` structural parse returned `json ok`.
- [x] Targeted protected-term scan for `linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c`, `CO-430`, `docs:freshness:maintain`, and `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`. Evidence: local `rg` scan after packet setup.
- [x] `npm run docs:check` or a recorded blocker. Evidence: `npm run docs:check` passed with `docs:check: OK`.
- [x] Provider-worker owner-rehome validation after CO-430 is admitted. Evidence: before/after `docs:freshness:maintain` reports show terminal CO-425 replaced by live CO-430.
- [x] `docs:check` after owner re-home. Evidence: `npm run docs:check` passed with `docs:check: OK`.
- [x] Full integration validation. Evidence: the standalone CO-430 lane was blocked by external March 30 active-spec/candidate debt; the CO-428 integration branch now imports the owner re-home plus the separate March 30 repairs and passes `npm run docs:freshness`, `npm run docs:freshness:maintain`, and `node scripts/spec-guard.mjs --dry-run`.

## Handoff
- [x] Fresh Linear issue-context read before transition. Evidence: issue-context returned `state=Backlog`, `updated_at=2026-04-30T01:52:01.291Z`, and no escaped checklist artifacts.
- [x] Guarded transition `Backlog -> Ready`. Evidence: `linear transition --expected-state Backlog --expected-updated-at 2026-04-30T01:52:01.291Z` moved CO-430 to Ready at `2026-04-30T01:52:32.411Z`.
- [x] Control-host nudge after Ready. Evidence: `control-host nudge --issue-id CO-430` accepted a starting claim with `launch_source=control-host` at `2026-04-30T01:53:00.413Z`.
- [ ] Monitor CO-430 provider worker until terminal state. Current owner-rehome work is complete; standalone closeout should consume the CO-428 integration result rather than reimplementing the March 30 repairs in CO-430.

## Notes
- Do not widen CO-429 beyond the six CO-41 `linear-af97d673` registry rows.
- Do not widen CO-428 beyond the March 30 active-spec cohort.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, or terminal-owner verification.
- Do not delete historical packet docs or registry rows to make validation pass.
