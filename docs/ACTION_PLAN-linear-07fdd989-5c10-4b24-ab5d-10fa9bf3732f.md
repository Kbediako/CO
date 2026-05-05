# ACTION_PLAN - CO-499 classify terminal Codex connector failures in ready-review

## Summary
- Goal: register the CO-499 traceability packet, then implement a narrow `ready-review` classifier so terminal Codex connector failure does not remain indistinguishable from active `bot_rereview_pending=codex`.
- Scope:
  - packet files and registry mirrors
  - `scripts/lib/pr-watch-merge.js`
  - `tests/pr-watch-merge.spec.ts`
  - operator-facing ready-review reason text
- Assumptions:
  - Current `origin/main` contains CO-457 and no CO-499 implementation.
  - The observed source failure came from CO-475 PR #767.
  - Manual `@codex review` triggering remains an orchestration action, with at most one ping per PR head SHA.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `pr ready-review`
  - `bot_rereview_pending=codex`
  - `chatgpt-codex-connector`
  - `Codex Review: Something went wrong. Try again later by commenting @codex review.`
  - `@codex review`
  - `eyes emoji reaction`
  - `thumbs up`
  - `unresolved_threads`
  - `unacknowledged_bot_feedback`
- Not done if:
  - terminal Codex connector failure remains a plain pending rereview state
  - active Codex reviews are treated as clean
  - terminal failure is treated as approval
  - older failure evidence clears newer review requests
  - required checks, merge state, unresolved threads, unacknowledged bot feedback, or CodeRabbit gates are weakened
- Pre-implementation issue-quality review:
  - 2026-05-05: CO-499 is a valid standalone follow-up from CO-475 and the user's current orchestration request. It is not a CO-475 wording change and not a broad PR lifecycle refactor.
- Fallback / refactor decision:
  - The task touches review-wrapper/readiness seam behavior.
  - Decision: remove the terminal-failure-as-pending seam.
  - Decision: justify retaining manual `@codex review` trigger policy as operator safety until the connector exposes deterministic first-class state.
  - Decision: justify retaining existing review-readiness hard gates as non-expiring correctness contracts.
- Durable retention evidence:
  - Existing readiness gates remain the supported contract: required checks, merge state, unresolved threads, `unacknowledged_bot_feedback`, review decisions, and CodeRabbit proof.
- Large-refactor check:
  - A narrow classifier is acceptable because Codex terminal failure is separable from other gates. Defer large refactor unless implementation proves signal separation is unsafe.

## Milestones & Sequencing
1. Register traceability packet.
   - Add PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
   - Run docs guard checks.
2. Implement focused classifier.
   - Inspect Codex signal handling in `scripts/lib/pr-watch-merge.js`.
   - Add terminal failure detection and output formatting.
   - Preserve active pending review and other hard gates.
3. Validate and hand off.
   - Run focused `tests/pr-watch-merge.spec.ts` coverage.
   - Run required validation floor scaled to touched surfaces.
   - Run manifest-backed review and elegance pass.
   - Open PR, monitor checks/review reactions, manually trigger Codex only if the current head lacks the expected auto-review signal or terminal failure asks for retry.
   - Transition Linear only after review handoff gates are clean.

## Dependencies
- CO-475 PR #767 source evidence.
- Existing `ready-review` signal collection in `scripts/lib/pr-watch-merge.js`.
- Existing PR lifecycle SOP for manual Codex pings.

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - focused `tests/pr-watch-merge.spec.ts`
  - `npm run build`
  - `npm run lint`
  - broader `npm run test` if implementation touches shared ready-review behavior
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
- Rollback plan:
  - Revert the classifier and tests from the CO-499 branch.
  - Leave the packet as traceability if implementation must be rerouted or blocked.

## Risks & Mitigations
- Risk: terminal failure is mistaken for clean approval.
  - Mitigation: output a distinct action-required or waiver-needed reason; tests must assert it is not clean.
- Risk: active Codex reviews stop blocking.
  - Mitigation: add a focused active/in-progress preservation regression.
- Risk: old failure comments clear newer requests.
  - Mitigation: classify request cycles by timestamp/order.
- Risk: parent automation pings Codex repeatedly.
  - Mitigation: preserve one manual `@codex review` ping per PR head SHA.

## Approvals
- Reviewer: pending
- Date: 2026-05-05
