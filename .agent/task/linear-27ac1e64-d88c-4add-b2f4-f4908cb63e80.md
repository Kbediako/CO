# Task Checklist - linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80

- Linear Issue: `CO-75` / `27ac1e64-d88c-4add-b2f4-f4908cb63e80`
- MCP Task ID: `linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80`
- Primary PRD: `docs/PRD-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`
- TECH_SPEC: `tasks/specs/linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`

## Docs-First
- [x] PRD drafted for the `CO-75` docs truthfulness and relevance lane. Evidence: `docs/PRD-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`.
- [x] TECH_SPEC drafted with the catalog, blocking truthfulness gate, class-separated reporting, and weekly artifact contract. Evidence: `tasks/specs/linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`, `docs/TECH_SPEC-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, doc alignment, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs and task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`. Evidence: `.agent/task/linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`.
- [x] Standalone pre-implementation self-review captured in the spec readiness gate. Evidence: `tasks/specs/linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80.md`.
- [ ] docs-review approval captured for `linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80`. Evidence: docs-review child rerun `.runs/linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80-docs-review/cli/2026-04-03T01-43-54-166Z-41f3bb38/manifest.json` preserved delegation evidence, but the child review stage did not produce a terminal approval artifact.

## Implementation
- [x] Add a checked-in docs catalog/config that classifies active and inventory surfaces by audience, class, source of truth, owner, cadence, and update triggers. Evidence: `docs/docs-catalog.json`, `scripts/lib/docs-catalog.js`, `scripts/lib/docs-catalog.d.ts`.
- [x] Extend `docs:check` with deterministic blocking truthfulness checks for current posture, bundled-skill roster parity, and README front-door budget. Evidence: `scripts/docs-hygiene.ts`, `tests/docs-hygiene.spec.ts`.
- [x] Extend `docs:freshness` with class-separated reporting so front-door/shipped docs do not drown in task packets and mirrors. Evidence: `scripts/docs-freshness.mjs`, `docs/docs-freshness-registry.json`, `tests/docs-freshness.spec.ts`.
- [x] Add weekly automation that emits the class-separated docs drift artifact. Evidence: `.github/workflows/docs-truthfulness-weekly.yml`.
- [x] Align README, shipped delegation docs, and any touched agent-facing or seeded-template docs to the live policy and shipped skill roster required by the new gate. Evidence: `README.md`, `docs/README.md`, `AGENTS.md`, `docs/AGENTS.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`, `templates/README.md`.

## Validation
- [x] Add focused tests for docs catalog resolution, blocking truthfulness checks, and class-separated reporting. Evidence: `tests/docs-hygiene.spec.ts`, `tests/docs-freshness.spec.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: local pass on `2026-04-03`; guard reported `OK (3 subagent manifest(s) found)`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: local pass on `2026-04-03`; guard reported `Spec guard: OK`.
- [x] `npm run build`. Evidence: local pass on `2026-04-03`.
- [x] `npm run lint`. Evidence: local pass on `2026-04-03`.
- [x] `npm run test`. Evidence: local pass on `2026-04-03` in `4m27s`; the slow tail was `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`, not a teardown hang.
- [x] `npm run docs:check`. Evidence: local pass on `2026-04-03`.
- [x] `npm run docs:freshness`. Evidence: local pass on `2026-04-03`; class-separated reporting emitted successfully.
- [x] `node scripts/diff-budget.mjs`. Evidence: local pass on `2026-04-03` with `DIFF_BUDGET_OVERRIDE_REASON` recorded for the single-lane truthfulness contract.
- [x] Manifest-backed standalone review wrapper executed or truthful fallback recorded. Evidence: `.runs/linear-27ac1e64-d88c-4add-b2f4-f4908cb63e80/cli/2026-04-03T01-15-24-411Z-7a4efc33/manifest.json` (the same run recorded `status: succeeded` and `review_outcome: clean-success` in review telemetry).
- [x] Explicit elegance review recorded after review findings are addressed. Evidence: manual elegance pass kept the solution inside the existing `docs:check` / `docs:freshness` surfaces, made the catalog loader fail closed instead of adding a compatibility path, and did not add any auto-edit behavior.
- [x] `npm run pack:smoke`. Evidence: local pass on `2026-04-03`.

## Handoff
- [ ] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
