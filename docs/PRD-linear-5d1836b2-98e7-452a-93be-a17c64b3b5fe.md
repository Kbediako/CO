# PRD - Control Host Supervision Stale co-status / probe-timeout Recurrence

## Summary
- Problem Statement: live control-host supervision can still record repeated `probe_timeout` restarts while active provider workers continue, and direct `co-status --format json` has recently failed against a stale `control_endpoint.json` dead port after endpoint rotation.
- Desired Outcome: classify and fix the recurrence so direct JSON status reads recover from stale endpoint rotation, supervision health probes do not flap on healthy but slow status reads, and genuine dead/stuck hosts remain fail-closed.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete Linear issue `CO-336` in the current provider-worker workspace by validating the combined stale endpoint plus health-probe timeout shape, preserving provider-worker safety, and landing a bounded control-host supervision/status fix with regression coverage.
- Success criteria / acceptance: stale endpoint recovery is deterministically covered; probe timeout recurrence is simulated without killing workers; root owner is classified; diagnostics expose probe/restart context; fail-closed semantics remain; related issues are explicitly classified at closeout.
- Constraints / non-goals: do not kill or restart active provider workers, do not redesign CO STATUS, do not broaden into stdin bootstrap or queue/admission policy except for explicit relation evidence, and do not rely on manual restart as the durable fix.

## Intent Checksum
- Exact user wording / phrases to preserve: `control_endpoint.json`, `co-status --format json`, `ECONNREFUSED`, `probe_timeout`, `control-host supervise status --format json`, `restart_count`, `/ui/data.json`, endpoint rotation, healthy active provider workers, `provider-intake-state.json`.
- Protected terms / exact artifact and surface names: `probeControlHostHealth`, `readUiDatasetWithEndpointRecovery`, `control_auth.json`, `restart_history`, `last_health_status`, `running_workers`, `polling.restart_required`.
- Nearby wrong interpretations to reject: this is not fully covered by `CO-329`; not fully covered by `CO-330` unless validation proves stale-owner reclaim causes this sequence; not fully covered by `CO-331`; not solved by killing workers or manually resetting the host; not closed merely because one later `co-status --format json` succeeded.

## Parity / Alignment Matrix
- Current truth: direct `co-status --format json` now uses endpoint recovery, but supervision invokes that path under a shorter probe budget than the `/ui/data.json` request timeout, so healthy slow reads can be killed as `probe_timeout`.
- Reference truth: attach/status endpoint recovery should have enough time to classify timeout, dead-port, auth, or endpoint rotation outcomes across the stale endpoint attempt and current endpoint retry before the supervisor declares a failed probe.
- Target truth / intended delta: supervision probe timing covers the status read contract, records probe timing metadata, and still fails closed after real repeated failed probes.
- Explicitly out-of-scope differences: provider-worker stdin bootstrap, Ready queue/admission policy, broad CO STATUS UI redesign, and destructive `provider-intake-state.json` cleanup.

## Not Done If
- `co-status --format json` can still fail first on stale endpoint rotation without recovery coverage.
- A healthy but slow `/ui/data.json` read can still be force-classified by the supervisor before the read path's own timeout/recovery contract has elapsed.
- Restart history lacks machine-checkable probe duration/failure context.
- The fix weakens `restart_required` or genuinely dead-host fail-closed behavior.

## Goals
- Align the supervision probe budget with the status read/recovery path.
- Add or identify machine-checkable diagnostics for probe duration and restart reason correlation.
- Add focused regression coverage for stale endpoint recovery and slow healthy probe behavior.

## Non-Goals
- Do not alter provider admission capacity, queue promotion, or stale-owner reclaim policy.
- Do not make manual host restart part of the fix.
- Do not change interactive dashboard rendering beyond the status-read contract needed here.

## Stakeholders
- Product: CO operators watching `co-status` and control-host supervision during live provider-worker activity.
- Engineering: maintainers of control-host supervision, `co-status`, endpoint artifacts, and provider-worker safety.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics: focused tests prove endpoint recovery and probe-budget behavior; validation commands pass; workpad records root-owner classification.
- Guardrails / Error Budgets: no active provider-worker kill/restart during diagnosis; no weakening of `restart_required` fail-closed semantics.

## User Experience
- Personas: operator-engineer supervising local CO provider workers.
- User Journeys: run direct `co-status --format json` during endpoint rotation and receive a truthful snapshot; inspect `control-host supervise status --format json` and restart history for probe duration/reason evidence.

## Technical Considerations
- Architectural Notes: keep the fix in the existing `coStatusAttachCliShell.ts` status-read contract and `controlHostSupervisionCliShell.ts` health-probe contract.
- Dependencies / Integrations: no new external dependencies.

## Open Questions
- None for the first implementation slice.

## Approvals
- Product: implicit via Linear `CO-336` prompt.
- Engineering: parent worker self-review plus required standalone review before handoff.
- Design: not applicable.
