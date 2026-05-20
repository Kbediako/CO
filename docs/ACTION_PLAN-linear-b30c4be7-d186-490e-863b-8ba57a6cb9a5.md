# ACTION PLAN - CO-566 Ready resumable recovery without broad dispatch source enablement

## Summary
- Goal: create the CO-566 docs-first packet for a targeted Ready/Rework resumable recovery fix.
- Scope: six declared docs/checklist files only; parent owns implementation, registry mirrors, Linear/workpad state, PR lifecycle, and validation.
- Assumptions:
  - the parent-provided source anchor is authoritative for this docs packet
  - eligible issues are live non-terminal Ready/Rework issues, not terminal Done/canceled/duplicate/archived issues
  - terminal failed historical runs are audit evidence, not active worker proof, and stale `resumable` claims should launch new governed work or return actionable blocked classifications through governed workflow behavior

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Ready resumable recovery`
  - `Ready/Rework issues`
  - `terminal failed historical runs`
  - `resumable provider-intake claim`
  - `launch new governed work or return actionable blocked classification`
  - `dispatch source disabled`
  - `dispatch_pilot.enabled=true`
  - `provider-intake-state.json`
  - `manual provider-intake-state deletion`
  - `CO-558 docs-freshness scope`
  - `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`
  - `Not Done If`
  - `parity matrix`
- Not done if:
  - protected terms or canonical owner key are missing
  - the packet allows broad `dispatch_pilot.enabled=true`
  - the packet allows manual provider-intake-state deletion
  - terminal live issue states can be resumed
  - CO-558 docs-freshness scope changes
  - this child lane edits registry mirrors, source, tests, Linear state, workpad, PR lifecycle, or provider-intake artifacts
- Pre-implementation issue-quality review:
  - 2026-05-20: approved as a docs-first packet for a narrow provider-intake recovery issue. The issue is not a micro-task because it depends on exact protected terms, fallback/seam classification, Not Done If, and a parity matrix.
- Fallback / refactor decision:
  - This task touches stale/cached provider-intake recovery behavior.
  - Decision: `remove fallback` for the workaround where recovery depends on broad `dispatch_pilot.enabled=true` or manual `provider-intake-state.json` deletion.
  - Owner: `CO-566`.
  - Trigger: Ready/Rework issue with terminal failed historical run and stale `resumable` claim while dispatch source is disabled.
  - Review date: 2026-05-20.
  - Maximum lifetime: this issue.
  - Removal condition: targeted recovery launches new governed work or returns an actionable blocked classification while preserving historical failed run evidence, without broad dispatch-pilot enablement or manual state deletion.

## Milestones & Sequencing
1. [x] Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and `.agent` mirror.
2. [x] Preserve source anchor, source object id, canonical owner key, and canonical owner marker.
3. [x] Add user request translation, protected terms, wrong interpretations to reject, explicit non-goals, Not Done If, and parity matrix.
4. [x] Record fallback/refactor decision for the Ready/Rework recovery seam.
5. [x] Parent imports the patch and registers task mirrors if accepted.
6. [x] Parent inspects provider-intake/recover source seams and implements the narrow fix.
7. [x] Parent adds focused tests for Ready/Rework stale-`resumable` recovery, terminal issue exclusion, no broad dispatch pilot requirement, and no manual provider-intake-state deletion.
8. [ ] Parent runs scoped validation, review, PR lifecycle, and Linear handoff.

## Parent-Owned Follow-On Plan
1. Reconcile this packet against authoritative Linear issue/workpad truth.
2. Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only from the parent lane if this packet is accepted.
3. Identify the exact provider-intake/recover implementation seam.
4. Implement targeted Ready/Rework stale-`resumable` recovery that launches new governed work or returns an actionable blocked classification.
5. Keep terminal live issue states excluded.
6. Prove the fix does not require broad `dispatch_pilot.enabled=true`.
7. Prove recovery does not require manual `provider-intake-state.json` deletion.
8. Keep CO-558 docs-freshness scope untouched.

## Dependencies
- Source anchor `ctx:sha256:4b0810177126360ba862e82ae588b6fff3ddbb23e51d40f70b84d4bfc6ce9da2#chunk:c000001`.
- Source object id `sha256:4b0810177126360ba862e82ae588b6fff3ddbb23e51d40f70b84d4bfc6ce9da2`.
- Parent manifest `.runs/linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5-docs-packet/cli/2026-05-20T03-01-24-615Z-49668b4b/manifest.json`.
- Parent source payload `.runs/linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5-docs-packet/cli/2026-05-20T03-01-24-615Z-49668b4b/memory/source-0/source.txt`.
- Parent-owned provider-intake/recover/status projection source seams.

## Validation
- Child-lane checks:
  - protected-term scan over the six declared files
  - scoped markdown whitespace check
  - `git status --short` confirms only declared files changed
- Parent-owned checks:
  - focused Ready/Rework stale-`resumable` explicit recovery regression
  - terminal live issue exclusion regression
  - no broad `dispatch_pilot.enabled=true` dependency proof
  - no manual provider-intake-state deletion proof
  - status projection proof that recovery is visible and historical audit evidence remains intact
- Rollback plan: remove the six docs/checklist packet files from the parent patch import; no source, registry, Linear, or provider-intake artifact rollback is required from this child lane.

## Risks & Mitigations
- Risk: recovery is implemented as broad dispatch pilot enablement.
  - Mitigation: Not Done If and fallback decision reject broad `dispatch_pilot.enabled=true`.
- Risk: provider-intake audit history is erased to unstick recovery.
  - Mitigation: packet requires governed workflow updates and rejects manual `provider-intake-state.json` deletion.
- Risk: terminal Done/canceled/duplicate issues become current recoverable work because stale `resumable` evidence is misread.
  - Mitigation: parent validation must cover terminal live issue exclusion.
- Risk: CO-558 docs-freshness work gets widened into this lane.
  - Mitigation: CO-558 docs-freshness scope is an explicit non-goal and Not Done If.
- Risk: child lane drifts into parent-owned integration.
  - Mitigation: file scope is limited to six packet/checklist files and registry mirrors are parent-owned.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent implementation/review/Linear lifecycle: pending parent ownership.
- Date: 2026-05-20
