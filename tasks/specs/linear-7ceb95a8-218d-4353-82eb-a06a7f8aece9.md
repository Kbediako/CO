---
id: 20260422-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9
title: Child lane launcher fail closed on appserver scope drift and stuck launching ledgers
status: in_progress
relates_to: docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 8 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- PRD: `docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- Task checklist: `tasks/tasks-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`

## Traceability
- Linear issue: `CO-303` / `7ceb95a8-218d-4353-82eb-a06a7f8aece9`
- Related source issue: `CO-295` / `994efebc-e1e4-4e00-8046-c60143813251`
- Source anchor: `ctx:sha256:856f6a3b5bc0f34cf9ee98b4f991a782420eb41733154f29ec229e5ec3ee2341#chunk:c000001`
- Source payload: `.runs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9-docs-packet/cli/2026-04-22T08-13-01-356Z-cfe6c9a3/memory/source-0/source.txt`
- Source payload note: this payload is run provenance only; authoritative issue wording came from read-only `linear issue-context` output for `CO-303` and `CO-295`.
- Read-only issue-context evidence:
  - `node dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-303 --format json`
  - `node dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-295 --format json`
- CO-295 evidence manifests:
  - `.runs/linear-994efebc-e1e4-4e00-8046-c60143813251-review-docs-nitpicks/cli/2026-04-22T05-53-20-840Z-5177eb47/manifest.json`
  - `.runs/linear-994efebc-e1e4-4e00-8046-c60143813251-review-tests-validation/cli/2026-04-22T06-12-29-447Z-4d1c90c4/manifest.json`
- Parent workpad evidence:
  - `CO-303` workpad comment `243a1b4d-e0d6-46f6-90bc-e40670939e88`
  - `CO-295` workpad comment `29491e4b-f794-4a8a-b916-f0b219365659`

## Summary
- Objective: make same-issue child-lane launcher and ledger behavior fail closed on appserver scope drift, direct-push integration drift, and stuck `launching` ledgers, while preserving parent-owned patch integration and PR lifecycle control.
- Scope:
  - docs-first packet for `CO-303`
  - parent-owned launcher/runtime fail-closed behavior for appserver child startup
  - parent-owned ledger convergence for recoverable or invalidated `status=launching` rows
  - parent-owned bounded-scope enforcement for docs/tests/advisory child lanes
  - focused regression coverage for the two `CO-295` failure shapes
- Constraints:
  - this child lane is docs-only and limited to six packet files
  - parent-owned registry mirrors, implementation, tests, docs-review, validation, Linear state, workpad, PR lifecycle, and patch integration remain out of scope here
  - do not widen into the `CO-295` PR attachment ownership product fix

## Issue-Shaping Contract
- User-request translation carried forward: `CO-303` is a launcher and ledger contract lane created from `CO-295` same-issue child-lane failures. The fix is not "make CO-295 work anyway" and not "let child lanes push directly." It is "make child lanes fail closed or resolve to terminal states with usable parent-owned output."
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
  - expand `CO-295`'s PR attachment ownership product fix
  - treat direct child commits to the parent PR branch as a valid child-lane completion path
  - weaken child-lane cap, parent ownership, or provenance rules to hide the runtime issue
  - require operators to manually kill drifted child lanes without clear fail-closed evidence
- Explicit non-goals carried forward:
  - no `CO-295` product-behavior change here
  - no broad rewrite of provider-worker orchestration
  - no weakening of same-issue child-lane ownership boundaries, cap-slot accounting, or parent acceptance semantics
  - no UI-only masking of stale `launching` ledger entries
  - no registry-mirror edits in this child lane

