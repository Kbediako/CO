# ACTION_PLAN - CO Fix Standalone Review Wrapper Commit/Base Scoped Codex Review Launch

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-39` / `ea3ee445-72d1-4c3d-90cc-1673c714eb2d`
- Linear URL: https://linear.app/asabeko/issue/CO-39/co-fix-standalone-review-wrapper-commitbase-scoped-codex-review-launch

## Summary
- Goal: finish Linear issue `CO-39` by making exact commit/base scoped `npm run review` launches executable and truthful.
- Scope: docs-first registration, baseline audit, pre-implementation docs-review child stream, bounded wrapper/docs/test changes, validation, review/elegance gates, and PR handoff.
- Assumptions:
  - the smallest durable fix is to keep prompt artifacts while omitting the inline prompt argument for explicit scoped review launches
  - explicit scope must remain auditable and must not silently widen to the default working-tree review
  - prompt-only focus reviews remain a separate unscoped pattern

## Milestones & Sequencing
1) Register the CO-39 docs-first packet, create the baseline audit note, update `tasks/index.json`, update `docs/TASKS.md`, and mirror the task checklist.
2) Run `docs-review` through the audited `linear child-stream` path and record the manifest-backed approval before implementation.
3) Patch the shared launch builder and any direct telemetry/help seams so explicit commit/base review runs stop passing unsupported prompt payloads while keeping wrapper-side evidence intact.
4) Update the standalone-review guidance surfaces to describe scoped launch truthfully.
5) Add focused regressions for the launch builder and end-to-end wrapper execution.
6) Run required validation plus standalone review and explicit elegance review, then refresh the workpad for PR handoff.

## Dependencies
- `scripts/run-review.ts`
- `scripts/lib/review-launch-attempt.ts`
- `scripts/lib/review-execution-telemetry.ts`
- `tests/review-launch-attempt.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`
- `skills/standalone-review/SKILL.md`
- `AGENTS.md`
- `docs/AGENTS.md`

## Validation
- Checks / tests:
  - `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - focused `vitest` coverage for the review wrapper launch seam
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 TASK=linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d npm run review -- --commit <sha>`
  - `npm run pack:smoke`
- Rollback plan:
  - revert scoped launch changes if they silently drop scope or lose prompt artifact evidence
  - revert telemetry/help/doc wording if it over-claims prompt delivery rather than reflecting the shipped launch contract

## Risks & Mitigations
- Risk: scoped launch succeeds but docs/telemetry still imply prompt delivery.
  - Mitigation: update direct guidance surfaces in the same patch and add focused assertions on saved evidence.
- Risk: a narrow launch change accidentally regresses unscoped prompt-only review.
  - Mitigation: keep the builder split explicit in tests for scoped versus unscoped launch arguments.
- Risk: docs-review child-stream output may still prepend logs before JSON.
  - Mitigation: record the underlying manifest-backed approval directly if the wrapper output is malformed while the child run itself succeeds.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d-docs-review/cli/2026-03-30T00-48-51-127Z-e10216d7/manifest.json`
- Date: 2026-03-30

## Manifest Evidence
- Baseline audit: `out/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d/manual/20260330T004235Z-baseline-audit.md`
- Docs-review manifest: `.runs/linear-ea3ee445-72d1-4c3d-90cc-1673c714eb2d-docs-review/cli/2026-03-30T00-48-51-127Z-e10216d7/manifest.json`
