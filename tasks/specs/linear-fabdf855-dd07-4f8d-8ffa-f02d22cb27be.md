---
id: 20260331-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be
title: CO: Reconcile provider-worker child-stream delegation evidence with delegation guard
status: done
owner: Codex
created: 2026-03-31
last_review: 2026-05-01
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md
related_action_plan: docs/ACTION_PLAN-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md
related_tasks:
  - tasks/tasks-linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be.md
review_notes:
  - 2026-05-01: CO-454 live Linear audit confirmed CO-56 is `Done`; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-03-31` so historical implementation evidence remains preserved without staying in active-spec freshness. Evidence: `codex-orchestrator linear issue-context --issue-id fabdf855-dd07-4f8d-8ffa-f02d22cb27be --format json`.
  - 2026-03-31: Opened from Linear issue `CO-56` in the provider-worker workspace using the issue id `fabdf855-dd07-4f8d-8ffa-f02d22cb27be`.
  - 2026-03-31: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`, `Done`), showed no attached PR and no existing workpad, and the issue was transitioned from `Ready` to `In Progress` before active work.
  - 2026-03-31: Current provider-worker env in this run carries `CODEX_ORCHESTRATOR_ROOT=/Users/kbediako/Code/CO/.workspaces/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be` and `CODEX_ORCHESTRATOR_RUNS_DIR=/Users/kbediako/Code/CO/.runs`, which explains why top-level `delegation-guard` currently searches only the shared-root artifact path.
  - 2026-03-31: `providerLinearChildStreamShell` and `providerLinearChildLaneShell` already sanitize child run artifacts back into the issue workspace via `<workspace>/.runs`, so the mismatch is in top-level delegated-manifest discovery rather than child launch behavior.
  - 2026-03-31: Pre-implementation approval: proceed with a narrow provider-worker-only reconciliation that derives extra delegated-manifest search roots from audited manifest/workspace metadata; do not widen into a generic artifact-root redesign.
  - 2026-03-31: Delegated docs-review succeeded via `.runs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be-docs-review/cli/2026-03-31T08-23-01-823Z-0c86b6cb/manifest.json` with `review_outcome=clean-success` and `termination_boundary=null`.
---

# Technical Specification

## Context

This issue exists because the current provider-worker validation environment mixes a workspace root with a shared-root runs directory. The active top-level provider-worker manifest records `workspace_path` for the issue workspace, and the child-stream / child-lane launch helpers intentionally sanitize child artifacts into `<workspace>/.runs`. Top-level `delegation-guard`, however, still trusts the inherited `CODEX_ORCHESTRATOR_RUNS_DIR` alone, so it misses valid delegated child manifests in the workspace-scoped artifact root and tells the worker that no delegated evidence exists.

## Requirements

1. Keep top-level delegation enforcement intact for provider-worker lanes; the fix must not turn valid provider-worker parent tasks into automatic exemptions.
2. Reconcile top-level delegated-manifest discovery so provider-worker tasks can find child-stream and child-lane manifests written into the active issue workspace's audited artifact root.
3. Preserve fail-closed behavior when no delegated child evidence exists in any sanctioned search root.
4. Keep the change bounded to provider-worker issue workspaces and avoid a generic artifact-root policy rewrite.
5. Update worker-facing guidance where provider-worker delegation expectations are described so audited child-stream / child-lane evidence is explicitly treated as the intended answer instead of override text.
6. Add focused regression coverage for the mixed-root provider-worker case that failed during CO-45 validation.

## Issue-Shaping Contract

- User-request translation carried forward: accept real provider-worker child evidence where it actually lands on disk, not where the inherited shared-root env says it should land.
- Protected terms / exact artifact and surface names:
  - `node scripts/delegation-guard.mjs`
  - `linear child-stream`
  - `linear child-lane`
  - `provider-linear-worker`
  - `workspace_path`
  - `CODEX_ORCHESTRATOR_ROOT`
  - `CODEX_ORCHESTRATOR_RUNS_DIR`
- Nearby wrong interpretations to reject:
  - use `DELEGATION_GUARD_OVERRIDE_REASON` for routine provider-worker validation when valid child evidence exists
  - redirect all provider-worker child artifacts back to the shared root
  - solve the issue by weakening `delegation-guard` for all top-level tasks
- Explicit non-goals carried forward:
  - no generic artifact-root refactor
  - no control-host contract redesign
  - no relaxation of top-level delegation requirements

## Parity / Alignment Matrix

- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth: top-level provider-worker validation searches the shared-root `runsDir`, while child-stream and child-lane manifests are written under the issue workspace's `.runs` root.
- Reference truth: the documented provider-worker workflow treats audited child-stream and child-lane runs as the sanctioned delegation evidence path.
- Target truth / intended delta: `delegation-guard` searches both the inherited shared-root runs dir and the active provider-worker workspace runs dir derived from audited manifest metadata.
- Explicitly out-of-scope differences: non-provider-worker run types and unrelated artifact-root behavior stay unchanged.

## Readiness Gate

- Not done if:
  - `delegation-guard` still fails when valid workspace-scoped child manifests exist
  - only one of child-stream or child-lane evidence is recognized
  - the fix relies on override text rather than real manifest discovery
- Pre-implementation issue-quality review evidence:
  - issue intent, current env mismatch, child helper behavior, and bounded fix seam were rechecked directly in this workspace before implementation
- Safeguard ownership split:
  - guard search-root reconciliation: `scripts/delegation-guard.mjs`
  - worker guidance updates: `skills/linear/SKILL.md`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - regressions: `tests/delegation-guard.spec.ts`

## Current Truth

- The active provider-worker run manifest lives under `/Users/kbediako/Code/CO/.runs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be/cli/2026-03-31T08-12-50-673Z-86806a3a/manifest.json` and records `workspace_path=/Users/kbediako/Code/CO/.workspaces/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be`.
- `resolveEnvironmentPaths()` currently honors the inherited absolute `CODEX_ORCHESTRATOR_RUNS_DIR`, which is `/Users/kbediako/Code/CO/.runs` in this provider-worker session.
- `providerLinearChildStreamShell` and `providerLinearChildLaneShell` sanitize child starts so `CODEX_ORCHESTRATOR_ROOT=<workspace>` and `CODEX_ORCHESTRATOR_RUNS_DIR=<workspace>/.runs`.
- `scripts/delegation-guard.mjs` currently calls `findSubagentManifests(runsDir, taskId)` and only reports expected paths under the single resolved `runsDir`.

## Validation Plan

- audited `linear child-stream --pipeline docs-review` before implementation
- focused provider-worker mixed-root regressions in `tests/delegation-guard.spec.ts`
- required repo validation floor after implementation
- standalone review plus explicit elegance pass before review handoff

## Manifest Evidence

- Workpad comment: `bc82008f-b9f8-4e79-8aff-f7223dacb96a`
- Active provider-worker manifest: `/Users/kbediako/Code/CO/.runs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be/cli/2026-03-31T08-12-50-673Z-86806a3a/manifest.json`
- Key upstream references:
  - `scripts/delegation-guard.mjs`
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `skills/linear/SKILL.md`
