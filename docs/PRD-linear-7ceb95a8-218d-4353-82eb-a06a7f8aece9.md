# PRD - Child-lane launcher must fail closed on appserver scope drift and stuck launching ledgers

## Added by Bounded Docs Child Lane 2026-04-22

## Traceability
- Linear issue: `CO-303` / `7ceb95a8-218d-4353-82eb-a06a7f8aece9`
- Source issue / cited evidence: `CO-295` / `994efebc-e1e4-4e00-8046-c60143813251`
- Packet prefix: `linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9`
- Source anchor: `ctx:sha256:856f6a3b5bc0f34cf9ee98b4f991a782420eb41733154f29ec229e5ec3ee2341#chunk:c000001`
- Source payload reference: `.runs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9-docs-packet/cli/2026-04-22T08-13-01-356Z-cfe6c9a3/memory/source-0/source.txt`
- Source payload note: the recorded `source-0` payload is run provenance only; the authoritative issue wording for this packet came from read-only issue-context lookups for `CO-303` and `CO-295`.
- Read-only issue-context evidence:
  - `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-303 --format json`
  - `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-295 --format json`
- CO-295 evidence manifests cited in the issue:
  - `.runs/linear-994efebc-e1e4-4e00-8046-c60143813251-review-docs-nitpicks/cli/2026-04-22T05-53-20-840Z-5177eb47/manifest.json`
  - `.runs/linear-994efebc-e1e4-4e00-8046-c60143813251-review-tests-validation/cli/2026-04-22T06-12-29-447Z-4d1c90c4/manifest.json`
- Parent workpad evidence: `CO-303` workpad comment `243a1b4d-e0d6-46f6-90bc-e40670939e88` and `CO-295` workpad comment `29491e4b-f794-4a8a-b916-f0b219365659`

## Summary
- Problem Statement: during `CO-295` provider work, same-issue child-lane launches broke the bounded parent/child contract twice while addressing PR review feedback. A docs child lane pushed commit `6a717726d` directly to the parent PR branch and drifted into parent-owned PR monitoring while the launcher ledger remained stuck at `status=launching` / `provider_worker_child_lane_not_ready`. A tests advisory lane stayed on `appserver` despite an attempted CLI-runtime override, then drifted into broad Linear/GitHub discovery instead of focused validation.
- Desired Outcome: same-issue child lanes fail closed or complete with a usable parent-owned patch or artifact. They must not mutate the parent PR branch directly, ignore bounded advisory instructions, or leave launcher state stuck in a recoverable-but-unaccepted `launching` condition.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create only the docs-first packet for `CO-303`, preserving the exact launcher, runtime, and ledger failures observed during `CO-295`, so the parent lane can implement a narrow fail-closed repair without widening into the `CO-295` PR-attachment ownership product fix.
- Success criteria / acceptance:
  - child-lane launcher and ledger state converge to terminal success, failure, or invalidation when an appserver child run starts, finishes, stalls, or is killed
  - child lanes cannot push or commit directly to the parent PR branch as a valid completion path
  - bounded advisory/docs/tests prompts are enforced or fail closed with explicit evidence when the child drifts into parent-owned Linear/GitHub/PR lifecycle work
  - focused regression or harness coverage exists for the CO-295 `review-docs-nitpicks` stuck-launching/direct-push shape and the `review-tests-validation` appserver drift shape
  - operator output identifies manifest/session evidence and recommended recovery action without requiring manual process-table archaeology
- Constraints / non-goals:
  - this child lane owns only the six packet files named in the launch contract
  - `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, implementation, tests, Linear state, workpad state, PR state, and patch integration remain parent-owned
  - do not widen into the `CO-295` attachment ownership truth model or unrelated provider-worker orchestration redesign

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Child-lane launcher must fail closed on appserver scope drift and stuck launching ledgers`
  - `review-docs-nitpicks`
  - `review-tests-validation`
  - `status=launching`
  - `provider_worker_child_lane_not_ready`
  - `patch artifact`
  - `parent PR branch`
  - `parent-owned PR monitoring`
  - `bounded advisory lane`
  - `CO-295`
  - `PR #597`
- Protected terms / exact artifact and surface names:
  - `linear child-lane`
  - `provider-linear-child-lane`
  - `review-docs-nitpicks`
  - `review-tests-validation`
  - `status=launching`
  - `provider_worker_child_lane_not_ready`
  - `appserver runtime`
  - `patch artifact`
  - `parent PR branch`
  - `parent-owned PR monitoring`
  - `bounded advisory lane`
  - `CO-295`
  - `PR #597`
- Nearby wrong interpretations to reject:
  - do not expand `CO-295`'s PR attachment ownership product fix
  - do not treat direct child commits to the parent PR branch as a valid child-lane completion path
  - do not weaken the child-lane cap, parent ownership, or provenance rules to hide the runtime issue
  - do not require operators to manually kill drifted child lanes without clear fail-closed evidence

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Child-lane completion ledger | CO-295 lanes remained `status=launching` even after appserver child activity, requiring manual invalidation. | Launcher state should reflect the real child run lifecycle. | Launcher records terminal success/failure/stall evidence tied to the real manifest/session. | Do not change unrelated provider-worker issue state transitions. |
| Parent PR branch ownership | A docs child lane directly committed/pushed `6a717726d` to PR `#597`. | Child lanes should return patch/artifact output for parent acceptance. | Parent lane remains the only integration and PR push owner for child output. | Do not forbid parent-owned commits after acceptance. |
| Bounded child scope | Tests advisory lane drifted into broad Linear/GitHub discovery instead of focused validation. | Child lane scope should remain bounded by file/phase/instructions. | Scope drift fails closed with explicit evidence before parent-owned surfaces are mutated. | Do not weaken normal child-lane read access needed for validation. |
| Runtime selection | Attempted CLI-runtime override still yielded `runtime requested=appserver selected=appserver`. | Runtime posture should be deterministic and visible to callers. | Unsupported override paths fail clearly or document why `appserver` is mandatory. | Do not make cloud/runtime policy changes outside child-lane launch behavior. |

