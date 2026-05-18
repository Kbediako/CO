---
id: 20260422-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3
title: CO-305 keep parent issue evidence truthful across cross-issue issue-context reads
status: in_progress
owner: Codex
created: 2026-04-22
last_review: 2026-05-18
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md
related_action_plan: docs/ACTION_PLAN-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md
related_tasks:
  - tasks/tasks-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md
review_notes:
  - 2026-04-22: Bounded docs child lane authored the packet from the parent-preserved issue contract. The provided source pointers are provenance-only in this checkout; the issue body contract comes from the parent-owned live `linear issue-context` read and workpad.
  - 2026-04-22: Issue-quality review kept the lane narrow on issue-context cache persistence truth and authoritative downstream consumers. This is not generic Linear truth, not PR attachment ownership, not stale-blocker reconcile redesign, and not a docs-only wording fix.
  - 2026-05-18: CO-522 active-spec audit found 5 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Summary
- Objective: stop the singleton `provider-linear-issue-context-cache.json` run-scoped artifact from becoming untruthful parent issue evidence after later cross-issue reads in one provider-worker run.
- Scope:
  - cache resolution and cache read/write helpers in `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - deterministic issue-specific selection for authoritative same-run cache consumers
  - focused `CO-301` multi-issue regression coverage
  - docs-first packet and run-artifact traceability updates away from the ambiguous singleton path
- Constraints:
  - keep the implementation bounded to issue-context cache persistence truth
  - do not widen into generic Linear truth, PR attachment ownership, stale-blocker reconcile redesign, or a broad rewrite of provider-worker issue-context reading
  - parent lane owns runtime edits, tests, workpad, Linear state, and all shared registries

## Issue-Shaping Contract
- User-request translation carried forward: a cache artifact that looks parent-authoritative cannot remain a singleton if later cross-issue reads can rewrite it. The fix is issue-keyed cache persistence plus deterministic issue-specific selection for the downstream consumers that treat cached issue-context as authoritative.
- Protected terms / exact artifact and surface names:
  - `provider-linear-issue-context-cache.json`
  - `issue-context`
  - `run-scoped artifact`
  - `cross-issue reads`
  - `CO-301`
  - `CO-295`
  - `CO-299`
  - `CO-302`
  - `parent issue evidence`
  - `docs-first packet`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `resolveIssueContextCachePath(...)`
  - `readCachedIssueContextRecord(...)`
  - `writeCachedIssueContextRecord(...)`
  - `getProviderLinearIssueContext(...)`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
- Nearby wrong interpretations to reject:
  - generic Linear truth redesign
  - PR attachment ownership or merge-closeout correctness redesign
  - stale-blocker reconcile redesign
  - broad provider-worker issue-context rewrite
  - docs-only mitigation that leaves overwrite behavior intact
- Explicit non-goals carried forward:
  - no broad rewrite of provider-worker issue-context reading
  - no unrelated PR attachment reconciliation work
  - no weakening of docs-first traceability
  - no widening into generic multi-issue Linear workflow redesign

## Parity / Alignment Matrix
- Current truth:
  - `resolveIssueContextCachePath(...)` derives a singleton `provider-linear-issue-context-cache.json` path from the provider Linear audit path
  - `writeCachedIssueContextRecord(...)` rewrites that singleton path after successful issue-context reads and direct mutation paths
  - `readCachedIssueContextRecord(...)` therefore only sees the current singleton payload, so later cross-issue reads can erase the prior parent issue payload from the authoritative path
  - docs/task packets can cite that singleton path as parent issue evidence even after it has been rewritten for a different issue
- Reference truth:
  - cached issue-context truth must remain attributable to the issue that produced it
  - authoritative same-run consumers must select issue-specific truth deterministically
  - docs-first packet evidence must point to issue-specific artifacts rather than an ambiguous singleton path
- Target truth / intended delta:
  - cache artifacts are keyed by issue id
  - authoritative same-run consumers resolve the requested issue-specific payload deterministically
  - later cross-issue reads do not overwrite parent issue evidence
  - docs/task packet traceability points to issue-specific evidence instead of the ambiguous singleton path
- Explicitly out-of-scope differences:
  - generic Linear truth redesign
  - broad provider-worker issue-context reader rewrite
  - PR attachment ownership redesign
  - stale-blocker reconcile redesign

## Readiness Gate
- Not done if:
  - a later cross-issue read can still overwrite the same apparent parent-authoritative path
  - deterministic same-run cache consumers can still lose parent issue truth after later cross-issue reads
  - downstream docs/task packets can still cite a parent cache path that now contains a different issue body
  - the repair is docs-only and leaves overwrite behavior intact
- Pre-implementation issue-quality review evidence:
  - current source audit confirmed the bounded seam in `providerLinearWorkflowFacade.ts`: cache resolution produces one singleton path, cache writes rewrite that path, runtime fallback depends on that path, and docs/task packet evidence currently treats it as parent-authoritative. That makes the issue broader than docs wording and narrower than generic Linear truth.
- Safeguard ownership split:
  - child lane owns only the six docs-first packet files
  - parent lane owns runtime changes, focused regressions, docs-review, validation, registry updates, and Linear/workpad state

## Technical Requirements
- Functional requirements:
  1. Replace singleton issue-context cache persistence with issue-keyed artifact identity so later cross-issue reads cannot overwrite another issue's authoritative cached payload.
  2. `getProviderLinearIssueContext(...)` must resolve or select the issue-specific cached payload deterministically for the requested issue.
  3. `readCachedIssueContextRecord(...)` and `writeCachedIssueContextRecord(...)` must preserve same-run issue-specific truth across later cross-issue reads.
  4. Bounded same-run cache consumers such as `providerMergeCloseout.ts` must receive deterministic issue-specific selection instead of relying on one ambiguous singleton artifact.
  5. Run-artifact and docs-first packet guidance must point to issue-specific evidence instead of the singleton cache path when documenting parent issue evidence.
  6. Focused regressions must reproduce the `CO-301` multi-issue read shape and prove that later cross-issue reads do not overwrite parent issue evidence.
- Non-functional requirements:
  - fail closed when requested issue-specific cache truth is absent or mismatched
  - preserve bounded same-run cache reuse rather than widening into global cache reuse
  - keep the change narrow and metadata-driven
  - preserve docs-first provenance and machine-checkable evidence
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `resolveIssueContextCachePath(...)` or an equivalent issue-keyed successor
  - `readCachedIssueContextRecord(...)`
  - `writeCachedIssueContextRecord(...)`
  - `getProviderLinearIssueContext(...)`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - docs/task packet traceability that cites issue-context cache artifacts

## Architecture & Data
- Architecture / design adjustments:
  - replace singleton issue-context cache resolution with an issue-keyed artifact layout or deterministic issue-keyed selector
  - keep cache read/write behavior narrow and local to the existing `providerLinearWorkflowFacade.ts` seam
  - update authoritative downstream consumers to request or resolve issue-specific cache truth explicitly
  - update docs packet guidance so issue evidence references the issue-specific artifact, not one singleton path
- Data model changes / migrations:
  - run-local artifact layout gains issue-specific issue-context cache identity
  - no generic Linear data-model changes
  - no workflow-state or PR attachment schema redesign
- External dependencies / integrations:
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - existing docs packets and checklists that cite `provider-linear-issue-context-cache.json` as issue-body evidence

## Validation Plan
- Tests / checks:
  - child lane: fixed-string protected-term grep across the six packet files
  - child lane: `git diff --check --` on the six packet files
  - parent lane: focused facade regression for the `CO-301` multi-issue read shape proving later cross-issue reads do not overwrite parent issue evidence
  - parent lane: focused bounded-consumer regression proving issue-specific selection still works for same-run cache fallback consumers
  - parent lane: targeted docs traceability review confirming issue-specific evidence pointers replace the ambiguous singleton path
- Rollout verification:
  - parent records the new issue-specific artifact path or selector contract in closeout evidence
  - parent keeps one reproducible artifact for the pre-fix overwrite shape and one for stable post-fix issue-specific truth
- Monitoring / alerts:
  - existing focused regression coverage plus traceability artifacts are sufficient for this bounded lane

## Open Questions
- None blocking. The parent may choose issue-id-suffixed filenames or an equivalent issue-keyed directory layout so long as authoritative selection is deterministic and docs traceability remains issue-specific.

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue boundaries
- Date: 2026-04-22
