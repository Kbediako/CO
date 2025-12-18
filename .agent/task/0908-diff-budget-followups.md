# Task Checklist — Diff Budget + Review Handoff Follow-ups (0908)

> Set `MCP_RUNNER_TASK_ID=0908-diff-budget-followups` for orchestrator commands. Mirror status with `tasks/tasks-0908-diff-budget-followups.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0908-diff-budget-followups/cli/<run-id>/manifest.json`).

## Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Validation report captured — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0908-diff-budget-followups.md`) — Evidence: this PR.

## Validation (current state)
- [x] Confirm CI runs diff budget but has no explicit label-based override wiring — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Confirm no automated tests exist for `scripts/diff-budget.mjs` — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Confirm `README.md` does not document diff-budget expectations or the recommended `NOTES="<goal + summary + risks>" npm run review` invocation — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.

## Follow-ups (implementation)

#### CI override path (without weakening default gate)
- [ ] Add an explicit CI override path for diff-budget (PR label + required reason surfaced in logs).
  - Files: `.github/workflows/core-lane.yml`, `scripts/diff-budget.mjs`
  - Acceptance:
    - With no override label, diff-budget failure fails CI (default gate stays strict).
    - With override label + reason present, CI exports `DIFF_BUDGET_OVERRIDE_REASON` and diff-budget exits successfully (with the override reason visible in logs).
    - With override label present but reason missing/empty, CI fails loudly with an actionable message.
  - Verification:
    - Add workflow-level checks (e.g., `echo` step summary) so the override is auditable from the run logs.

#### Diff-budget test coverage
- [ ] Add tests for `scripts/diff-budget.mjs` (commit-scoped mode, untracked-too-large failure, ignore list, override reason).
  - Files: `scripts/diff-budget.mjs`, `tests/` (new test file)
  - Acceptance:
    - Tests cover:
      - `--commit <sha>` mode
      - untracked-too-large measurement issue handling
      - ignore list behavior (`package-lock.json`, `.runs/`, `out/`, etc.)
      - override reason behavior (`DIFF_BUDGET_OVERRIDE_REASON`)
    - Tests run under `npm run test` and would fail if diff-budget regresses.

#### README updates (diff-budget + review handoff)
- [ ] Update `README.md` to document diff-budget expectations and the recommended `NOTES="<goal + summary + risks>" npm run review` invocation.
  - Files: `README.md`, `scripts/run-review.ts`
  - Acceptance:
    - README documents: what diff-budget is, how CI selects base (`BASE_SHA`), how to run locally, and how to override with `DIFF_BUDGET_OVERRIDE_REASON`.
    - README documents the recommended `NOTES="<goal + summary + risks>" npm run review` handoff pattern.

## Guardrails & handoff (required before requesting review)
- [x] Implementation-gate run captured (spec-guard/build/lint/test/docs:check + review) — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T13-37-52-708Z-16d46fa7/manifest.json`.
- [x] Guardrails pass — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T13-37-52-708Z-16d46fa7/manifest.json`.
- [x] Reviewer handoff uses explicit context — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T13-37-52-708Z-16d46fa7/manifest.json`.
