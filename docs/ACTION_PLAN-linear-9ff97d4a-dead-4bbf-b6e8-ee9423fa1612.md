# ACTION_PLAN - CO Preserve Scoped Standalone-Review Context Without Inline Prompt

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-43` / `9ff97d4a-dead-4bbf-b6e8-ee9423fa1612`
- Linear URL: https://linear.app/asabeko/issue/CO-43/co-preserve-scoped-standalone-review-context-without-inline-prompt

## Summary
- Goal: finish Linear issue `CO-43` by restoring bounded reviewer-visible context for explicit scoped standalone-review launches while preserving the `CO-39` compatibility fix.
- Scope: docs-first registration, baseline audit, pre-implementation docs-review child stream, bounded wrapper/telemetry/docs/test changes, validation, review/elegance gates, and PR handoff.
- Assumptions:
  - the smallest durable transport is a bounded scoped review title derived from resolved `NOTES` plus review surface when `--title` is absent
  - full `NOTES` and scope-path details remain in `review/prompt.txt` for audit continuity
  - explicit scoped review continues to support only the `diff` surface at the actual Codex layer

## Milestones & Sequencing
1) Register the CO-43 docs-first packet, create the baseline audit note, update `tasks/index.json`, update `docs/TASKS.md`, and mirror the task checklist.
2) Run `docs-review` through the audited `linear child-stream` path and record the manifest-backed approval before implementation.
3) Patch the prompt-context builder, scoped launch builder, and telemetry contract so explicit scoped review carries bounded reviewer-visible title context without inline prompt delivery.
4) Update standalone-review guidance surfaces to describe the scoped title-plus-artifact contract truthfully.
5) Add focused regressions for generated scoped title transport, explicit-title preservation, and telemetry truth.
6) Run required validation plus standalone review and explicit elegance review, then refresh the workpad for PR handoff.

## Dependencies
- `scripts/run-review.ts`
- `scripts/lib/review-launch-attempt.ts`
- `scripts/lib/review-prompt-context.ts`
- `scripts/lib/review-execution-telemetry.ts`
- `tests/review-launch-attempt.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`
- `skills/standalone-review/SKILL.md`
- `AGENTS.md`
- `docs/AGENTS.md`

## Validation
- Checks / tests:
  - `node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --format json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - focused `vitest` coverage for scoped context transport in the review wrapper
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 TASK=linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612 NOTES="Goal: bounded standalone review for CO-43 scoped context transport | Summary: verify scoped --title transport on explicit --base review | Risks: scope/title incompatibility or telemetry drift" npm run review -- --base origin/main`
  - `npm run pack:smoke`
- Rollback plan:
  - revert scoped context transport changes if they reintroduce scope/title incompatibility or silently over-claim reviewer-visible context
  - revert telemetry/docs wording if persisted evidence does not match the shipped launch behavior

## Risks & Mitigations
- Risk: generated scoped titles carry too much or too little context.
  - Mitigation: keep the title bounded, structured, and covered by focused contract tests.
- Risk: adding scoped title transport regresses existing explicit `--title` flows.
  - Mitigation: preserve explicit user titles as authoritative and add direct regressions for that behavior.
- Risk: docs-review child-stream output again prepends logs before JSON.
  - Mitigation: record the manifest-backed approval directly if the child run succeeds but the wrapper output remains malformed.

## Approvals
- Reviewer: `codex-orchestrator docs-review` approved for implementation via the successful initial child-stream manifest `.runs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612-docs-review/cli/2026-03-30T06-52-40-070Z-7b90108a/manifest.json` plus the recorded fallback closeout in `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T070418Z-docs-review-fallback.md`
- Date: 2026-03-30

## Manifest Evidence
- Baseline audit: `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T064502Z-baseline-audit.md`
