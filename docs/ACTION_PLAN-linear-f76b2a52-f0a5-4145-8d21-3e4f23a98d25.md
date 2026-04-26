# ACTION_PLAN - CO-380 authoritative review gate

## Summary
- Goal: Replace routine review-wrapper fallback success with one authoritative gate.
- Scope: Docs-first packet, review wrapper contract, pipeline env posture, focused tests, and validation evidence.
- Assumptions: `docs-relevance-advisory` remains intentionally advisory and prompt-only.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `authoritative review gate`, `routine review-wrapper fallbacks`, `handoff-only`, `generated fallback notes`, `explicit waiver artifact`, `break-glass`.
- Not done if: Generated fallback notes or handoff-only output still count as normal gate success, or a failed authoritative review silently becomes manual review.
- Pre-implementation issue-quality review: Parent reviewed the issue acceptance criteria and accepted same-issue child-lane contract tests for `tests/review-prompt-context.spec.ts`.

## Milestones & Sequencing
1. Create docs-first packet and task registry mirrors.
2. Implement authoritative review gate input validation and pipeline env posture.
3. Update tests and docs so fallback activation is exceptional.
4. Run required validation, standalone review, elegance pass, PR handoff checks, and workpad refresh.

## Dependencies
- Existing review telemetry and wrapper runtime helpers.
- Existing provider-worker review pipelines in `codex.orchestrator.json`.

## Validation
- Checks / tests: focused review tests, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, forced standalone review, and `npm run pack:smoke` when review wrapper/package behavior changes.
- Rollback plan: Revert the review wrapper contract and pipeline env changes together; do not leave tests expecting stricter behavior without implementation.

## Risks & Mitigations
- Risk: Advisory lanes are accidentally made blocking. Mitigation: Keep `docs-relevance-advisory` outside `CODEX_REVIEW_AUTHORITATIVE_GATE`.
- Risk: Break-glass becomes another routine fallback. Mitigation: Require owner, expiry, reason, and evidence.

## Approvals
- Reviewer: Codex provider worker.
- Date: 2026-04-26.
