---
id: 20260423-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46
title: CO: scope provider-linear parallelization proof invariants to the current turn
status: done
relates_to: docs/PRD-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md
risk: medium
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (22 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- PRD: `docs/PRD-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- Task checklist: `tasks/tasks-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- `.agent` mirror: `.agent/task/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`

## Traceability
- Linear issue: `CO-326` / `4ea68a3d-3832-4161-bab7-84dceeceeb46`
- Linear URL: https://linear.app/asabeko/issue/CO-326
- Source anchor: `ctx:sha256:b6dfe577e25cc512757f1fba35bab57fb685d968fa340ea712648248f38b1fd5#chunk:c000001`
- Docs packet child lane: `.runs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46-docs-packet/cli/2026-04-23T03-59-42-098Z-c11737dd/manifest.json`

## Summary
- Objective: scope provider-linear parallelization proof invariants to the current turn so valid earlier-turn decisions do not create false failed closeouts.
- Scope:
  - docs-first packet in this child lane
  - parent-owned proof invariant repair
  - parent-owned focused regressions and summary-surface validation
  - parent-owned registry, review, PR, Linear, and workpad lifecycle
- Constraints:
  - preserve strict exactly-one-decision-per-active-turn enforcement
  - preserve cumulative audit evidence in `provider-linear-worker-linear-audit.jsonl`
  - do not mask genuine worker failures or stale control-host errors
  - do not edit source or tests from this child lane

## Issue-Shaping Contract
- User-request translation carried forward: valid parallelization decisions recorded across multiple turns in one successful provider-linear run must not be treated as a current-turn duplicate failure.
- Protected terms / exact artifact and surface names: `provider-linear-worker-proof`, `parallelization_decision_multiple`, `owner_status=failed`, `manifest.status`, `runs.json`, `provider-linear-worker-linear-audit.jsonl`, `current-turn same-issue parallelization decision`.
- Nearby wrong interpretations to reject: weakening the parallelization contract, ignoring true same-turn duplicate decisions, hiding real worker failures, deleting audit rows, or changing unrelated closeout behavior.
- Explicit non-goals carried forward: no Linear mutation, no workpad update, no registry mirror update, no implementation, no test edits, no broad provider-worker closeout redesign from this child lane.

## Current / Reference / Target Truth
- Current / reported truth:
  - `CO-319` successfully moved through review handoff and closeout, including PR `#610` merge.
  - The same run still wrote failed proof/manifest/summary state because cumulative valid decisions across the run were interpreted as `parallelization_decision_multiple`.
- Reference truth:
  - A provider-linear worker turn requires one `current-turn same-issue parallelization decision`.
  - Multiple decisions across multiple turns are normal audit history, not a duplicate.
  - Multiple decisions inside the same turn remain invalid.
- Target truth / intended delta:
  - invariant evaluation receives only current-turn decisions for the same issue
  - prior-turn decisions remain visible as historical rows
  - successful closeout produces aligned success across proof, manifest, `runs.json`, and diagnostics
  - same-turn duplicate and missing-decision cases remain fail-closed
- Explicitly out-of-scope differences:
  - child-lane launch or acceptance semantics
  - Linear workflow transition design
  - stale claim reconciliation
  - operator dashboard redesign
  - audit retention policy changes

## Technical Requirements
- Functional requirements:
  - Select current-turn parallelization decisions by same issue and a refreshed audit cursor captured immediately after the current turn bootstrap proof is hydrated.
  - Reject zero current-turn decisions with the existing missing-decision failure.
  - Reject more than one current-turn decision with `parallelization_decision_multiple`.
  - Do not include prior-turn decisions in the duplicate count.
  - Preserve cumulative `provider-linear-worker-linear-audit.jsonl` history.
  - Keep proof/manifest/run-summary final state consistent after successful closeout.
- Non-functional requirements:
  - no new network calls
  - deterministic local artifact behavior
  - fail closed when the current-turn audit cursor or child-lane launch boundary cannot be established
  - small source delta localized to provider worker proof/failure resolution and any necessary summary reader
- Interfaces / contracts:
  - `provider-linear-worker-proof` must expose truthful `owner_status` and end reason
  - `manifest.status` must not be set to failed by earlier valid turn decisions
  - `runs.json` must not contradict proof/manifest success for the fixed shape
  - `provider-linear-worker-linear-audit.jsonl` remains the historical input

## Validation Plan
- Child lane:
  - protected-term `rg` over all six owned files
  - trailing-whitespace scan over all six owned files
- Parent lane:
  - focused multi-turn success regression with one valid decision per turn
  - focused true same-turn duplicate regression preserving `parallelization_decision_multiple`
  - focused missing current-turn decision regression
  - focused previous-turn and previous-attempt isolation regression
  - focused summary-surface assertion for `provider-linear-worker-proof`, `manifest.status`, and `runs.json`
  - scoped provider-linear worker vitest suite selected by parent
  - `node scripts/spec-guard.mjs --dry-run`
  - parent-selected docs-review / implementation gate

## Open Questions
- Resolved 2026-04-23: use a refreshed post-bootstrap same-issue audit cursor as the authoritative selector for current-turn decisions. Use `current_turn_started_at` with `attempt_started_at` fallback only for current-turn child-lane launch classification, not for the duplicate-decision cursor.
- Resolved 2026-04-23: the fixed failure path is `resolveProviderLinearWorkerParallelizationFailure(...)`; proof `owner_status` / `end_reason` feed manifest and run summary surfaces, so validation should assert the proof state and rerun summary-facing gates after current-main merge.

## Approvals
- Docs-first packet: same-issue docs child lane `.runs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46-docs-packet/cli/2026-04-23T03-59-42-098Z-c11737dd/manifest.json`
- Parent implementation validation: pending parent lane
- Parent review / PR lifecycle: pending parent lane
- Date: 2026-04-23