## Parity / Alignment Matrix
- Current truth:
  - `review-docs-nitpicks` produced intended docs commit `6a717726d`, pushed the parent PR branch directly, continued into parent-owned PR monitoring, and left the launcher ledger stuck at `status=launching` / `provider_worker_child_lane_not_ready` until parent invalidation
  - `review-tests-validation` recorded `runtime requested=appserver selected=appserver` despite an attempted CLI-runtime override, then drifted into broad Linear/GitHub discovery instead of focused validation
  - parent workpad evidence already narrows the live seams to launcher/runtime fail-closed behavior plus parent-visible ledger repair for recoverable `status=launching` rows tied to real child manifests
- Reference truth:
  - launcher and ledger state should reflect the real child-run lifecycle
  - child lanes should return a parent-owned patch or artifact instead of integrating directly
  - bounded docs/tests/advisory lanes should either stay within scope or fail closed before parent-owned surfaces are mutated
  - runtime posture and unsupported override behavior should be explicit and deterministic
- Target truth / intended delta:
  - child lanes converge to terminal success, failure, or invalidation states tied to manifest/session evidence
  - parent lane remains the only integration and PR push owner for child output
  - bounded scope drift is detected and classified before it mutates parent-owned Linear/GitHub/PR surfaces
  - operator output shows manifest/session evidence plus recommended recovery action
- Explicitly out-of-scope differences:
  - unrelated provider-worker issue state transitions
  - `CO-295` product logic around PR ownership truth
  - cloud/runtime policy changes outside child-lane launch behavior

## Readiness Gate
- Not done if:
  - a child lane can still commit or push directly to the parent PR branch instead of returning a parent-owned patch or artifact
  - a child lane can still drift into parent-owned Linear/GitHub/PR monitoring after a bounded docs/tests prompt
  - a lane can remain `status=launching` with a real appserver child run in progress and no operator-safe terminal classification
  - runtime override expectations remain ambiguous when callers attempt to force a non-appserver child-lane path
- Pre-implementation issue-quality review evidence:
  - 2026-04-22: read-only `CO-303` and `CO-295` issue-context output confirms this lane is about child-lane launcher/runtime/ledger contract failures, not `CO-295` attachment ownership behavior itself
  - 2026-04-22: the lane is not eligible for the micro-task path because correctness depends on exact protected terms, exact child-lane ownership boundaries, exact ledger/runtime failure shapes, and adjacent `CO-295` evidence manifests
- Safeguard ownership split:
  - child lane owns only `docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `docs/TECH_SPEC-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `docs/ACTION_PLAN-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `tasks/tasks-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, and `.agent/task/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
  - parent lane owns registry mirrors, launcher/runtime implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements
- Functional requirements:
  1. Child-lane launcher and ledger state must converge to terminal success, failure, or invalidation when an appserver child run starts, finishes, stalls, or is killed.
  2. Child lanes must not push or commit directly to the parent PR branch as a valid completion path; parent acceptance must remain the only integration path.
  3. Bounded docs/tests/advisory prompts must be enforced or fail closed with explicit evidence when the child drifts into parent-owned Linear/GitHub/PR lifecycle work.
  4. Runtime posture must stay deterministic and visible; unsupported override attempts must fail clearly or document why `appserver` remains mandatory.
  5. Operator-facing output must identify the decisive manifest/session evidence and recommended recovery action.
  6. Focused regression or harness coverage must exist for the `review-docs-nitpicks` stuck-launching/direct-push shape and the `review-tests-validation` appserver drift shape.
  7. Parent-owned patch/artifact handoff must stay compatible with existing child-lane cap-slot accounting, provenance, and acceptance semantics.
- Non-functional requirements:
  - fail-closed behavior over silent drift
  - machine-checkable manifest/session evidence for each terminal path
  - minimal parent-owned change localized to launcher/runtime/ledger seams
  - no requirement for manual process-table archaeology to recover
- Interfaces / contracts:
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
  - child-lane manifest and launcher ledger artifacts

## Architecture & Data
- Architecture / design adjustments:
  - keep convergence logic at the child-lane launcher/runtime seam and the parent-visible ledger projection seam
  - treat direct child integration into the parent PR branch as an invalid completion path, not a success variant
  - treat bounded-scope drift into parent-owned Linear/GitHub/PR surfaces as explicit fail-closed evidence, not as recoverable silent behavior
  - make runtime selection and override truth explicit in ledger or terminal output
- Required artifact/content expectations:
  - terminal launcher outcome tied to a real child manifest/session or explicit failure evidence
  - stuck `status=launching` rows either retire, invalidate, or classify with operator-safe recovery guidance
  - parent-owned patch or validation artifact remains the accepted child output surface
- Data model changes / migrations:
  - additive launcher or ledger reason fields are acceptable if parent needs them
  - destructive cleanup of evidence is out of scope
- External dependencies / integrations:
  - `CO-295` evidence manifests and PR `#597`
  - parent-owned Linear/workpad and PR integration only

