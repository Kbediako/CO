# PRD — Metrics Pending Batch Cap

## Summary
- Problem Statement: The current batched pending merge can accumulate a large backlog into memory and a single append, increasing OOM risk and widening the duplication blast radius if a crash happens after append but before deletions.
- Desired Outcome: Cap batch size (bytes/lines) while preserving ordering and correctness, reducing memory spikes and limiting worst-case duplication.

## Goals
- Bound memory usage during pending merges without reverting to per-file appends.
- Limit worst-case duplication if a process is interrupted after append.
- Preserve ordering guarantees and existing metrics schemas/paths.

## Non-Goals
- Changing metrics.json schema or aggregate formats.
- Altering lock acquisition semantics or retry policy.
- Introducing new dependencies or background processes.

## Stakeholders
- Product: N/A
- Engineering: Orchestrator team
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: bounded batch size (bytes/lines) with preserved ordering and stable aggregation behavior.
- Guardrails / Error Budgets: no data loss; keep metrics ordering stable; avoid regressions in aggregate updates.

## User Experience
- Personas: Internal operators
- User Journeys: CLI runs recording metrics at completion.

## Technical Considerations
- Architectural Notes: pending merges are serialized via lock; batch flushing should preserve filename ordering and remain safe under lock.
- Dependencies / Integrations: Node.js fs/promises, EnvUtils (for optional caps).

## Open Questions
- Resolved: defaults set to 500 lines and 1 MB (configurable via `CODEX_METRICS_PENDING_BATCH_MAX_LINES` and `CODEX_METRICS_PENDING_BATCH_MAX_BYTES`).

## Approvals
- Product:
- Engineering:
- Design:
