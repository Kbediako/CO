---
id: 20260422-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3
title: CO-305 keep parent issue evidence truthful across cross-issue issue-context reads
relates_to: docs/PRD-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- PRD: `docs/PRD-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- Task checklist: `tasks/tasks-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- `.agent` mirror: `.agent/task/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`

## Traceability
- Linear issue: `CO-305` / `6ef38dcf-eee6-4e2a-a261-179a040b52f3`
- Shared source 0 anchor: `ctx:sha256:d84141c3995ad070cf0b28b86f770ef757bfb3ee5240072fc996b2b78fa4abff#chunk:c000001`
- Source object id: `sha256:d84141c3995ad070cf0b28b86f770ef757bfb3ee5240072fc996b2b78fa4abff`
- Provided source payload pointer: `.runs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3-docs-packet/cli/2026-04-22T08-59-19-453Z-a315ce06/memory/source-0/source.txt`
- Provided origin manifest pointer: `.runs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3-docs-packet/cli/2026-04-22T08-59-19-453Z-a315ce06/manifest.json`
- Workspace-local provenance anchor: `ctx:sha256:ab4c3060e772d502014ab440b9e34d0ee916242ea9a6e6b3656566dfc21366f1#chunk:c000001`
- Source payload note: both provided anchors are metadata/provenance only in this checkout; the issue body contract comes from the parent-owned live `linear issue-context` read and workpad.

