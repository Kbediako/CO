# 1086 Deliberation - Control Server Seed Loading Extraction

## Decision

Proceed with a bounded control-server seed-loading extraction after `1085`.

## Why this seam is next

- `1085` isolated the request shell, leaving the five JSON seed reads as the next cohesive startup concern in `ControlServer.start()`.
- That block is pure startup hydration: it loads persisted control/question/confirmation/delegation/linear-advisory inputs without touching route logic, runtime assembly behavior, or lifecycle ownership.
- Extracting it continues the thin-shell direction without reopening seeded runtime assembly, request transport, or startup sequencing.

## Out-of-scope guardrails

- Keep token generation unchanged.
- Keep seeded runtime assembly unchanged.
- Keep request-shell behavior unchanged.
- Keep bootstrap assembly and startup sequencing unchanged.
- Keep shutdown ordering unchanged.
- Avoid splitting seed loading into multiple helpers/files.

## Approval note

Approved for docs-first registration based on the `1085` next-slice note plus bounded read-only inspection of the remaining inline seed-loading block in `ControlServer.start()`.
