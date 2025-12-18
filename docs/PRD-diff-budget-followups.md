# PRD — Diff Budget + Review Handoff Follow-ups (Task 0908)

## Summary
- Problem Statement: The repo enforces a diff-size gate via `scripts/diff-budget.mjs` and runs it in CI on pull requests (`.github/workflows/core-lane.yml:25-31`), but there is no explicit, auditable CI override path (e.g., PR label + required reason surfaced in logs). The diff-budget guard also lacks automated tests, increasing regression risk. Finally, `README.md` does not document diff-budget expectations or the recommended `NOTES="<goal + summary + risks>" npm run review` handoff pattern (the guidance currently lives in `.agent/system/conventions.md:11-20`).
- Desired Outcome: Add a safe CI override mechanism that preserves the default gate, add test coverage for the diff-budget script’s critical behaviors, and document diff-budget + review handoff expectations in `README.md`.

## Goals
- Provide a CI override path for diff budget that is explicit (opt-in), auditable (reason logged), and does not weaken the default gate.
- Add automated tests for `scripts/diff-budget.mjs` covering commit-scoped mode, untracked measurement failure modes, ignore list behavior, and override-reason behavior.
- Update `README.md` to document:
  - what the diff-budget gate does and when it runs (local + CI)
  - how to run it locally
  - how/when `DIFF_BUDGET_OVERRIDE_REASON` is used (and the expectation that it’s rare + justified)
  - the recommended `NOTES="<goal + summary + risks>" npm run review` invocation.

## Non‑Goals
- Removing the diff-budget gate or making overrides implicit/silent.
- Large refactors unrelated to diff-budget enforcement, testing, or documentation.
- Changing default thresholds unless explicitly required by maintainers.

## Stakeholders
- Engineering: Codex Orchestrator maintainers (scripts + CI + tooling)
- Reviewers: People consuming `npm run review` output
- CI owners: GitHub Actions maintainers for `.github/workflows/core-lane.yml`

## Metrics & Guardrails
- Default PR behavior remains: oversized diffs fail CI (no override) (`.github/workflows/core-lane.yml:29-31`).
- Override behavior is explicit and recorded:
  - requires an explicit signal (e.g., label)
  - requires a non-empty reason
  - reason is surfaced in CI logs and (optionally) step summary.
- `npm run test` includes coverage that would fail if:
  - `--commit` mode stops working
  - untracked-too-large handling regresses
  - ignore list stops applying
  - override reason no longer bypasses exit code.

## User Experience
- When the diff budget fails, contributors have a clear path:
  1) preferred: split changes into smaller diffs
  2) exception: apply an explicit override signal and supply an override reason that appears in CI logs.
- Review handoff remains consistent: use `NOTES="<goal + summary + risks>" npm run review` to capture reviewer context (per `.agent/system/conventions.md:11-20`).

## Technical Considerations
- CI override signaling should be based on PR metadata available to GitHub Actions (labels and/or PR body).
- Override reason must be treated as untrusted input (log-only; avoid shell injection when exporting to `$GITHUB_ENV`).
- Diff-budget script already supports an escape hatch via `DIFF_BUDGET_OVERRIDE_REASON` (`scripts/diff-budget.mjs:33-35`, `scripts/diff-budget.mjs:257-399`); the remaining work is safe CI wiring + docs/tests.

## Documentation & Evidence
- Task checklist: `tasks/tasks-0908-diff-budget-followups.md`
- Tech spec: `docs/TECH_SPEC-diff-budget-followups.md`
- Action plan: `docs/ACTION_PLAN-diff-budget-followups.md`
- Mini-spec: `tasks/specs/0908-diff-budget-followups.md`
- Findings / validation report: `docs/findings/validation-tasks-0908-diff-budget-followups.md`
- Run Manifest Link: `.runs/0908-diff-budget-followups/cli/2025-12-18T13-37-52-708Z-16d46fa7/manifest.json`

## Open Questions
- What should be the canonical “reason” source in CI?
  - A required PR body field (recommended: easier to store longer text), or
  - A label naming convention that embeds a short reason, or
  - A workflow input (less ideal for PR gate behavior).
- Should the CI override be allowed for fork PRs (where label application permissions may differ)?

## Approvals
- Engineering: _(pending)_
- Reviewer: _(pending)_
