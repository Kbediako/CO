# 1084 Deliberation - Control Server Seeded Runtime Assembly Extraction

## Decision

Proceed with a bounded control server seeded runtime-assembly extraction after `1083`.

## Why this seam is next

- `1083` isolated bind/listen plus final bootstrap startup, leaving one large seeded runtime-assembly block between JSON seed reads and `http.createServer(...)`.
- That block is the next cohesive concern: store construction, runtime creation, persist closures, and `requestContextShared` assembly move together and do not need startup-shell or route changes.
- Extracting that block keeps the thin-shell direction moving without reopening controllers or lifecycle internals.

## Out-of-scope guardrails

- Keep JSON seed reads unchanged.
- Keep `controlServerStartupSequence.ts` unchanged.
- Keep `createControlBootstrapAssembly(...)` unchanged.
- Keep route handling/controller logic unchanged.
- Avoid splitting the seeded runtime assembly into multiple helpers/files.

## Approval note

Approved for docs-first registration based on the `1083` next-slice note and bounded read-only inspection of the remaining seeded runtime-assembly block in `ControlServer.start()`.
