# Action Plan — Diff Budget + Review Handoff Follow-ups (Task 0908)

## Phase 0 — Planning collateral (this PR)
- [x] Draft PRD — `docs/PRD-diff-budget-followups.md`
- [x] Draft Tech Spec — `docs/TECH_SPEC-diff-budget-followups.md`
- [x] Draft Action Plan — `docs/ACTION_PLAN-diff-budget-followups.md`
- [x] Draft mini-spec — `tasks/specs/0908-diff-budget-followups.md`
- [x] Update canonical checklist with acceptance criteria — `tasks/tasks-0908-diff-budget-followups.md`
- [x] Record findings/validation — `docs/findings/validation-tasks-0908-diff-budget-followups.md`
- [x] Sync mirrors (agent + docs snapshot) — `npm run docs:sync -- --task 0908-diff-budget-followups`

## Phase 1 — CI override path (implementation PR)
1. Add an explicit PR override signal (label) for diff budget in `.github/workflows/core-lane.yml`.
2. Require a non-empty reason and surface it in logs/step summary.
3. Ensure default behavior remains unchanged when the label is absent (hard gate).

## Phase 2 — Diff-budget test coverage (implementation PR)
1. Add tests for `scripts/diff-budget.mjs` covering:
   - `--commit <sha>` mode
   - untracked-too-large failure mode
   - ignore list behavior (exact + prefixes)
   - override reason behavior (`DIFF_BUDGET_OVERRIDE_REASON`)
2. Ensure tests run under `npm run test`.

## Phase 3 — README documentation (implementation PR)
1. Document diff-budget purpose + expectations and local invocation examples in `README.md`.
2. Document the recommended review handoff invocation:
   - `NOTES="<goal + summary + risks>" npm run review`

## Phase 4 — Evidence + handoff (required before requesting review)
1. Run diagnostics under the task id and capture the manifest:
   - `export MCP_RUNNER_TASK_ID=0908-diff-budget-followups`
   - `npx codex-orchestrator start diagnostics --format json --no-interactive --task 0908-diff-budget-followups`
2. Run guardrails:
   - `node scripts/spec-guard.mjs --dry-run`
   - `npm run build`
   - `npm run lint`
   - `npm run test`
   - `npm run docs:check`
   - `node scripts/diff-budget.mjs`
3. Run reviewer handoff:
   - `NOTES="<goal + summary + risks>" npm run review`
4. Flip checklist items to `[x]` with evidence across:
   - `tasks/tasks-0908-diff-budget-followups.md`
   - `.agent/task/0908-diff-budget-followups.md`
   - `docs/TASKS.md`
   - `tasks/index.json` (when gate log/run_id are available)
