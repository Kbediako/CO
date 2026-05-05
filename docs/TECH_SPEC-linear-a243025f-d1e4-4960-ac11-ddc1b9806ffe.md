---
id: 20260505-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe
title: CO-462 run-review override-prefixed mock cleanup
relates_to: docs/PRD-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md
risk: medium
owners:
  - Codex
last_review: 2026-05-05
related_action_plan: docs/ACTION_PLAN-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md
task_checklists:
  - tasks/tasks-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md
---

This TECH_SPEC mirrors `tasks/specs/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`; keep the canonical task spec and this docs-facing mirror aligned.

## Summary
- Objective: clean up run-review fake Codex mock processes when config overrides appear before the `review` subcommand.
- Scope: focused `tests/run-review.spec.ts` helper/regression, exact-path process matching, focused validation, and process-health proof.
- Constraints: no provider-worker admission changes, no generic process supervisor rewrite, no cleanup of unrelated user processes.

## Issue-Shaping Contract
- User-request translation carried forward: CO-462 is a CO-205 follow-up variant for `codex-mock.sh -c mcp_servers.delegation.enabled=true review ...` processes that can survive test cleanup.
- Protected terms / exact artifact and surface names: `run-review`, `tests/run-review.spec.ts`, `codex-mock.sh`, `-c mcp_servers.delegation.enabled=true review`, `process-health checks`, `CO-205`.
- Nearby wrong interpretations to reject: provider-worker admission blocker, queue recovery, live worker kill lane, status-output filtering, broad process supervisor rewrite, basename-only process cleanup.
- Explicit non-goals carried forward: no provider/Linear behavior changes, no manual host orphan cleanup as completion, no real review process cleanup, no broad run-review rewrite.

## Technical Requirements
- Match the exact sandbox fake Codex binary path.
- Recognize config override flags before the `review` subcommand.
- Preserve direct `codex-mock.sh review` cleanup.
- Add override-prefixed regression coverage.
- Keep passive process-health evidence truthful.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Remove the stale direct-only matching seam for override-prefixed fake review commands.
- Retain the exact fake-binary cleanup finalizer as supported test-harness safety behavior.

## Validation Plan
- Focused run-review regression for override-prefixed hanging mock cleanup.
- Existing direct hanging mock cleanup regression.
- `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- `node scripts/spec-guard.mjs --dry-run`.
- Passive process-health scan for stale `codex-mock.sh` review mocks.
