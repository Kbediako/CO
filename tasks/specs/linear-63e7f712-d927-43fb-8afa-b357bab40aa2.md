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
  - 2026-04-10: Opened from Linear issue `CO-123` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` parallelization decision with reason `single_bounded_change`, and switching the detached workspace at `2a0e6320c1e35fbaf5ebe7709599221112ceaec0` onto branch `linear/co-123-transitive-dist-freshness`.
  - 2026-04-10: Current source audit matches the issue packet: `tests/cli-command-surface.spec.ts` currently treats built CLI JS as fresh only when `dist/bin/codex-orchestrator.js` is newer than `bin/codex-orchestrator.ts`, while `tests/run-review.spec.ts` compares `dist/scripts/run-review.js` against `scripts/run-review.ts` plus `scripts/lib/**`.
  - 2026-04-10: The first audited `docs-review` pass surfaced two P1 contract gaps in the subtree proposal: CLI imports already escape `orchestrator/src/cli/**`, and review-runtime imports already escape `orchestrator/src/cli/runtime/**`. The packet therefore switches to an entrypoint-specific transitive relative-import closure as the authoritative dependency contract.
  - 2026-04-10: The rerun audited `docs-review` child stream `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-09T15-19-12-917Z-b0df389b/manifest.json` passed delegation guard, `spec-guard`, `docs:check`, and `docs:freshness`, then stalled inside forced `npm run review` after drifting into repo-wide `generated_at`, `require()`, and registry/meta-surface probing instead of returning a packet-local verdict. Manual fallback review found the updated packet coherent, so docs-review is recorded as an explicit override. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T152544Z-docs-first/05-docs-review-override.md`, `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-09T15-19-12-917Z-b0df389b/commands/05-review.ndjson`, `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-09T15-19-12-917Z-b0df389b/review/output.log`.
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
- Reviewer: `codex-orchestrator docs-review` (stalled low-signal drift, manual fallback accepted)
- Date: 2026-04-10
- Manifest: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-09T15-19-12-917Z-b0df389b/manifest.json`
- Override note: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T152544Z-docs-first/05-docs-review-override.md`
