---
id: 20260402-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936
title: CO: Embed screenshot proof directly in Linear comments and workpads
relates_to: docs/PRD-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md
risk: high
owners:
  - Codex
last_review: 2026-04-02
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`
- PRD: `docs/PRD-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`
- Task checklist: `tasks/tasks-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`

## Traceability
- Linear issue: `CO-61` / `17c2a486-f5d8-4801-823e-edb8d9ec9936`
- Linear URL: https://linear.app/asabeko/issue/CO-61/co-embed-screenshot-proof-directly-in-linear-comments-and-workpads
- Source issue: `CO-55` / `cd3020f3-b6be-4adb-ae00-1a15497de036`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: extend the worker-owned Linear helper surface so a local screenshot artifact can be uploaded into Linear-managed storage and embedded directly into the active workpad comment.
- Scope:
  - docs-first registration for `CO-61`
  - bounded upload-and-embed support inside the provider Linear workflow facade
  - CLI and audit surfacing for the upload result
  - workflow and worker-guidance wording updates for embedded-in-Linear proof
  - focused facade and CLI regression coverage plus live Linear validation
- Constraints:
  - preserve existing PR and external URL attachment flows
  - avoid a general asset platform or broad new comment-management lane
  - keep the workpad as the canonical proof surface for this issue

## Technical Requirements
- Functional requirements:
  - the helper must accept a local screenshot artifact as input to the workpad mutation flow
  - the helper must request a Linear `fileUpload` payload, including the signed upload URL, returned upload headers, and resulting `assetUrl`
  - the worker must upload the screenshot bytes server-side using the returned headers before mutating the workpad comment
  - the final workpad body stored in Linear must reference the returned `assetUrl` with markdown image syntax so the screenshot renders directly in Linear
  - the workpad contract and worker guidance must be able to require `embedded directly in Linear, not only linked` screenshot proof
  - the resulting mutation or audit output must record enough proof traceability to tie the workpad update to the uploaded asset reference
- Non-functional requirements:
  - fail closed for unreadable local files, unsupported content types, or upload failures
  - preserve the single active `## Codex Workpad` comment contract
  - avoid repeated unrelated GraphQL reads or mutation surface churn beyond the workpad path
- Interfaces / contracts:
  - upload negotiation and comment mutation: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - GraphQL transport: `orchestrator/src/cli/control/linearGraphqlClient.ts`
  - audit summary surface: `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
  - CLI routing and help: `orchestrator/src/cli/linearCliShell.ts`
  - provider-worker prompt wording: `orchestrator/src/cli/providerLinearWorkerRunner.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add a bounded local-image markdown resolver ahead of the workpad comment mutation
  - the resolver must:
    - find local screenshot references intended for direct Linear embedding
    - read local file metadata and bytes
    - request `fileUpload` from Linear
    - `PUT` the bytes with the returned upload headers
    - rewrite the markdown image reference to the returned `assetUrl`
  - keep the upload logic internal to the provider workflow facade so CLI callers still use the existing workpad entrypoint
  - extend audit entries to include the uploaded asset URL and any associated comment id or attachment id needed for later traceability
- Data model changes / migrations:
  - add upload metadata to the workflow facade result and audit shape as needed for proof traceability
  - no persistence migration beyond existing JSONL audit and issue-context cache best-effort data
- External dependencies / integrations:
  - Linear GraphQL `fileUpload` mutation plus signed upload URL
  - Linear markdown rendering of `![alt](assetUrl)` image references in comments

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `ProviderLinearWorkflowFacade` coverage for:
    - successful signed-upload negotiation and body rewrite
    - upload failure propagation
    - invalid or unreadable local screenshot references
    - audit or result traceability for the uploaded asset
  - focused `LinearCliShell` coverage for any new CLI flags or wording changes
  - required repo validation floor after implementation
- Rollout verification:
  - update the live workpad comment with at least one embedded screenshot whose image is visible directly in Linear
  - confirm the resulting audit or helper output records the workpad comment id plus the Linear asset URL
  - confirm the updated docs or worker guidance explicitly distinguishes embedded direct proof from linked-only proof
- Monitoring / alerts:
  - rely on existing provider Linear audit output and live Linear issue context for this bounded lane

## Open Questions
- Whether workpad-only embedding is sufficient long-term or whether a later follow-up should add a separate generic proof-comment helper. This lane does not require that broader surface unless the workpad path proves insufficient.

## Approvals
- Reviewer: `codex-orchestrator docs-review (failed-other, manual fallback accepted)`
- Date: 2026-04-02
