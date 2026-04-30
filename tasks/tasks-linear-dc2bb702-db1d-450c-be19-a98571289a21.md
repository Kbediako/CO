# Task Checklist - linear-dc2bb702-db1d-450c-be19-a98571289a21

- Linear Issue: `CO-428` / `dc2bb702-db1d-450c-be19-a98571289a21`
- Primary PRD: `docs/PRD-linear-dc2bb702-db1d-450c-be19-a98571289a21.md`
- TECH_SPEC: `tasks/specs/linear-dc2bb702-db1d-450c-be19-a98571289a21.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dc2bb702-db1d-450c-be19-a98571289a21.md`

## Docs-First
- [x] CO-428 packet drafted with protected terms, parity matrix, non-goals, and not-done-if gates. Evidence: PRD, TECH_SPEC, ACTION_PLAN, task checklist, and `.agent` mirror paths above.
- [x] Pre-implementation issue-quality review captured. Evidence: canonical task spec `review_notes`.
- [x] Registry mirrors updated. Evidence: current diff in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

## Investigation
- [x] Current-main `node scripts/spec-guard.mjs` failure reproduced for the March 30 cohort. Evidence: provider-worker command output on branch base `origin/main` aad50900d.
- [x] Twelve source issues live-audited as `Done`. Evidence: packaged `linear issue-context` command output for CO-26, CO-28, CO-35, CO-37, CO-38, CO-39, CO-40, CO-42, CO-43, CO-44, CO-47, and CO-51.
- [x] Confirmed the repair is separate from CO-427 docs-freshness owner re-home and CO-330 provider/control-host behavior. Evidence: PRD / TECH_SPEC non-goals.

## Implementation
- [x] Reclassify the twelve task spec frontmatter statuses to inactive completed-lane status. Evidence: current diff sets each listed task spec to `status: done` with 2026-04-30 CO-428 review notes.
- [x] Align `tasks/index.json` status for the twelve completed lanes and register CO-428. Evidence: current diff adds CO-428 and `spec_guard_cohort` evidence to each source item.
- [x] Mark the exact March 30 completed-lane registry rows inactive/archive-status. Evidence: current diff archives all 72 listed packet/mirror registry rows with `last_review=2026-04-30` and `cadence_days=365`.
- [x] Integrate dependent owner repairs into the CO-428-led branch. Evidence: imported CO-429 six-row CO-41 registry residue repair and CO-430 `docs:freshness:maintain` owner re-home packet/catalog/cohort updates.

## Validation
- [x] JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`. Evidence: `json ok`.
- [x] `node scripts/spec-guard.mjs`. Evidence: `Spec guard: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 4981 docs, 4984 registry entries`; rolling cohort CO-430 remains visible and owned.
- [x] `npm run docs:freshness:maintain -- --format json`. Evidence: `freshness_decision=pass_with_owned_rolling_debt`, `owner_issue=CO-430`, `blocking_changed_paths=[]`, `policy_capacity_status.status=within_policy`.
- [x] Required repo validation floor for the combined metadata diff. Evidence: delegation guard, `spec-guard`, `spec-guard --dry-run`, docs:check, build, lint, test, docs:freshness, docs:freshness:maintain, repo stewardship, diff-budget with explicit CO-428 integration override, and `git diff --check` all passed after the final metadata cleanup.
- [x] Manifest-backed standalone review and explicit elegance pass before handoff. Evidence: standalone review telemetry `.runs/linear-dc2bb702-db1d-450c-be19-a98571289a21/cli/2026-04-30T02-32-01-176Z-5bcaed8b/review/telemetry.json` reports `status=succeeded`, `review_outcome=bounded-success`; elegance pass recorded `out/linear-dc2bb702-db1d-450c-be19-a98571289a21/manual/elegance-review.md`.
- [ ] PR handoff evidence. Evidence: pending.

## Handoff
- [ ] Open or update a PR, attach it to CO-428, and wait for required checks. Evidence: pending after review/elegance gate.
- [ ] Run `codex-orchestrator pr ready-review` and resolve or push back on actionable feedback. Evidence: pending drain output.
- [ ] Update CO-427 / PR #727 blocker notes once this owner clears the gate. Evidence: pending Linear/GitHub note.
- [ ] Move CO-428 to `In Review` only after validation, PR attachment, checks, and ready-review drain are clean. Evidence: pending Linear transition.
