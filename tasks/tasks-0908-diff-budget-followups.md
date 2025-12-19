# Task 0908 — Diff Budget + Review Handoff Follow-ups

- MCP Task ID: `0908-diff-budget-followups`
- Primary PRD: `docs/PRD-diff-budget-followups.md`
- Tech Spec: `docs/TECH_SPEC-diff-budget-followups.md`
- Action Plan: `docs/ACTION_PLAN-diff-budget-followups.md`
- Mini-spec: `tasks/specs/0908-diff-budget-followups.md`
- Findings / validation report: `docs/findings/validation-tasks-0908-diff-budget-followups.md`
- Run Manifest (latest implementation gate): `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`
- Metrics/State: `.runs/0908-diff-budget-followups/metrics.json`, `out/0908-diff-budget-followups/state.json`.

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Validation report captured — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0908-diff-budget-followups.md`) — Evidence: this PR.

### Validation (baseline)
- [x] Confirm CI runs diff budget but has no explicit label-based override wiring — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Confirm no automated tests exist for `scripts/diff-budget.mjs` — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Confirm `README.md` does not document diff-budget expectations or the recommended `NOTES="<goal + summary + risks>" npm run review` invocation — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.

### Follow-ups (implementation)

#### CI override path (without weakening default gate)
- [x] Add an explicit CI override path for diff-budget (PR label + required reason surfaced in logs). — Evidence: `.github/workflows/core-lane.yml:29`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `.github/workflows/core-lane.yml`, `scripts/diff-budget.mjs`
  - Acceptance:
    - With no override label, diff-budget failure fails CI (default gate stays strict).
    - With override label + reason present, CI exports `DIFF_BUDGET_OVERRIDE_REASON` and diff-budget exits successfully (with the override reason visible in logs).
    - With override label present but reason missing/empty, CI fails loudly with an actionable message.
  - Verification:
    - Add workflow-level checks (e.g., `echo` step summary) so the override is auditable from the run logs.

#### Diff-budget test coverage
- [x] Add tests for `scripts/diff-budget.mjs` (commit-scoped mode, untracked-too-large failure, ignore list, override reason). — Evidence: `tests/diff-budget.spec.ts:1`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `scripts/diff-budget.mjs`, `tests/` (new test file)
  - Acceptance:
    - Tests cover:
      - `--commit <sha>` mode
      - untracked-too-large measurement issue handling
      - ignore list behavior (`package-lock.json`, `.runs/`, `out/`, etc.)
      - override reason behavior (`DIFF_BUDGET_OVERRIDE_REASON`)
    - Tests run under `npm run test` and would fail if diff-budget regresses.

#### README updates (diff-budget + review handoff)
- [x] Update `README.md` to document diff-budget expectations and the recommended `NOTES="<goal + summary + risks>" npm run review` invocation. — Evidence: `README.md:154`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `README.md`, `scripts/run-review.ts`
  - Acceptance:
    - README documents: what diff-budget is, how CI selects base (`BASE_SHA`), how to run locally, and how to override with `DIFF_BUDGET_OVERRIDE_REASON`.
    - README documents the recommended `NOTES="<goal + summary + risks>" npm run review` handoff pattern.

### Guardrails & handoff (required before requesting review)
- [x] Implementation-gate run captured (spec-guard/build/lint/test/docs:check + review) — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
- [x] Guardrails pass — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
- [x] Reviewer handoff uses explicit context — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
