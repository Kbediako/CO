# PRD - CO-424 Provider-Worker Closeout Invariants

## Request
Fix the `provider-linear-worker` closeout class exposed by `CO-423` / `PR #721`: successful `review handoff`, `merge handoff`, or post-merge/Done bookkeeping must not be reported failed only because implementation-turn parallelization proof no longer maps to the closeout turn.

## Problem
`CO-423` reached review and later merged cleanly, but provider runs ended failed with `parallelization_serial_conflict` and then `parallelization_decision_missing`. The decisive evidence was a stale same-turn interpretation: earlier `same-issue child lanes` were counted against later `stay_serial` / `forbid_parallel` lifecycle decisions, and lifecycle-only Done bookkeeping still expected a fresh implementation-turn decision. Repeated stale `proof lock` diagnostics also made the terminal cause harder to read.

## Protected Terms
- `parallelization_serial_conflict`
- `parallelization_decision_missing`
- `stay_serial`
- `forbid_parallel`
- `same-issue child lanes`
- `review handoff`
- `merge handoff`
- `post-merge/Done closeout`
- `provider-linear-worker`
- `proof lock`
- `CO-423`
- `PR #721`

## Scope
- Distinguish implementation child-lane lineage from later review/merge/Done closeout decisions.
- Permit clean no-child lifecycle closeout turns to finish without a fresh implementation parallelization decision only when the current turn is closeout-only.
- Keep real active-turn violations fail-closed, including same-decision serial/forbid launches, dirty source proof, blocked queued states, and non-closeout audit work such as `attach-pr`.
- Deduplicate or demote proof-lock diagnostics when another provider-worker terminal cause exists.

## Non-Goals
- No weakening of same-turn child-lane enforcement.
- No retry scheduler rewrite.
- No reopening `CO-326`, `CO-403`, `CO-408`, or `CO-417`.
- No mutation of `CO-423` implementation or `PR #721` content.
- No masking real child-lane launches that violate the active decision.

## Wrong Interpretations To Reject
- Treating every `proof lock` diagnostic as the primary cause.
- Making all `stay_serial` or `forbid_parallel` turns tolerant of child-lane launches.
- Inventing child lanes for handoff/merge bookkeeping.
- Broadening into durable lineage work beyond the fix needed here.

## Acceptance Criteria
- [ ] A CO-423-style successful `review handoff` followed by later serial/merge decision does not fail solely due to earlier child-lane history.
- [ ] Post-merge/Done closeout bookkeeping does not require a fresh implementation-turn parallelization decision unless child lanes or repo artifact edits occur.
- [ ] True same-decision `stay_serial` / `forbid_parallel` plus child-lane launches still fail closed.
- [ ] Implementation lineage and review/merge closeout decisions are separated in provider-worker proof.
- [ ] Stale `proof lock` diagnostics are secondary/deduped when another terminal cause exists.
- [ ] Tests cover false-failure and true-violation shapes.

## Prior Art
Use `CO-326`, `CO-408`, `CO-403`, and `CO-417` as adjacent evidence only; do not reopen their scope.
