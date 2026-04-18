# PRD - CO workflow: reclassify blocked CO-231 validation floor on current head

## Added by Bootstrap 2026-04-18

## Traceability
- Linear issue: `CO-247` / `9ce7811e-45ca-4d04-b759-bc5e7da77511`
- Follow-up packet prefix: `linear-9ce7811e-45ca-4d04-b759-bc5e7da77511`
- Canonical task id: `20260418-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511` (`tasks/index.json` lookup key)
- Canonical task spec: `tasks/specs/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- Task checklist: `tasks/tasks-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- `.agent` mirror: `.agent/task/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- Shared source anchor: `ctx:sha256:435270084f0b1ce52333855ba3d994b5a40a6a98549a81c2fd69d7f806ba3dd0#chunk:c000001`
- Source packet anchors: `CO-231` / `91749283-6dc8-4df8-aee3-5c9127c1200c`
- Blocked branch anchor: `linear/co-231-doctor-readiness-stability-r2`
- Current workpad source: `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/workpad.md`

## Summary
- Problem Statement: the blocked `CO-231` packet carried two validation-floor blockers into follow-up work: a `docs/TASKS.md` `tasks-file-too-large` / `zero_headroom` docs gate tied to `450/450`, and a full-suite timeout story around `orchestrator/tests/SelectedRunProjection.test.ts`, especially `refreshes projection proofs when child-lane reservation ledger placeholders exist`. This lane had to reclassify both inherited surfaces on the current branch head instead of copying the source packet forward unchanged.
- Desired Outcome: keep the packet truthful, classify each inherited surface on the current branch head, fix only the surfaces that remain live blockers, and either restore a review-handoff validation floor for blocked `CO-231` or leave an explicit blocked dependency / evidence contract.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the required docs-first packet for `CO-247`, preserve the source packet anchors from blocked `CO-231`, and keep both inherited blocker surfaces explicitly unresolved until fresh current-head repro shows whether each one is still live or is now a non-repro.
- Success criteria / acceptance:
  - the packet names both inherited blocker surfaces exactly and keeps the source anchors visible
  - the packet does not assume the `docs/TASKS.md` zero-headroom gate or the `SelectedRunProjection` timeout is still live
  - the parent can use the packet to run fresh current-head docs and test classification steps without widening scope
  - the final handoff for `CO-231` records which surface is still blocking, if any, with machine-checkable artifacts
- Constraints / non-goals:
  - this issue lane stays bounded to the docs packet, required registry mirrors, the exact `SelectedRunProjection` production/test seam, and the audit artifacts needed for truthful handoff
  - no broad docs archive redesign, generic `SelectedRunProjection` rewrite, or unrelated code/test/registry edits beyond the exact blocker surfaces
  - no reopening Doctor readiness semantics or widening back into `CO-220`

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs/TASKS.md`
  - `450/450 zero_headroom`
  - `tasks-file-too-large`
  - `SelectedRunProjection.test.ts`
  - `refreshes projection proofs when child-lane reservation ledger placeholders exist`
  - `current-head repro`
  - `live blockers or non-repros`
  - `CO-231`
- Protected terms / exact artifact and surface names:
  - `docs/TASKS.md`
  - `npm run docs:check`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `refreshes projection proofs when child-lane reservation ledger placeholders exist`
  - `npm run test`
  - `CO-231`
  - `91749283-6dc8-4df8-aee3-5c9127c1200c`
  - `linear/co-231-doctor-readiness-stability-r2`
  - `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/workpad.md`
- Nearby wrong interpretations to reject:
  - assume the docs gate is still red only because the source packet once recorded `450/450`
  - assume the current `446` line count alone proves the docs surface is fixed without rerunning the real docs gate
  - assume the `SelectedRunProjection` timeout is still live without current-head reproduction
  - broaden into generic docs cleanup, archive redesign, or broad `SelectedRunProjection` refactors before current-head classification
  - treat `CO-247` as replacing the `CO-231` source anchors instead of reclassifying them truthfully on the new head

## Parity / Alignment Matrix

| Surface | Source / Inherited Truth | Current-Head Status To Verify | Target Truth |
| --- | --- | --- | --- |
| `docs/TASKS.md` docs gate | Source packet treated `450/450` as `tasks-file-too-large` / `zero_headroom`. | Fresh `docs:check` reruns on the current branch head are green, so the inherited docs blocker is now classified as a current-head non-repro rather than a live failure. | Keep the docs headroom contract green and record the blocker as stale-on-current-head instead of preserving the old `450/450` story. |
| `SelectedRunProjection` exact case | Source packet carried a full-suite timeout story for `orchestrator/tests/SelectedRunProjection.test.ts`, especially `refreshes projection proofs when child-lane reservation ledger placeholders exist`. | The lane reproduced the interaction, then fixed it by allowing the child-lane refresh fast path to skip session-log hydration only for `turn_completed` proofs that already have a complete session-log-backed floor; targeted regression coverage now pins the reservation-placeholder + `turn_running` path. | Preserve the bounded seam fix and its regression coverage so the full-suite timeout no longer blocks truthful handoff. |
| `CO-231` review-handoff floor | Blocked branch `linear/co-231-doctor-readiness-stability-r2` remained unable to claim a truthful validation floor. | Current-head validation now shows no remaining validation-floor blocker; the only residual dependency is PR `#536` review/check drain. | Handoff names PR review/check drain as the remaining dependency and does not continue to describe the docs or projection surfaces as live blockers. |


