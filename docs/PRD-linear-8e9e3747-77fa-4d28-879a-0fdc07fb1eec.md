# PRD - CO-406 no-run accepted recover capacity accounting

## Traceability
- Linear issue: `CO-406` / `8e9e3747-77fa-4d28-879a-0fdc07fb1eec`
- Linear URL: https://linear.app/asabeko/issue/CO-406/control-host-no-run-accepted-recover-claims-can-self-block-admission
- Task id: `linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec`
- Canonical spec: `tasks/specs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- Task checklist: `tasks/tasks-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- Source anchor: `ctx:sha256:5e6a41f3e50484fb975cfe88fc0f51f6189eb4f7f7096067413bc84e3025cfc0#chunk:c000001`

## Summary
- Problem Statement: a `control-host recover` request can leave a provider issue in `state=accepted` with `reason=provider_issue_rehydration_pending_revalidation` but no `run_id`, no `run_manifest_path`, no `launch_started_at`, and no `launch_token`. A later recover/relaunch/nudge can then count that no-run accepted claim as capacity and return `provider_issue_start_blocked:max_concurrency` even when live worker truth is below the WIP cap.
- Desired Outcome: no-run accepted pending-revalidation claims remain auditable provider-intake state but no longer consume running/launching capacity. A retry for that same issue either launches, queues truthfully, or returns an actionable no-op, while real running or launching claims still prevent duplicate provider-worker launches.

## User Request Translation
- User intent / needs: fix the CO-405 admission failure shape without reopening CO-404 acknowledgement-timeout behavior. The implementation must repair admission/capacity accounting for accepted pending-revalidation claims that have no run or launch token.
- Success criteria / acceptance:
  - accepted pending-revalidation claims with `run_id=null`, `run_manifest_path=null`, and no launch token do not count as running or launching capacity
  - recover/relaunch/nudge retries for the same no-run accepted claim do not self-block as `provider_issue_start_blocked:max_concurrency`
  - `co-status --format json`, `/ui/data.json`, and `provider-intake-state.json` agree on active accepted/no-run versus running worker claims
  - regression coverage proves `running=2`, `max_allowed=3`, plus one accepted no-run recover claim does not block the next recover for that same issue
  - duplicate launches are still blocked for real running or launching claims
- Constraints / non-goals:
  - do not change CO-404 acknowledgement timeout semantics
  - do not relax duplicate provider-worker protection for live running or launching claims
  - do not hand-edit provider-intake state as the fix
  - do not broaden into provider workflow, release intake, review-wrapper, or current-state authority redesign

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `accepted pending-revalidation claims`
  - `run_id=null`
  - `run_manifest_path=null`
  - `launch_token=null`
  - `provider_issue_start_blocked:max_concurrency`
  - `provider_issue_rehydration_pending_revalidation`
  - `control_host_provider_worker_recover`
  - `recover/relaunch/nudge`
  - `running=2`
  - `max_allowed=3`
  - `provider-intake-state.json`
  - `co-status --format json`
  - `/ui/data.json`
- Protected artifact and surface names:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
- Nearby wrong interpretations to reject:
  - treating every `accepted` claim as live capacity without checking run or launch evidence
  - deleting no-run accepted claims instead of preserving auditable intake truth
  - allowing duplicate starts for a real running worker or in-flight launch token
  - describing this as CO-404 acknowledgement timeout
  - making `co-status` look green while provider-intake admission still counts stale capacity

## Capacity Authority Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `provider-intake-state.json` | Can retain an accepted pending-revalidation recover claim with no run or launch token. | Retained intake rows are audit evidence unless run or launch evidence proves active occupancy. | No-run accepted pending-revalidation claims are visible but marked non-running/non-launching for capacity. | Manual state edits or claim deletion as the fix. |
| `providerIssueHandoff.ts` | Blocked admission can be persisted as `state=accepted`, and retry capacity can count the same no-run claim. | Admission should count live running/launching workers, not a retry's own inert no-run residue. | Same-issue no-run accepted residue does not cause `provider_issue_start_blocked:max_concurrency`; real running/launching claims still block duplicates. | CO-404 acknowledgement timeout or lifecycle watchdog redesign. |
| `controlRuntime.ts` / `/ui/data.json` | Read models can treat accepted claims as active in status projections. | Operator status must distinguish active accepted/no-run claims from running worker claims. | `co-status --format json` and `/ui/data.json` agree with provider-intake active versus running identifiers. | Broader current-state authority consolidation. |
| Regression tests | Existing coverage protects max-concurrency paths but not the same-issue no-run recover residue. | The observed CO-405 shape must be pinned. | Focused tests cover `running=2`, `max_allowed=3`, accepted no-run retry, and duplicate protection for real active claims. | Large fixture rewrites unrelated to admission accounting. |

