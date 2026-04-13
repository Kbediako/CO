# PRD - CO workflow: make parent-owned same-issue child lanes parallel-first by default where safe

## Traceability
- Linear issue: `CO-174` / `3cdd7af3-787e-4e73-bb00-731feb5d0db2`
- Linear URL: https://linear.app/asabeko/issue/CO-174/co-workflow-make-parent-owned-same-issue-child-lanes-parallel-first-by
- Reference issues: `CO-35`, `CO-101`, `CO-125`
- Audit baseline: `235` recorded decisions; `parallelize_now=5`, `stay_serial=161`, `forbid_parallel=69`

## Summary
- `CO-35` and `CO-101` prove the child-lane runtime and decision recording work, but ordinary provider-worker adoption is still mostly serial. The gap is policy and evidence, not runtime availability.
- Ordinary active turns should start parallel-first where safe: record the pre-turn decomposition matrix, reject `stay_serial` while a safe candidate exists, honor the child-lane cap, and preserve parent ownership until accept/reject/invalidate.

## User Request Translation (Context Anchor)
- Intent: make parent-owned same-issue child-lane parallelization the ordinary safe default without unsafe splits, admission bypasses, or weakened parent acceptance.
- Success: matrix before `linear parallelization`; `stay_serial` only when no safe candidate exists; cap counts active/pending/unaccepted lanes; parent avoids delegated scope until accept/reject/invalidate; shaped canary beats `5/235` without metric-only lanes.
- Constraints: do not rebuild `CO-35`/`CO-101`, force every issue parallel, exceed `CO-125`, launch metric-hack lanes, or weaken parent-only Linear mutation.

## Intent Checksum
- Preserve: `parent-owned same-issue child-lane parallelization`, `pre-turn decomposition matrix`, `child-lane cap`, `parent ownership discipline`, `shaped canary`.
- Protected surfaces: `linear parallelization --decision parallelize_now|stay_serial|forbid_parallel`, `linear child-lane --action launch|accept|reject|invalidate`, `parallelize_now`, `stay_serial`, `forbid_parallel`, `independent_scope_available`.
- Reject: runtime rebuilds, unconditional parallelization, broad `single_bounded_change` without docs/test/research/review separation proof, admission bypasses, and parent edits to active delegated scope followed by unqualified acceptance.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Decision posture | One explicit decision per active turn exists, but audit shows only `5/235` `parallelize_now` decisions. | User wants parent-owned same-issue child lanes adopted as the main safe mode. | Every eligible turn starts by actively looking for safe child lanes before choosing serial mode. |
| Serial evidence | `stay_serial` reasons can be broad, especially `single_bounded_change`. | Serial mode should be an evidence-backed exception. | `stay_serial` is rejected unless the matrix proves no safe independent child lane exists. |
| Child-lane bounds | Runtime supports launch, accept, reject, and invalidate. | Parallel-first still needs bounded resource use. | A cap counts active, pending, and unaccepted child lanes; cap exhaustion is explicit and cannot bypass `CO-125`. |
| Parent ownership | Parent authority exists, but delegated-file restraint is not first-class in the ordinary prompt/policy. | Parent owns the issue; child lanes own bounded slices. | Parent avoids delegated files/phases while a child lane is active, except to invalidate/reject or resolve explicit collision. |
| Adoption proof | Baseline is `parallelize_now=5`, `stay_serial=161`, `forbid_parallel=69`. | Adoption should increase only where safe. | A shaped canary demonstrates higher safe `parallelize_now` adoption and no metric-only child work. |

## Not Done If
- A provider worker can choose `stay_serial` while the matrix contains a safe independent candidate, or `single_bounded_change` lacks docs/test/research/review separation proof.
- Cap exhaustion is silent or bypasses `CO-125`; parent prompt/docs allow active delegated-scope edits; canary counts child lanes without accepted/rejected/invalidated outcome reasons.

## Goals
- Make parallel-first policy discoverable, require matrix-backed serial exceptions/cap evidence, and codify parent restraint plus shaped canary adoption proof.

## Non-Goals
- Do not reopen `CO-35`/`CO-101`, transition live issues in the canary, add scheduler-wide orchestration, or penalize truthful `forbid_parallel` decisions.

## Stakeholders
- CO operators and provider-worker, child-lane, control-host, and Linear workflow maintainers.

## Metrics & Guardrails
- Success: shaped canary `parallelize_now` rate exceeds `5/235`; every launched lane has an accepted/rejected/invalidated outcome reason; `stay_serial` cases cite a matrix with no safe candidate.
- Guardrails: preserve parent-only Linear mutation, parent acceptance authority, truthful `forbid_parallel`, `CO-125` admission constraints, and bounded policy/help/test/canary scope.

## User Experience
- Personas: parent provider worker, operator auditor, reviewer checking useful child work.
- Journeys: matrix finds an independent slice and launches `parallelize_now`; matrix proves no separable slice and records precise `stay_serial`; cap exhaustion records explicit serial/no-go evidence without exceeding admission constraints.

## Technical Considerations
- Architecture: keep policy in provider-worker guidance/docs, derive cap accounting from child-lane ledger status, and make canary reporting deterministic/file-backed without live issue mutation.
- Dependencies: `providerLinearWorkerRunner.ts`, `providerLinearChildLaneShell.ts`, `linearCliShell.ts`, focused tests, and `skills/linear/SKILL.md`.

## Open Questions
- Resolved: the canary uses bounded fixture/scenario inputs, not live issue transitions or metric-only child lanes.

## Approvals
- Product: self-approved from Linear issue `CO-174`; Engineering: pending docs-review.
