# PRD - Control host: reconcile resumed provider-worker retry acceptance and CO STATUS truth after a failed prior attempt

## Added by Docs Child Lane 2026-04-18

## Traceability
- Linear issue: `CO-222` / `8f8b9b94-41fe-46c3-93fc-0a2c28efc58c`
- Task id: `linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c`
- Canonical spec: `tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- Docs packet child lane manifest: `.runs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c-co222-docs-packet/cli/2026-04-17T16-32-33-651Z-8f6278d1/manifest.json`
- Source anchor: `ctx:sha256:6c2fdaf4cabe0fb0a183c2574b434ee4b063ceab0a04e0e592aad4c44d81b205#chunk:c000001`
- Source payload note: the expected shared `source-0` payload is not present in this child checkout; this packet is anchored on the protected issue wording from the bounded lane handoff and current repo seam names only.

## Summary
- Problem Statement: after a failed prior attempt, resumed provider-worker runs can diverge across retry acceptance, control-host refresh failure history, control-host intake, manifest/proof/summary truth reconciliation, and `CO STATUS`. When those surfaces disagree, a stale failed attempt can keep dominating acceptance or reporting even though the current resumed run should be authoritative.
- Desired Outcome: resumed provider-worker runs become authoritative across retry acceptance and read-model/reporting surfaces once current control-host intake plus current run evidence prove the resumed attempt is real, while failed prior attempt evidence remains preserved for audit instead of being silently deleted or allowed to dominate the current truth.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the docs-first packet for `CO-222` only, preserving the exact issue wording around resumed provider-worker runs, failed prior attempt, retry acceptance, control-host refresh failure history, control-host intake, `CO STATUS`, manifest/proof/summary truth reconciliation, and the parity matrix current/reference/target contract before the parent lane edits code or tests.
- Success criteria / acceptance:
  - resumed provider-worker runs have one authoritative current-truth contract after a failed prior attempt
  - retry acceptance follows current control-host intake and current run evidence instead of stale failed-attempt residue
  - control-host refresh failure history remains auditable but does not outrank current resumed-run truth
  - manifest/proof/summary truth reconciliation and `CO STATUS` prefer the same current authoritative attempt
  - the packet preserves an explicit parity matrix current/reference/target contract and explicit non-goals / not-done-if bullets before implementation
- Constraints / non-goals:
  - child lane owns only the declared docs packet, checklist mirrors, `tasks/index.json`, and `docs/TASKS.md`
  - parent lane owns the authoritative issue workspace, implementation, validation commands, Linear state, workpad refreshes, PR lifecycle, and merge
  - do not widen this child lane into source edits, test edits, or full repo validation

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `resumed provider-worker runs`
  - `failed prior attempt`
  - `retry acceptance`
  - `control-host refresh failure history`
  - `control-host intake`
  - `CO STATUS`
  - `manifest/proof/summary truth reconciliation`
  - `parity matrix current/reference/target contract`
- Protected terms / exact artifact and surface names:
  - `resumed provider-worker runs`
  - `failed prior attempt`
  - `retry acceptance`
  - `control-host refresh failure history`
  - `control-host intake`
  - `CO STATUS`
  - `manifest/proof/summary truth reconciliation`
  - `provider-intake-state.json`
  - `provider-linear-worker-proof.json`
  - `providerIssueHandoff.ts`
  - `controlRuntime.ts`
  - `selectedRunProjection.ts`
- Nearby wrong interpretations to reject:
  - this is a generic retry-queue redesign rather than a resumed provider-worker truth-reconciliation lane
  - this is only a `CO STATUS` presentation cleanup
  - this is only a control-host refresh-history cleanup with no retry-acceptance consequence
  - the fix can delete failed prior attempt evidence instead of reconciling it
  - manifest, proof, summary, control-host intake, and `CO STATUS` can keep using different precedence rules

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Resumed provider-worker runs | A failed prior attempt can continue to dominate the operator story even after a resumed run exists. | Current provider-worker truth should be able to supersede stale failed-attempt residue without erasing history. | Resumed provider-worker runs become the authoritative current attempt once current intake plus current run evidence prove the resumed lane is real. |
| Retry acceptance | Retry acceptance can be influenced by stale failed-attempt residue or stale refresh-history state. | Retry acceptance should follow the current authoritative attempt and current control-host intake. | Retry acceptance prefers current resumed-run truth and treats failed prior attempt evidence as historical context only. |
| Control-host refresh failure history | Historical refresh-failure evidence can linger and compete with current resumed-run state. | Refresh failure history should stay visible for audit without outranking newer authoritative truth. | Control-host refresh failure history is retained but explicitly demoted when the resumed run is current and authoritative. |
| Control-host intake | Control-host intake can preserve stale ownership or stale attempt framing long enough to confuse later reads. | Control-host intake should align with the current authoritative attempt. | Control-host intake reflects the resumed run once it is current, while preserving failed prior attempt evidence for audit. |
| Manifest/proof/summary truth reconciliation | Manifest, proof, and summary surfaces can disagree on which attempt is current. | Manifest/proof/summary truth reconciliation should choose one current authoritative attempt and keep historical evidence secondary. | Manifest/proof/summary truth reconciliation uses one precedence rule for the resumed run versus failed prior attempt. |
| `CO STATUS` | `CO STATUS` can report stale failed-attempt truth even when a resumed run is the current active truth. | `CO STATUS` should project the same current authoritative attempt selected by intake and run evidence. | `CO STATUS` reports the resumed provider-worker run as current once authoritative proof exists and does not regress to stale failed-attempt reporting. |

