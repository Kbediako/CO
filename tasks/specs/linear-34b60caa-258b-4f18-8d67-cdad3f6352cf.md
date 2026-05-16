---
id: 20260415-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf
title: CO STATUS: prune stale in_progress provider rows when released terminal claim has no live worker
status: done
relates_to: docs/PRD-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md
risk: high
owners:
  - Codex
last_review: 2026-05-16
review_notes:
  - 2026-05-16: CO-545 strict spec-guard audit reclassified this stale Apr 14/15 row as inactive done; live `node bin/codex-orchestrator.js linear issue-context --issue-id 34b60caa-258b-4f18-8d67-cdad3f6352cf --format json` verified CO-192 is Linear Done/completed and attached/related PR evidence https://github.com/Kbediako/CO/pull/487. No completed_at was inferred or fabricated.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- PRD: `docs/PRD-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- Task checklist: `tasks/tasks-linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- `.agent` mirror: `.agent/task/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`

## Traceability
- Linear issue: `CO-192` / `34b60caa-258b-4f18-8d67-cdad3f6352cf`
- Linear URL: https://linear.app/asabeko/issue/CO-192
- Source anchor: `ctx:sha256:4988a9186e7944a1d681ff5093420160eb74c672f2c5a221f19b80c33cae1199#chunk:c000001`
- Origin manifest: `.runs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf-docs-packet/cli/2026-04-15T15-17-13-513Z-1f05f920/manifest.json`

## Summary
- Objective: make `CO STATUS` JSON non-active classification prefer terminal released provider-intake truth over stale `in_progress` manifest/proof evidence when the worker PID is dead, the issue state is completed, the PR is merged, and no same-issue worker is live.
- Scope:
  - docs-first registration for `CO-192`
  - active projection semantics for `co-status --format json`
  - pruning from `counts.issues`, `counts.running`, active `issues[]`, and active-looking `provider_debug_snapshot.claim`
  - preservation of stale manifests/proofs and provider-intake history as audit/debug evidence
  - preservation of `CO-182` terminal-release pruning and `CO-189` live-worker released-pending-reopen behavior
- Constraints:
  - child lane owns docs packet and registry mirrors only
  - parent owns implementation, source/test edits, Linear state, workpad, validation, and PR lifecycle
  - do not solve by destructively clearing `.runs` or `provider-intake-state.json`

## Issue-Shaping Contract
- User-request translation carried forward: stale `in_progress` manifest/proof evidence must not dominate terminal released provider-intake truth when the worker is dead and the PR is merged; `co-status --format json` should report only genuinely active work.
- Protected terms / exact artifact and surface names: `CO STATUS`, `co-status --format json`, `provider-intake-state.json`, `provider_issue_released:not_active`, `provider_issue_released_pending_reopen`, `issue_state_type: completed`, `in_progress`, dead worker PID, merged PR, `counts.issues`, `counts.running`, `issues[]`, `provider_debug_snapshot.claim`.
- Nearby wrong interpretations to reject: deleting stale manifests, changing Linear states, hiding all released history, counting all stale active-looking proofs, hiding `CO-189` live same-issue workers, weakening `CO-182`, broad renderer redesign, or scheduler/admission changes.
- Explicit non-goals carried forward: no Linear mutation from this child lane, no implementation/test edits from this child lane, no destructive artifact cleanup, no issue-by-id burn expansion, and no terminal UI redesign.

## Parity / Alignment Matrix
- Current truth:
  - retained provider-intake claims can correctly say `released` / `provider_issue_released:not_active`.
  - issue metadata can say `issue_state_type: completed`.
  - stale run manifests or proofs can still say `in_progress` after worker PID death and PR merge.
  - status projection can let those stale active-looking artifacts dominate active counts/rows.
- Reference truth:
  - active JSON counts should represent current live work.
  - terminal provider-intake and closeout evidence should demote stale active-looking artifacts when no worker is live.
  - live same-issue worker evidence is the only safe reason to preserve or rehydrate active status for released-pending-reopen rows.
- Target truth / intended delta:
  - released/not-active completed no-live-worker rows are pruned from active JSON projection despite stale `in_progress` artifacts.
  - `counts.issues`, `counts.running`, `issues[]`, and `provider_debug_snapshot.claim` share the same active classifier.
  - stale manifests/proofs remain historical evidence.
  - `CO-182` and `CO-189` invariants remain intact.
- Explicitly out-of-scope differences:
  - changing Linear labels, workflow states, or workpads
  - changing provider worker admission or scheduler behavior
  - clearing local state history as the main fix
  - broad renderer/dashboard redesign

## Technical Requirements
- Functional requirements:
  - classify a retained provider row as non-active for status projection when provider-intake is released/not-active, `issue_state_type: completed`, worker PID is dead, PR is merged, and no same-issue worker is live.
  - ensure stale `in_progress` manifests/proofs cannot override that non-active classification.
  - prune the row from `counts.issues`, `counts.running`, and active `issues[]`.
  - ensure `provider_debug_snapshot.claim` cannot make the row look active.
  - preserve `CO-182` terminal-release pruning.
  - preserve `CO-189` released-pending-reopen active visibility when current same-issue worker evidence is genuinely live.
  - preserve historical/audit access to stale manifests, proofs, and provider-intake rows.
  - treat unknown liveness or missing closeout evidence conservatively instead of assuming terminal state from absence alone.
- Non-functional requirements:
  - keep the change local to status/read-model projection or existing provider-intake reconciliation seams.
  - avoid new unbounded Linear/GitHub polling.
  - keep JSON output backward compatible except for corrected active pruning/classification.
  - keep debug output sanitized.
- Interfaces / contracts:
  - `co-status --format json`
  - `counts.issues`
  - `counts.running`
  - `issues[]`
  - `provider_debug_snapshot.claim`
  - `provider-intake-state.json`
  - retained run manifests and provider-worker proof artifacts

## Architecture & Data
- Architecture / design adjustments:
  - add or reuse one shared active-status classifier so counts, rows, and debug claim projection cannot drift.
  - make classifier ordering explicit: live same-issue worker evidence can preserve active status, but terminal released provider-intake plus dead worker/merged PR evidence demotes stale active-looking artifacts.
  - preserve retained artifacts as historical sources and prune only active projection.
- Data model changes / migrations:
  - no migration expected.
  - no required schema change to `provider-intake-state.json`.
  - optional additive debug markers are acceptable only if backward compatible and not active-looking.
- External dependencies / integrations:
  - local process liveness checks or fixture equivalents for worker PID
  - merged PR closeout evidence, preferably from existing local proof/manifest state
  - live or cached Linear issue state metadata already available to status projection

## Acceptance Criteria
1. `co-status --format json` excludes the stale terminal no-live-worker row from `counts.issues`.
2. `co-status --format json` excludes the stale terminal no-live-worker row from `counts.running`.
3. Active `issues[]` excludes the stale terminal no-live-worker row.
4. `provider_debug_snapshot.claim` does not show the stale terminal row as active.
5. A stale `in_progress` manifest/proof cannot outrank released/not-active completed provider-intake truth when worker PID is dead and PR is merged.
6. `CO-182` terminal release pruning remains covered.
7. `CO-189` released-pending-reopen live same-issue worker visibility remains covered.
8. Historical manifests/proofs remain inspectable.

## Validation Plan
- Tests / checks:
  - parent-owned focused coverage for stale `in_progress` manifest/proof plus released/not-active completed provider-intake row with dead worker PID and merged PR
  - parent-owned focused coverage preserving `CO-182` terminal release pruning
  - parent-owned focused coverage preserving `CO-189` live same-issue worker visibility
  - parent-owned focused coverage proving stale manifests/proofs remain historical/audit evidence
  - parent runs `node scripts/spec-guard.mjs --dry-run` after accepting the docs packet
- Validation command from the issue:
  - `co-status --format json`
- Manual/fixture verification:
  - inspect `counts.issues`
  - inspect `counts.running`
  - inspect `issues[]`
  - inspect `provider_debug_snapshot.claim`
  - inspect retained manifest/proof paths only to confirm they remain available as history

## Readiness Gate
- Not done if:
  - stale `in_progress` manifests/proofs still dominate terminal released provider-intake truth
  - dead-worker merged-PR completed rows remain active
  - live `CO-189` same-issue worker rows are hidden
  - `CO-182` terminal pruning regresses
  - historical artifacts are deleted instead of demoted
- Pre-implementation issue-quality review evidence:
  - 2026-04-15: child lane self-review confirms the issue is a status JSON projection precedence lane, not a provider admission, Linear workflow, state cleanup, or terminal UI redesign lane. The micro-task path is ineligible because correctness depends on exact surfaces and adjacent invariant preservation.
- Safeguard ownership split:
  - child lane owns only the listed docs/task files and registry mirrors
  - parent lane owns implementation, focused tests, validation, Linear integration, and PR lifecycle

## Open Questions
- Which projection helper should own the shared classifier so stale-manifest demotion and live-worker preservation cannot diverge?
- Can merged PR evidence be obtained from existing proof/manifest state without extra request burn?
- Should pruned stale claims be surfaced in a debug-only historical bucket in a later lane?

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-15
