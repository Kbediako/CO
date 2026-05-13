---
id: 20260408-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f
title: CO: Add a bounded macOS screenshot-proof capture path without external helper dependencies
relates_to: docs/PRD-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md
risk: high
owners:
  - Codex
last_review: 2026-04-08
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`
- PRD: `docs/PRD-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`
- Task checklist: `tasks/tasks-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`

## Traceability
- Linear issue: `CO-105` / `1c361221-d50a-43bd-aeba-ce6bada3b07f`
- Linear URL: https://linear.app/asabeko/issue/CO-105/co-add-a-bounded-macos-screenshot-proof-capture-path-without-external
- Source evidence note: `CO-97` / `bd8f3cc3-0871-470b-8c86-2f3815b326f2`
- Existing embed seam: `CO-61` / `17c2a486-f5d8-4801-823e-edb8d9ec9936`
- Existing reviewer-link seam: `CO-8` / `e913b2ab-2be9-4891-bf54-0ac4642ba012`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: give CO one repo-owned built-in macOS screenshot capture helper that creates a local proof artifact, keeps cleanup explicit, and feeds the existing `upsert-workpad` embed path without changing `runtime-proof`.
- Scope:
  - docs-first registration for `CO-105`
  - one new `linear screenshot-proof` helper plus focused audit/CLI wiring
  - worker and skill guidance updates
  - focused capture and CLI regression coverage
  - real host capture plus direct Linear workpad embedding
- Constraints:
  - built-in macOS tools only for the default path
  - no dependency on the external/local Swift helper wrapper
  - keep `runtime-proof` and `upsert-workpad` as separate adjacent seams

## Technical Requirements
- Functional requirements:
  - add a new worker-visible helper that captures a screenshot to a local file on macOS
  - emit structured result data that records the local output path and cleanup status
  - keep capture failure distinct from later embed failure
  - update worker guidance so direct-in-Linear proof uses the capture helper plus `upsert-workpad`, while reviewer-visible proof URLs continue to use `runtime-proof`
- Non-functional requirements:
  - fail closed and truthfully on permissions or unreadable output
  - avoid new external helper dependencies in the default path
  - keep the implementation bounded to macOS still-image capture
- Interfaces / contracts:
  - new capture orchestration module under `orchestrator/src/cli/control/`
  - CLI routing: `orchestrator/src/cli/linearCliShell.ts`
  - audit tracking: `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
  - worker guidance: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - skill guidance: `skills/linear/SKILL.md`

## Architecture & Data
- Architecture / design adjustments:
  - add one new helper operation on the existing `linear` CLI surface
  - keep the default implementation on `screencapture` plus optional `osascript` cleanup only when the helper opened a temporary proof surface
  - leave `runtime-proof` and `upsert-workpad` behavior unchanged
- Data model changes / migrations:
  - extend Linear audit entries to capture the new `screenshot-proof` operation
  - no persistent storage migration beyond helper audit and issue workpad evidence
- External dependencies / integrations:
  - built-in macOS `screencapture`
  - built-in macOS `osascript`
  - existing `upsert-workpad` local image embedding once a file exists

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused screenshot-proof module tests
  - focused `LinearCliShell` tests for the new subcommand and audit result
  - required repo validation floor after implementation
- Rollout verification:
  - capture at least one real screenshot on this host via the new helper
  - embed that screenshot directly into the CO-105 workpad
  - preserve the CO-97 failure note in the packet and workpad
  - record the explicit failure classifications exercised during validation
- Monitoring / alerts:
  - rely on existing provider Linear audit output and the live Linear workpad for this bounded lane

## Open Questions
- Whether a future follow-up should add richer target-selection modes once the bounded built-in default path is landed and validated.

## Approvals
- Reviewer: `codex-orchestrator docs-review` rerun recorded a truthful manual fallback after packet-local fixes; `spec-guard` and `docs:check` passed, and only the existing repo-wide `docs:freshness` stale-doc baseline remained. Evidence: `.runs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review-rerun/cli/2026-04-07T14-53-48-499Z-d042023d/manifest.json`, `out/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review-rerun/docs-freshness.json`.
- Date: 2026-04-08
