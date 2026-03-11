# PRD - Coordinator Symphony-Aligned Standalone Review Audit Exported-Env Startup Anchor Propagation

## Summary

`1108` finished exact-path audit startup anchoring, but bounded audit review still has one env-state asymmetry: shell-local exported evidence vars and sibling shell-segment updates are not propagated when the reviewer reads `$MANIFEST`, `$RUNNER_LOG`, or `$RUN_LOG` after `export ...` or `VAR=...; export VAR` inside one shell payload.

## Problem

- Audit mode now correctly requires real manifest or runner-log evidence before repeated off-surface startup reads can continue.
- The current parser handles inline `KEY=... cmd "$KEY"` and direct nested-shell env assignments, but it does not carry shell-local exported evidence vars across sibling segments inside one shell payload.
- That means valid evidence-first startup forms such as `export MANIFEST=...; sed "$MANIFEST"` or `MANIFEST=...; export MANIFEST; /bin/zsh -lc 'sed "$MANIFEST"'` can still be misclassified.
- Fixing that env-state propagation is smaller and safer than reopening prompt design, meta-surface heuristics, or native review replacement.

## Goals

- Teach bounded audit startup analysis to honor shell-local exported evidence vars across sibling shell segments.
- Preserve direct same-shell evidence reads and nested-shell evidence reads when the active evidence var has been exported or explicitly carried to the child process.
- Keep the slice limited to the active audit evidence vars (`MANIFEST`, `RUNNER_LOG`, `RUN_LOG`) within one shell payload.
- Stay inside the shared review-state/test seams unless implementation proves a wrapper change is required.

## Non-Goals

- General shell interpretation or broad env emulation.
- Wrapper replacement or native review-controller work.
- Prompt retuning, scope rendering work, or sustained meta-surface heuristic changes.
- Broader Symphony controller extraction work.

## User Value

- Standalone review accepts the evidence-first shell forms reviewers naturally use during audit startup.
- Review reliability keeps improving without broadening the wrapper beyond auditable, testable seams.
- CO stays on the hardened-wrapper path while broader Symphony extraction work remains paused only for justified review-surface fixes.

## Acceptance Criteria

- Bounded audit startup accepts `export MANIFEST=...; sed "$MANIFEST"` and the analogous runner-log forms when the path matches the active evidence.
- `RUN_LOG` remains a valid alias for the active runner log during audit startup.
- `MANIFEST=...; export MANIFEST; /bin/zsh -lc 'sed "$MANIFEST"'` preserves the active manifest path through sibling plus nested shell segments.
- Rebinding an exported or sibling-carried evidence var away from the active path before the first anchor still trips the audit startup boundary.
- Focused regressions cover both valid and invalid exported-env startup flows without reopening unrelated review-wrapper policy.
