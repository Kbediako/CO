---
id: 20260409-linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827
title: Reduce practical Linear request-bucket exhaustion under low-headroom single-issue operation
relates_to: docs/PRD-linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827.md`
- PRD: `docs/PRD-linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827.md`
- Task checklist: `tasks/tasks-linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827.md`

## Traceability
- Linear issue: `CO-110` / `bd8ae57a-71b5-4eb9-9b69-70841cc16827`
- Linear URL: https://linear.app/asabeko/issue/CO-110/reduce-practical-linear-request-bucket-exhaustion-under-low-headroom
- Follow-up to: `CO-106` / `95f1c334-e623-471e-a013-d7019feed423`

## Summary
- Objective: reduce practical request-bucket burn under low-headroom single-issue operation without weakening the truthful shared-budget contract landed in `CO-106`.
- Scope:
  - add earlier reset-aware request slowdown to shared polling interval selection
  - reuse fresh scoped `issue-context` truth on the read-only provider helper path when request headroom is already degraded
  - add focused regression coverage and proof artifacts around request-vs-complexity behavior
- Constraints:
  - keep `CO-106` budgeting, reservation, merge, and fail-fast semantics intact
  - do not broaden into provider-control-plane redesign
  - keep cooldown fail-fast truthful even when cache exists

## Implementation Boundary
- Shared budget / polling:
  - keep `resolveLinearBudgetPreflight(...)` behavior intact
  - teach `resolveLinearPollingInterval(...)` to consider reset-aware request headroom floors before the request bucket hits current hardcoded low/exhausted thresholds
- Provider helper reads:
  - keep mutation flows on the current revalidation contract
  - allow the top-level read-only `issue-context` path to return a recent scoped cached snapshot when request pressure is already degraded and the cache is still inside a bounded freshness window
- Audit / proof:
  - use existing `.runs` worker proof, worker audit, and local control-host intake artifacts to describe before/after request-burn behavior

## Design
- Earlier slowdown:
  - compute a request-headroom-derived minimum polling interval from request `remaining` and `reset_at`
  - select the tighter request bucket for the current operation, including endpoint request buckets when present
  - keep cooldown and exhausted paths dominant; reset-aware slowdown only applies before fail-fast would trigger
- Cache reuse:
  - reuse the scoped issue-context cache only for read-only `getProviderLinearIssueContext(...)`
  - require bounded freshness plus degraded request headroom
  - preserve live reads when headroom is healthy so the normal truth path stays authoritative
- Guardrails:
  - no cache-based bypass during active cooldown
  - no broad mutation trust-window expansion in this lane

## Validation
- `linear child-stream --pipeline docs-review`
- focused regressions in:
  - `orchestrator/tests/LinearBudgetState.test.ts`
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- local proof cross-checks against:
  - `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `/Users/kbediako/Code/CO/.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/provider-linear-worker-proof.json`
  - `/Users/kbediako/Code/CO/.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/provider-linear-worker-linear-audit.jsonl`
- full repo validation floor plus standalone review and elegance review before handoff

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream rerun failed only on the repo-wide `docs:freshness` stale-doc baseline after `spec-guard` and `docs:check` passed and the repo-supported `docs:archive-tasks` fallback repaired the `docs/TASKS.md` line budget; manual fallback accepted
- Date: 2026-04-09
- Manifest: `.runs/linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827-docs-review-rerun/cli/2026-04-08T14-52-46-037Z-dc982d9a/manifest.json`
- Review telemetry: fallback note at `out/linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827/manual/20260408T145246Z-docs-review-fallback.md`
