---
id: 20260310-1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation
title: Coordinator Symphony-Aligned Standalone Review Audit Exported-Env Startup Anchor Propagation
status: draft
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation.md
related_tasks:
  - tasks/tasks-1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Audit Exported-Env Startup Anchor Propagation

## Summary

Extend the audit startup-boundary parser so shell-local exported evidence vars and sibling shell-segment updates remain available when bounded audit review inspects `$MANIFEST`, `$RUNNER_LOG`, or `$RUN_LOG` after `export ...` or `VAR=...; export VAR` inside one shell payload. Keep the change inside shared review-state parsing plus focused tests unless implementation proves a wrapper-facing regression needs coverage.

## Scope

- Update `scripts/lib/review-execution-state.ts` to preserve active audit evidence vars across sibling shell segments within one payload.
- Keep propagation bounded to `MANIFEST`, `RUNNER_LOG`, and `RUN_LOG` and the current audit startup/meta-surface seams.
- Add focused coverage in `tests/review-execution-state.spec.ts`.
- Add at least one runtime-facing audit-mode wrapper regression in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and task mirrors to reflect the exported-env startup contract.

## Out of Scope

- General shell interpreter behavior.
- `scripts/run-review.ts` changes unless the implementation proves they are required.
- Prompt retuning, scope rendering, or sustained meta-surface heuristic changes.
- Native review replacement or broader controller extraction.

## Proposed Design

### 1. Track shell-local evidence vars across sibling segments

Introduce a bounded shell-env state for audit startup/meta-surface analysis. The state only needs to preserve:

- shell-local evidence var values for same-shell sibling reads,
- exported evidence vars for nested shell payloads,
- explicit command-local env assignments for the current command.

Do not broaden the state to arbitrary shell semantics beyond the active audit evidence vars.

### 2. Distinguish current-command env from persisted shell state

Inline assignments such as `MANIFEST=/tmp/x sed "$MANIFEST"` should apply to the current command and nested child payloads for that command, but should not automatically persist to later sibling segments. Assignment-only segments and `export` segments should persist.

### 3. Preserve nested-shell audit behavior

When a shell command payload is analyzed recursively, only the env state that would still be visible to that child payload should be inherited. That keeps sibling-segment propagation honest without reopening broad shell interpretation.

### 4. Keep classifier ownership unchanged

`run-review.ts` already wires the active manifest and runner-log paths into the state layer. The intended `1109` change stays in `review-execution-state.ts` unless runtime-facing tests prove a wrapper note is missing.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Over-broad env propagation could silently turn this into a general shell interpreter.
- Under-modeling nested-shell inheritance could miss the real exported-env seam and leave drift unresolved.
- Reopening `run-review.ts` unnecessarily would widen the slice beyond the justified seam.

## Validation Plan

- Focused unit regressions for:
  - exported manifest startup success,
  - exported runner-log and `RUN_LOG` success,
  - sibling assignment plus later `export`,
  - rebinding away from the active path before the first anchor.
- One runtime-facing audit-mode fake-review regression proving the wrapper succeeds on an exported-env manifest startup form.
- Run docs-first guards before implementation, then the bounded validation lane plus review/pack smoke at closeout.