## Summary
- Objective: stop the run-scoped singleton `provider-linear-issue-context-cache.json` from becoming untruthful parent issue evidence after later cross-issue reads inside one provider-worker run.
- Scope:
  - the issue-context cache write/read seam in `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - deterministic issue-specific selection for authoritative downstream consumers
  - bounded same-run cache consumers such as deterministic merge closeout
  - docs-first packet traceability that currently treats the singleton cache path as authoritative
  - focused `CO-301` multi-issue regression coverage
- Constraints:
  - keep scope bounded to issue-context cache persistence truth
  - reject generic Linear truth, PR attachment ownership, stale-blocker reconcile redesign, and broad issue-context reader rewrites
  - parent owns runtime edits, tests, workpad, Linear state, and all shared registries

## Issue-Shaping Contract
- User-request translation carried forward: the defect is that a run-scoped artifact currently looks parent-authoritative even though later cross-issue reads can overwrite it. The repair is issue-keyed cache persistence plus deterministic issue-specific selection for the downstream consumers that treat cached issue-context as authoritative.
- Protected terms / exact artifact and surface names:
  - `provider-linear-issue-context-cache.json`
  - `issue-context`
  - `run-scoped artifact`
  - `cross-issue reads`
  - `parent issue evidence`
  - `CO-301`
  - `CO-295`
  - `CO-299`
  - `CO-302`
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
  - docs-only mitigation that leaves runtime overwrite behavior intact
- Explicit non-goals carried forward:
  - no broad rewrite of provider-worker issue-context reading
  - no unrelated PR attachment reconciliation work
  - no weakening of docs-first traceability
  - no widening into generic multi-issue Linear workflow redesign

## Parity / Alignment Matrix
- Current truth:
  - `resolveIssueContextCachePath(...)` resolves one singleton `provider-linear-issue-context-cache.json` path from the provider Linear audit path
  - `writeCachedIssueContextRecord(...)` rewrites that singleton path after successful issue-context reads and direct mutation paths
  - `readCachedIssueContextRecord(...)` only sees the currently persisted singleton payload, so later cross-issue reads can erase the prior parent issue payload from the authoritative run-local path
  - docs-first packets and task mirrors can cite that singleton path as parent issue evidence even after it has been rewritten for a different issue
- Reference truth:
  - cached issue-context truth must remain attributable to the issue that produced it
  - same-run cache fallback must select the requested issue deterministically
  - docs traceability must point to issue-specific evidence rather than an ambiguous singleton artifact
- Target truth / intended delta:
  - cache artifacts are keyed by issue id
  - cache readers and bounded same-run cache consumers select the requested issue-specific payload deterministically
  - later cross-issue reads do not overwrite parent issue evidence
  - docs-first packet traceability points to issue-specific evidence instead of an ambiguous singleton path
- Explicitly out-of-scope differences:
  - generic Linear truth redesign
  - broad provider-worker issue-context reader rewrite
  - PR attachment ownership redesign
  - stale-blocker reconcile redesign

## Readiness Gate
- Not done if:
  - a later cross-issue read can still overwrite the same apparent parent-authoritative path
  - deterministic merge closeout or other same-run cache consumers can still lose parent issue truth after later cross-issue reads
  - downstream docs/task packets can still cite a parent cache path that now contains a different issue body
  - the repair is docs-only and leaves overwrite behavior intact
- Pre-implementation issue-quality review evidence:
  - 2026-04-22: source audit confirmed the narrow seam in `providerLinearWorkflowFacade.ts`: one resolved cache path is shared across writes, while runtime fallback and docs packet traceability both treat the result as authoritative. This is narrower than generic Linear truth and broader than a docs-only wording fix because the overwrite behavior itself must change.
- Safeguard ownership split:
  - child lane owns only the six docs-first packet files
  - parent lane owns runtime changes, focused regressions, docs-review, validation, and integration into shared registries and Linear state

## Technical Requirements
- Functional requirements:
  1. Cache artifact persistence for `issue-context` truth is keyed by issue id rather than one singleton run-local path that later cross-issue reads can overwrite.
  2. `getProviderLinearIssueContext(...)` resolves the issue-specific cached payload deterministically for the requested issue.
  3. `readCachedIssueContextRecord(...)` and `writeCachedIssueContextRecord(...)` preserve same-run issue-specific truth across later cross-issue reads.
  4. Bounded same-run cache consumers such as `providerMergeCloseout.ts` receive deterministic issue-specific selection instead of depending on one ambiguous singleton artifact.
  5. Run-artifact and docs-first packet traceability guidance point to issue-specific evidence instead of a singleton parent-authoritative cache path.
  6. Focused regressions reproduce the `CO-301` multi-issue read shape and prove that later cross-issue reads do not overwrite parent issue evidence.
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
  - replace singleton issue-context cache resolution with an issue-keyed artifact layout or deterministic issue-keyed selection helper
  - keep cache read/write behavior narrow, close to the existing `providerLinearWorkflowFacade.ts` seam
  - update authoritative downstream consumers to request or resolve issue-specific cache truth explicitly
  - update docs packet guidance so issue evidence references the issue-specific artifact, not one singleton path
- Data model changes / migrations:
  - run-local artifact layout gains issue-specific issue-context cache identity
  - no generic Linear model changes
  - no workflow-state or PR attachment schema redesign
- External dependencies / integrations:
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - existing docs packets and checklists that cite `provider-linear-issue-context-cache.json` as issue-body evidence

## Validation Plan
- Child-lane checks:
  - fixed-string protected-term grep across the six packet files
  - `git diff --check` on the six packet files
- Parent-lane checks:
  - focused facade regression for the `CO-301` multi-issue read shape proving later cross-issue reads do not overwrite parent issue evidence
  - focused bounded-consumer regression proving issue-specific selection still works for same-run cache fallback consumers
  - targeted docs traceability update review confirming issue-specific evidence pointers replace the ambiguous singleton path
  - parent-owned docs-review, implementation review, and broader validation after source edits
- Rollout verification:
  - parent records the new issue-specific artifact path or selector contract in docs and closeout evidence
  - parent keeps one reproducible artifact showing the pre-fix singleton overwrite shape and one showing stable issue-specific truth after the fix

## Open Questions
- None blocking. The parent may choose issue-id-suffixed filenames or an equivalent issue-keyed directory layout as long as selection is deterministic and docs traceability remains issue-specific.

## Approvals
- Reviewer: docs child lane self-review for packet scope and issue-shaping contract
- Date: 2026-04-22
