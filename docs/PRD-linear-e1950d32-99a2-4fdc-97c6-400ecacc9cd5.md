# PRD - CO Reconcile Terminal Provider-Worker Failures and Stale Intake Workpad State

## Added by Bootstrap 2026-03-25

## Traceability
- Linear issue: `CO-18` / `e1950d32-99a2-4fdc-97c6-400ecacc9cd5`
- Linear URL: https://linear.app/asabeko/issue/CO-18/co-reconcile-terminal-provider-worker-failures-and-stale-intakeworkpad

## Summary
- Problem Statement: a terminal provider-worker failure in the earlier `CO-16` lane did not reconcile across the control-host surfaces that operators actually use. The failed child run manifest ended `status: failed`, the matching `provider-linear-worker-proof.json` ended `owner_status: failed` with `end_reason: codex_exit_1`, but the persisted control-host intake claim stayed stale long enough to keep the issue looking actively owned and in the wrong workflow state until manual recovery merged PR `#294`.
- Desired Outcome: terminal provider-worker failures become authoritative across run manifests, provider-intake persistence, and Linear-facing workpad status so the next recovery attempt can start from truthful state without manual cleanup or ambiguous ownership.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-18` in this workspace by auditing the failed `CO-16` artifacts, fixing the provider/control-host reconciliation seams so failed autonomous lanes release or reclassify ownership truthfully, refreshing stale issue metadata before future dispatch decisions, and leaving operators with a truthful workpad/update trail instead of stale in-progress state.
- Success criteria / acceptance:
  - a terminal failed provider-worker run no longer leaves `provider-intake-state.json` claiming the issue is still `running`
  - persisted intake and subsequent dispatch/reconcile reads do not keep stale `Ready` or other outdated provider metadata after the failure
  - failure-side Linear/workpad output is truthful and recoverable
  - focused regressions cover manifest/proof failure reconciliation and control-host/provider rehydrate behavior
- Constraints / non-goals:
  - preserve healthy active-run ownership semantics and do not weaken delegation guard
  - keep the fix bounded to provider-worker/control-host reconciliation, truthful workpad handling, docs, and focused tests
  - record a delegation override for this provider-worker run because subagent spawning is unavailable without explicit user authorization in this session

## Goals
- Reconcile terminal provider-worker failure truth from authoritative run evidence instead of stale intake claim state.
- Refresh persisted issue metadata from live provider state or terminal run evidence before the next dispatch/recovery decision.
- Add a truthful failure-side Linear/workpad update path so autonomous failure is visible without reading raw manifests.
- Make restart/rehydrate behavior deterministic when a child provider-worker previously exited in terminal failure.

## Non-Goals
- Reworking unrelated review-wrapper behavior from `CO-16`.
- Weakening the delegation guard or broadening provider dispatch semantics beyond this reconciliation seam.
- Introducing generic tracker-write automation beyond the bounded failure-side workpad/update needed here.

## Stakeholders
- Product: CO operator / provider-lane owner
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - failed provider-worker runs are surfaced as non-running provider intake state on the next authoritative reconcile
  - control-host restart/refresh reads show current provider metadata rather than stale queued-state snapshots
  - operators can see the autonomous failure and blocker in the active workpad comment or equivalent failure-side update
- Guardrails / Error Budgets:
  - preserve current active/handoff/review lifecycle rules for healthy runs
  - keep the implementation minimal and auditable
  - stop coding once the issue reaches the live review-handoff state

## User Experience
- Personas: CO operator reading control-host status, persisted intake, and the Linear issue to decide whether recovery or manual action is needed
- User Journeys:
  - operator inspects a failed provider lane and immediately sees that the run failed, the intake claim is no longer `running`, and the workpad reflects the blocker
  - control host restarts after a failure and rebuilds a truthful claim state without depending on stale pre-failure intake metadata
  - a later retry/recovery run starts from refreshed provider metadata instead of stale `Ready` or stale active ownership

## Technical Considerations
- Architectural Notes:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` owns claim rehydrate/refresh/release/retry decisions
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts` owns terminal worker proof writing and is the most direct place to emit failure-side reconciliation signals
  - `orchestrator/src/cli/control/controlRuntime.ts` and related projection tests expose the stale provider-intake/read-model impact to operators
  - current control-host lifecycle already has refresh/rehydrate infrastructure that may be reusable instead of adding a new channel
- Dependencies / Integrations:
  - `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T07-52-01-619Z-c8fa582f/manifest.json`
  - `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T07-52-01-619Z-c8fa582f/provider-linear-worker-proof.json`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `/Users/kbediako/Code/symphony/SPEC.md`

## Open Questions
- Whether the failure-side Linear truthfulness should be limited to workpad refresh only or also include a bounded workflow-state mutation when the team exposes an explicit failure/rework state.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria
- Engineering: Pending docs-review + implementation validation
- Design: N/A

## Manifest Evidence
- Baseline audit: `out/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/manual/20260325T000000Z-baseline-audit.md`
