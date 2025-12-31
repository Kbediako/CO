# Technical Spec - Docs Review Gate (Task 0910)

## Objective
Add a pre-implementation docs-review gate that captures a Codex review for planning docs, while keeping the existing post-implementation review handoff intact.

## Scope
### In scope
- Add a docs-review pipeline to `codex.orchestrator.json` with stages for spec-guard, docs:check, docs:freshness, and review.
- Set `SKIP_DIFF_BUDGET=1` for docs-review runs to bypass diff-budget checks on doc-only changes.
- Update workflow docs and task checklist templates to require docs-review evidence before implementation.
- Add checklist items for both the pre-implementation docs review and the post-implementation review handoff.

### Out of scope
- A hard enforcement script that blocks implementation-gate when docs-review evidence is missing.
- CI automation that runs `npm run review`.
- A new docs-review wrapper script; reuse the existing `NOTES` environment variable.

## Current State Validation
- `implementation-gate` already runs `npm run review` with `DIFF_BUDGET_STAGE=1`, so post-implementation review exists.
- `npm run docs:check` exists and validates doc references and commands.
- `npm run docs:freshness` validates docs registry coverage + review recency.
- `scripts/run-review.ts` honors `SKIP_DIFF_BUDGET=1` for doc-only review runs.
- `.agent/SOPs/specs-and-research.md` requires PRD approval to be recorded in `tasks/index.json`, but it does not define a manifest-backed docs-review gate.

## Design
### Docs-review pipeline
- Pipeline ID: `docs-review`.
- Stages:
  1. `node scripts/spec-guard.mjs --dry-run`
  2. `npm run docs:check`
  3. `npm run docs:freshness`
  4. `npm run review` with env `SKIP_DIFF_BUDGET=1`
- Rationale: reuse existing guardrails and the review handoff prompt without adding a new wrapper.

### Evidence and mirrors
- Capture docs-review manifests under `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`.
- Record the manifest in:
  - `tasks/tasks-0910-docs-review-gate.md` (docs-review checklist item)
  - `.agent/task/0910-docs-review-gate.md`
  - `docs/TASKS.md`
  - `tasks/index.json` gate metadata (`gate.log`, `gate.run_id`)

### Post-implementation review
- Keep `implementation-gate` unchanged.
- Continue to record the implementation review manifest after guardrails.

## Testing / Verification
- Run the docs-review pipeline on doc-only changes and confirm diff-budget is skipped.
- Confirm `npm run docs:check` passes before review.
- Confirm `npm run docs:freshness` passes before review.
- Verify the review prompt includes the manifest evidence and task context.

## Evidence
- Task checklist: `tasks/tasks-0910-docs-review-gate.md`
