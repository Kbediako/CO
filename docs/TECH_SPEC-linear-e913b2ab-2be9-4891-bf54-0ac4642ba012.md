---
id: 20260327-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012
title: CO Add App-Runtime Proof Capture and PR Media Handoff Parity
relates_to: docs/PRD-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md
risk: high
owners:
  - Codex
last_review: 2026-04-27
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`
- PRD: `docs/PRD-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`
- Task checklist: `tasks/tasks-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`

## Traceability
- Linear issue: `CO-8` / `e913b2ab-2be9-4891-bf54-0ac4642ba012`
- Linear URL: https://linear.app/asabeko/issue/CO-8/co-add-app-runtime-proof-capture-and-pr-media-handoff-parity

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: add the smallest CO runtime-proof helper and policy surface needed for app-touching Linear worker lanes to produce reviewer-usable proof handoff before review.
- Scope:
  - docs-first registration and workpad bootstrap for the current Linear worker issue
  - permit-gated runtime-proof helper under the worker-visible CLI surface
  - provider-worker prompt/help/skill updates so the path is discoverable
  - focused tests for allowed and blocked proof modes
- Constraints:
  - preserve current worker-owned Linear mutation boundaries
  - keep video capture disabled unless explicitly permitted
  - do not claim local-only proof is reviewer-usable handoff
  - record delegation override explicitly because this worker run cannot spawn subagents

## Technical Requirements
- Functional requirements:
  - workers must have one explicit CO command path for app-runtime proof handoff
  - the helper must evaluate permit policy for the target origin or proof lane and report allowed modes explicitly
  - the helper must emit structured workpad/PR handoff text for reviewer proof when the requested mode is allowed
  - screenshot-only or external-link-only degraded modes must be explicit
  - disallowed proof modes, including video when disabled, must fail closed
- Non-functional requirements (performance, reliability, security):
  - keep the policy deterministic and auditable from checked-in permit data
  - keep the implementation bounded to current worker-visible CLI and prompt/docs seams
  - avoid introducing a large media hosting subsystem
- Interfaces / contracts:
  - worker CLI contract: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/linearCliShell.ts`
  - worker prompt contract: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - permit contract: `scripts/design/pipeline/permit.js`, `compliance/permit.json`, `compliance/permit.example.json`

## Architecture & Data
- Architecture / design adjustments:
  - extend the worker-visible `linear` helper surface with a bounded proof-handoff subcommand instead of introducing a broad new runtime framework
  - translate permit data into explicit proof capabilities so workers see screenshot, external-link, and video posture clearly
  - return structured markdown or text blocks that can be pasted into the workpad and PR flow without inventing a second tracker system
- Data model changes / migrations:
  - permit entries may need minimal runtime-proof-specific fields so screenshot versus external-link behavior is explicit and fail-closed
  - Linear helper audit entries may need to record proof-handoff usage so the worker path remains observable
- External dependencies / integrations:
  - local Symphony workflow baseline under `/Users/kbediako/Code/symphony`
  - repo permit configuration under `compliance/permit.json`
  - existing provider-worker Linear workflow docs and prompt surface

## Validation Plan
- Tests / checks:
  - docs-review on the new task packet before code edits
  - focused tests for linear proof helper behavior, CLI help, provider-worker prompt text, and permit policy outcomes
  - required repo validation floor after implementation
- Rollout verification:
  - confirm the helper surfaces explicit screenshot/external-link/video posture on the default example permit
  - confirm blocked requests fail closed with actionable messages
  - refresh the workpad to include the new runtime-proof contract before review handoff
- Monitoring / alerts:
  - use the Linear workpad as the operator-facing progress surface
  - use helper JSON output plus any audit log as the proof-handoff evidence source

## Open Questions
- Whether the smallest truthful degraded path is "screenshot allowed but reviewer handoff still requires a link" or a narrower contract that only treats externally reachable proof as handoff-ready. Implementation should choose the smallest explicit contract and document it.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-27

## Manifest Evidence
- Baseline audit: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T035157Z-baseline-audit.md`
