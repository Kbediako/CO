# PRD - CO: re-enforce CO-185 provider-helper preflight guarantees in live worker attempts

## Traceability
- Linear issue: `CO-306` / `0297d59b-66c3-4bfe-b019-fe2fa423063d`
- Linear URL: `https://linear.app/asabeko/issue/CO-306/co-re-enforce-co-185-provider-helper-preflight-guarantees-in-live`
- Source issue: `CO-185` / `9a54c7d8-518f-4452-95aa-c5852008b38d`
- Canonical registry task id: `20260422-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d`
- Shared source 0 anchor: `ctx:sha256:da29a2b000e92976ef06ef6b0d4b5b0ac127ead95990269b2208338853a8b988#chunk:c000001`
- Source object id: `sha256:da29a2b000e92976ef06ef6b0d4b5b0ac127ead95990269b2208338853a8b988`
- Handoff source payload: `../../.runs/linear-0297d59b-66c3-4bfe-b019-fe2fa423063d/cli/2026-04-22T07-58-27-272Z-b8b8cfb3/memory/source-0/source.txt`
- Issue body source: read-only Linear issue fetch for `CO-306` on 2026-04-22
- Parent lane ownership: authoritative issue workspace, Linear state, workpad, registry mirrors, implementation, validation, PR lifecycle, and patch acceptance

## Summary
- Problem Statement: live Apr 22 provider-worker runs still hit the exact helper-preflight failure modes `CO-185` claimed to contain. `CO-295` still shows repeated `provider_worker_child_lane_parent_dirty` failures and invalidation churn, while `CO-299` and `CO-302` still show repeated same-attempt `linear_follow_up_parity_matrix_missing` failures. The live provider-worker path is therefore regressed or not actually leveraging the `CO-185` guarantees.
- Desired Outcome: restore the `CO-185` helper-preflight guarantees in the live provider-worker path so deterministic parity-follow-up failures and parent-dirty child-lane launches do not recur across a single attempt, while keeping parity-matrix enforcement and clean-parent checks fail-closed.

## User Request Translation (Context Anchor)
- User intent / needs: re-audit and restore the `CO-185` helper-preflight guarantees in the live provider-worker path using Apr 22 evidence from `CO-295`, `CO-299`, and `CO-302`.
- Success criteria / acceptance: preserve the live issue wording around repeated same-attempt `linear_follow_up_parity_matrix_missing` failures, repeated `provider_worker_child_lane_parent_dirty` failures, deterministic sequencing/guidance, fail-closed parity-matrix and clean-parent contracts, focused regression coverage, and the bounded follow-up scope.
- Constraints / non-goals: do not weaken parity-matrix enforcement, do not weaken clean-parent checks, do not broaden into the unrelated scope of `CO-295`, `CO-299`, or `CO-302`, and do not redesign scheduler/dispatch/concurrency policy beyond what is needed to restore the live `CO-185` guarantee.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `re-enforce CO-185 provider-helper preflight guarantees in live worker attempts`
  - `provider_worker_child_lane_parent_dirty`
  - `linear_follow_up_parity_matrix_missing`
  - `provider truth/prompting/retry suppression`
  - `live provider-worker path`
  - `deterministic sequencing/guidance`
  - `fail-closed parity-matrix and clean-parent contracts`
  - `CO-295`
  - `CO-299`
  - `CO-302`
- Protected terms / exact artifact and surface names:
  - `CO-185`
  - `CO-295`
  - `CO-299`
  - `CO-302`
  - `provider_worker_child_lane_parent_dirty`
  - `linear_follow_up_parity_matrix_missing`
  - `provider-linear-worker-linear-audit.jsonl`
  - `provider-linear-worker-proof.json`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearChildLanePhaseContract.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `ProviderLinearWorkerRunner.test.ts`
  - `ProviderLinearChildLaneShell.test.ts`
  - `ProviderLinearWorkflowFacade.test.ts`
- Nearby wrong interpretations to reject:
  - weakening parity-matrix enforcement
  - weakening clean-parent child-lane safety checks
  - broadening active issue scopes beyond the helper-preflight guarantee gap
  - solving all of `CO-295`, `CO-299`, or `CO-302` instead of extracting only the shared failure mode
  - redesigning scheduler, dispatch, or concurrency policy beyond what is needed to restore the `CO-185` guarantees
  - treating docs registration as sufficient closure without focused regression coverage

## Existing Issue Accounting / Dedupe
- `CO-185` is the source contract. `CO-306` is a follow-up restore/re-audit lane for the live provider-worker path, not a rewrite of the original issue.
- `CO-295` is broader PR-attachment ownership work. `CO-306` only uses its repeated `provider_worker_child_lane_parent_dirty` failures and invalidation churn as evidence that the helper-preflight guarantee is not holding live.
- `CO-299` is broader Node OOM and provenance-invalid retry churn work. `CO-306` only uses its repeated same-attempt `linear_follow_up_parity_matrix_missing` failures and parent-dirty child-lane launch failures as evidence.
- `CO-302` is broader stale-blocker metadata work. `CO-306` only uses its repeated same-attempt `linear_follow_up_parity_matrix_missing` failures as evidence that the live retry path still reissues deterministic parity-follow-up mutations.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Same-attempt parity follow-up retries | `CO-299` and `CO-302` still show repeated same-attempt `linear_follow_up_parity_matrix_missing` failures inside one live run. | `CO-185` intended guarantee: parity/alignment follow-ups fail once and unchanged same-attempt retries are suppressed unless inputs materially change. | The live provider-worker path suppresses unchanged retries after the first deterministic failure without weakening parity-matrix enforcement. |
| Parent-dirty child-lane launch recovery | `CO-295` and `CO-299` still show `provider_worker_child_lane_parent_dirty` failures and churn inside the same live attempt. | `CO-185` intended guarantee: clean-parent checks remain authoritative, but the worker gets deterministic sequencing/recovery guidance. | Parent-dirty situations converge via sequencing/guidance instead of recurring failed launches. |
| Live leverage of helper-preflight truth | Current live attempts suggest the provider-worker prompt/truth/retry path is not actually carrying the `CO-185` guarantee forward. | A deterministic helper failure should materially change the next step in the same attempt. | The first deterministic failure alters same-attempt guidance and retry behavior in the live provider-worker path. |
| Guardrail preservation | Fix pressure could encourage bypassing fail-closed checks to stop churn. | Parity-matrix and clean-parent contracts remain authoritative. | Guarantees are restored without weakening parity-matrix enforcement, clean-parent safety checks, or broadening scheduler/dispatch scope. |

