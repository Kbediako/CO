# Task Checklist - linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba

- Linear Issue: `CO-397` / `3b516fb7-dd94-4ca6-abb9-81edf906a1ba`
- MCP Task ID: `linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba`
- Primary PRD: `docs/PRD-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- TECH_SPEC: `tasks/specs/linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`
- Worktree: `/Users/kbediako/Code/CO/.workspaces/linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba-packet`
- Branch: `kb/co-397-docs-packet`

## Docs-First
- [x] Current `origin/main` worktree created for the packet lane. Evidence: branch `kb/co-397-docs-packet` at `origin/main`.
- [x] PRD drafted with protected terms and non-goals. Evidence: `docs/PRD-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, parity matrix, fallback decision table, Not Done If, and validation commands. Evidence: `tasks/specs/linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`, `docs/TECH_SPEC-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`.
- [x] ACTION_PLAN drafted for packet creation and parent-owned implementation sequencing. Evidence: `docs/ACTION_PLAN-linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba.md`.
- [x] Task registration mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Protected Issue Terms
- [x] `docs freshness ownership`
- [x] `fallback expiry`
- [x] `large refactor`
- [x] `minor seam`
- [x] `remove fallback`
- [x] `expire fallback`
- [x] `justify retaining fallback`
- [x] `docs:freshness:maintain`
- [x] `rolling_freshness_cohorts.owner_issue`
- [x] `configured_owner_terminal`
- [x] `same-project live owner`

## Parent-Owned Implementation
- [ ] Parent reconciles live CO-397 Linear issue context before implementation.
- [ ] Parent runs docs-review before implementation.
- [ ] Parent verifies `rolling_freshness_cohorts.owner_issue` as a live same-project non-terminal owner before owned rolling debt is usable.
- [ ] Parent treats terminal, canceled, duplicate, out-of-project, and unverifiable configured owners as fail-closed owner actions.
- [ ] Parent reuses or creates the canonical `docs:freshness:maintain` owner and intentionally re-homes `docs/docs-catalog.json` owner guidance when configured owner verification fails.
- [ ] Parent updates `scripts/docs-freshness-maintain.mjs`, focused tests, and `docs/guides/docs-freshness-cohorts.md` after review.
- [ ] Parent records terminal PR and ready-review handoff evidence.

## Validation
- [x] JSON parse check for `tasks/index.json`. Evidence: `node -e "JSON.parse(...); console.log('tasks/index ok')"` returned `tasks/index ok`.
- [x] JSON parse check for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(...); console.log('docs freshness registry ok')"` returned `docs freshness registry ok`.
- [x] Protected-term coverage check for packet files and `docs/TASKS.md`. Evidence: `rg -n "docs freshness ownership|fallback expiry|large refactor|minor seam|remove fallback|expire fallback|justify retaining fallback|docs:freshness:maintain|rolling_freshness_cohorts.owner_issue|configured_owner_terminal|same-project live owner" ...` returned matches across the packet and `docs/TASKS.md`.
- [x] Scoped diff review confirms no edits outside declared file scope. Evidence: `git status --short` shows only CO-397 packet files plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] `git diff --check`. Evidence: command exited 0.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 4876 docs, 4879 registry entries`.
- [x] `npm run docs:freshness:maintain -- --format json --warn`. Evidence: `out/linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba/docs-freshness-maintenance.json` reports `freshness_decision=clean`, `owner_issue=CO-401`, `owner_issue_verification=null`, `candidate_cohorts=[]`, `blocking_changed_paths=[]`, and `stale_entries=0`; terminal CO-401 owner evidence did not appear because the clean packet diff had no rolling/candidate debt to verify.

## Progress Log
- 2026-04-27: bounded packet worker created the CO-397 docs-first packet and registry mirrors from current `origin/main`. The worker intentionally did not edit runtime/provider/control-host surfaces or docs freshness implementation files.
- 2026-04-27: focused packet validation passed JSON parse checks, protected-term scan, `git diff --check`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness`.
- 2026-04-27: `docs:freshness:maintain -- --format json --warn` returned clean and wrote `out/linear-3b516fb7-dd94-4ca6-abb9-81edf906a1ba/docs-freshness-maintenance.json`; CO-401 is present only as the configured owner issue in this clean report, with no terminal verification evidence surfaced.

## Notes
- Do not weaken freshness/spec guard policy.
- Do not widen rolling freshness caps or windows as a substitute for owner verification.
- Do not create a replacement owner key; preserve `docs:freshness:maintain`.
