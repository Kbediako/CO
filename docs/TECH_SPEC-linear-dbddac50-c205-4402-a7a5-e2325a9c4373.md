---
id: 20260402-linear-dbddac50-c205-4402-a7a5-e2325a9c4373
title: CO: Restore clean full-suite Vitest exit for provider-worker validation
relates_to: docs/PRD-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md
risk: high
owners:
  - Codex
last_review: 2026-04-02
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`
- PRD: `docs/PRD-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`
- Task checklist: `tasks/tasks-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`

## Traceability
- Linear issue: `CO-69` / `dbddac50-c205-4402-a7a5-e2325a9c4373`
- Linear URL: https://linear.app/asabeko/issue/CO-69/co-restore-clean-full-suite-vitest-exit-for-provider-worker-validation
- Source issue: `CO-50` / `6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore truthful operator interpretation of the full-suite Vitest exit path in CO provider-worker workspaces by proving whether the current tree really hangs or merely runs quietly for longer than earlier diagnostic ceilings.
- Scope:
  - register the docs-first packet for `linear-dbddac50-c205-4402-a7a5-e2325a9c4373`
  - reproduce the apparent current-workspace full-suite hang with machine-checkable evidence
  - isolate whether the owner is a real lingering process or a false timeout during the slow late tail
  - land the smallest fix or explicit fallback that preserves full-suite truth
  - document the final owner or fallback for future provider-worker lanes
- Constraints:
  - no skipped `npm run test`
  - no force-kill fallback that could hide failures
  - no broad unrelated Vitest refactor unless a narrow fix proves insufficient

## Technical Requirements
- Functional requirements:
  - reproduce the apparent hang with a deterministic command or evidence-backed classification of which command shapes are actually terminal
  - identify the smallest owner of the late-tail behavior after late green suites
  - restore or preserve a clean terminal success exit for the approved full-suite validation path
  - preserve truthful non-zero exits for real failures
  - document the root cause or approved fallback in the issue packet and workpad
- Non-functional requirements (performance, reliability, security):
  - keep changes bounded and auditable
  - preserve full-suite coverage
  - keep evidence machine-checkable for provider-worker handoffs
- Interfaces / contracts:
  - `package.json` `test` scripts
  - `vitest.config.core.ts`
  - any test helpers or runtime services that hold active handles open
  - provider-worker validation commands and review handoff contract

## Architecture & Data
- Architecture / design adjustments:
  - start with reproduction from the user-cited full-suite command surfaces
  - compare default `npm run test` with direct `vitest run` shapes only as needed to isolate the owner
  - if the owner is a specific leaking handle or service, fix shutdown at that owner rather than adding global cleanup
  - if only an explicit fallback is viable, it must keep truthful full-suite coverage and exit semantics machine-checkable
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - Vitest
  - esbuild service lifetime where relevant
  - provider-worker validation and review workflow

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - deterministic reproduction of the apparent hang or explicit non-repro evidence for the approved full-suite command shape
  - explicit runbook validation for the chosen owner when no code change is required
  - required repo validation floor after implementation
- Rollout verification:
  - confirm the chosen full-suite path exits cleanly in this workspace
  - confirm real failures still fail truthfully
  - refresh the Linear workpad with exact commands and outcomes
- Monitoring / alerts:
  - rely on command logs, manifests, targeted evidence notes, and final review telemetry

## Open Questions
- The current default `npm run test` path is terminal on this tree; should the issue packet also classify the direct fallback shapes from the original issue body, or is the approved default path sufficient for provider-worker handoff?

## Approvals
- Reviewer: docs-review child stream rerun approved cleanly via `.runs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373-co-69-docs-review-rerun/cli/2026-04-02T10-02-03-042Z-c947ed42/manifest.json`
- Status: in progress
- Date: 2026-04-02
