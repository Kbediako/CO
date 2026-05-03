# ACTION_PLAN - CO-453 provider child-lane tracker real-run reconciliation

## Summary
- Goal: prepare parent implementation so provider child-lane tracker/status truth reconciles `provider-linear-worker-child-lanes.json` from `launching-*` reservation metadata to the real child run id and artifact paths after startup succeeds.
- Scope: docs-first packet, checklist/index mirrors, and parent-owned implementation sequencing for placeholder-to-real-run reconciliation.
- Assumptions:
  - The child prompt and source anchor are authoritative for this bounded docs lane.
  - The declared source payload path is absent inside this child checkout; parent owns live Linear/source reconciliation.
  - CO-449 is related observed context only.
  - `refresh request timeout` is protected diagnostic wording but not a generic recovery work item for CO-453.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider-linear-worker-child-lanes.json`, `launching-*`, real child run id/artifact paths, parent refresh/status logic, `refresh request timeout`, real child run startup reconciliation, CO-449 as related observed lane only, `provider-linear-child-lane.patch`, `provider-linear-child-lane-proof.json`, `parent_run_id`, `run_manifest_path`, `issue_updated_at`, and `provider-worker:child-lane-tracker-real-run-reconciliation`.
- Not done if:
  - parent refresh/status still resolves a nonexistent placeholder manifest after real child startup
  - real child run id/artifact paths are lost or conflated with `launching-*`
  - CO-449 intake changes are included
  - broad recovery/freshness or generic `refresh request timeout` work is included
  - current ledger rows remain pinned to `launching-*` after a trusted real child manifest exists
- Pre-implementation issue-quality review:
  - 2026-05-03: CO-453 is implementation-ready as a child-lane tracker/status issue. It is not plausibly satisfied by CO-449 intake work or by generic recovery/freshness timeout handling.
- Fallback / refactor decision:
  - `remove fallback`: placeholder manifest paths must stop acting as current run authority after real child startup.
  - `justify retaining fallback`: child-lane proof and decision evidence remain durable audit context.
  - `justify retaining fallback`: `refresh request timeout` remains an adjacent diagnostic outside CO-453 unless parent source inspection proves direct coupling.
- Large-refactor decision:
  - broad recovery/freshness refactor is not required for this packet. Parent should keep the implementation local to child-lane tracker/status truth unless source inspection proves incompatible authority splits.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Parent child-lane status/refresh projection | Status can read a placeholder manifest path after the real child run exists. | `remove fallback` | CO-453 | Trusted child manifest exists after startup. | observed 2026-05-03 | 2026-05-03 | This issue | Parent status/refresh resolves the real child manifest instead of the placeholder path. | Focused child-lane tracker/status regression. |
| Child-lane ledger current identity | `provider-linear-worker-child-lanes.json` can retain `launching-*` as current identity after a real child manifest exists. | `remove fallback` | provider worker child-lane tracker | Operators need real run identity and patch/proof provenance once startup succeeds. | Existing child-lane runtime | 2026-05-03 | This issue | Current ledger rows reconcile to the real child run id once a trusted manifest exists. | Focused tests prove placeholder-to-real-run ledger reconciliation and patch/proof path preservation. |
| Refresh timeout diagnosis | `refresh request timeout` appears near the observed symptom. | `justify retaining fallback` | control-host recovery owners, not CO-453 | Control-host refresh request exceeds its budget. | Existing recovery behavior | 2026-05-03 | Durable adjacent diagnostic | Dedicated recovery issue changes timeout contract. | Boundary tests or no-touch proof keep timeout remediation out of CO-453. |

## Milestones & Sequencing
1. Parent accepts this docs patch and refreshes live CO-453 issue-context before implementation.
2. Parent inspects provider child-lane tracker, accept/reject/invalidate decision persistence, and refresh/status projection.
3. Parent identifies where `launching-*` reservation identity is reconciled with real child run id/artifact paths.
4. Parent adds focused regression for reconciling placeholder launch metadata to the real child run after startup.
5. Parent adds preservation checks for `provider-linear-worker-child-lanes.json`, real child run id, and artifact paths.
6. Parent implements the smallest ledger reconciliation/status truth change.
7. Parent proves CO-449 intake, broad recovery/freshness, and generic `refresh request timeout` behavior remain out of scope.
8. Parent runs docs-review, implementation validation, standalone review, elegance pass, PR checks, feedback cleanup, ready-review drain, and Linear handoff.

## Dependencies
- Live Linear issue truth for CO-453.
- `provider-linear-worker-child-lanes.json`.
- `provider-linear-child-lane.patch`.
- `provider-linear-child-lane-proof.json`.
- Real child run manifest and artifact paths.
- Parent refresh/status logic.
- CO-449 as observed adjacent context only.
- Existing refresh-timeout diagnostic behavior.

## Validation
- Child lane:
  - protected-term grep over packet files
  - JSON parse for `tasks/index.json`
  - `git diff --check` over declared touched files
- Parent lane:
  - docs-review before implementation
  - focused child-lane tracker/status regression for placeholder-to-real-run reconciliation
  - focused proof that launch context, real child run id, and artifact paths remain audit-visible
  - boundary evidence that CO-449 intake does not change
  - boundary evidence that broad recovery/freshness and generic `refresh request timeout` work are not absorbed
  - full parent-required implementation and review gates
- Rollback plan:
  - Revert the child-lane tracker/status change and focused tests if it loses ledger audit evidence, accepts stale output, or widens into CO-449/recovery/freshness behavior.
  - If source inspection proves real-run reconciliation cannot be handled within child-lane tracker/status ownership, stop and relaunch with widened ownership.

## Risks & Mitigations
- Risk: parent status silently keeps reading the placeholder manifest path after real child startup.
  - Mitigation: require focused reconciliation regression and explicit real-run status evidence.
- Risk: launch context is deleted while repairing current ledger identity.
  - Mitigation: preserve child-lane proof, decision lineage, accepted patch artifacts, real child run id, and artifact paths as protected terms.
- Risk: parent absorbs CO-449 intake or generic refresh-timeout recovery.
  - Mitigation: keep CO-449 and `refresh request timeout` as named boundaries with no implementation ownership in CO-453.
- Risk: placeholder launch metadata remains current authority after a trusted manifest exists.
  - Mitigation: make that condition a Not Done If and validation requirement.

## Approvals
- Reviewer: CO-453 provider worker
- Date: 2026-05-03
