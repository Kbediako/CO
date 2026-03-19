# 1204 Deliberation - Orchestrator Cloud Branch Resolution Boundary Extraction

## Recommendation

Proceed with a bounded shared cloud branch-resolution extraction next.

## Why This Seam

- `1203` removed the shared environment-id contract from the executor, so the next truthful cloud-resolution duplication is branch precedence.
- `CODEX_CLOUD_BRANCH` is still resolved inline in the cloud executor request builder, the cloud-route preflight request builder, and the auto-scout evidence recorder.
- Adjacent small parsing helpers still exist, but they should remain context only unless the implementation proves another narrower reuse boundary. The truthful seam is the shared branch-resolution contract itself.
- The contract is small enough to extract without reopening request shaping, fallback policy, or completion behavior.

## Guardrails

- Preserve the current branch-resolution precedence exactly.
- Keep shared environment-id resolution, prompt assembly, request numeric/default parsing, preflight target resolution, missing-environment handling, and completion logic out of scope.
- Treat this as a boundary extraction, not a general cloud-helper consolidation.
