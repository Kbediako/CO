# PRD — Metrics Pending IO Batching

## Summary
- Problem Statement: Metrics aggregation drains pending entries by appending each file individually and can recompute aggregates twice when late pending entries arrive, adding I/O and latency at run completion.
- Desired Outcome: Batch pending entry appends and update aggregates once after the final merge, preserving ordering and correctness.

## Goals
- Reduce filesystem writes during pending metrics merges.
- Avoid redundant aggregate recomputation while keeping metrics outputs accurate.
- Preserve existing metrics schemas and artifact locations.

## Non-Goals
- Changing metrics.json schema or aggregate formats.
- Altering lock acquisition semantics or retry policy.
- Introducing new background processes.

## Stakeholders
- Product: N/A
- Engineering: Orchestrator team
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: fewer append operations and single aggregate recomputation when late pending entries exist.
- Guardrails / Error Budgets: no data loss; keep metrics ordering stable.

## User Experience
- Personas: Internal operators
- User Journeys: CLI runs recording metrics at completion.

## Technical Considerations
- Architectural Notes: pending metrics entries are serialized via lock; merges can be safely batched before aggregate updates.
- Dependencies / Integrations: Node.js fs/promises.

## Open Questions
- Should we cap batch size for extremely large pending queues?

## Approvals
- Product:
- Engineering:
- Design:
