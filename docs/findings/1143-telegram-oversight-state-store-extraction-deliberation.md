# 1143 Deliberation - Telegram Oversight State Store Extraction

## Decision

Open a bounded production extraction next, centered on the remaining bridge-local persistence shell.

## Why this is the next truthful seam

- `1125` already extracted push-state policy and cooldown logic.
- `1142` pinned the bridge-owned interleaving guarantees so the remaining risk is no longer semantic uncertainty.
- The bridge still owns a small persistence shell that is separable from runtime lifecycle and transport ownership.

## Slice Boundaries

- In scope: state-file path resolution, persisted-state reads/writes, and monotonic top-level `updated_at` reconciliation for bridge-applied patches.
- Out of scope: push-state policy, polling transport, queue ownership, Bot API ownership, and command/update controller extraction.

## Approval

Pre-implementation local read-only review approved for docs-first registration.
