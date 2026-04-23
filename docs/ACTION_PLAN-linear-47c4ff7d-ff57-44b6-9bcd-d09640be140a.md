# ACTION_PLAN - Maintain docs freshness rolling baseline for Apr 22 stale cohorts and registry drift

## Summary
- Goal: give the parent lane a bounded implementation plan for the Apr 22 docs freshness owner lane after recreating the docs packet on the current branch.
- Scope: the current branch owns the docs-first packet plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updates, then carries the reviewed baseline repairs, regression coverage, validation, workpad, Linear, PR, and merge flow.
- Assumptions:
  - the shared source payload is the parent worker prompt for this run
  - fresh current-main before artifacts are the authoritative Apr 22 baseline for implementation decisions
  - the older `4307`/`4316`/`53`/`6 missing` issue snapshot remains historical context only
  - the smallest correct repair uses existing docs freshness/catalog/cohort machinery, not a policy redesign

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `canonical owner`
  - `CO-175`
  - `CO-267`
  - `terminal owner metadata`
  - `blocking_changed_paths=[]`
  - `docs/codex-orchestrator-issues.md`
  - `missing-on-disk registry references`
  - `Mar 21/22 historical cohorts`
  - `1317`
  - `1318`
  - `current main`
- Not done if:
  - `docs:freshness:maintain` still points at a terminal owner
  - Apr 22 missing-on-disk registry references or hard-stale `docs/codex-orchestrator-issues.md` remain unresolved with no reviewed owner action
  - Mar 21/22 historical cohorts remain live with no explicit owner evidence
  - `CO-295` stays blocked for repo-wide debt while `blocking_changed_paths=[]`
- Pre-implementation issue-quality review:
  - 2026-04-22: CO-300 is already shaped as the Apr 22 stale-cohort and registry-drift owner lane; the packet must preserve exact owner-transition wording and reject reinterpretation as CO-295 implementation work or gate-policy redesign.

## Milestones & Sequencing
1. Recreate the six packet files and the three required registry/mirror updates on the current branch after invalidating the stale child-lane seed.
2. Parent captures Apr 22 before artifacts on `current main`:
   - `MCP_RUNNER_TASK_ID=linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a npm run docs:freshness`
   - `MCP_RUNNER_TASK_ID=linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a npm run docs:freshness:maintain`
3. Parent saves those reports under `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/`.
4. Parent records that the earlier six missing-on-disk registry references no longer reproduce on current main, preserves that evidence, and resolves hard-stale `docs/codex-orchestrator-issues.md` with reviewed evidence.
5. Parent classifies and processes the Mar 21/22 historical stale cohorts, including `1317`/`1318`, through reviewed refresh, archive, or reclassification.
6. Parent re-homes canonical owner metadata from terminal `CO-175` / `CO-267` to `CO-300` across the policy, catalog, and maintenance decision surfaces.
7. Parent adds or updates focused regression coverage so terminal owner issues cannot remain the live maintenance recommendation.
8. Parent reruns docs validation, review, and closeout so `CO-295` can leave `Blocked` without widening its implementation scope.

## Dependencies
- Shared source anchor: `ctx:sha256:e6e7135ed5c5dcc34ca04950403e7a9a88a5902d59c65a6241a8aba0924f7392#chunk:c000001`
- Worker run manifest: `.runs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/cli/2026-04-22T02-48-35-760Z-e043d741/manifest.json`
- Live Apr 22 issue checksum:
  - historical issue snapshot: `4307` docs, `4316` registry entries, `53` stale docs, `6` missing-on-disk registry references
  - fresh current-main reproduction: `docs:freshness FAILED - 4390 docs, 4393 registry entries`
  - `16` stale docs total
  - `0` missing-on-disk or invalid registry references on current main
  - `1` hard-stale path: `docs/codex-orchestrator-issues.md`
  - `15` historical candidate entries across `6` candidate cohorts including Mar 22 stale packets and mirrors
  - pre-fix `docs:freshness:maintain` emitted `owner_issue=CO-175`, `owner_issue_action=update_existing`, and `blocking_changed_paths=[]`
- Adjacent issues:
  - `CO-295`
  - `CO-267`
  - `CO-175`
- Parent-owned implementation surfaces:
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `docs/docs-catalog.json`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `scripts/docs-freshness.mjs`
  - `scripts/docs-freshness-maintain.mjs`
  - `scripts/spec-guard.mjs`

## Validation
- Docs packet integrity:
  - `rg -n "docs:freshness|docs:freshness:maintain|canonical owner|CO-175|CO-267|terminal owner metadata|blocking_changed_paths=\\[\\]|docs/codex-orchestrator-issues.md|missing-on-disk registry references|Mar 21/22 historical cohorts|1317|1318|current main" docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/TECH_SPEC-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/tasks-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md .agent/task/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/TASKS.md`
  - `git diff --check -- docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/TECH_SPEC-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/tasks-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md .agent/task/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - `python3 - <<'PY'` parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`
- Parent implementation lane:
  - before/after `npm run docs:freshness`
  - before/after `npm run docs:freshness:maintain`
  - classification artifact for missing-on-disk drift, hard-stale docs, and Mar 21/22 cohorts
  - focused regression coverage for terminal owner recommendation misuse
  - `npm run docs:check`
  - parent docs-review and follow-up review before handoff
- Rollback plan:
  - revert parent-owned metadata/content changes if they hide debt, keep terminal owner pointers live, or widen scope beyond the reviewed Apr 22 owner lane

## Risks & Mitigations
- Risk: parent widens `CO-295` instead of treating this as repo-wide debt.
  - Mitigation: keep `blocking_changed_paths=[]` explicit and reject CO-295 implementation drift in every packet artifact.
- Risk: terminal owner metadata stays live in one surface even after CO-300 is registered.
  - Mitigation: make canonical owner transition a first-class requirement across policy, catalog, and maintenance surfaces.
- Risk: parent removes rows only to lower counts.
  - Mitigation: require reviewed refresh, archive, or reclassification rationale for every missing-on-disk or stale row.
- Risk: this child packet overstates implementation progress.
  - Mitigation: mark all parent-owned implementation, findings, and validation steps as pending in the checklist mirrors.

## Approvals
- Parent docs-review, implementation, validation, and PR lifecycle: pending parent lane
