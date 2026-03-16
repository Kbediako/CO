# Findings - 1230 Delegation Server RPC Transport and Tool-Dispatch Shell Extraction Deliberation

## Decision

Proceed with a bounded Symphony-aligned extraction centered on the RPC transport/runtime shell and tool-dispatch entry surface in `orchestrator/src/cli/delegationServer.ts`.

## Why this seam next

- `1228` explicitly froze the standalone-review wrapper subsystem, so the next truthful move must shift to a different mixed-ownership cluster.
- `delegationServer.ts` is one of the largest remaining CLI runtime files and still mixes request transport framing, top-level JSON-RPC routing, entry validation, and delegation/control tool dispatch with the underlying tool-handler implementations.
- The top-of-file concentration is cohesive enough to extract without forcing a fake symmetry move across already-settled review-wrapper or orchestrator-service lanes.

## Boundaries to keep

- Do not widen into individual tool-handler rewrites in this lane.
- Do not change dynamic-tool bridge, question handling, GitHub tool, or transport security semantics.
- Do not widen into Telegram or Linear setup/auth/webhook work unless later evidence proves it is required.

## Estimate Note

- Current bounded scout evidence suggests roughly `12-22` more truthful Symphony-aligned slices remain repo-wide, centered around the delegation server, RLM family, control/live-dispatch family, and doctor/diagnostics family.
- `1230` is the next concrete lane, not a claim that the remainder is fully enumerated.

## Approval

- 2026-03-16: Approved for docs-first registration as the next truthful post-`1228` lane based on local seam inspection plus bounded scout corroboration.
