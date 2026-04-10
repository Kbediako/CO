---
id: 20260410-linear-63e7f712-d927-43fb-8afa-b357bab40aa2
title: CO: Harden hot-suite dist freshness heuristics for transitive CLI/runtime dependencies
status: in_progress
owner: Codex
created: 2026-04-10
last_review: 2026-04-10
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md
related_action_plan: docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md
related_tasks:
  - tasks/tasks-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md
review_notes:
  - 2026-04-10: Rework reset resumed from live issue state `Rework`; previous PR `#401` was already closed, the stale workpad was replaced, and the branch was later fast-forwarded to `origin/main` `8b64f436f801a616d770af0011867811f9491a93` after `CO-143` restored the current docs-freshness baseline.
  - 2026-04-10: The required turn-level parallelization decision for this reset was `forbid_parallel` with reason `parent_only_mutation`, because the turn only mutated parent-owned PR/workpad/branch state before fresh implementation work.
  - 2026-04-10: Current source audit still matches the issue packet: `tests/cli-command-surface.spec.ts` treats built CLI JS as fresh only when `dist/bin/codex-orchestrator.js` is newer than `bin/codex-orchestrator.ts`, while `tests/run-review.spec.ts` compares `dist/scripts/run-review.js` against `scripts/run-review.ts` plus `scripts/lib/**`.
  - 2026-04-10: The latest April 10, 2026 closed-PR `Core Lane` failure was unrelated to CO-123 logic; `spec-guard` failed because older task specs elsewhere in the repo had `last_review` dates older than 30 days.
  - 2026-04-10: Prior CO-123 docs-review findings still inform the bounded contract: CLI imports escape hand-maintained `orchestrator/src/cli/**` roots and review-runtime imports escape `orchestrator/src/cli/runtime/**`, so the authoritative dependency contract remains an entrypoint-specific transitive relative runtime-import closure.
  - 2026-04-10: The rework-branch audited `linear child-stream --pipeline docs-review` succeeded under manifest `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-10T07-11-11-313Z-8de3743e/manifest.json` after the branch synced to the `CO-143` docs-freshness baseline and the repo-supported `npm run docs:archive-tasks` trim returned `docs/TASKS.md` to the enforced 450-line budget.
  - 2026-04-10: The docs-review review output surfaced a low-severity cache invalidation hole for previously unresolved imports in `tests/helpers/distFreshness.ts`; the helper now tracks unresolved candidate paths as `null` mtimes and the CLI hot suite carries a focused regression test for the missing-to-resolvable transition.
  - 2026-04-10: Codex PR review surfaced a P2 cache gap for newly appearing higher-priority candidates (for example a later-added `dep.js` outranking an existing `dep.ts`); the helper now tracks resolution-priority candidate prefixes for each resolved specifier and the CLI hot suite carries a focused regression for that late-candidate transition.
  - 2026-04-10: Final validation floor completed successfully (`delegation-guard`, `spec-guard`, `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `diff-budget`, `pack:smoke`), and focused hot-suite validation passed with `263` tests after the higher-priority candidate fix (`3323` full-suite tests passed).
  - 2026-04-10: Standalone review completed cleanly after the follow-up fix via `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 npm run review -- --manifest ../../.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/cli/2026-04-10T06-49-36-719Z-253d7dad/manifest.json`; telemetry reports `status: succeeded`, `review_outcome: clean-success`, and `termination_boundary: null`.
  - 2026-04-10: Explicit elegance pass kept the final design at one shared test-local helper, narrowed the fix to resolution-priority candidates that can actually change the winning source path, and still rejected broader product/runtime extraction or whole-repo invalidation as unnecessary scope growth.
---

# Technical Specification

## Context
CO-114 already landed the retained subprocess smoke speedup and is explicitly not being reopened. The remaining gap is local truthfulness: the built-entry preference helpers in the two hot suites can still use stale `dist` when a transitive dependency moved outside the currently tracked roots. The lane is therefore a bounded hot-suite freshness hardening change, not a product-runtime redesign or generic dependency-graph effort.

## Requirements
1. Define the authoritative bounded dependency contract for the CLI hot suite and the review hot suite.
2. Invalidate built JS when any tracked transitive CLI/runtime root is newer than the corresponding `dist` entrypoint.
3. Preserve the fast built-entry path when only unrelated sibling files outside the declared roots are newer.
4. Keep the freshness logic shared between the two suites to prevent future drift, while keeping the helper test-local.
5. Keep the diff bounded to the hot suites, a direct helper under `tests/helpers/**`, and the required docs packet unless new evidence proves a missing adjacent seam.
6. Record the chosen dependency-root contract and shared-helper decision in the docs packet and workpad.

## Design
- Extract a shared helper under `tests/helpers/**` that:
  - computes the newest mtime across the transitive relative runtime-dependency closure of a source entrypoint
  - resolves relative `.js` and extensionless specifiers back to checkout source files (`.ts`, `.js`, and `index.*` variants) before recursing
  - caches the discovered dependency set per source entrypoint within the test process
  - ignores type-only edges so runtime-unrelated type edits do not evict the fast built-entry path
  - fails closed when a tracked relative runtime dependency cannot be resolved
  - fails closed if `dist` cannot be read
- Suite-specific seed entrypoints:
  - CLI: `bin/codex-orchestrator.ts`
  - Review: `scripts/run-review.ts`
- Test expectations:
  - stale tracked transitive dependencies under each suite's contract reject `dist`
  - unrelated sibling files outside each suite's contract still allow `dist`

## Implementation Surface
- Expected codepaths:
  - `tests/helpers/**`
  - `tests/cli-command-surface.spec.ts`
  - `tests/run-review.spec.ts`
- Reference-only audit surfaces:
  - `bin/codex-orchestrator.ts`
  - `scripts/run-review.ts`

## Protected Expectations
- Preserve CO-114's merged speedup and current Core Lane guardrail shape.
- Keep the hot-suite fast path bounded to explicit roots rather than broad repository invalidation.
- Keep this logic local to the test harness unless new evidence proves the product code must own it.
- Keep final validation and review evidence explicit in the workpad.

## Reject These Wrong Interpretations
- "Use any repo edit as a freshness invalidator because it is safer."
- "Reopen CO-114 because the protected CI path must also be stale."
- "Build a generic dependency crawler for the entire CLI/runtime surface."
- "Leave the two suites with separate freshness logic because the change is small."

## Current Truth
- `tests/cli-command-surface.spec.ts` only compares `dist/bin/codex-orchestrator.js` against `bin/codex-orchestrator.ts`.
- `tests/run-review.spec.ts` already scans `scripts/run-review.ts` plus `scripts/lib/**`, but it still misses transitive imports reached through `../orchestrator/src/cli/runtime/index.js`.
- `bin/codex-orchestrator.ts` and `scripts/run-review.ts` both reach transitive imports outside their first obvious subtrees, so hand-maintained subtree roots are narrower than the actual retained subprocess dependency surface.

## Proposed Design
- Replace the suite-local helper duplication with a shared test-local `dist` freshness helper.
- Declare the dependency contract as the transitive relative runtime-dependency closure of each source entrypoint instead of static subtree lists.
- Add focused stale-root and unrelated-sibling tests to lock the contract.

## Non-Goals
- Reopening CO-114.
- Converting the retained subprocess smoke layer into a whole-tree or generic dependency scan.
- Shipping new product runtime behavior outside the tests.
- General CLI/runtime refactoring.

## Parity / Alignment Matrix
- Current truth:
  - stale transitive dependencies can still leave built JS looking fresh in local reruns
  - the CLI and review suites carry separate freshness logic
- Reference truth:
  - the retained subprocess smoke helpers stay fast and truthful for the declared roots
- Target truth / intended delta:
  - one shared test-local freshness helper
  - entrypoint-specific transitive dependency closures for CLI and review
  - focused tests for stale tracked roots and unrelated sibling tolerance
- Explicitly out-of-scope differences:
  - CI pipeline shape
  - generic dependency discovery
  - product-code freshness ownership

## Not Done If
- A tracked transitive CLI/runtime root can still move without invalidating stale built JS.
- Unrelated sibling edits outside the declared roots still force source-entry fallback.
- The final packet does not record the explicit root contract and shared-helper decision.

## Validation Plan
- `linear child-stream --pipeline docs-review`
- `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`
- full repo validation floor before review handoff

## Approvals
- Reviewer: `codex-orchestrator linear child-stream docs-review (rework branch)`
- Date: `2026-04-10`
- Manifest: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-10T07-11-11-313Z-8de3743e/manifest.json`
- Override note: `Not required; the audited docs-review rerun succeeded cleanly on the synced branch.`
