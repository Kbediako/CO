---
id: 20260331-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be
title: CO: Reconcile provider-worker child-stream delegation evidence with delegation guard
relates_to: docs/PRD-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md
risk: high
owners:
  - Codex
last_review: 2026-03-31
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`
- PRD: `docs/PRD-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`
- Task checklist: `tasks/tasks-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md`

## Traceability
- Linear issue: `CO-56` / `fabdf855-dd07-4f8d-8ffa-f02d22cb27be`
- Linear URL: https://linear.app/asabeko/issue/CO-56/co-reconcile-provider-worker-child-stream-delegation-evidence-with

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: reconcile top-level provider-worker delegation checks with the worker's real audited child-run artifact location so workspace-scoped child manifests satisfy `delegation-guard` without weakening the guard.
- Scope:
  - register the docs-first packet for `linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be`
  - add a narrow provider-worker-aware delegated-manifest search expansion inside `scripts/delegation-guard.mjs`
  - add focused regression coverage for the workspace-scoped child-manifest case plus the fail-closed absence case
  - update provider-worker workflow guidance where audited child-stream / child-lane delegation expectations are described
- Constraints:
  - keep the change provider-worker-specific and metadata-driven
  - do not weaken top-level delegation enforcement or replace it with routine override text
  - preserve the current workspace-scoped child-stream / child-lane artifact contract

## Technical Requirements
- Functional requirements:
  - when the active top-level task is a provider-worker issue workspace, `delegation-guard` must inspect the active manifest and derive any additional audited workspace-scoped runs root needed to find child manifests
  - the guard must recognize child-stream and child-lane evidence by their child task directories and manifests, regardless of whether those child manifests live under the inherited shared root or the workspace-scoped root
  - the guard must continue to fail when no delegated child manifest exists in any sanctioned search root
  - operator guidance must explicitly say valid audited child-stream / child-lane evidence satisfies the guard in provider-worker lanes
- Non-functional requirements (performance, reliability, security):
  - keep filesystem inspection bounded to sanctioned runs roots derived from the active manifest and existing env contract
  - avoid broad recursive scans or implicit fallback to unrelated directories
  - preserve current guard output quality by reporting the expected search roots and candidate manifests truthfully
- Interfaces / contracts:
  - `scripts/delegation-guard.mjs`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `skills/linear/SKILL.md`
  - `tests/delegation-guard.spec.ts`

## Architecture & Data
- Architecture / design adjustments:
  - derive delegated-manifest search roots from the active provider-worker manifest rather than from the inherited `runsDir` alone
  - keep the authoritative shared-root runs dir in the search set so existing behavior remains unchanged for tasks that still write there
  - add provider-worker-specific wording to the worker prompt and Linear skill so the documented contract matches the guard behavior
- Data model changes / migrations:
  - none; this is a search-root and documentation reconciliation only
- External dependencies / integrations:
  - active provider-worker manifest at `CODEX_ORCHESTRATOR_MANIFEST_PATH`
  - workspace path carried in `workspace_path`
  - child-stream and child-lane launch helpers that already sanitize child artifacts into `<workspace>/.runs`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - provider-worker workspace-path guard regression in `tests/delegation-guard.spec.ts`
  - provider-worker fail-closed regression in `tests/delegation-guard.spec.ts`
  - required repo validation floor after implementation
- Rollout verification:
  - confirm the guard now passes when a workspace-scoped child manifest exists even if `CODEX_ORCHESTRATOR_RUNS_DIR` still points to the shared root
  - confirm the same provider-worker context still fails when that workspace-scoped child manifest is absent
- Monitoring / alerts:
  - rely on guard logs, focused tests, and provider-worker workpad validation evidence

## Open Questions
- Resolved in planning: this lane will not widen into a generic `run-manifests.js` artifact-root redesign unless later evidence shows another concrete consumer needs the same provider-worker-specific search-root expansion.

## Approvals
- Reviewer: codex-orchestrator docs-review
- Status: approved
- Date: 2026-03-31
- Evidence: `.runs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be-docs-review/cli/2026-03-31T08-23-01-823Z-0c86b6cb/manifest.json`, `.runs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be-docs-review/cli/2026-03-31T08-23-01-823Z-0c86b6cb/review/telemetry.json`
