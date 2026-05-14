# PRD: Coordinator Symphony-Aligned Control Server Bootstrap Start Sequencing Extraction

## Problem

`1151` reduced the Telegram bootstrap wrapper to a thin adapter, but `ControlServerBootstrapLifecycleRuntime.start()` still owns the remaining inline bootstrap sequencing: persist control bootstrap metadata, start expiry lifecycle, then best-effort start the Telegram bridge with warn-and-continue behavior.

## Goal

Extract that ordered bootstrap start sequencing into a tiny adjacent helper while preserving persistence ordering, expiry start behavior, non-fatal Telegram bridge startup handling, and the current generic bootstrap lifecycle contract.

## Non-Goals

- Telegram bootstrap-local helper churn or additional Telegram-specific micro-extractions
- Changes to bootstrap metadata payload shape or file persistence behavior
- Expiry lifecycle logic changes
- Telegram bridge runtime lifecycle, polling, or projection-delivery behavior changes
- Broader `controlBootstrapAssembly.ts` or `controlServer.ts` refactors

## Requirements

1. One adjacent helper owns the ordered bootstrap start sequence currently in `ControlServerBootstrapLifecycleRuntime.start()`.
2. `controlServerBootstrapLifecycle.ts` remains the owner of the generic bootstrap lifecycle contract and delegates only the start sequencing.
3. The extracted helper preserves the existing order: persist bootstrap metadata, start expiry lifecycle, then best-effort Telegram bridge startup.
4. Telegram bridge startup failure remains non-fatal and still logs the current warning.
5. Focused regressions cover ordering and non-fatal bridge-start behavior.

## Success Criteria

- `ControlServerBootstrapLifecycleRuntime.start()` no longer inlines the ordered bootstrap start sequence.
- Focused bootstrap lifecycle regressions remain green on the final tree.
- The standard closeout gate bundle passes on the final tree.
