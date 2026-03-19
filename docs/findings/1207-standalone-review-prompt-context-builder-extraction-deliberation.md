# 1207 Deliberation - Standalone Review Prompt Context Builder Extraction

## Recommendation

Proceed with a narrow prompt/context builder extraction.

## Why This Seam

- `scripts/run-review.ts:138-394` still owns task index lookup, checklist parsing, task-context assembly, and active closeout provenance helpers inline.
- `scripts/run-review.ts:620-732` still assembles the prompt scaffold for diff, audit, and architecture surfaces inline before the runtime shell continues into monitoring and telemetry.
- `scripts/run-review.ts:2680-2697` still owns generated NOTES fallback inline even though it is part of the same prompt-support family.
- `tests/run-review.spec.ts:1191-1285`, `tests/run-review.spec.ts:2263-2392`, and `tests/run-review.spec.ts:4107-4142` already pin the task-context and prompt-surface behavior strongly enough that the extraction can stay structural instead of behavioral.

## Guardrails

- Keep runtime selection, launch/monitor loops, scope-path parsing, and `ReviewExecutionState` out of scope.
- Preserve exact task-parent lookup behavior for delegated scout manifests and legacy task-index entries.
- Preserve the existing active closeout provenance contract and architecture-surface path return behavior.
