# 1083 Deliberation - Control Server Startup Shell Extraction

## Decision

Proceed with a bounded control server startup-shell extraction after `1082`.

## Why this seam is next

- `1082` isolated bootstrap collaborator assembly, leaving bind/listen, base URL derivation, and final bootstrap start as the remaining cohesive startup shell inside `ControlServer.start()`.
- This is the next smallest coherent step toward a thinner `ControlServer.start()` without reopening route handling or lifecycle internals.
- Keeping bind/listen and bootstrap start together avoids splitting one startup concern across multiple micro-files.

## Out-of-scope guardrails

- Keep request-context/store seeding unchanged.
- Keep `controlBootstrapAssembly.ts` unchanged.
- Keep route handling/controller logic unchanged.
- Avoid splitting bind/listen and bootstrap start into separate helpers/files.

## Approval note

Approved for docs-first registration based on the `1082` next-slice note and bounded read-only inspection of the remaining startup shell in `ControlServer.start()`.
