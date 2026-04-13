# ACTION_PLAN - CO: narrow generic control-host forced cleanup to avoid detached provider-worker collateral

## Added by Bootstrap 2026-04-13

## Summary
- Goal: narrow the generic control-host forced-cleanup helper so stale-host teardown remains reliable without killing detached provider-worker descendants.
- Scope:
  - docs-first packet and single Linear workpad
  - one bounded change in `terminateChildProcess(...)`
  - focused supervision regression coverage
  - required validation/review/handoff loop
- Assumptions:
  - `CO-163` already fixed the restart-specific stale-host cleanup seam and should remain untouched
  - detached provider workers can still appear in descendant snapshots briefly before reparenting
  - process-group kill remains the correct stale-host teardown boundary

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `generic control-host forced cleanup`
  - `detached provider-linear-worker collateral`
  - `process-group-scoped teardown`
  - `descendant diagnostics`
- Not done if:
  - generic cleanup still `SIGKILL`s detached provider workers
  - stale control-host teardown is weakened
  - descendant/process-group diagnostics become less observable
  - no focused regression proves detached-worker preservation
- Pre-implementation issue-quality review:
  - Approved on 2026-04-13 after live issue-context inspection and source audit confirmed the remaining live seam is `terminateChildProcess(...)` rather than the already-fixed restart helper.

## Milestones & Sequencing
1. Docs and audited design gate
   - Create PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, registry entries, and the initial workpad.
   - Run `linear child-stream --pipeline docs-review` and record the manifest or truthful fallback if provenance fails closed.
2. Generic cleanup implementation
   - Narrow `terminateChildProcess(...)` to kill only the stale control-host process group on timeout.
   - Keep descendant inspection diagnostic-only and preserve the wrapper kill fallback.
3. Focused regression coverage
   - Update `ControlHostSupervision.test.ts` to prove detached descendants are preserved while process-group teardown still happens.
4. Validation and handoff
   - Run the required validation floor, standalone review, elegance pass, PR create/attach, ready-review drain, and review-state transition if clean.

## Dependencies
- `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- `orchestrator/tests/ControlHostSupervision.test.ts`
- `tasks/specs/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`
- `tasks/tasks-linear-abca2add-198d-40a6-b1c0-35e49f4c78cd.md`

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review` or recorded fallback
  - focused `npx vitest run orchestrator/tests/ControlHostSupervision.test.ts`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run pack:smoke`
  - manifest-backed `codex-orchestrator review`
- Rollback plan:
  - revert the generic teardown helper and matching tests together if the narrowed cleanup breaks stale-host shutdown or loses diagnostic observability.

## Risks & Mitigations
- Risk: generic cleanup stops tearing down the stale host reliably.
  - Mitigation: preserve the existing process-group kill and wrapper `SIGKILL` fallback; only remove descendant kill collateral.
- Risk: descendant diagnostics become implicit instead of explicit.
  - Mitigation: keep descendant enumeration reachable in tests and avoid deleting the helper seam.
- Risk: the lane drifts back into the `CO-163` restart helper.
  - Mitigation: keep the code change isolated to `terminateChildProcess(...)` and focused tests.

## Approvals
- Reviewer: pending docs-review evidence for the CO-164 packet
- Date: 2026-04-13
