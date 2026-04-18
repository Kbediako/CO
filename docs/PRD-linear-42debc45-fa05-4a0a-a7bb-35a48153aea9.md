# PRD - Run artifact truth: reconcile orphaned active manifests and child-lane placeholders after release/invalidation

## Added by Docs Child Lane 2026-04-19

## Traceability
- Linear issue: `CO-241` / `42debc45-fa05-4a0a-a7bb-35a48153aea9`
- Task id: `linear-42debc45-fa05-4a0a-a7bb-35a48153aea9`
- Canonical task id: `20260419-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9`
- Canonical spec: `tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- Task checklist: `tasks/tasks-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- Source anchor: `ctx:sha256:63b0749832e8a186a955a92d8fd3c5f60eb8d06d28e3a02f3006b2838e802175#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-packet/cli/2026-04-18T15-12-30-748Z-ea3efd2f/manifest.json`
- Source payload note: the expected shared source text at `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-packet/cli/2026-04-18T15-12-30-748Z-ea3efd2f/memory/source-0/source.txt` is not present in this child checkout, so this packet is anchored on the protected parent prompt wording and current repo seam names only.

## Summary
- Problem Statement: local run discovery and child-lane bookkeeping can continue to present `.runs/**/manifest.json` records with `status=in_progress` or `status=launching` as active truth after parent state has already moved through `released`, `removed`, `invalidated`, or `rejected` outcomes. That leaves operators with mismatched file-based audit truth, `provider-intake-state.json` lifecycle truth, and child-lane ledger truth.
- Desired Outcome: parent implementation establishes one reconciliation contract that keeps historical artifacts durable while preventing orphaned active manifests and stale child-lane placeholders from inflating active work after release or invalidation.

## User Request Translation
- User intent / needs: create the docs-first packet for `CO-241` only, preserving the exact run-artifact and child-lane truth vocabulary before the parent lane edits implementation or tests.
- Success criteria / acceptance:
  - distinguish live active work from orphaned `.runs/**/manifest.json` records that still show `status=in_progress` or `status=launching`
  - reconcile `provider-intake-state.json` `released` / `removed` lifecycle truth with retained manifest files
  - reconcile child-lane ledger truth for `invalidated` / `rejected` / placeholder lanes with file-based run truth
  - preserve file-based audit truth without deleting historical artifacts
  - keep the fix bounded to run artifact truth and child-lane ledger truth
- Constraints / non-goals:
  - child lane owns only the declared docs packet files and `tasks/index.json`
  - parent lane owns implementation, validation, Linear state, workpad, PR lifecycle, and merge
  - do not edit implementation or test files in this child lane
  - do not delete historical artifacts

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `.runs/**/manifest.json`
  - `status=in_progress`
  - `status=launching`
  - `provider-intake-state.json`
  - `orphaned / released / removed / invalidated / rejected`
  - `file-based audit truth`
  - `child-lane ledger truth`
- Protected terms / exact artifact and surface names:
  - `.runs/**/manifest.json`
  - `status=in_progress`
  - `status=launching`
  - `provider-intake-state.json`
  - `orphaned`
  - `released`
  - `removed`
  - `invalidated`
  - `rejected`
  - `file-based audit truth`
  - `child-lane ledger truth`
  - `providerLinearWorkerRunner.ts`
  - `providerLinearChildLaneShell.ts`
  - `providerLinearChildLaneRunner.ts`
  - `run-manifests.js`
- Nearby wrong interpretations to reject:
  - deleting historical `.runs/**/manifest.json` files is the fix
  - every retained `status=in_progress` or `status=launching` manifest is active work
  - `provider-intake-state.json` should be destructively rewritten to hide stale entries
  - `invalidated` or `rejected` child-lane records should still block capacity or active projections
  - this is a Linear workflow-state mutation lane rather than a file and ledger truth reconciliation lane

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| `.runs/**/manifest.json` | Retained manifests can still show `status=in_progress` or `status=launching` after the owning provider claim or child lane has moved on. | File-based audit truth is durable evidence, not automatically current active occupancy. | Active projection classifies orphaned active-looking manifests separately while preserving the underlying files. |
| `provider-intake-state.json` | Provider records can become `released` or `removed` while older manifests remain on disk. | Intake lifecycle truth should decide whether provider-owned work is still active. | `released` / `removed` intake truth prevents stale manifest rows from counting as active work without deleting history. |
| Child-lane ledger truth | Reservation placeholders can remain `status=launching`, and completed child lanes can later be `invalidated` or `rejected`. | Child-lane ledger truth decides whether a child lane is pending acceptance, retired, invalidated, rejected, or still live. | `invalidated` / `rejected` records and orphaned launching placeholders stop blocking or inflating active child-lane state once reconciled. |
| File-based audit truth | Historical manifests, patches, logs, and proofs remain useful for audit even when no longer active. | Audit truth must remain inspectable and must not be "fixed" by deletion. | Parent repair keeps history intact and records why an active-looking artifact is no longer active. |
| Operator status surfaces | Active rows can be inflated when file discovery and ledger truth disagree. | Operators need one machine-checkable active-work contract. | Status/read-model output names live, orphaned, released, removed, invalidated, and rejected states without contradiction. |

