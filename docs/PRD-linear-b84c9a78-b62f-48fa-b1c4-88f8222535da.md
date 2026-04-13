# PRD - CO: harden control-host supervise restart against orphaned duplicate host burn

## Added by Bootstrap 2026-04-12

## Traceability
- Linear issue: `CO-163` / `b84c9a78-b62f-48fa-b1c4-88f8222535da`
- Linear URL: https://linear.app/asabeko/issue/CO-163/co-harden-control-host-supervise-restart-against-orphaned-duplicate
- Related lanes:
  - `CO-118` / `linear-f0d312eb-055f-4926-80df-8fcaaf56839c`
  - `CO-152` / `linear-0d66d189-fc51-4054-80db-b6990858f33d`
  - `CO-157` / `linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf`
  - `CO-160` / `linear-95011595-52df-4ad8-9cb5-256e7eee5424`
  - `CO-162` / `linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d`

## Summary
- Problem Statement: after `provider_refresh_lifecycle_stuck` exceeded the 45s stuck threshold, `control-host supervise restart` launched a replacement control-host child but did not prove the prior supervised child tree was gone first. The orphaned prior host stayed alive, kept burning `dispatch_source_issue_by_id` reads, and forced an operator bootout to protect shared Linear budget.
- Desired Outcome: make supervised restart deterministically clear the prior control-host child tree before reporting success, keep duplicate-owner evidence explicit when restart races or orphaned owners exist, and stop a stuck refresh from continuing new issue-by-id reads once `restart_required=true` has already been established.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): harden the existing control-host ownership and supervision path so restart is safe under real stuck-refresh incidents. A supervised restart must not leave two control-hosts polling at once, must not require manual orphan cleanup as the normal path, and must not kill unrelated provider-linear-worker issue processes while cleaning the stuck host up.
- Success criteria / acceptance:
  - `control-host supervise restart` does not report success while the prior supervised control-host child is still alive
  - orphaned duplicate control-host evidence remains machine-checkable through owner-token/process diagnostics
  - once polling is already classified as `provider_refresh_lifecycle_stuck`, the same refresh pass stops doing new direct issue-by-id reads
  - deterministic regression coverage proves both restart cleanup and stuck-refresh abort behavior
  - operator-facing status/runbook guidance clearly distinguishes supervised control-host children from detached provider workers
- Constraints / non-goals:
  - do not widen into provider-worker review or merge workflow behavior
  - do not weaken ownership lock or max-allowed dispatch logic
  - do not hide lifecycle hangs by extending the timeout alone
  - do not make manual `pkill` or LaunchAgent bootout the normal recovery path

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `control-host supervise restart`
  - `orphaned duplicate control-host child`
  - `provider_refresh_lifecycle_stuck`
  - `dispatch_source_issue_by_id request burn`
  - `CO-152 regression`
  - `CO-118 rehydration timeout`
- Protected terms / exact artifact and surface names:
  - `control-host`
  - `provider-linear-worker`
  - `control-host-owner.json`
  - `control-host-duplicate-owner.json`
  - `provider_refresh_lifecycle_stuck`
  - `dispatch_source_issue_by_id`
  - `restart_required`
- Nearby wrong interpretations to reject:
  - "this is only a CO STATUS rendering issue"
  - "just increase the refresh timeout"
  - "this is only a rate-limit sizing problem"
  - "kill active provider-linear-worker issue processes during restart cleanup"

## Parity / Alignment Matrix
- Not a formal parity lane. Guardrail comparison for the restart/orphan follow-up:
- Current truth:
  - startup ownership already fails closed through `controlHostOwnership`, but `control-host supervise restart` itself only asks launchd to `kickstart -k` and does not verify the old supervised child is gone before reporting success
  - refresh stuck detection sets `restart_required=true`, but the active `providerIssueHandoff.poll(...)` loop can continue into later direct tracked-issue reads after the watchdog has already classified the lifecycle as stuck
  - operator status shows rollout and restart metadata, but safe restart evidence is not explicit enough about which pid is the supervised control-host child versus detached provider worker issue processes