## Not Done If
- A same-issue no-run accepted recover claim can still block its own retry as `provider_issue_start_blocked:max_concurrency`.
- `accepted` remains synonymous with running/launching capacity.
- `co-status --format json`, `/ui/data.json`, and provider-intake state disagree about running worker claims.
- The implementation permits duplicate provider-worker launches for a real active run or launch token.
- The fix is only a display-layer change and admission still counts the stale claim.
- CO-404 acknowledgement timeout behavior is changed as part of this issue.

## Goals
- Repair provider-worker admission capacity accounting for no-run accepted recover residue.
- Preserve auditable provider-intake state while excluding inert no-run claims from running/launching capacity.
- Keep duplicate launch protection for real running/launching claims.
- Add focused regressions for the exact CO-405 failure shape.

## Non-Goals
- No acknowledgement-timeout semantics change for `recover`, `relaunch`, or `nudge`.
- No provider workflow redesign.
- No broad control-host status authority rewrite.
- No provider-intake manual cleanup tool.
- No changes to unrelated docs freshness, review wrapper, or release detector lanes.

## Stakeholders
- Product: CO operators using control-host recover/relaunch/nudge and `co-status` to manage provider WIP.
- Engineering: provider-worker admission, control-host status, and provider-intake maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - focused regression fails before the fix and passes after implementation
  - `co-status` and `/ui/data.json` expose running identifiers separately from no-run accepted active identifiers
  - admission no longer returns same-issue `provider_issue_start_blocked:max_concurrency` for inert no-run residue
- Guardrails / Error Budgets:
  - zero duplicate launches for real running or launching claims
  - zero behavior changes to CO-404 acknowledgement timeout
  - zero manual provider-intake state edits as validation

## Technical Considerations
- Architectural Notes:
  - Capacity accounting needs a single predicate that distinguishes occupancy-bearing accepted claims from auditable no-run accepted residue.
  - Read-side status should share the same active/running distinction or consume provider-intake summaries that already encode it.
  - Admission retries should ignore or discount the same no-run accepted claim only when it has no run, no manifest, no launch start, and no launch token.
- Dependencies / Integrations:
  - `provider-intake-state.json`
  - `control-host recover|relaunch|nudge`
  - `co-status --format json`
  - `/ui/data.json`
  - provider WIP cap from CO-125 admission constraints

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider admission capacity | Treating accepted pending-revalidation no-run claims as active capacity | remove fallback | CO-406 | A recover/relaunch/nudge retry sees a retained accepted claim without run or launch evidence. | observed 2026-04-27 | N/A after removal | N/A after removal | Accepted no-run residue is excluded from running/launching capacity. | Focused ProviderIssueHandoff regression for `running=2`, `max_allowed=3`, plus same-issue no-run claim. |
| Provider-intake audit state | Retaining accepted pending-revalidation no-run claims for revalidation/audit | justify retaining fallback | CO-406 provider-intake state | Recovery request times out or persists a pending-revalidation claim before launch evidence exists. | observed 2026-04-27 | 2026-05-12 | Non-expiring only as audit-visible non-occupancy state | Replace only if provider-intake gets an explicit non-occupancy state. | Status/read-model regressions prove the row is visible but not running. |
| Duplicate launch protection | Blocking retries for real running or launching same-issue claims | justify retaining fallback | CO-125 admission constraints / CO-406 | Existing claim has live run evidence or launch token/start evidence. | existing provider admission contract | 2026-05-12 | Non-expiring admission safety contract | Remove only with a stronger single-flight launch lock. | Regression proves real running/launching claims still block duplicates. |

- Durable retention evidence: provider-intake may retain accepted no-run claims as audit and revalidation state, but this retained state must not be governed as running occupancy. Duplicate protection remains a durable admission safety contract for claims with run or launch evidence.
- Large-refactor check: a large refactor is not required. The narrow fix should centralize the occupancy predicate and thread it through admission/read models. Escalate only if source inspection shows capacity is duplicated across incompatible authority paths.

## Open Questions
- Resolved 2026-04-28: preserving active identifiers plus running identifiers is sufficient for CO-406; a distinct no-run accepted count is not required.
- Resolved 2026-04-28: parent added the `/ui/data.json` agreement regression in `orchestrator/tests/ControlRuntime.test.ts` after reconciling the tests child-lane patch.

## Approvals
- Product: Linear CO-406, pending
- Engineering: docs-review / implementation review, pending
- Design: N/A
