# Findings: 1151 Control Telegram Bridge Bootstrap Oversight Factory Extraction Deliberation

- Date: 2026-03-13
- Task: `1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction`

## Decision

After `1150`, the next truthful Symphony-aligned seam is the lazy oversight-facade assembly still embedded inside `controlTelegramBridgeBootstrapLifecycle.ts`.

## Why this seam next

- `1149` neutralized the read contract.
- `1150` neutralized the update contract and lifecycle typing, while also hardening start/close sequencing.
- The remaining inline coordinator-owned wiring in this cluster is now the bootstrap-local closure that assembles the oversight facade from shared request context, expiry lifecycle lookup, and dispatch-audit emission.
- Extracting that helper is smaller and more defensible than reopening Telegram runtime lifecycle, polling, or broader `controlServer` startup work.

## Explicit Boundaries

- In scope: the bootstrap-local lazy oversight-factory helper and the minimal lifecycle rewiring that consumes it.
- Out of scope: Telegram runtime behavior, bridge sequencing, contract-shape changes, and broader startup/controller refactors.

## Validation posture

- Minimum truthful proof is focused helper/bootstrap regressions plus the standard closeout gate bundle.
