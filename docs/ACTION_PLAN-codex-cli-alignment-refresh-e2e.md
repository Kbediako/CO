# ACTION_PLAN - Codex CLI Alignment + Refresh E2E (0963)

## Summary
- Goal: Deliver a low-friction, validated Codex alignment workflow and clarify custom CLI requirements.
- Scope: docs-first scaffolding, delegated scout evidence, script/docs updates, automated gates, and manual E2E validation.
- Assumptions: local codex fork path is available via `${CODEX_DIR}` (example: `export CODEX_DIR=~/Code/codex`).

## Milestones and Sequencing
1) Docs-first scaffolding + checklist mirrors + task index registration.
2) Delegation scout evidence + pre-implementation review note.
3) Implement minimal script/docs updates for refresh/alignment and CLI requirement clarity.
4) Align local codex fork to upstream and rebuild managed CLI path where needed.
5) Run full guardrail lane and manual E2E validations with evidence capture.
6) Run standalone elegance review and apply any justified simplifications.

## Dependencies
- Access to local codex fork and upstream remote.
- Existing CO scripts and release docs.

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
- Rollback plan:
  - Revert task branch changes; no schema/data migration required.

## Risks and Mitigations
- Risk: Documentation implies wrong default and confuses downstream users.
  - Mitigation: Explicit stock-vs-managed matrix with clear recommendation.
- Risk: Refresh script behavior change surprises existing users.
  - Mitigation: Keep defaults compatible and add opt-in flags only.
- Risk: Manual E2E misses edge cases.
  - Mitigation: cover both no-op and update paths where feasible.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