## Acceptance Criteria
1. The packet preserves the `CO-231` source anchors, blocked branch, and both inherited blocker surfaces without silently narrowing scope.
2. The packet states explicitly that the `docs/TASKS.md` zero-headroom gate and the `SelectedRunProjection` timeout may each resolve as a live blocker or a current-head non-repro.
3. Parent-owned validation includes a fresh `docs/TASKS.md` / `npm run docs:check` classification step and a focused rerun for `refreshes projection proofs when child-lane reservation ledger placeholders exist`, plus any full-suite classification needed to explain current-head behavior.
4. If the docs gate is still red, the parent-owned fix stays bounded to the supported docs headroom surfaces rather than generic docs cleanup.
5. If the `SelectedRunProjection` surface is still red, the parent-owned fix stays bounded to the exact projection/test seam needed to explain or repair current-head behavior.
6. If either inherited surface is a non-repro, the packet, workpad, and handoff record that truth directly instead of preserving stale blocker language.
7. The shipped diff stays bounded to the docs packet, required registry mirrors, the exact `SelectedRunProjection` production/test seam, and audit artifacts needed for truthful handoff.

## Goals
- Preserve the issue-shaping contract from the blocked `CO-231` source packet.
- Keep the two inherited blocker surfaces separate so each can be reclassified independently.
- Make the parent's next steps mechanically obvious: docs repro, exact test repro, then bounded repair only if needed.
- Keep the eventual review-handoff floor truthful for `CO-231`.

## Non-Goals
- Broad docs archive redesign or generic docs debt cleanup beyond the supported headroom surfaces needed to keep `docs:check` truthful.
- Broad `SelectedRunProjection` production or test refactors beyond the exact refresh / hydration seam required to classify and fix the inherited timeout.
- Unrelated registry, workpad, or PR workflow changes beyond the evidence and handoff updates required for `CO-247`.
- Reopening Doctor readiness semantics or `CO-220` stale-projection scope while resolving the inherited validation-floor blockers.
- Reframing the issue as generic docs debt or a generic `SelectedRunProjection` rewrite.

## Not done if
- either inherited blocker surface is marked resolved without fresh current-head evidence artifacts
- the packet drops the `CO-231` / `91749283-6dc8-4df8-aee3-5c9127c1200c` source anchors, blocked branch anchor, or parity/alignment matrix
- the lane lacks an explicit docs packet, acceptance criteria, or a bounded rerun path for the `SelectedRunProjection` snapshots
- the lane edits code, tests, registry mirrors, or docs surfaces outside the bounded packet + headroom + `SelectedRunProjection` contract required for this fix

## Stakeholders
- Product: CO maintainers who need a truthful follow-up path for blocked `CO-231`
- Engineering: parent lane owner and reviewers who need exact current-head blocker classification
- Operations / Review: anyone deciding whether `CO-231` still lacks a real validation floor

## Metrics & Guardrails
- Primary Success Metrics:
  - the docs packet names both inherited blocker surfaces and source anchors correctly
  - the parent can classify both surfaces on the current head without reopening unrelated seams
  - eventual handoff truthfully distinguishes live blocker from non-repro for each surface
- Guardrails / Error Budgets:
  - do not assume either blocker outcome before fresh current-head evidence
  - keep any parent fix bounded to the proven live seam
  - preserve exact artifact names and branch/source anchors so closeout remains auditable

## User Experience
- Personas:
  - parent worker re-establishing a truthful review-handoff floor
  - reviewer checking whether `CO-231` is still genuinely blocked
  - maintainer auditing whether stale blocker language was refreshed or merely copied forward
- User Journeys:
  - the parent reruns current-head docs and test evidence and can classify both inherited surfaces cleanly
  - a reviewer can see exactly which blocker, if any, still prevents truthful handoff
  - a maintainer can trace the issue from blocked `CO-231` source packet to the refreshed `CO-247` follow-up contract

## Technical Considerations
- Architectural Notes:
  - the initial docs packet came from a bounded child lane, but the shipped issue lane also owns the required registry updates, current-head repro, bounded `SelectedRunProjection` repair, and review/handoff closeout
  - the workpad already proves that line-count signal alone is not enough to inherit the old docs blocker blindly
  - the exact `SelectedRunProjection` case exists on this head and is the minimum acceptable reproduction surface before any wider test diagnosis
- Dependencies / Integrations:
  - `docs/TASKS.md`
  - `npm run docs:check`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `npm run test`
  - `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/workpad.md`

## Resolved Questions
- The inherited `docs/TASKS.md` `450/450 zero_headroom` blocker was stale on the current branch head; fresh `docs:check` reruns are green.
- `refreshes projection proofs when child-lane reservation ledger placeholders exist` required a bounded current-head fix in the `SelectedRunProjection` refresh/hydration seam rather than blanket retries or a widened refactor.
- After current-head reruns, the remaining dependency for blocked `CO-231` is PR `#536` review/check drain, not a live validation-floor blocker on the docs or projection surfaces.

## Approvals
- Product: pending
- Engineering: pending parent current-head reproduction and classification
- Operations / Review: pending parent handoff decision
