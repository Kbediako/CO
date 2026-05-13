---
id: 20260330-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2
title: CO Fix stale merge-handoff after successful provider-worker review handoff
relates_to: docs/PRD-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`
- PRD: `docs/PRD-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`
- Task checklist: `tasks/tasks-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`

## Traceability
- Linear issue: `CO-40` / `dcfbd1cc-2b22-41dc-94c6-ce00c38258a2`
- Linear URL: https://linear.app/asabeko/issue/CO-40/co-fix-stale-merge-handoff-after-successful-provider-worker-review

## Summary
- Objective: remove the stale active-run truth that can survive a successful provider-worker review handoff and block the later `Merging` continuation path.
- Scope:
  - docs-first registration for `CO-40`
  - artifact-backed audit of the required `CO-30` / `CO-38` baseline files
  - narrow run-discovery/reconciliation changes in `providerIssueHandoff.ts`
  - focused regressions for successful-proof-versus-stale-manifest timing
  - closeout proof tying the fix back to a real issue/PR merge-handoff path
- Constraints:
  - preserve legitimate active-run detection when proof is absent or older than the manifest
  - keep failure-proof behavior unchanged except where shared helpers are generalized safely
  - do not widen into unrelated write-back, shared-root sync, or generic CI health changes

## Technical Requirements
- Functional requirements:
  - provider run discovery must stop classifying a run as `in_progress` when a provider-worker proof sidecar for the same run is terminal-success (`owner_phase: ended`, `owner_status: succeeded`) and is at least as fresh as the manifest
  - provider-intake rehydrate must not keep a claim in `running` solely because a stale manifest still says `in_progress` when authoritative proof says the worker already ended successfully
  - later active-state transitions such as `Merging` must treat the earlier successful run as prior terminal history and remain eligible for truthful continuation handling
  - control-host/provider-intake surfaces must distinguish ended prior runs from active runs, especially around post-review merge handoff
  - at least one focused regression must reproduce the stale merge-handoff class by combining:
    - a stale `running` claim
    - a manifest that still says `in_progress`
    - a provider-worker proof that already says `ended/succeeded`
    - a later active tracked-issue update such as `Merging`
  - the lane must emit at least one closeout-proof artifact tied to a real issue/PR merge-handoff class (`CO-30` or `CO-38`)
- Non-functional requirements (performance, reliability, security):
  - keep proof usage fail-closed to same-run evidence only; do not infer success from unrelated or older proof records
  - avoid flapping between `running` and terminal states when manifest/proof timestamps are out of order
  - preserve current ownership and workflow-state eligibility rules
- Interfaces / contracts:
  - `discoverProviderIssueRuns` and the provider run status/summary/updated-at helpers in `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - provider-worker proof sidecar contract in `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - control-host startup/refresh path in `orchestrator/src/cli/controlHostCliShell.ts`
  - focused regression coverage in `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - generalize the existing failure-proof override into a terminal-proof override that also recognizes terminal success when the proof is newer than or equal to the manifest
  - use the proof-derived terminal status during run discovery so both rehydrate and direct accepted-issue handling stop treating the run as active
  - keep summary/updated-at computation aligned with the same terminal-proof authority decision so operator surfaces do not contradict the corrected status
  - preserve existing continuation logic that reopens or relaunches from completed/released state when a later `Merging` update is genuinely newer
- Data model changes / migrations:
  - none; this is a reconciliation/read-model correction using existing manifest and proof fields
- External dependencies / integrations:
  - persisted provider-intake state at `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - real worker proof sidecars and manifests for `CO-30` and `CO-38`
  - existing provider workflow state classification for `In Review`, `Merging`, `Rework`, and `Done`

## Validation Plan
- Tests / checks:
  - rerun docs-review after the CO-40 packet exists and record the successful manifest plus resolved packet findings
  - focused `ProviderIssueHandoff` regressions for terminal-success proof reclassification and merge-stage continuation eligibility
  - required repo validation floor after implementation
  - standalone review plus elegance review before any review handoff
- Rollout verification:
  - prove stale `running` claim reclassification works when manifest is still `in_progress` but proof says `ended/succeeded`
  - prove a later `Merging` update no longer gets blocked by stale active-run truth in that scenario
  - record a closeout-proof artifact tied to the real `CO-30` / `CO-38` issue/PR class
- Monitoring / alerts:
  - keep artifact-backed notes under `out/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2/manual/`
  - refresh the single Linear workpad after docs-review, after implementation, and before any handoff

## Open Questions
- Whether summary surfaces should prefer `proof.end_reason` for terminal success when the manifest is still stale, or whether status/updated-at correction alone is enough for this lane.

## Approvals
- Reviewer: `codex-orchestrator docs-review` completed at `.runs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2-co-40-docs-review/cli/2026-03-30T00-51-39-696Z-5b6b4a29/manifest.json`; implementation validation still pending
- Date: 2026-03-30
