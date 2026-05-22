# Task Checklist - CO-577 quota hygiene degraded machine-status classification

- [x] Live Linear context read before transition.
- [x] Issue moved from `Ready` to `In Progress`.
- [x] Single active workpad created and refreshed.
- [x] Parallelization decision recorded as `parallelize_now` with docs child lane.
- [x] Docs child lane reached terminal `succeeded` and exported a patch.
- [x] Child patch rejected because it reframed CO-577 around `machine_status_degraded` instead of protected `degraded_read.reason=ui_request_timeout` / `source=local_machine_status`.
- [x] Parent docs-first packet created with corrected protected terms.
- [x] Root cause recorded: `classifyCoStatusDataset` flattened unknown bounded degraded-read reasons into `unavailable`.
- [x] Red quota-hygiene regression failed on current `classification: "unavailable"`.
- [x] Implementation added available degraded machine-status classification and reason/source/freshness evidence.
- [x] Focused quota-hygiene test passed after implementation.
- [x] `npm run build` passed.
- [x] `npm run lint` passed with existing warnings outside this change.
- [x] `npm run test` passed.
- [x] `node scripts/delegation-guard.mjs` passed with 1 subagent manifest.
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `npm run repo:stewardship`
- [x] `node scripts/diff-budget.mjs`
- [x] Manifest-backed standalone review clean.
- [x] Explicit elegance/minimality review complete.
- [x] `npm run pack:smoke` passed for the touched CLI package surface.
- [ ] PR attached and ready-review drain clean before review handoff.

## Acceptance Criteria
- [x] Add regression coverage in quota hygiene for a zero-WIP `co-status` payload with `degraded_read.reason=ui_request_timeout`, `source=local_machine_status`, and current freshness.
- [x] `hygiene quota` classifies that case as bounded degraded/partial machine status, not unavailable, while keeping the overall verdict visibly degraded until the dashboard/status read is fully clean.
- [x] Live-token extraction remains empty for degraded reads so partial status cannot falsely corroborate active workers.
- [x] Existing stale endpoint and unhealthy live-host degraded-read cases keep their stronger classifications and findings.
- [x] Finding text distinguishes unavailable status from available degraded machine status and points to the producer reason/source.
- [x] Documentation or task notes record the consumer contract invariant.
- [x] Validation includes focused quota-hygiene tests, focused co-status tests if touched, `node scripts/spec-guard.mjs --dry-run`, and the normal review gate for the implementation scope.

## Consumer Contract Invariant
Every downstream status consumer must preserve `degraded_read.reason`, `degraded_read.source`, and `degraded_read.freshness_verdict` instead of flattening unknown bounded degraded reads into `unavailable`. Stale endpoint, unhealthy host, auth failure, dead endpoint, and true unavailable evidence remain stronger fail-closed classifications.