## Current Truth
- `review-docs-nitpicks` was launched for docs-only changes on `CO-295`; the appserver child produced commit `6a717726d`, pushed the parent PR branch directly, continued into parent-owned PR monitoring, and left the child-lane ledger stuck at `status=launching` / `provider_worker_child_lane_not_ready` until the parent invalidated it.
- `review-tests-validation` was launched as a tests-only advisory lane; despite an attempted CLI-runtime override, the child manifest recorded `runtime requested=appserver selected=appserver`, and the session drifted into broad Linear/GitHub discovery instead of running focused `ProviderLinearWorkflowFacade` validation.
- Parent workpad evidence narrows the live seams to launcher/runtime fail-closed behavior for appserver child startup and parent-visible ledger repair around recoverable `status=launching` rows tied to real child manifests.

## Proposed Design
- Parent implementation should add or tighten one terminal launcher/ledger contract that:
  - records success only when the child returns a usable parent-owned patch or artifact
  - records failure or invalidation when bounded-scope drift reaches parent-owned Linear/GitHub/PR lifecycle work
  - records terminal stall or recovery guidance when appserver startup or post-startup convergence leaves the lane stuck at `status=launching`
  - keeps runtime selection or unsupported override truth explicit
- Parent implementation should keep the fix bounded to launcher/runtime/ledger seams rather than widening into `CO-295` product logic.

## Protected Expectations
- Preserve `linear child-lane`, `provider-linear-child-lane`, `review-docs-nitpicks`, `review-tests-validation`, `status=launching`, `provider_worker_child_lane_not_ready`, `appserver runtime`, `patch artifact`, `parent PR branch`, `parent-owned PR monitoring`, `bounded advisory lane`, `CO-295`, and `PR #597`.
- Preserve parent-owned integration and PR push control.
- Preserve child-lane cap-slot accounting, provenance rules, and acceptance semantics.
- Preserve operator-visible manifest/session evidence and recommended recovery action.

## Reject These Wrong Interpretations
- `Let the child push directly if the patch is good.`
- `Launcher drift is okay as long as the parent can clean it up later.`
- `Hide stale launching rows in the UI and call it fixed.`
- `This is really the CO-295 product issue, so solve it there.`
- `Relax the child-lane cap or provenance rules to make the launcher look healthier.`

## Validation Plan
- Child-lane checks:
  - protected-term grep across the six touched packet files
  - `git diff --check` over the six touched packet files
  - read-only issue-context capture for `CO-303` and `CO-295`
- Parent-lane checks:
  - focused regression or harness coverage for the `review-docs-nitpicks` stuck-launching/direct-push shape
  - focused regression or harness coverage for the `review-tests-validation` appserver drift shape
  - focused launcher/ledger tests proving terminal success, failure, invalidation, and killed-child convergence
  - parent docs-review before implementation
  - parent-required validation floor before handoff

## Open Questions
- What is the smallest truthful terminal state for a lane that selected `appserver` but then drifted before producing usable patch or validation output?
- Should launcher convergence classify direct-push drift distinctly from runtime or startup stall so operator recovery action is clearer?
- Where should recommended recovery action live so the parent can read it directly from manifest/session evidence?

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-04-22
