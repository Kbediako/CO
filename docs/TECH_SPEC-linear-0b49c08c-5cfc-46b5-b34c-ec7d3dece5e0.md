---
id: 20260409-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0
title: CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces
relates_to: docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- PRD: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- Task checklist: `tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`

## Traceability
- Linear issue: `CO-88` / `0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- Linear URL: https://linear.app/asabeko/issue/CO-88/co-repo-wide-cleanup-of-stale-compatibility-debt-contradictory-docs
- Follow-up to: `CO-77` / `da28812d-8367-4d94-a273-d0652535f818`

## Summary
- Objective: land one integrated cleanup pass that removes stale compatibility debt and placeholder or contradictory truth surfaces across code, docs, task packets, instructions, and package contracts.
- Scope:
  - reconcile stale selected-run, review-launch, SDK, design-system, template, and archive/instruction seams
  - correct touched docs/specs/tasks/instructions in the same lane
  - make explicit keep-or-delete decisions for compatibility candidates
  - run the normal validation and review gates before any review handoff
- Constraints:
  - keep `CO-82` and `CO-83` out of scope
  - prefer deletion or collapse over preserving dead compatibility
  - if a seam stays, record the live consumer and rationale

## Implementation Boundary
- Cleanup targets:
  - removed legacy selected-run presenter module versus the current `uiDataController.ts` and `operatorDashboardPresenter.ts` story
  - uppercase `.agent/task/*_TEMPLATE.md` duplicates versus `.agent/task/templates/*`
  - review-launch compatibility behavior in `scripts/lib/review-launch-attempt.ts` and `scripts/run-review.ts`
  - stale `gpt-5.3-*` posture claims where the active repo target is `gpt-5.4`
  - `packages/sdk-node` artifact contract truth
  - `packages/design-system` and design-reference task/spec claims
  - stale instruction/archive/demo surfaces such as `docs/AGENTS.md`, `.agent/AGENTS.md`, the old MCP code-mode report archive, and `packages/orchestrator-status-ui/app.js`
  - compatibility candidates such as `orchestrator/src/sync/**`, the former shared stdio shim, `pipelineResolver.ts`, `rlmCodexRuntimeShell.ts`, and `requiresCloud` vs `requires_cloud`
- Registry/docs integrity:
  - register the new packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - apply the repo-supported task-archive fallback immediately if the new snapshot exceeds the `docs/TASKS.md` budget

## Design
- Classify each seam as remove, retain-with-rationale, or follow-up.
- Prefer canonical-reference rewrites and deletion over keeping duplicate placeholder surfaces.
- Convert stale present-tense historical wording into explicit historical wording when deletion is not appropriate.
- Keep the cleanup bounded to the named contradictions and any directly adjacent truth surfaces needed to make the result coherent.

## Validation
- audited `linear child-stream --pipeline docs-review`
- focused runtime/package/review seam tests
- full repo validation floor
- standalone review and explicit elegance/minimality pass before handoff

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-09