## Acceptance Criteria
- Docs packet and checklist mirrors exist for the declared `CO-222` files only.
- The packet preserves the exact issue wording around resumed provider-worker runs, failed prior attempt, retry acceptance, control-host refresh failure history, control-host intake, `CO STATUS`, and manifest/proof/summary truth reconciliation.
- Parent implementation can adopt one authoritative precedence rule for current resumed-run truth versus stale failed-attempt residue.
- Parent implementation scope is clearly bounded to reconciliation and precedence, not broad control-host or `CO STATUS` redesign.
- The parity matrix current/reference/target contract is explicit before implementation begins.

## Non-Goals
- No broad retry-queue or provider-worker lifecycle redesign outside the resumed-run versus failed-prior-attempt truth seam.
- No control-host intake architecture rewrite.
- No `CO STATUS` visual or layout redesign.
- No deletion of failed prior attempt manifest/proof/summary evidence as the fix.
- No widening into unrelated refresh-history or merge-closeout lanes.
- No implementation or test edits in this docs child lane.

## Not Done If
- Resumed provider-worker runs can still be rejected or misclassified because a failed prior attempt remains authoritative.
- Retry acceptance still follows stale failed-attempt residue instead of current control-host intake plus current run evidence.
- Control-host refresh failure history still outranks current resumed-run truth.
- Manifest/proof/summary truth reconciliation still leaves stale failed-attempt summary truth dominant over the current resumed run.
- `CO STATUS` still reports the failed prior attempt instead of the authoritative resumed provider-worker run.
- The packet omits the explicit parity matrix current/reference/target contract or drifts away from the protected issue wording.

## Stakeholders
- Product: CO operators depending on truthful retry acceptance and `CO STATUS` after a resumed provider-worker run.
- Engineering: control-host intake, provider-worker, and observability/read-model maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - one current-truth contract exists for resumed provider-worker runs after a failed prior attempt
  - retry acceptance, control-host intake, manifest/proof/summary truth reconciliation, and `CO STATUS` agree on the authoritative current attempt
  - failed prior attempt evidence stays inspectable without dominating current truth
- Guardrails / Error Budgets:
  - preserve audit visibility of failed prior attempt evidence
  - keep the implementation bounded to precedence/truth reconciliation
  - do not widen into control-host or `CO STATUS` redesign

## User Experience
- Personas: CO operator reading retry state, control-host intake, and `CO STATUS` after a resumed provider-worker run.
- User Journeys:
  - operator sees a resumed provider-worker run after a failed prior attempt and can tell which attempt is current
  - operator reads retry acceptance or `CO STATUS` and sees the same authoritative current attempt
  - operator can still inspect failed prior attempt evidence without it corrupting current reporting

## Technical Considerations
- Architectural Notes:
  - likely authority seams are `providerIssueHandoff.ts` for retry acceptance and control-host intake reconciliation
  - `providerLinearWorkerRunner.ts` and `provider-linear-worker-proof.json` are the likely proof-writing and summary-authority surfaces
  - `selectedRunProjection.ts`, `providerIssueObservability.ts`, and `controlRuntime.ts` likely shape the `CO STATUS` / read-model side of manifest/proof/summary truth reconciliation
  - the smallest correct fix is one precedence rule reused across write-side and read-side surfaces instead of multiple ad hoc overrides
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`

## Open Questions
- Which single seam should own the authoritative precedence rule between failed prior attempt evidence and current resumed-run truth?
- Should control-host refresh failure history be demoted at write time, read time, or through one shared helper used by both?
- Which artifact fields are minimally required so manifest/proof/summary truth reconciliation can stay deterministic across resumed runs?

## Validation Contract
- Parent lane runs focused regressions only, likely in `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`, `ProviderIssueHandoff.test.ts`, `ProviderLinearWorkerRunner.test.ts`, `SelectedRunProjection.test.ts`, `ProviderIssueObservability.test.ts`, `CompatibilityIssuePresenter.test.ts`, and `ControlRuntime.test.ts` as needed by the final seam choice.
- Child lane runs only scoped docs checks: JSON parse for `tasks/index.json`, protected-term grep over the touched packet files, and `git diff --check` over the declared docs scope.
