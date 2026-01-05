# PRD — ExperienceStore JSONL Line Repair

## Summary
- Problem Statement: Append-only JSONL writes can lose line boundaries after crashes, causing future records to be concatenated into malformed lines.
- Desired Outcome: Guarantee new appends start on a fresh line without re-reading or rewriting the full file.

## Goals
- Preserve append-only performance while preventing multi-record concatenation.
- Ensure subsequent records remain readable even if a partial line exists.

## Non-Goals
- Full JSONL compaction or rotation.
- Schema changes or data migration.
- Adding new storage backends.

## Stakeholders
- Product: N/A
- Engineering: Orchestrator team
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: tests prove records remain readable after partial trailing lines.
- Guardrails / Error Budgets: avoid full-file reads; add at most a single-byte read per append.

## User Experience
- Personas: Internal operators
- User Journeys: TF-GRPO experience collection after interrupted runs.

## Technical Considerations
- Architectural Notes: read last byte before append and insert a newline if missing.
- Dependencies / Integrations: Node.js fs/promises.

## Open Questions
- Should we add compaction/repair for partial tails in a follow-up?

## Approvals
- Product:
- Engineering:
- Design:
