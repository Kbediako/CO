---
id: 20260415-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf
title: CO STATUS: prune stale in_progress provider rows when released terminal claim has no live worker
relates_to: docs/PRD-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md
risk: high
owners:
  - Codex
last_review: 2026-04-15
---

## Canonical Spec
- Implementation contract: `tasks/specs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- PRD: `docs/PRD-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- Action plan: `docs/ACTION_PLAN-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- Checklist: `tasks/tasks-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`

## Traceability
- Linear issue: `CO-192` / `34b60caa-258b-4f18-8d67-cdad3f6352cf`
- Source anchor: `ctx:sha256:4988a9186e7944a1d681ff5093420160eb74c672f2c5a221f19b80c33cae1199#chunk:c000001`
- Origin manifest: `.runs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf-docs-packet/cli/2026-04-15T15-17-13-513Z-1f05f920/manifest.json`

## Scope
- Active projection for `co-status --format json`.
- Conflict ordering between retained provider-intake release truth and stale active-looking run manifests/proofs.
- Parent-owned implementation likely touches CO STATUS/read-model projection and focused status/provider-intake tests.
- This child lane owns docs packet and registry mirrors only.

## Required Behavior
- A provider-intake claim is non-active for CO STATUS when all of these are true:
  - claim is retained as `released` or not-active, including `provider_issue_released:not_active`
  - Linear issue metadata has `issue_state_type: completed`
  - worker PID/process evidence is dead or unavailable as a live same-issue process
  - associated PR evidence is merged or otherwise terminal closeout
  - no current same-issue provider worker is genuinely live
- Stale `in_progress` manifests or `provider-linear-worker-proof.json` data must not override that terminal provider-intake classification.
- `counts.issues`, `counts.running`, active `issues[]`, and active-looking `provider_debug_snapshot.claim` must use the same non-active classification.
- Retained manifests, proofs, and `provider-intake-state.json` rows remain available for historical/audit inspection.
- Preserve `CO-182`: terminal released completed rows remain pruned from active status.
- Preserve `CO-189`: released-pending-reopen rows with fresh started issue truth and attachable same-issue live run evidence remain visible and counted while intake rehydrates.

## Non-Goals
- No state-file migration or destructive cleanup of `.runs` history.
- No provider scheduler redesign, admission policy change, or Linear workflow mutation.
- No child-lane implementation or test edits.
- No broad terminal UI redesign.

## Acceptance Criteria
1. `co-status --format json` excludes the stale terminal no-live-worker row from `counts.issues`.
2. `co-status --format json` excludes the stale terminal no-live-worker row from `counts.running`.
3. Active `issues[]` excludes the stale terminal no-live-worker row.
4. `provider_debug_snapshot.claim` does not present the stale terminal row as an active provider claim.
5. Focused coverage proves a stale `in_progress` manifest/proof cannot outrank released/not-active completed provider-intake truth when the worker PID is dead and PR is merged.
6. Focused coverage proves a genuinely live same-issue worker from the `CO-189` shape remains visible.
7. Focused coverage proves `CO-182` terminal release pruning still works.
8. Historical manifests/proofs remain readable and are not deleted as part of the active projection fix.

## Validation Plan
- Child lane:
  - create docs-first packet and registry mirrors only
  - run scoped parse/reference checks for touched docs/JSON
- Parent lane:
  - focused status projection regression for released/not-active + `issue_state_type: completed` + dead worker PID + merged PR + stale `in_progress` manifest/proof
  - focused regression preserving `CO-189` live same-issue released-pending-reopen visibility
  - focused regression preserving `CO-182` terminal release pruning
  - `co-status --format json` proof after implementation
  - normal spec guard, review, and validation gates before PR lifecycle

## Readiness Gate
- Pre-implementation issue-quality review:
  - 2026-04-15: this packet confirms `CO-192` is a projection precedence bug. It is not a state cleanup lane, not a Linear workflow lane, and not a provider scheduler lane. Correctness depends on exact protected surfaces, so the micro-task path is ineligible.
- Not done if:
  - stale active-looking manifests/proofs dominate terminal released provider-intake truth
  - dead-worker merged-PR completed rows remain active in JSON
  - live same-issue workers from `CO-189` are hidden
  - historical/audit artifacts are deleted instead of demoted from active projection

## Open Questions
- Which current helper already combines run manifest/proof state with provider-intake and CO STATUS issue projection?
- Should debug-only JSON expose a separate historical bucket for pruned stale rows, or should this lane keep debug output active-only?
- What parent-owned fixture best captures merged PR evidence without adding live GitHub request burn?

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-15
