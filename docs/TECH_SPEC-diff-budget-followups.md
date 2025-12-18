# Technical Spec — Diff Budget + Review Handoff Follow-ups (Task 0908)

## Overview
- Objective: Close the documented gaps around the diff-budget gate by adding a CI override mechanism (explicit + auditable), adding automated tests for `scripts/diff-budget.mjs`, and updating `README.md` to document diff-budget and the recommended review handoff invocation.
- In Scope:
  - CI override wiring for diff-budget (without weakening default behavior)
  - Test coverage for `scripts/diff-budget.mjs`
  - `README.md` documentation updates for diff-budget + `npm run review` usage
- Out of Scope:
  - Changing default diff-budget thresholds unless explicitly required
  - Unrelated CI/workflow refactors

## Validation Report (current state)
- See: `docs/findings/validation-tasks-0908-diff-budget-followups.md`
- Key observations (evidence pointers):
  - CI runs diff budget but has no label-based override logic (`.github/workflows/core-lane.yml:25-31`).
  - Escape hatch exists via `DIFF_BUDGET_OVERRIDE_REASON` (`scripts/diff-budget.mjs:257-399`) and was manually verified in the validation report.
  - No automated tests for the diff-budget script were found.
  - `README.md` does not mention diff-budget or the recommended `NOTES="<goal + summary + risks>" npm run review` invocation; the guidance exists in `.agent/system/conventions.md:11-20`.

## Architecture & Design

### Current State
- CI gate:
  - PRs run `node scripts/diff-budget.mjs` after setting `BASE_SHA` (`.github/workflows/core-lane.yml:25-31`).
- Local gate:
  - `node scripts/diff-budget.mjs` supports `--commit`, base resolution (`BASE_SHA`/`DIFF_BUDGET_BASE`/`origin/main`), ignore rules, and override reason (`scripts/diff-budget.mjs:24-50`, `scripts/diff-budget.mjs:122-139`, `scripts/diff-budget.mjs:15-22`, `scripts/diff-budget.mjs:257-399`).
- Review handoff:
  - `npm run review` runs `scripts/diff-budget.mjs` and includes override reason in the review prompt when present (`scripts/run-review.ts:262-310`, `scripts/run-review.ts:396-415`).

### Proposed Changes

#### 1) CI override path (explicit, label-based)
- Add a workflow-level override that only activates when a specific PR label is present (example label name: `diff-budget-override`).
- Require a non-empty reason and surface it in logs:
  - Export `DIFF_BUDGET_OVERRIDE_REASON` for the diff-budget step only.
  - Print the reason in the diff-budget step output and/or GitHub step summary.
- Guardrails:
  - If override label is present but no reason is found → fail CI with an actionable message.
  - If override label is absent → default behavior remains a hard gate.

Reason sourcing options (choose one; document in `README.md`):
1) PR body field (recommended):
   - Require a line like `Diff budget override: <reason>`.
2) Label naming convention:
   - Embed short reason in label name (limited length).
3) Workflow input (least ideal for PR enforcement):
   - Manual dispatch + doesn’t apply to PR checks.

Security notes:
- Treat any reason text as untrusted; avoid unsafe shell interpolation when writing to `$GITHUB_ENV` or step summaries.

#### 2) Automated tests for `scripts/diff-budget.mjs`
Add tests that cover:
- Commit-scoped mode (`--commit <sha>`) operates on `git show` output and ignores working tree state.
- Untracked-too-large detection triggers a failure unless `--dry-run` or override reason is set (`scripts/diff-budget.mjs:235-245`, `scripts/diff-budget.mjs:343-399`).
- Ignore list behavior:
  - exact ignores (e.g., `package-lock.json`) (`scripts/diff-budget.mjs:15`)
  - prefix ignores (`.runs/`, `out/`, `dist/`, etc.) (`scripts/diff-budget.mjs:16-22`)
- Override reason behavior:
  - When set, diff-budget prints `Override accepted via DIFF_BUDGET_OVERRIDE_REASON: ...` and exits successfully (`scripts/diff-budget.mjs:384-399`).

Implementation approach options (choose one; keep minimal):
- Preferred (testability): refactor `scripts/diff-budget.mjs` into an importable module that exports pure helpers, with a thin CLI wrapper that calls them.
- Alternative (black-box): spawn `node scripts/diff-budget.mjs ...` in a temporary git repo created under a test temp directory to assert exit codes and key output lines.

#### 3) README documentation
Update `README.md` to include:
- A brief “Diff budget” section explaining:
  - why it exists
  - the default thresholds (`scripts/diff-budget.mjs:11-13`)
  - how CI selects the base (`BASE_SHA`) (`.github/workflows/core-lane.yml:25-31`)
  - how to run locally, including commit-scoped mode (`--commit`)
  - how to use `DIFF_BUDGET_OVERRIDE_REASON` (rare + justified).
- A clear “Review handoff” snippet:
  - `NOTES="<goal + summary + risks>" npm run review` (matches `.agent/system/conventions.md:11-20`).

## Operational Considerations
- Failure Modes:
  - Missing/incorrect override reason parsing → CI should fail loudly with guidance.
  - Label permissions (fork PRs) → may affect who can apply overrides.
- Observability & Telemetry:
  - CI logs and/or step summary should include whether an override was used and the reason text.
- Security / Privacy:
  - Override reason is logged; do not include secrets.

## Testing Strategy
- Unit / Integration:
  - Add tests covering the 4 required behaviors in the checklist item (commit mode, untracked-too-large, ignore list, override reason).
- Tooling / Automation:
  - Ensure tests run under `npm run test`.
- Rollback Plan:
  - Revert CI override wiring and rely on default gate (diff-budget script already behaves deterministically without CI override).

## Documentation & Evidence
- Linked PRD: `docs/PRD-diff-budget-followups.md`
- Task checklist: `tasks/tasks-0908-diff-budget-followups.md`
- Action plan: `docs/ACTION_PLAN-diff-budget-followups.md`
- Mini-spec: `tasks/specs/0908-diff-budget-followups.md`
- Findings / validation report: `docs/findings/validation-tasks-0908-diff-budget-followups.md`

## Open Questions
- What label name + reason format do we want to standardize on?
- Should the override be permitted for all PRs or restricted to maintainers (enforced via label permissions)?

## Approvals
- Engineering: _(pending)_
- Reviewer: _(pending)_

