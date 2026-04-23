# ACTION_PLAN - Control Host Supervision Stale co-status Endpoint and Probe Timeout Recurrence

## Summary
- Goal: close `CO-336` with a bounded status/supervision fix and machine-checkable tests.
- Scope: direct `co-status --format json`, endpoint recovery, supervision probe budget, and restart/probe diagnostics.
- Assumptions: first source classification points to supervision probe coupling because the probe budget is shorter than the status read path, especially when stale endpoint recovery can attempt a stale endpoint and then the rotated current endpoint.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `control_endpoint.json`, `co-status --format json`, `ECONNREFUSED`, `probe_timeout`, `control-host supervise status --format json`, `restart_count`, `/ui/data.json`, endpoint rotation, healthy active provider workers, `provider-intake-state.json`.
- Not done if: the fix broadens into queue/admission or provider-worker lifecycle mutation, or it treats one later successful status read as closure.
- Pre-implementation issue-quality review: source inspection confirms a concrete mismatch between `probeControlHostHealth` and `fetchUiDataset` timeouts; this is a valid bounded owner for the first implementation.

## Milestones & Sequencing
1. Register docs-first packet and workpad.
2. Implement probe-budget alignment and additive probe-duration diagnostics.
3. Add focused regressions for slow healthy probe, fail-closed timeout, restart-record diagnostics, and stale endpoint recovery.
4. Run scoped validation plus required review/elegance gates before handoff.

## Dependencies
- Existing `readUiDatasetWithEndpointRecovery` stale endpoint behavior from direct `co-status`.
- Existing supervision health evaluation in `control/controlHostSupervision.ts`.

## Validation
- Checks / tests: focused Vitest command, `npm run build`, guard commands, and review/elegance before handoff.
- Rollback plan: revert the bounded timeout/diagnostic additions; no runtime state migration is required.

## Risks & Mitigations
- Risk: longer probe budget delays detection of a truly dead host. Mitigation: keep a finite cap, preserve unhealthy threshold counting, and cover command timeout fail-closed behavior.
- Risk: diagnostics schema drift. Mitigation: additive optional fields only.

## Approvals
- Reviewer: pending.
- Date: 2026-04-23