- Reference truth:
  - restart should be a bounded control-host-tree replacement, not a best-effort request
  - once a refresh is already classified as stuck, no additional issue-by-id burn should happen from that same poll cycle
  - operator evidence should show exactly which control-host pid was replaced or rejected without implying worker cleanup
- Target truth / intended delta:
  - supervised restart waits for old child exit and force-cleans only the old control-host tree when launchd leaves it behind
  - poll/reconcile loops fail closed against a sticky stuck-abort signal before later direct issue reads or fresh discovery
  - status/runbook output makes the safe recovery path explicit and distinguishes supervised control-host pids from provider-worker issue runs
- Explicitly out-of-scope differences:
  - changing worker review/merge logic
  - changing request headroom or dispatch-cap rules
  - masking lifecycle hangs by changing the timeout budget alone

## Not Done If
- `control-host supervise restart` can still return `restarted` while the previous supervised child tree remains alive.
- An orphaned old control-host can keep making `dispatch_source_issue_by_id` reads after the replacement host starts.
- A stuck refresh keeps entering new direct issue reads after `restart_required=true`.
- Restart cleanup kills active provider-linear-worker issue processes as collateral.
- The only recovery documentation is still "manually kill the old pid."

## Goals
- Make supervised restart prove or enforce prior child-tree exit before returning success.
- Preserve and surface duplicate/stale owner-token and process evidence for restart-race incidents.
- Abort further stuck-refresh read burn once the lifecycle is already classified as stuck.
- Add focused regression coverage for orphan cleanup and stuck-refresh abort behavior.
- Clarify the operator recovery path in machine-readable status and the public runbook.

## Non-Goals
- Provider-worker review or merge-policy changes.
- Dispatch-budget or max-allowed policy redesign.
- Broader launchd replacement.
- Timeout-only masking of the stuck lifecycle.

## Stakeholders
- Product: CO operators protecting shared Linear budget during host incidents.
- Engineering: control-host supervision, ownership, polling, and provider-worker maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - restart success is only emitted after the prior supervised child pid is gone or force-cleaned
  - duplicate-owner artifacts retain owner token, pid, and path evidence for restart/orphan incidents
  - stuck refresh regressions show zero additional direct issue-by-id reads after the abort boundary
- Guardrails / Error Budgets:
  - cleanup must target only the old supervised control-host process tree
  - detached provider-linear-worker issue processes remain alive and unmodified
  - restart and stuck diagnostics remain distinct from request-budget throttling

## User Experience
- Personas:
  - local operator recovering a stuck LaunchAgent-managed control-host
  - reviewer validating that restart cleanup is narrow and worker-safe
  - provider worker owner inspecting duplicate-owner evidence after a restart race
- User Journeys:
  - a restart is requested while the old supervised child is wedged; the command waits, force-cleans only that child tree if needed, and reports which pid was replaced
  - the new host encounters an active old owner; duplicate-owner diagnostics show owner token/pid evidence rather than silently running both hosts
  - status/runbook guidance tells the operator which pid is the supervised host child and that detached provider workers are separate issue processes

## Technical Considerations
- Architectural Notes:
  - supervision restart should reuse the existing tracked child pid/state plus process-group cleanup helpers rather than inventing a second cleanup mechanism
  - the provider refresh loop needs a sticky abort seam that can be checked before later `resolveTrackedIssue(...)` or fresh-discovery calls once polling health is already stuck
  - operator evidence should stay additive and machine-readable
- Dependencies / Integrations:
  - `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
  - `orchestrator/src/cli/control/controlHostOwnership.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerPollingHealth.ts`
  - `docs/public/provider-onboarding.md`

## Open Questions
- Should `supervise restart` do one follow-up `kickstart -k` after forced orphan cleanup when the first replacement host already lost the ownership race, or is owner-artifact cleanup plus launchd's existing retry semantics enough for this lane?
- Should the operator-facing status note live only under `control-host supervise status`, or should `co-status` also include a short control-host child-vs-worker distinction in a follow-up?

## Approvals
- Product: Linear issue `CO-163`
- Engineering: audited docs-review fallback clean (`.runs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da-co-163-docs-review/cli/2026-04-12T15-55-23-100Z-6b52bdd3/manifest.json`)
- Design: N/A
