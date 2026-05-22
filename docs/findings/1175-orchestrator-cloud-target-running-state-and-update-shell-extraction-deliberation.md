# Findings - 1175 Orchestrator Cloud-Target Running-State And Update Shell Extraction

## Decision

Proceed with a bounded running-state and in-progress update shell extraction next.

## Why This Seam

- `1173` already removed the request-contract cluster before executor handoff.
- `1174` already removed the adjacent missing-environment hard-fail projection.
- The remaining dense success-path shell is now the activation plus `onUpdate` persistence cluster before final executor result application.
- That is a truthful next seam because it is bounded, behaviorally coherent, and still smaller than a broad lifecycle refactor.

## Out of Scope

- target-stage resolution or sibling skip-marking
- missing-environment failure contract
- request-contract shaping
- final success/failure result application
- broader cloud-target lifecycle refactors

## Risk

If the lane only renames locals, the actual activation/update shell stays inline. If it absorbs final completion handling, the slice widens beyond the truthful seam.
