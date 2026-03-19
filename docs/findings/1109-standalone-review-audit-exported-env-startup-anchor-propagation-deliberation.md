# Findings - 1109 Standalone Review Audit Exported-Env Startup Anchor Propagation

- `1108` completed exact-path audit startup anchoring and explicitly left shell-local exported env propagation as the next remaining audit startup seam.
- The current parser already covers inline `KEY=... cmd "$KEY"` and direct nested command payload analysis, so the next smallest fix is not `run-review.ts` expansion or prompt retuning.
- The bounded next seam is preserving the active audit evidence vars (`MANIFEST`, `RUNNER_LOG`, `RUN_LOG`) across sibling shell segments and exported child-shell startup flows inside one shell payload.
- The safe v1 contract is to support valid exported-env evidence-first startup and fail when those vars are rebound away from the active path before the first audit anchor; do not reopen general shell interpretation or wrapper replacement.
