# PRD - CO: make linear transition race-safe with expected-state/CAS semantics and expected updated_at

## Added by Docs Child Lane 2026-04-17

## Traceability
- Linear issue: `CO-215` / `5de4b04b-ec1e-4ab5-b75a-270989af4599`
- Linear URL: https://linear.app/asabeko/issue/CO-215
- Task id: `linear-5de4b04b-ec1e-4ab5-b75a-270989af4599`
- Related lanes:
  - `CO-212` / `31794e73-bc33-44b7-96d0-41334119a038`
  - `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
  - `CO-140` / `97d69ad8-ba75-432f-b8b2-21ca83754325`
- Source anchor: `ctx:sha256:2ac878f3d195fac62c08cd13c1747e33d4960f3aa5ec0484caee93b20cb2a167#chunk:c000001`
- Source object id: `sha256:2ac878f3d195fac62c08cd13c1747e33d4960f3aa5ec0484caee93b20cb2a167`
- Expected source payload: `../../.runs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599/cli/2026-04-17T09-12-09-997Z-af2c6e14/memory/source-0/source.txt`
- Origin manifest: `../../.runs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599/cli/2026-04-17T09-12-09-997Z-af2c6e14/manifest.json`
- Source payload note: the expected shared source-0 payload from the original worker-run manifest is absent in this child checkout, so this packet is anchored on the protected issue wording plus current repo truth from `providerLinearWorkflowFacade.ts`, `linearCliShell.ts`, `providerLinearWorkflowStates.ts`, and `providerMergeCloseout.ts`.

## Summary
- Problem Statement: `CO-212` landed in merged `PR #507`, but current `linear transition` still accepts only a target state and does not expose expected-state/CAS semantics, expected updated_at, or a `--force` path with explicit force reason and richer audit output. `providerLinearWorkflowStates.ts` already classifies `done` and `state_type=completed` as terminal/completed workflow type, while `providerMergeCloseout.ts` already owns `In Review -> Merging` and `Merging -> Done`, so a stale reader can still create a `Done -> Merging race` unless the transition seam itself becomes compare-and-set aware.
- Desired Outcome: add a narrow `linear transition` contract that carries expected-state/CAS semantics, expected updated_at, terminal/completed workflow type guards, and explicit `--force` override with force reason plus audit output, without broadening merge-closeout or workflow-state semantics.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the docs-first packet and registry/checklist mirrors for `CO-215`, preserving the exact `linear transition` race-safety contract before the parent lane edits source or tests.
- Success criteria / acceptance:
  - `linear transition` can express expected-state/CAS semantics and expected updated_at, rather than only target state
  - stale `In Review -> Merging` and `Merging -> Done` callers fail closed when the live issue already moved elsewhere, including terminal/completed workflow type
  - the explicit `Done -> Merging race` is prevented unless a caller deliberately uses `--force`
  - any forced override requires a force reason and records it in audit output
  - `providerMergeCloseout.ts` and the transition helper share one truthful race-guard contract instead of ad hoc caller-specific checks
  - focused validation covers normal `In Review -> Merging`, normal `Merging -> Done`, stale `Done -> Merging race`, and forced override behavior
- Constraints / non-goals:
  - child lane owns only the docs packet and listed registry/checklist mirrors
  - parent owns authoritative source inspection, implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge
  - keep `CO-212` / `PR #507` scope intact; this is a follow-on race-guard lane, not a reclaim-policy rewrite

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `linear transition`
  - `expected-state/CAS semantics`
  - `expected updated_at`
  - `terminal/completed workflow type`
  - `Done -> Merging race`
  - `In Review -> Merging`
  - `Merging -> Done`
  - `--force`
  - `force reason`
  - `audit output`
  - `CO-212`
  - `PR #507`
- Protected terms / exact artifact and surface names:
  - `providerLinearWorkflowFacade.ts`
  - `linearCliShell.ts`
  - `providerLinearWorkflowStates.ts`
  - `providerMergeCloseout.ts`
  - `linear transition`
  - `expected-state/CAS semantics`
  - `expected updated_at`
  - `terminal/completed workflow type`
  - `Done -> Merging race`
  - `In Review -> Merging`
  - `Merging -> Done`
  - `--force`
  - `force reason`
  - `audit output`
- Nearby wrong interpretations to reject:
  - this is a generic workflow-state redesign rather than a bounded transition guard
  - this should be solved by weakening `providerMergeCloseout.ts` or silently tolerating stale `Done -> Merging` writes
  - this is only a CLI help-text or audit formatting cleanup
  - `--force` can bypass the guard without an explicit force reason or durable audit output
  - this docs child lane should touch implementation or tests

## Parity / Alignment Matrix