## Acceptance Criteria
1. The docs packet and `tasks/index.json` entry exist for `CO-241`.
2. The packet preserves `.runs/**/manifest.json`, `status=in_progress`, `status=launching`, `provider-intake-state.json`, `orphaned / released / removed / invalidated / rejected`, file-based audit truth, and child-lane ledger truth.
3. Parent implementation can classify orphaned active-looking manifests without deleting the retained artifacts.
4. Parent implementation can keep `released` / `removed` provider-intake truth from being contradicted by stale manifest status.
5. Parent implementation can keep `invalidated` / `rejected` child lanes and stale `status=launching` placeholders from counting as live child-lane work.
6. Parent validation can prove the active projection, file-based audit truth, and child-lane ledger truth agree on the same outcome.

## Non-Goals
- No deletion of historical `.runs/**/manifest.json`, patch, proof, or log artifacts.
- No Linear mutation from this docs child lane.
- No source or test edits in this docs child lane.
- No broad provider scheduler, admission, or capacity redesign.
- No blanket "ignore all `status=in_progress`" or "ignore all `status=launching`" rule.
- No destructive rewrite of `provider-intake-state.json`.

## Not Done If
- Active projections still treat orphaned `.runs/**/manifest.json` files with `status=in_progress` or `status=launching` as live work after `released`, `removed`, `invalidated`, or `rejected` truth is known.
- `provider-intake-state.json` lifecycle truth and manifest status truth still contradict each other with no explicit reconciliation label.
- Child-lane ledger truth still lets `invalidated`, `rejected`, or stale placeholder lanes block capacity or appear as live output.
- The repair deletes historical artifacts instead of preserving file-based audit truth.
- The implementation broadens into Linear mutation, scheduler policy, or unrelated dashboard redesign.

## Stakeholders
- Product: CO operators and parent lanes relying on truthful active-work status.
- Engineering: provider worker, child-lane shell, run-manifest discovery, and status projection maintainers.
- Operations / Review: reviewers auditing release, invalidation, rejection, and retained artifact evidence.

## Metrics & Guardrails
- Primary Success Metrics:
  - active-work status no longer counts orphaned active-looking manifests after `released`, `removed`, `invalidated`, or `rejected` truth is present
  - file-based audit truth remains durable and inspectable
  - child-lane ledger truth remains authoritative for child-lane acceptance, rejection, invalidation, and stale placeholder state
- Guardrails / Error Budgets:
  - no historical artifact deletion
  - no destructive state-file cleanup
  - no active-work undercount for genuinely live `status=in_progress` or `status=launching` runs

## Technical Considerations
- Architectural Notes:
  - parent likely audits manifest discovery in `scripts/lib/run-manifests.js` and provider-worker hydration in `providerLinearWorkerRunner.ts`
  - parent likely audits child-lane reservation and decision handling in `providerLinearChildLaneShell.ts` and `providerLinearChildLaneRunner.ts`
  - the smallest correct fix is a reconciliation/classification contract, not artifact deletion
- Dependencies / Integrations:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `scripts/lib/run-manifests.js`
  - focused parent tests near `ProviderLinearChildLaneShell.test.ts`, `ProviderLinearWorkerRunner.test.ts`, and status/read-model projection tests

## Open Questions
- Which parent-owned projection should name the reconciliation state for an orphaned active-looking `.runs/**/manifest.json`?
- Should a stale `status=launching` child-lane reservation become `invalidated`, or stay retained with a separate orphaned-placeholder classification?
- Which JSON/status surface should expose the reason that file-based audit truth differs from current active-work truth?

## Validation Contract
- Child lane runs only scoped docs checks: JSON parse for `tasks/index.json`, protected-term grep over the touched packet files, and `git diff --check` over the declared docs scope.
- Parent lane owns focused implementation validation and docs-review before source edits.
