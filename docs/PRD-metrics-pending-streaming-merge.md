# PRD — Metrics Pending Streaming Merge

## Summary
- Problem Statement: Pending merges still read entire files into memory; a single oversized `.jsonl` can bypass batch caps and spike memory, and whitespace-only lines can poison later JSON parsing.
- Desired Outcome: Stream pending files line-by-line, flush batches incrementally even within a file, preserve ordering, and ignore whitespace-only lines.

## Goals
- Bound memory usage even when a single pending file is large.
- Preserve ordering guarantees and existing metrics schemas/paths.
- Reduce downstream parse failures by filtering whitespace-only lines.

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
- Dependencies / Integrations: Node.js fs/promises + readline for streaming, EnvUtils (for optional caps).

## Open Questions
- Should whitespace-only lines be skipped everywhere JSONL is parsed, or only during pending merges?

## Approvals
- Product:
- Engineering:
- Design:
