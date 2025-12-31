# PRD - Docs Review Gate (Task 0910)

## Summary
- Problem Statement: The repo enforces a post-implementation Codex review (`npm run review`) but has no dedicated pre-implementation docs review gate for PRD/TECH_SPEC/ACTION_PLAN updates. SOPs require PRD approval in `tasks/index.json`, yet there is no consistent manifest evidence for docs-only reviews.
- Desired Outcome: Introduce a lightweight docs-review gate that captures a Codex review after planning docs are drafted, records the manifest in task mirrors and `tasks/index.json`, and preserves the existing post-implementation review handoff.

## Goals
- Add a docs-review pipeline (spec-guard, docs:check, docs:freshness, review) suitable for doc-only changes.
- Record pre-implementation review evidence in task checklists and task mirrors.
- Keep the existing implementation review sequence intact.

## Non-Goals
- Hard enforcement that fails the implementation gate when docs-review evidence is missing.
- Running Codex review in CI.
- Introducing a new review wrapper or prompt beyond the existing `NOTES` environment variable.

## Stakeholders
- Engineering: Orchestrator maintainers / platform enablement
- Reviewers: DX / tooling owners

## Metrics & Guardrails
- Every task has a docs-review manifest linked before implementation begins.
- Docs review runs skip diff-budget checks to avoid noise on doc-only changes.
- Implementation review remains required after guardrails.

## User Experience
- Agents draft PRD/TECH_SPEC/ACTION_PLAN, run the docs-review pipeline, and record the manifest in the checklists.
- After implementation, the existing guardrails and `npm run review` handoff remain unchanged.

## Technical Considerations
- `implementation-gate` already runs `npm run review` with `DIFF_BUDGET_STAGE=1`.
- `scripts/run-review.ts` supports `SKIP_DIFF_BUDGET=1` for doc-only review runs.
- `npm run docs:freshness` validates docs registry coverage + review recency.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-docs-review-gate.md`
- Action Plan: `docs/ACTION_PLAN-docs-review-gate.md`
- Task checklist: `tasks/tasks-0910-docs-review-gate.md`
- Run Manifest (docs review): `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`
- Metrics / State: `.runs/0910-docs-review-gate/metrics.json`, `out/0910-docs-review-gate/state.json`

## Open Questions
- Should a future iteration add a hard gate that blocks implementation without docs-review evidence?
- Should the docs-review prompt require specific `NOTES` content?

## Approvals
- Engineering: (pending)
- Reviewer: (pending)
