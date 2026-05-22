# Task Checklist - linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a

- Linear Issue: `CO-422` / `69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a`
- Primary PRD: `docs/PRD-linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md`
- TECH_SPEC: `tasks/specs/linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task checklist, and `.agent` mirror drafted for the CO-422 Mar 29 active spec-guard cohort. Evidence: CO-422 packet files.
- [x] `tasks/index.json` and `docs/docs-freshness-registry.json` registration planned as part of the same metadata repair. Evidence: current branch diff.
- [x] Issue-quality review captured. Evidence: current spec review notes and Linear workpad.

## Investigation
- [x] Reproduce current-main `spec-guard` failure for the three Mar 29 task specs. Evidence: `node scripts/spec-guard.mjs` output captured in the worker run.
- [x] Live Linear state reads for CO-14, CO-30, and CO-34. Evidence: packaged `linear issue-context` reads returned `Done` for all three.
- [x] Confirm the repair is separate from CO-409's Mar 28 docs-freshness cohort. Evidence: PRD / TECH_SPEC non-goals and registry row selection.

## Implementation
- [x] Reclassify the three task spec frontmatter statuses to inactive completed-lane status. Evidence: frontmatter changed to `status: done` with 2026-04-29 review notes in the CO-14, CO-30, and CO-34 task specs.
- [x] Align `tasks/index.json` status for the three completed lanes and register CO-422. Evidence: current branch diff.
- [x] Mark the exact Mar 29 completed-lane registry rows inactive/archive-status without touching the Mar 28 rolling cohort. Evidence: current branch diff in `docs/docs-freshness-registry.json`.

## Validation
- [x] JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`. Evidence: `json ok`.
- [x] `node scripts/spec-guard.mjs`. Evidence: `Spec guard: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 4923 docs, 4926 registry entries`.
- [x] Required repo validation floor for the final diff. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` passed.
- [x] Manifest-backed standalone review and explicit elegance pass before handoff. Evidence: `.runs/linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a/cli/2026-04-29T11-58-42-842Z-626fbc67/review/telemetry.json` reports `status=succeeded`, `review_outcome=bounded-success`; elegance notes are in `out/linear-69a0e91c-0b3c-4be9-8cf0-d0ead9f1df3a/manual/20260429T122441Z-review/elegance-review.md`.
- [x] Out-of-scope maintenance blocker routed separately. Evidence: `docs:freshness:maintain` reports `docs:freshness:maintain` canonical owner with terminal CO-420, so CO-423 was filed in Backlog.

## Handoff
- [x] Open or update a PR, attach it to CO-422, and wait for required checks. Evidence: pending PR.
- [x] Run `codex-orchestrator pr ready-review` and resolve or push back on actionable feedback. Evidence: pending drain output.
- [x] Update CO-409 / PR #719 blocker notes once this owner clears the gate. Evidence: pending Linear/GitHub note.
- [x] Move CO-422 to `In Review` only after validation, PR attachment, checks, and ready-review drain are clean. Evidence: pending Linear transition.

## CO-575 terminal lifecycle reconciliation

- 2026-05-22: Historical open checklist residue was reconciled under CO-575 after tasks/index and live Linear terminal evidence showed this task is already complete. This allows implementation-docs archival to preserve the full packet on doc-archives without keeping active docs-freshness debt open on main.
