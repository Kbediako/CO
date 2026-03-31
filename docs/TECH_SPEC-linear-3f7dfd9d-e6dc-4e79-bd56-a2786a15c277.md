---
id: 20260331-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277
title: CO Strengthen Autonomous Issue Understanding and Intent Capture for Follow-Up Work
relates_to: docs/PRD-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md
risk: high
owners:
  - Codex
last_review: 2026-03-31
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`
- PRD: `docs/PRD-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`
- Task checklist: `tasks/tasks-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md`

## Traceability
- Linear issue: `CO-45` / `3f7dfd9d-e6dc-4e79-bd56-a2786a15c277`
- Linear URL: https://linear.app/asabeko/issue/CO-45/co-strengthen-autonomous-issue-understanding-and-intent-capture-for

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: harden the autonomy-facing issue-creation and issue-readiness path so follow-up issues preserve exact user intent earlier and fail closed when parity, surface, naming, or scope boundaries are still ambiguous.
- Scope:
  - docs-first packet and checklist registration for `CO-45`
  - workflow/template hardening in `AGENTS.md`, docs-first templates, and micro-task guidance
  - `linear create-follow-up` helper and provider-worker prompt hardening for structured intent capture plus immediate traceability
  - focused CLI/facade regressions for the new follow-up contract
- Constraints:
  - preserve a lightweight provider-worker flow; do not require a full repo bootstrap before a follow-up issue can even be filed
  - keep parity-specific safeguards conditional instead of forcing a parity matrix on every issue, while still failing closed when a follow-up is explicitly marked as a parity/alignment lane
  - treat issue-quality review as a pre-implementation gate layered onto existing docs-review/checklist flow rather than a full new pipeline in this slice

## Technical Requirements
- Functional requirements:
  - autonomy-facing issue shaping must preserve:
    - user-request translation
    - protected terms and exact artifact/surface names
    - explicit non-goals
    - nearby wrong interpretations to reject
    - `Not Done If` readiness blockers
  - parity/alignment issues must include a required matrix covering:
    - current CO truth
    - reference truth
    - intended target delta
    - explicitly out-of-scope differences
  - `linear create-follow-up` must support a stronger structured follow-up contract instead of freeform description plus acceptance criteria only
  - follow-up issue creation must leave immediate traceability in the issue body using the created issue id and exact repo packet paths expected before the follow-up leaves backlog
  - docs-first templates must expose the new required/conditional sections so the docs packet does not re-narrow a well-shaped issue
  - the task checklist/workflow guidance must record a lightweight pre-implementation issue-quality review gate and clearly say work is not ready when ambiguity remains
  - micro-task guidance must explicitly reject parity/alignment and exact-name/exact-surface preservation lanes from the shortcut path
- Non-functional requirements (performance, reliability, security):
  - helper changes must remain fail-closed and auditable in the provider-worker audit log
  - template changes must remain concise enough to use routinely
  - traceability text must be deterministic and generated from issue ids/paths rather than ad hoc prose
- Interfaces / contracts:
  - CLI surface: `orchestrator/src/cli/linearCliShell.ts`
  - follow-up issue builder/facade: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - provider-worker prompt contract: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - docs-first templates/guidance: `.agent/task/templates/*.md`, `AGENTS.md`, `docs/micro-task-path.md`

## Architecture & Data
- Architecture / design adjustments:
  - add a structured follow-up contract to `linear create-follow-up` with dedicated sections for `Intent Checksum`, `Non-Goals`, parity-matrix enforcement behind an explicit parity/alignment lane toggle, `Not Done If`, and `Immediate Traceability`
  - make `Immediate Traceability` deterministic from the created follow-up issue id so the issue body itself points to the exact repo packet paths required before the issue moves into active work
  - document the post-create partial-success contract explicitly: `createProviderLinearFollowUpIssue` in `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts` performs `issueCreate` first, then description/relation writes; if the initial create succeeds and a later write fails, the helper does not retry or reconcile the first mutation idempotently and must surface `created_issue` recovery metadata so callers can recover manually
  - strengthen PRD/TECH_SPEC/ACTION_PLAN/task templates so the docs packet carries the same guardrails instead of collapsing back into a smaller interpretation
  - record a lightweight issue-quality review gate in guidance/checklists before implementation starts
- Data model changes / migrations:
  - none; this lane changes templates, text contracts, and CLI argument/description shaping only
- External dependencies / integrations:
  - Linear GraphQL issue create/update mutations
  - provider-worker audit JSONL
  - existing docs-review / standalone-review / elegance-review workflow

## Safeguard Ownership Split
- Follow-up issue helper/tooling:
  - structured issue sections for `Intent Checksum`, `Non-Goals`, parity-matrix enforcement behind an explicit parity/alignment lane toggle, `Not Done If`, and deterministic `Immediate Traceability`
- Issue/docs-first templates:
  - required translation, protected terms, wrong-interpretation rejection, parity matrix, safeguard split, and readiness fields
- Review gate / workflow guidance:
  - lightweight pre-implementation issue-quality review gate that blocks work when the issue is still plausibly narrower than the user request
- Task checklist:
  - explicit evidence that issue-quality review happened before implementation and that parity/intent/readiness fields are present when relevant

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `LinearCliShell` and `ProviderLinearWorkflowFacade` tests for the stronger follow-up contract and traceability section
  - required repo validation floor after implementation
- Rollout verification:
  - verify new follow-up issue descriptions render the required structured sections and actual created-issue repo traceability paths
  - verify templates and guidance clearly expose the new issue-quality/readiness contract
  - verify micro-task guidance rejects parity/alignment lanes from the shortcut path
- Monitoring / alerts:
  - rely on provider-worker audit entries plus focused CLI/facade tests; future misses should be opened as narrow follow-ups with the stronger contract already in place

## Open Questions
- Resolved in planning: issue-quality review is a lightweight checklist/guidance/docs-review gate in this slice, not a new standalone pipeline.

## Approvals
- Reviewer: Codex self-review plus delegated docs-review fallback
- Status: approved with comments; no blocking docs issues after fallback review
- Date: 2026-03-31
- Evidence: `.runs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277-co-45-docs-review/cli/2026-03-31T05-38-11-020Z-51bac25e/manifest.json`, `.runs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277-co-45-docs-review/cli/2026-03-31T05-38-11-020Z-51bac25e/review/telemetry.json`, `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T165600Z-docs-review-fallback.md`
