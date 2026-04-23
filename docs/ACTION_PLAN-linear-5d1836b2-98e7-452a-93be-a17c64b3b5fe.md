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
- [x] Register docs-first packet and workpad. Evidence: `../../.runs/linear-5d1836b2-98e7-452a-93be-a17c64b3b5fe/cli/2026-04-23T10-15-31-978Z-3b9ae081/manifest.json`; Linear workpad `901e2cfe-ad3a-46f5-883e-1add737f39e1`.
- [x] Implement probe-budget alignment and additive probe-duration diagnostics. Evidence: `orchestrator/src/cli/controlHostSupervisionCliShell.ts`; `orchestrator/src/cli/control/controlHostSupervision.ts`.
- [x] Add focused regressions for slow healthy probe, fail-closed timeout, restart-record diagnostics, and stale endpoint recovery. Evidence: `tests/control-host-supervision.spec.ts`; `orchestrator/tests/ControlHostSupervision.test.ts`.
- [x] Run scoped validation plus required review/elegance gates before handoff. Evidence: `../../.runs/linear-5d1836b2-98e7-452a-93be-a17c64b3b5fe/cli/2026-04-23T10-15-31-978Z-3b9ae081/review/telemetry.json`; PR `#620`.

## Dependencies
- [x] Existing `readUiDatasetWithEndpointRecovery` stale endpoint behavior from direct `co-status`. Evidence: `orchestrator/src/cli/coStatusAttachCliShell.ts`.
- [x] Existing supervision health evaluation in `control/controlHostSupervision.ts`. Evidence: `orchestrator/src/cli/control/controlHostSupervision.ts`.

## Validation
- [x] Checks / tests: focused Vitest command, `npm run build`, guard commands, and review/elegance before handoff. Evidence: `../../.runs/linear-5d1836b2-98e7-452a-93be-a17c64b3b5fe/cli/2026-04-23T10-15-31-978Z-3b9ae081/manifest.json`; `../../.runs/linear-5d1836b2-98e7-452a-93be-a17c64b3b5fe/cli/2026-04-23T10-15-31-978Z-3b9ae081/review/telemetry.json`.
- [x] Rollback plan: revert the bounded timeout/diagnostic additions; no runtime state migration is required. Evidence: additive optional fields in `orchestrator/src/cli/control/controlHostSupervision.ts`.

## Risks & Mitigations
- Risk: longer probe budget delays detection of a truly dead host. Mitigation: keep a finite cap, preserve unhealthy threshold counting, and cover command timeout fail-closed behavior.
- Risk: diagnostics schema drift. Mitigation: additive optional fields only.

## Approvals
- Reviewer: wrapper-led standalone review found one P2 on the initial one-read budget; final post-merge review found no actionable regressions.
- Date: 2026-04-23