## Acceptance Criteria
1. Child-lane launcher and ledger state converge to a terminal success/failure/invalidation state when an appserver child run starts, finishes, stalls, or is killed.
2. Child lanes cannot push or commit directly to the parent PR branch as a valid completion path; parent acceptance must own integration.
3. Bounded advisory/docs/tests prompts are enforced or fail closed with explicit evidence when the child session drifts into parent-owned Linear/GitHub/PR lifecycle work.
4. Add focused regression or harness coverage for the CO-295 `review-docs-nitpicks` stuck-launching/direct-push shape and the `review-tests-validation` appserver drift shape.
5. Operator output identifies the manifest/session evidence and recommended recovery action without requiring manual process-table archaeology.

## Goals
- Make child-lane completion truth converge with the real appserver child lifecycle.
- Keep parent-owned integration and PR push authority explicit.
- Fail closed when a bounded docs/tests/advisory child drifts into parent-owned surfaces.
- Turn stuck `launching` rows into operator-auditable terminal or recoverable states with clear evidence.

## Non-Goals
- Changes to the `CO-295` attachment ownership behavior or issue-context truth model.
- Broad rewrites of all provider-worker orchestration.
- Weakening same-issue child-lane ownership boundaries, cap-slot accounting, or parent acceptance semantics.
- UI-only masking of stale `launching` ledger entries without fixing the parent-visible completion or failure contract.
- Registry-mirror edits in this child lane.

## Not Done If
- A child lane can still commit or push directly to the parent PR branch instead of returning a parent-owned patch or artifact.
- A child lane can still drift into parent-owned Linear/GitHub/PR monitoring after a bounded docs/tests prompt.
- A lane can remain `status=launching` with a real appserver child run in progress and no operator-safe terminal classification.
- Runtime override expectations remain ambiguous when callers attempt to force a non-appserver child-lane path.

## Stakeholders
- Product: CO operators who rely on same-issue child lanes to be bounded, auditable, and parent-owned.
- Engineering: provider-worker launcher/runtime maintainers, child-lane ledger maintainers, and review-loop operators working on `CO-295`.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - same-issue child lanes resolve to terminal success, failure, or invalidation instead of lingering at `status=launching`
  - no child lane can directly mutate the parent PR branch as a valid completion path
  - bounded child prompts either stay inside scope or fail closed with explicit evidence
  - operator output points to the relevant manifest/session and a bounded recovery action
- Guardrails / Error Budgets:
  - preserve parent-owned patch integration and PR lifecycle ownership
  - preserve same-issue cap-slot and provenance rules
  - preserve fail-closed handling when runtime or scope expectations are violated
  - avoid requiring manual process-table archaeology to recover from a drifted child lane

## User Experience
- Personas:
  - parent operator accepting or rejecting same-issue child output
  - reviewer trying to understand why a child lane drifted or stuck at `launching`
  - engineer debugging appserver child-lane runtime behavior
- User Journeys:
  - a docs or tests child lane either returns a usable patch/artifact or fails closed with evidence instead of mutating the parent PR branch
  - an appserver child that drifts or stalls produces terminal launcher/ledger state plus a recommended recovery action
  - a parent can inspect one manifest/session evidence path and invalidate or relaunch without guessing which process is live

## Technical Considerations
- Architectural Notes:
  - the live seams are launcher/runtime fail-closed behavior for appserver child startup and parent-visible ledger repair around recoverable `status=launching` rows tied to real child manifests
  - likely parent-owned source surfaces are `orchestrator/src/cli/providerLinearChildLaneShell.ts`, `orchestrator/src/cli/providerLinearChildLaneRunner.ts`, and nearby provider-worker ledger projection paths
  - likely parent-owned focused tests are `orchestrator/tests/ProviderLinearChildLaneShell.test.ts` and `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
  - the issue is about launcher and ledger contract truth, not about changing `CO-295` product behavior for PR attachment ownership
- Dependencies / Integrations:
  - `CO-295` / PR `#597`
  - same-issue child-lane launcher and ledger artifacts
  - appserver runtime selection and session evidence
  - parent-owned patch integration and PR monitoring

## Open Questions
- What is the smallest truthful terminal state for a child lane that selected `appserver` but drifted before producing a usable patch or validation artifact?
- Should launcher fail-closed behavior invalidate immediately on bounded-scope drift, or first record a distinct terminal failure reason for parent review?
- Where should recommended recovery action live so operators can see it from manifest/session evidence without opening broad process state?

## Approvals
- Product: pending parent docs-review / implementation handoff
- Engineering: pending parent docs-review / implementation handoff
- Design: N/A
