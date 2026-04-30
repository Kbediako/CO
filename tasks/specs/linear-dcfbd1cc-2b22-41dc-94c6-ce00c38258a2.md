---
id: 20260330-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2
title: CO Fix stale merge-handoff after successful provider-worker review handoff
status: done
owner: Codex
created: 2026-03-30
last_review: 2026-04-30
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md
related_action_plan: docs/ACTION_PLAN-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md
related_tasks:
  - tasks/tasks-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md
review_notes:
  - 2026-04-30: CO-428 live Linear audit confirmed CO-40 is `Done`; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-03-30` so historical implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-03-30: Opened from Linear issue `CO-40` in the provider-worker workspace using issue id `dcfbd1cc-2b22-41dc-94c6-ce00c38258a2`.
  - 2026-03-30: The packaged `linear issue-context` read succeeded before any transition; the live CO workflow states expose `In Progress`, `In Review`, `Merging`, and `Rework`, and the issue was moved from `Ready` to `In Progress`.
  - 2026-03-30: The single active `## Codex Workpad` comment was created after the state transition, and the detached workspace was resynced onto branch `linear/co-40-stale-merge-handoff` from `origin/main`.
  - 2026-03-30: Required baseline artifacts were audited: the current control-host intake state now shows `CO-30` and `CO-38` released as `provider_issue_released:not_active`, while both historical provider-worker proofs show `owner_phase: ended`, `owner_status: succeeded`, and review-handoff completion.
  - 2026-03-30: Code inspection narrowed the stale merge-handoff seam to `discoverProviderIssueRuns` and related status helpers in `providerIssueHandoff.ts`: terminal failure proof already overrides a stale `in_progress` manifest, but terminal success proof does not, so control-host can keep `provider_issue_rehydrated_active_run` truth past successful review handoff.
  - 2026-03-30: Initial child `docs-review` invocation was launched before the CO-40 docs packet existed and failed delegation-guard setup; rerun is required after docs registration.
  - 2026-03-30: Pre-implementation approval: proceed with the smallest fix that generalizes proof authority to terminal success without weakening older-manifest or foreign-run safeguards.
  - 2026-03-30: Child `docs-review` rerun succeeded at `.runs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2-co-40-docs-review/cli/2026-03-30T00-51-39-696Z-5b6b4a29/manifest.json`; the two P2 findings were resolved by correcting the non-interactive standalone-review command and the CO-38 proof reference.
---

# Technical Specification

## Context

`CO-30` and `CO-38` already proved that provider workers can end truthfully at review handoff, attach or update the right Linear/workpad state, and leave behind provider-worker proof sidecars showing terminal success. The missing seam is later in control-host reconciliation. If control-host still sees an `in_progress` manifest while the worker proof already says `ended/succeeded`, it can keep a stale `running` claim and treat the issue as occupied, which blocks the later `Merging` continuation path until an operator intervenes manually.

## Requirements

1. Reclassify provider issue runs from terminal successful proof when the manifest still says `in_progress` but the proof is at least as fresh as the manifest.
2. Keep legitimate active runs active when proof is absent, malformed, or older than the manifest.
3. Ensure rehydrate and direct accepted-issue handling no longer persist `state: running` in the stale-success case.
4. Preserve the distinction between:
   - active run in progress
   - prior completed successful run
   - eligible continuation after later `Merging`
   - explicit released/non-active state
5. Add focused `ProviderIssueHandoff` regressions for the stale-success proof timing class, including later `Merging` continuation.
6. Capture a closeout-proof artifact tied to a real issue/PR merge-handoff class (`CO-30` or `CO-38`).

## Current Truth

- `providerIssueHandoff.ts` currently trusts provider-worker proof sidecars only for terminal failure when `manifest.status` still says `in_progress`.
- The same helper does not treat terminal success as authoritative, so a finished review-handoff worker can still be discovered as `in_progress`.
- Rehydrate then re-persists the claim as `state: running`, `reason: provider_issue_rehydrated_active_run`, which is the stale truth this issue targets.
- Later continuation logic for `Merging` already exists, but it can only execute if the prior run is recognized as terminal history instead of a still-active run.

## Validation Plan

- Child `docs-review` rerun succeeded after packet registration; keep the manifest and review output linked for the packet approval record.
- Add focused `ProviderIssueHandoff` regressions for:
  - stale running claim + `in_progress` manifest + terminal-success proof -> terminal reclassification
  - same setup plus later `Merging` update -> truthful continuation instead of active-run block
- Run the required validation floor, then record standalone review and elegance review before any handoff.
- Emit at least one closeout-proof artifact under `out/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2/manual/`.

## Manifest Evidence

- Control-host intake state: `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`
- `CO-30` provider-worker proof: `/Users/kbediako/Code/CO/.runs/linear-f6e514fa-352e-4d82-97e2-08667e32e586/cli/2026-03-29T02-19-33-956Z-a40ae5da/provider-linear-worker-proof.json`
- `CO-38` provider-worker proof: `/Users/kbediako/Code/CO/.runs/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60/cli/2026-03-29T20-44-06-912Z-3f073605/provider-linear-worker-proof.json`
- Relevant implementation seam: `orchestrator/src/cli/control/providerIssueHandoff.ts`
