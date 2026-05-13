# PRD — Orchestrator Persistence Throughput

## Summary
- Problem Statement: Run completion persistence writes task snapshots and manifests sequentially, adding avoidable end-of-run latency.
- Desired Outcome: Overlap snapshot + manifest writes without changing error handling semantics or data formats.

## Goals
- Reduce run completion wall time by parallelizing independent persistence writes.
- Preserve existing lock behavior and manifest guarantees.

## Non-Goals
- Changing JSON schema or storage locations.
- Introducing background daemons or new persistence backends.
- Reworking task state snapshot formats.

## Stakeholders
- Product: N/A
- Engineering: Orchestrator team
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: run completion persists manifest + snapshot with unchanged outputs while reducing wall time in diagnostics.
- Guardrails / Error Budgets: keep error reporting behavior consistent and avoid masking failures.

## User Experience
- Personas: Internal operators
- User Journeys: CLI runs that write manifests and task state snapshots.

## Technical Considerations
- Architectural Notes: state snapshot + manifest writes are independent; we can issue both concurrently and handle errors after settlement.
- Dependencies / Integrations: Node.js Promise utilities.

## Open Questions
- Should we add a coarse timing metric for persistence duration in a follow-up?

## Approvals
- Product:
- Engineering:
- Design:
