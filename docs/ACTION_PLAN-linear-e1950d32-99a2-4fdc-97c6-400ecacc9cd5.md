# ACTION_PLAN - CO Reconcile Terminal Provider-Worker Failures and Stale Intake Workpad State

## Added by Bootstrap 2026-03-25

## Traceability
- Linear issue: `CO-18` / `e1950d32-99a2-4fdc-97c6-400ecacc9cd5`
- Linear URL: https://linear.app/asabeko/issue/CO-18/co-reconcile-terminal-provider-worker-failures-and-stale-intakeworkpad
- MCP Task ID: `linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5`

## Goal
- Reconcile terminal provider-worker failures truthfully across run manifests, worker proof, provider-intake persistence, and Linear/workpad surfaces, so recovery is deterministic and operator-visible.

## Plan
1. Register the docs-first packet for `linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5`, update `tasks/index.json`, `docs/TASKS.md`, the freshness registry, and the single active Linear workpad.
2. Capture the failed `CO-16` baseline in a manual audit note covering the manifest/proof pair, the current intake snapshot, the relevant provider/control runtime seams, and the Symphony baseline.
3. Run `docs-review` for the new packet before implementation.
4. Patch the smallest reconciliation path that makes terminal failure authoritative, refreshes stale issue metadata, and leaves a truthful failure-side workpad/update trail.
5. Add focused tests across provider handoff, worker runner, and control runtime seams.
6. Run the required validation floor, refresh the workpad, and hand off through the normal review workflow once the branch is ready.

## Checkpoints
- Docs-first registration complete and mirrored.
- Baseline audit written with concrete failed-artifact references.
- docs-review manifest recorded.
- Runtime patch and focused regressions complete.
- Validation floor green and review/elegance passes complete.

## Notes
- Delegation override required for this session:
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session."`
- Expected primary edit seams:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - relevant tests under `orchestrator/tests/`

## Evidence
- Baseline audit: `out/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/manual/20260325T000000Z-baseline-audit.md`