| Surface | Current Truth | Target Truth |
| --- | --- | --- |
| `linear transition` | `linearCliShell.ts` forwards only target `--state`, and `providerLinearWorkflowFacade.ts` transitions after summary reads without expected-state/CAS semantics or expected updated_at. | `linear transition` can carry expected-state/CAS semantics and expected updated_at so stale callers fail closed. |
| Terminal guard | `providerLinearWorkflowStates.ts` already classifies `done` and `state_type=completed` as terminal/completed workflow type, but transition does not currently use that truth as a compare-and-set guard. | transition rejects stale writes when live issue truth is already terminal/completed workflow type unless the caller deliberately uses `--force`. |
| `In Review -> Merging` | `providerMergeCloseout.ts` can promote a review handoff into `Merging`, but the shared transition seam cannot assert what the caller expected to still be true. | review promotion threads expected-state/CAS semantics and expected updated_at through the shared transition helper. |
| `Merging -> Done` | merge closeout transitions to `Done`, but the transition seam cannot assert the caller still owns the same live state/update boundary it inspected earlier. | merge closeout threads the same race-safe transition contract instead of relying on timing. |
| `Done -> Merging race` | a stale promotion attempt can still try to move a just-completed issue back into `Merging` because transition only knows the target state. | the stale `Done -> Merging race` fails closed by default and is only bypassable with `--force` plus force reason. |
| `audit output` | transition audit output records operation, success, action, and resulting state, but not requested expectations, observed mismatch, or force reason. | audit output records expected-state/CAS semantics, expected updated_at, observed state/state type/updated_at, `--force` usage, and force reason. |

## Goals
- Make `linear transition` race-safe with expected-state/CAS semantics and expected updated_at.
- Reuse existing terminal/completed workflow type truth from `providerLinearWorkflowStates.ts` instead of inventing a second lifecycle classifier.
- Keep `providerMergeCloseout.ts` on one truthful transition contract for both `In Review -> Merging` and `Merging -> Done`.
- Require explicit `--force` plus force reason when a caller deliberately bypasses the guard.
- Expand audit output so stale-write refusals and forced overrides are machine-checkable.

## Non-Goals
- Rewriting provider workflow-state normalization outside the transition guard.
- Changing `CO-212` reclaim semantics or reopening `PR #507`.
- Weakening existing merge-closeout safety or review-handoff truth.
- Making `--force` the default path.
- Implementation or test edits in this docs child lane.

## Not Done If
- `linear transition` still accepts only target state with no expected-state/CAS semantics or expected updated_at.
- A stale `Done -> Merging race` can still move a just-completed issue back into `Merging` without an explicit `--force`.
- `--force` exists without mandatory force reason and durable audit output.
- `In Review -> Merging` and `Merging -> Done` still rely on divergent, caller-specific race checks instead of one shared transition contract.

## Stakeholders
- Product: CO operators who expect post-`CO-212` lifecycle truth to stay consistent under concurrent transition attempts.
- Engineering: maintainers of `providerLinearWorkflowFacade.ts`, `linearCliShell.ts`, `providerLinearWorkflowStates.ts`, and `providerMergeCloseout.ts`.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - stale transition attempts fail closed with actionable mismatch truth
  - `In Review -> Merging` and `Merging -> Done` continue to work when expectations still match
  - forced overrides remain explicit and auditable
  - `CO-212` / `PR #507` reclaim truth remains unaffected
- Guardrails / Error Budgets:
  - preserve existing workflow-state classification semantics
  - preserve current merge-closeout behavior when the live issue still matches expectations
  - preserve a machine-checkable audit trail for both mismatch and force paths
  - never hide a stale-write race behind a silent noop

## User Experience
- Personas:
  - operator debugging why a transition was refused after the issue moved again
  - maintainer tracing a stale `Done -> Merging race` after merge closeout or review promotion
- User Journeys:
  - a normal `In Review -> Merging` promotion succeeds because expected-state/CAS semantics and expected updated_at still match the live issue
  - a normal `Merging -> Done` closeout succeeds under the same contract
  - a stale post-closeout `Done -> Merging race` is refused with concrete audit output
  - an operator deliberately overrides the guard with `--force`, records a force reason, and leaves a durable audit trail

## Technical Considerations
- Architectural Notes:
  - `linearCliShell.ts` currently exposes only target-state transition flags, so the CLI surface itself needs the new guard inputs
  - `providerLinearWorkflowFacade.ts` already owns the actual transition read/refresh/write sequence, so compare-and-set enforcement belongs there
  - `providerLinearWorkflowStates.ts` already owns terminal/completed workflow type truth and should remain the source of that classification
  - `providerMergeCloseout.ts` already owns `In Review -> Merging` and `Merging -> Done`, so it should thread the new transition guard rather than re-implement it
- Dependencies / Integrations:
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/tests/LinearCliShell.test.ts`
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`

## Open Questions
- Should the transition helper reject on expected-state mismatch before or after re-reading a stale cached summary when expected updated_at is provided?
- Should terminal/completed workflow type mismatch report the raw live state name, the normalized state type, or both in audit output?
- What is the smallest safe audit output extension that captures force reason and mismatch truth without widening unrelated audit consumers?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue-shaping contract.
- Date: 2026-04-17
