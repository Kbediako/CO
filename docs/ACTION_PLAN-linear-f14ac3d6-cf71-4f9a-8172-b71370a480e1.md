# ACTION_PLAN - CO: re-home March 28 docs freshness cohort owner

## Summary
- Goal: re-home the March 28 task packet/mirror cohort under live same-project `CO-420` while preserving `docs:freshness` and `docs:freshness:maintain` fail-closed owner checks.
- Scope: CO-420 packet files, rolling owner metadata in `docs/docs-catalog.json`, registry/task mirrors, and validation evidence for the named March 28 cohort.
- Assumptions: `CO-401` is terminal evidence only; `CO-415` timeout/core validation repair remains unrelated.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness`, `docs:freshness:maintain`, `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `CO-401`, `block_unowned_repo_debt`, `configured_owner_terminal`, `blocking_changed_paths=[]`, `March 28 task packet/mirror cohort`, and `docs:freshness:maintain canonical owner key`.
- Not done if: the lane broadens into `CO-415`, weakens freshness gates, omits owner-terminal blocker semantics, leaves terminal `CO-401` as live owner, or hides stale rows instead of re-homing/reviewing them.
- Pre-implementation issue-quality review: live issue-context, the workpad matrix, the accepted docs child lane, and the preserved baseline reports confirm this is a scoped docs freshness owner lane.

## Milestones & Sequencing
1. Accept the bounded docs child-lane packet after scope review.
2. Preserve baseline `docs:freshness` and `docs:freshness:maintain` machine output.
3. Re-home `docs/docs-catalog.json` rolling owner metadata to `CO-420` and declare the exact March 28 Task Packet / Task Mirror baseline cohort.
4. Register the CO-420 packet in `docs/docs-freshness-registry.json`, `tasks/index.json`, and `docs/TASKS.md`.
5. Run freshness, docs, review, and handoff gates.

## Parity Matrix (Current / Reference / Target)

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| Rolling owner issue | `CO-401` is terminal and makes owner verification fail closed as `configured_owner_terminal` / `block_unowned_repo_debt`. | `docs:freshness:maintain` needs a live same-project owner for the canonical owner key before owned rolling debt can pass. | `CO-420` is the live same-project owner for `docs:freshness:maintain`. |
| March 28 cohort visibility | The March 28 Task Packet / Task Mirror rows are stale and must not be hidden or deleted. | Rolling debt must remain machine-visible until a reviewed refresh, archive, reclassify, or new same-project owner action. | The exact cohort remains visible under `co-420-apr-28-march-28-task-packet-mirror`. |
| Fail-closed semantics | Terminal owner evidence blocks handoff even when `blocking_changed_paths=[]`. | Freshness maintenance must keep terminal-owner and unowned-debt blockers fail-closed. | Only the owner identity changes; `configured_owner_terminal`, `block_unowned_repo_debt`, and `blocking_changed_paths=[]` semantics remain intact. |

## Implementation
- Re-home the March 28 Task Packet / Task Mirror cohort under live `CO-420`.
- Update `docs/docs-catalog.json` for the `docs:freshness:maintain canonical owner key` without changing freshness caps or eligible classes.
- Keep the March 28 stale rows machine-visible as rolling debt under the declared baseline cohort unless a direct reviewed refresh is recorded.
- Update `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, Linear workpad, PR lifecycle, and validation evidence.

## Dependencies
- Parent-provided shared source anchor: `ctx:sha256:6d4d5e3d19965f60dc9e00809159fdd254719ca5621a2feb717e04808157390e#chunk:c000001`.
- Parent-owned live issue-context for `CO-420`.
- Parent-owned current `docs:freshness` and `docs:freshness:maintain` reports.

## Validation
- Child-lane check:
  - `git apply --check` and accepted `docs-packet` child lane manifest
- Parent checks:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - focused inspection that `block_unowned_repo_debt`, `configured_owner_terminal`, and `blocking_changed_paths=[]` behavior remains fail-closed unless a live owner is present
- Rollback plan: revert the docs-only catalog/registry/task packet changes before PR handoff if owner verification cannot prove live same-project `CO-420`.

## Risks & Mitigations
- Risk: catalog or registry edits accidentally hide stale rows. Mitigation: validation must show rolling cohort entries or clean reviewed rows, never silent deletion.
- Risk: `CO-401` terminal evidence is treated as reusable owner truth. Mitigation: packet states terminal owner evidence is historical context only and live owner alignment targets CO-420.
- Risk: the lane drifts into `CO-415` timeout logic. Mitigation: explicit non-goal and `Not Done If` entries keep timeout/core validation repair out of scope.
- Risk: freshness gates are weakened to get green output. Mitigation: validation plan requires preserving `docs:freshness` and `docs:freshness:maintain` fail-closed behavior.

## Approvals
- Reviewer: parent CO-420 lane
- Date: 2026-04-28
