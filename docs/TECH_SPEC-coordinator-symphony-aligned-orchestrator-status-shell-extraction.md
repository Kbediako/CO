# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Status Shell Extraction

- Date: 2026-03-15
- Owner: Codex (top-level agent)
- Task: `1196-coordinator-symphony-aligned-orchestrator-status-shell-extraction`
- Status: Draft

## Background

`1194` and `1195` reduced the public lifecycle entrypoints to thin preparation-shell handoffs. The remaining cohesive public command-local orchestration in `orchestrator.ts` is now the read-only `status()` path and its local payload/render helpers.

## Scope

- extract the `status()` command cluster from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - manifest load for a run id
  - runtime activity snapshot resolution
  - JSON payload assembly currently handled by `buildStatusPayload(...)`
  - human-readable rendering currently handled by `renderStatus(...)`
- preserve the exact manifest return contract and current stdout/log output semantics

## Out of Scope

- `start()` or `resume()`
- `plan()`
- runtime-mode or runtime-selection helpers
- control-plane or run-lifecycle orchestration
- broader status payload semantic changes

## Proposed Approach

1. Introduce one bounded status-shell helper under `orchestrator/src/cli/services/`.
2. Move the `status()` manifest/activity lookup plus JSON/text branching into that helper.
3. Move or inline the current `buildStatusPayload(...)` and `renderStatus(...)` logic inside the new shell.
4. Keep `orchestrator.ts` as the public entrypoint while delegating only the status shell.
5. Add or adapt focused tests around JSON output, text rendering, and manifest/activity lookup behavior.

## Validation

- standard docs-first guards before implementation
- focused status-shell regressions during implementation:
  - one new status-shell test to pin JSON payload shape and human-readable rendering
  - adjacent command-surface coverage that proves external CLI behavior remains unchanged
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing payload keys or log wording would create visible CLI regressions
- widening into `plan()` or broader public command ownership would break the bounded seam
- mixing read-only status presentation with lifecycle abstractions would reduce symmetry rather than improve it
