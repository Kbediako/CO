# 1196 Deliberation - Orchestrator Status Shell Extraction

## Decision

Open `1196-coordinator-symphony-aligned-orchestrator-status-shell-extraction` as the next bounded Symphony-aligned lane after `1195`.

## Why This Seam

After `1195`, both public lifecycle entrypoints already delegate their preparation shells before the shared control-plane lifecycle handoff. The remaining cohesive public command-local orchestration in `orchestrator.ts` is now the read-only `status()` path plus its private payload/render helpers.

That cluster is cohesive and bounded:

- manifest load for a run id
- runtime activity snapshot resolution
- JSON payload assembly through `buildStatusPayload(...)`
- human-readable rendering through `renderStatus(...)`

## Keep Out of Scope

- `start()` or `resume()`
- `plan()`
- runtime-mode selection or execution routing helpers
- control-plane or run-lifecycle orchestration
- broader status payload semantic changes

## Test Focus

- dedicated status-shell helper coverage for JSON payload shape and human-readable rendering
- adjacent command-surface coverage in `tests/cli-command-surface.spec.ts` that proves user-visible status output remains unchanged
- error-path coverage for manifest/activity lookup behavior if the helper introduces a new seam-local surface
