# PRD — Manifest Persister Throughput

## Summary
- Problem Statement: `ManifestPersister` flushes manifest and heartbeat writes sequentially, extending end-of-run latency when both are dirty.
- Desired Outcome: Overlap manifest + heartbeat writes and avoid unnecessary retries when only one write fails.

## Goals
- Reduce flush wall time by parallelizing independent persistence writes.
- Preserve existing manifest and heartbeat formats and error semantics.

## Non-Goals
- Changing manifest schemas or file locations.
- Adding new background processes or persistence backends.
- Altering scheduling or debounce intervals.

## Stakeholders
- Product: N/A
- Engineering: Orchestrator team
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: tests confirm concurrent writes and single-channel retry behavior.
- Guardrails / Error Budgets: no change to output files; avoid masking errors.

## User Experience
- Personas: Internal operators
- User Journeys: CLI runs persisting manifests + heartbeat files.

## Technical Considerations
- Architectural Notes: manifest and heartbeat writes are independent and can run in parallel.
- Dependencies / Integrations: Node.js Promise utilities.

## Open Questions
- Should we emit a latency metric for persistence flush duration later?

## Approvals
- Product:
- Engineering:
- Design:
