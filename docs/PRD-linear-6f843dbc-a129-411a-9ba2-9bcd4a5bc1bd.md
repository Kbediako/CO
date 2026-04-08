# PRD - CO: Make ordinary eligible provider-worker issues actually leverage parent-owned same-issue child-lane parallelisation

## Traceability
- Linear issue: `CO-101` / `6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd`
- Linear URL: https://linear.app/asabeko/issue/CO-101/co-make-ordinary-eligible-provider-worker-issues-actually-leverage
- Source issue: `CO-35` / `271cbab4-de28-4847-a468-128df007c4a0`
- Required reused contracts: `CO-52`, `CO-56`, `CO-68`, `CO-82`

## Summary
- Problem Statement: `CO-35` landed truthful parent-owned same-issue child-lane runtime, but ordinary `provider-linear-worker` execution still treats same-issue child-lane parallelisation as optional prompt advice. Later ordinary worker proofs still finish with `child_lanes: []` and no explicit explanation, so the capability stays latent in practice.
- Desired Outcome: ordinary provider-worker execution must record a machine-checkable child-lane eligibility decision, must actually launch a bounded same-issue child lane when the decision is `parallelize_now`, and must persist an explicit serial or no-go reason when the decision is `stay_serial` or `forbid_parallel`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): turn parent-owned same-issue child-lane parallelisation into a normal ordinary-worker behavior instead of a latent capability. Reuse the existing child-lane runtime, phase verification, delegation evidence, parsing, and observability slices instead of rebuilding them.
- Success criteria / acceptance:
  - one explicit ordinary-worker eligibility contract exists: `parallelize_now`, `stay_serial`, or `forbid_parallel`
  - the reason is machine-checkable and visible in existing proof or debug surfaces
  - `parallelize_now` means the parent actually launched at least one same-issue child lane
  - at least one non-`CO-35` proof or replay shows successful ordinary adoption
  - at least one proof or replay shows the explicit serial or no-go path
- Constraints / non-goals:
  - do not reopen `CO-35` architecture or generic scheduler-wide parallelism
  - do not duplicate `CO-52`, `CO-56`, `CO-68`, or `CO-82`
  - do not solve this with prompt wording alone

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider-linear-worker`
  - `ordinary eligible issues`
  - `same-issue child-lane parallelisation`
  - `machine-checkable eligibility decision`
- Protected terms / exact artifact and surface names:
  - `linear child-lane --action launch|accept|reject|invalidate`
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-child-lanes.json`
  - `child_lanes`
  - `provider_debug_snapshot`
- Nearby wrong interpretations to reject:
  - just improve the prompt wording
  - prove child lanes again only on `CO-35`
  - parallelize every issue by default
  - split heuristics, observability, and usage policy into multiple follow-up issues
  - treat silent `child_lanes: []` as sufficient operator judgment

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Ordinary provider-worker contract | prompt says child lanes are optional "when the issue benefits" | `CO-35` already proved parent-owned same-issue child lanes can launch, return patches, and stay parent-owned | ordinary worker records one explicit decision per active turn and either launches a child lane or persists a serial/no-go reason |
| `provider-linear-worker-proof.json` | `child_lanes: []` can mean "not beneficial", "forgot to parallelize", or "never evaluated" | `CO-82` already uses proof plus `provider_debug_snapshot` as authoritative debug surfaces | proof exposes the current decision and reason so `child_lanes: []` is explicit rather than silent |
| `provider_debug_snapshot` | child-lane absence is not classified | `CO-82` already projects provider proof into control-host debug surfaces | debug snapshot exposes the same decision, reason, and recorded child-lane count |
| Ordinary proof coverage | only the `CO-35` proof run shows non-empty child lanes | `CO-35` demonstrated the runtime, `CO-52` verified phase scope, `CO-56` reconciled delegation evidence, `CO-68` hardened parsing | at least one non-`CO-35` ordinary proof or replay shows `parallelize_now`, and another shows explicit serial/no-go |

## Not Done If
- The worker still only suggests child-lane use in prompt text but does not make and persist an eligibility decision.
- Ordinary eligible runs can still complete with `child_lanes: []` and no explicit reason.
- The implementation proves only isolated `CO-35` child-lane behavior instead of ordinary worker adoption.
- The fix expands into multiple narrower follow-up issues instead of landing the bounded adoption contract.
- `child_lanes: []` remains ambiguous in proof or debug surfaces.

## Goals
- Add one explicit repo-local ordinary-worker child-lane eligibility decision contract with bounded reason codes.
- Keep the source of truth inside existing proof and debug surfaces so operators can audit adoption or non-adoption without a new artifact family.
- Fail closed when the parent says `parallelize_now` but never launches a child lane.
- Prove both the parallel and serial/no-go paths with focused regressions plus ordinary-worker replay evidence.

## Non-Goals
- Reopening `CO-35` runtime architecture, child-lane authority, or generic scheduler-wide parallelism.
- Duplicating `CO-52` phase-scope verification, `CO-56` delegation evidence reconciliation, `CO-68` parsing work, or `CO-82` observability-model work.
- Forcing parallelisation for trivial, overlapping-scope, review-only, or otherwise clearly non-beneficial issues.
- Weakening parent-only Linear mutation, explicit parent acceptance, or existing child-lane trust boundaries.

## Stakeholders
- Product: CO operators depending on ordinary unattended issue throughput and truthful artifacts
- Engineering: provider-worker, child-lane, and control-host observability maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - ordinary-worker proof exposes a non-null eligibility decision for active execution turns
  - `parallelize_now` turns record at least one launched child lane
  - serial/no-go turns expose an explicit reason code instead of silent `child_lanes: []`
- Guardrails / Error Budgets:
  - preserve parent-only Linear mutation and explicit child-lane acceptance flow
  - preserve existing phase-scope verification, delegation evidence, parsing, and observability behavior
  - keep the change bounded to ordinary adoption, proof/debug truth, and focused regressions

## User Experience
- Personas:
  - provider worker parent choosing whether to split work
  - operator auditing why an issue stayed serial
  - reviewer confirming same-issue parallelisation is real in ordinary execution
- User Journeys:
  - the parent records `parallelize_now`, launches a bounded child lane, and later accepts or rejects the patch
  - the parent records `stay_serial` because the remaining scope is a single bounded change or overlaps existing work
  - the parent records `forbid_parallel` because the current phase is parent-only mutation, merge, review handoff, or dependency-blocked

## Technical Considerations
- Architectural Notes:
  - the ordinary-worker contract should live on the parent provider-worker path, not in isolated child-lane demos
  - the structured decision should be reconstructed from existing sanctioned worker artifacts so live proof refreshes do not lose it
  - control-host debug surfaces should project the same decision without adding a separate reader-specific contract
- Dependencies / Integrations:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/LinearCliShell.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts`

## Open Questions
- Resolved in planning: this lane will use one bounded decision contract plus explicit reason codes instead of trying to auto-heuristic every issue in the runner without worker judgment.

## Approvals
- Product: self-approved from the Linear issue scope
- Engineering: pending `docs-review`
- Design: N/A
