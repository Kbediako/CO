---
id: 20260410-linear-63e7f712-d927-43fb-8afa-b357bab40aa2
title: CO: Harden hot-suite dist freshness heuristics for transitive CLI/runtime dependencies
relates_to: docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md
risk: high
owners:
  - Codex
last_review: 2026-04-11
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- PRD: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- Task checklist: `tasks/tasks-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`

## Traceability
- Linear issue: `CO-123` / `63e7f712-d927-43fb-8afa-b357bab40aa2`
- Linear URL: https://linear.app/asabeko/issue/CO-123/co-harden-hot-suite-dist-freshness-heuristics-for-transitive
- Follow-up to: `CO-114` / `54387f04-30aa-436a-9901-690c0e9cfcee`

## Summary
- Objective: harden the two retained subprocess hot-suite freshness selectors so stale built JS is rejected when relevant transitive command-surface or runtime roots changed.
- Scope:
  - define authoritative bounded dependency roots for the CLI and review hot suites
  - replace the diverging suite-local freshness logic with one shared test-local helper
  - add focused tests covering stale tracked roots and unrelated sibling tolerance
  - document the root contract and shared-helper decision in the issue packet
- Constraints:
  - preserve CO-114's fast-path intent and Core Lane guardrail shape
  - avoid broad whole-tree invalidation or generic dependency-graph traversal
  - keep the change local to the hot suites, a direct helper, and their docs packet unless new evidence forces expansion

## Implementation Boundary
- Hot test suites:
  - `tests/cli-command-surface.spec.ts`
  - `tests/run-review.spec.ts`
- Shared helper surface:
  - `tests/helpers/**`
- Adjacent runtime reference surfaces:
  - `bin/codex-orchestrator.ts`
  - `scripts/run-review.ts`
- Required docs mirrors:
  - `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
  - `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
  - `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
  - `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
  - `tasks/tasks-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
  - `.agent/task/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`

## Design
- Shared helper decision:
  - keep the freshness logic shared but test-local by extracting a helper under `tests/helpers/**`
  - do not move the optimization seam into product code because only the hot suites own this built-vs-source decision
- Authoritative dependency contract:
  - for each suite, compute the transitive closure of relative runtime-dependency edges reachable from the source entrypoint
  - CLI seed entrypoint: `bin/codex-orchestrator.ts`
  - Review seed entrypoint: `scripts/run-review.ts`
  - resolve relative `.js` and extensionless specifiers back to the source files present in the checkout (`.ts`, `.js`, and `index.*` variants) so the closure follows checkout source truth rather than built-output paths
  - cache the discovered closure per source entrypoint within the test process so repeated smoke invocations do not repeatedly walk the graph
  - derive closure freshness from `mtime` while separately using change tokens (`max(mtimeMs, ctimeMs)`) for newly appeared or higher-priority candidates and disappearance tokens from the winning candidate's parent directory so resolution flips invalidate stale `dist`
- Helper behavior:
  - recurse only through the discovered relative runtime-dependency closure for that suite, so the helper stays bounded to the relevant entrypoint graph
  - ignore type-only edges so runtime-unrelated type edits do not force source-entry fallback
  - fail closed when a tracked relative runtime dependency can no longer be resolved, because stale `dist` should not hide a broken source graph
  - fail closed when a winning tracked candidate disappears and `dist` is older than the disappearance token derived from that candidate's parent directory change time
  - keep rebuilt `dist` eligible on the first post-delete probe when its change token is newer than that disappearance token
  - fail closed on unreadable `dist` or root-stat errors
- Test plan:
  - CLI: reject stale `dist` when a transitive imported dependency outside the entry file is newer
  - Review: reject stale `dist` when a transitive imported dependency outside the entry file or direct `scripts/lib/**` roots is newer
  - Both: keep `dist` eligible when only unrelated sibling files outside the discovered closure are newer

## Validation
- Focused checks:
  - `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`
  - any narrower focused reruns needed while iterating
- Required repo floor before review handoff:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review` or truthful manual fallback
  - `npm run pack:smoke` only when the surviving final diff still touches downstream-facing CLI, package, skill, or review-wrapper paths; the current CO-123 rework closeout does not require it because the final diff is limited to the test-local helper and hot-suite tests

## Approvals
- Reviewer: `codex-orchestrator linear child-stream docs-review (manual fallback recorded after forced review stall)`
- Date: `2026-04-11`
- Manifest: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-docs-review/cli/2026-04-10T15-54-09-224Z-cab1c2ab/manifest.json`
- Override note: `The rerun passed delegation-guard, spec-guard, docs:check, and docs:freshness, then the forced nested review stalled and was manually terminated. The run closed failed with exit 128 plus missing/incomplete review telemetry, so this packet uses the manual docs-review fallback recorded in out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T160253Z-review-closeout.json.`