## Not Done If
- A single provider-worker attempt can still emit repeated `linear_follow_up_parity_matrix_missing` failures without materially changed inputs.
- Parent-dirty child-lane launch failures can still recur in the same attempt without deterministic recovery or sequencing guidance that prevents repeated failed launches.
- The live provider-worker path still does not carry forward the `CO-185` helper-preflight truth after the first deterministic failure.
- The fix weakens parity-matrix enforcement, clean-parent checks, or broadens scheduler/dispatch/concurrency scope beyond what is needed to restore the guarantee.

## Goals
- Reproduce the Apr 22 live failure shapes from `CO-295`, `CO-299`, and `CO-302` using audit evidence and isolate why `CO-185` did not hold.
- Restore or add provider truth/prompting suppression so a deterministic `linear_follow_up_parity_matrix_missing` failure cannot be retried unchanged within the same attempt.
- Restore or add deterministic parent-dirty guidance/sequencing so repeated `provider_worker_child_lane_parent_dirty` launch failures do not recur in the same attempt.
- Add regression coverage proving both guarantees hold in the current provider-worker path.
- Preserve fail-closed parity-matrix and clean-parent contracts while reducing retry churn.

## Non-Goals
- Do not weaken parity-matrix enforcement.
- Do not weaken clean-parent child-lane safety checks.
- Do not broaden active issue scopes beyond the helper-preflight guarantee gap shared across `CO-295`, `CO-299`, and `CO-302`.
- Do not redesign scheduler, dispatch, or concurrency policy beyond what is needed to restore the `CO-185` guarantees.
- Do not treat docs-only registration or review as a substitute for implementation and focused regression coverage.

## Stakeholders
- Product: CO workflow operator and Linear issue owner.
- Engineering: provider-worker, child-lane, follow-up, truth/proof, and test maintainers.
- Review: parent lane, docs-review, implementation-gate, and PR reviewers.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics: live failure reproduction is isolated to a bounded helper-preflight gap; same-attempt parity-follow-up churn stops after the first deterministic failure; parent-dirty launches converge via deterministic guidance instead of repeated failed launches; parent regression coverage proves both guarantees on the current worker path.
- Guardrails / Error Budgets: zero weakening of parity-matrix enforcement, zero weakening of clean-parent checks, zero broadening of scheduler/dispatch scope, and zero hidden deterministic failures.

## User Experience
- Personas: provider worker, parent lane operator, reviewer auditing live provider proof, and maintainers of the provider helper surfaces.
- User Journeys: a live provider-worker attempt hits the first deterministic failure once, the next same-attempt step is guided by remembered helper truth, repeated bad launches/mutations do not recur, and reviewers can verify the restored behavior from focused regression evidence.

## Technical Considerations
- Architectural Notes: likely implementation spans provider worker prompting, provider truth/retry memory, child-lane launch guidance, follow-up helper failure classification, and focused regression coverage.
- Dependencies / Integrations: the `CO-185` packet as the reference contract, live audit/proof artifacts from `CO-295`, `CO-299`, and `CO-302`, and the existing provider worker/child-lane/follow-up seams.
- Target surfaces from the issue family: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`, `orchestrator/src/cli/providerLinearChildLaneShell.ts`, `orchestrator/src/cli/providerLinearChildLanePhaseContract.ts`, `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, plus focused tests such as `ProviderLinearWorkerRunner.test.ts`, `ProviderLinearChildLaneShell.test.ts`, and `ProviderLinearWorkflowFacade.test.ts`.

## Acceptance Criteria
- [ ] Reproduce the Apr 22 live failure shapes from `CO-295`, `CO-299`, and `CO-302` using audit evidence and isolate why `CO-185` did not hold.
- [ ] Restore or add provider truth/prompting suppression so a deterministic `linear_follow_up_parity_matrix_missing` failure cannot be retried unchanged within the same attempt.
- [ ] Restore or add deterministic parent-dirty guidance/sequencing so repeated `provider_worker_child_lane_parent_dirty` launch failures do not recur in the same attempt.
- [ ] Add regression coverage proving both guarantees hold in the current provider-worker path.
- [ ] Preserve fail-closed parity-matrix and clean-parent contracts while reducing retry churn.

## Open Questions
- Which live seam lost the `CO-185` guarantee: prompt text, provider truth, follow-up helper classification, child-lane launch guidance, or a combination?
- Does same-attempt suppression need new structured proof/audit fields, or can the current provider-worker truth surface carry the needed state?
- Should parent-dirty recovery live primarily in provider guidance, child-lane shell feedback, or both?

## Approvals
- Product: self-approved from the live `CO-306` issue text.
- Engineering: pending pre-implementation docs review and parent implementation review.
- Design: not applicable.
