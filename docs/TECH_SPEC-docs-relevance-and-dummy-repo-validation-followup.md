# TECH_SPEC - Docs Relevance + Dummy Repo Validation Follow-up (0982)

## Summary
- Objective: close post-merge documentation/state drift and add durable dummy-repo runtime validation evidence after 0981.
- Scope: targeted updates to task mirrors/index/snapshot docs plus simulation logs for packaged runtime behavior checks.
- Constraints: minimal edits, no unrelated refactors, preserve existing runtime semantics.

## Technical Requirements
- Functional requirements:
  - Update stale task lifecycle states and checklist items tied to 0981 merge completion.
  - Align mirrored checklist state between `tasks/` and `.agent/task/` for 0981 handoff rows.
  - Refresh `docs/TASKS.md` snapshot text to post-merge state.
  - Run dummy/simulated downstream validations and persist artifacts under `out/0982-.../manual/`.
- Non-functional requirements:
  - Deterministic, auditable evidence paths.
  - No changes to manifest schema/contracts.
  - Preserve current runtime behavior.

## Architecture & Data
- Architecture / design adjustments:
  - None; docs/state and validation-only follow-up.
- Data model changes / migrations:
  - Update `tasks/index.json` item/spec metadata for status/recency correctness.
- External dependencies / integrations:
  - npm pack/install in temp repos.
  - existing CLI runtime selection/fallback code paths.

## Validation Plan
- Dummy/simulated scenarios:
  1) `npm run pack:smoke` baseline downstream packaging/install smoke.
  2) Dummy repo `review --runtime-mode appserver` with forced precheck fail to verify deterministic fallback to CLI and review artifacts.
  3) Dummy repo `start frontend-testing --execution-mode cloud --runtime-mode appserver --format json --no-interactive` fail-fast unsupported-combination check (validated via explicit unsupported-combo error text plus terminal `status: "failed"` payload).
- Required gate order:
  1. `node scripts/delegation-guard.mjs`
  2. `node scripts/spec-guard.mjs --dry-run`
  3. `npm run build`
  4. `npm run lint`
  5. `npm run test`
  6. `npm run docs:check`
  7. `npm run docs:freshness`
  8. `node scripts/diff-budget.mjs`
  9. `npm run review`
  10. `npm run pack:smoke`

## Risks & Mitigations
- Risk: touching task index state incorrectly.
  - Mitigation: limit edits to high-signal stale rows with explicit merge evidence.
- Risk: flaky test noise during gate reruns.
  - Mitigation: fail/fix/pass logging and targeted retest only when needed.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
