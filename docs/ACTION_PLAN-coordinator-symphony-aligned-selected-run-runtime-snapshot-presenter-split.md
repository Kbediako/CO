# ACTION_PLAN - Coordinator Symphony-Aligned Selected-Run Runtime Snapshot + Presenter Split (1027)

## Summary
- Goal: move the selected-run runtime seam to a transport-neutral snapshot and make HTTP/Telegram read-side behavior explicit presenter mapping over that snapshot.
- Scope: docs-first registration, one bounded type-ownership refactor, focused regression/manual evidence, and closeout sync.
- Assumptions:
  - `1026` is the latest completed prerequisite,
  - behavior is already correct enough; this slice is about boundary ownership and minimal cleanup,
  - compatibility HTTP payloads remain stable.

## Milestones & Sequencing
1. Register `1027` docs-first artifacts and task mirrors from the `1026` next-slice note plus real-Symphony references.
2. Run `docs-review` for `1027` and incorporate any scope corrections before implementation.
3. Introduce a runtime-owned selected-run snapshot type and route runtime reads through it.
4. Move compatibility HTTP and Telegram presenter shaping onto explicit adapter helpers over that snapshot.
5. Remove dead helper surface, add focused regression/manual evidence, then close out and sync mirrors.

## Dependencies
- Completed slices `1015` through `1026`.
- Real `openai/symphony` upstream at commit `b0e0ff0082236a73c12a48483d0c6036fdd31fe1`.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - focused manual/mock presenter-alignment evidence
- Rollback plan:
  - revert the `1027` runtime-snapshot/presenter split commit if HTTP/Telegram parity regresses,
  - preserve the `1026` seam as the last known-good stopping point.

## Risks & Mitigations
- Risk: the slice grows into a broader observability rewrite.
  - Mitigation: keep scope limited to selected-run runtime snapshot + presenter mapping only.
- Risk: public HTTP or Telegram payload semantics drift while moving shaping logic.
  - Mitigation: lock outputs down with focused presenter-alignment tests and manual evidence.
- Risk: removing dead helper surface accidentally breaks implicit callers.
  - Mitigation: grep all runtime/controller/bridge callers before deleting helpers and cover the seam with targeted tests.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
