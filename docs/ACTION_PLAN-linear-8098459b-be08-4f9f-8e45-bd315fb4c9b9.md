# ACTION_PLAN - CO-408 durable child-lane decision lineage

## Summary
- Goal: create the missing CO-408 traceability packet so later provider-worker implementation can add durable same-issue child-lane decision lineage without weakening CO-403 fail-closed retry recovery.
- Scope: packet files and mirrors only in this PR.
- Assumptions:
  - CO-408 remains in Backlog while this packet PR is prepared.
  - The current packet is based on the parent-provided CO-408 issue details and CO-403 source issue context.
  - Future implementation must run under normal provider-worker admission and review gates after this packet lands.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider-worker retry recovery`
  - `same-issue child lane`
  - `parallelize_now`
  - `recover_child_lane:<stream>`
  - `recover_run:<run_id>`
  - `latest prior decision lineage`
  - `stale older child lane`
  - `fail closed`
  - `pending parent acceptance`
- Not done if:
  - a stale older child lane can satisfy a newer `parallelize_now` decision
  - a matching stream name alone satisfies recovery
  - timestamp tolerance is increased without durable lineage
  - pending parent acceptance checks are weakened
  - this packet edits provider-worker source, tests, Linear state, workpads, WIP slots, or PR handoff behavior
- Pre-implementation issue-quality review:
  - 2026-04-30: approved for packet-only readiness. The issue is not merely a timestamp-tolerance tweak; it requires durable parent turn and parallelization decision lineage plus lineage-first retry recovery. CO-403's narrow fail-closed behavior remains the reference safety posture.
- Immediate Traceability:
  - This PR only creates traceability packet/mirrors; CO-408 implementation remains Backlog/Ready-gated until this packet lands.
  - The packet is intended to unblock later cleanup of `backlog_head_follow_up_traceability_pending`, not to claim the provider-worker WIP slot.

## Milestones & Sequencing
1. Create the CO-408 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register the canonical spec and checklist in `tasks/index.json`.
3. Add a current CO-408 snapshot to `docs/TASKS.md`.
4. Add docs freshness registry rows for the six CO-408 packet/checklist surfaces.
5. Run scoped packet validation:
   - JSON parse checks for edited registries
   - protected-term scan over packet files
   - `git diff --check`
   - `node scripts/spec-guard.mjs --dry-run`
   - `npm run docs:check`
   - `npm run docs:freshness`
   - `node scripts/diff-budget.mjs`
   - scoped `git status --short` / `git diff --name-only`
6. Commit the packet changes.
7. Push and open a draft packet-only PR if validation is clean and GitHub auth works non-interactively.
8. Later parent implementation: add durable lineage to child-lane records or companion audit entries, make retry recovery lineage-first, preserve narrow legacy timestamp fallback only when explicitly safe, and expose lineage through proof/status.
9. Later parent validation and review: focused lineage tests, proof/status tests, standard validation floor, standalone review, elegance pass, PR checks, ready-review drain, and Linear state handling.

## Parent-Owned Implementation Plan
1. Reconcile live CO-408 issue text and queue state before moving from Backlog/Ready.
2. Inspect `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/providerLinearChildLaneRunner.ts`, `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `orchestrator/src/cli/coStatusCliShell.ts`, and existing child-lane audit/proof persistence.
3. Add or derive a durable lineage object tying a same-issue child lane to parent issue id, parent run/turn, `parallelize_now` decision id, decision stream, child stream, child run id, and pending parent acceptance state.
4. Update retry recovery to prefer lineage before timestamp inference.
5. Keep legacy timestamp inference only for records without lineage where the existing narrow skew check remains safe.
6. Reject stale older child lanes, stream-only matches, missing lineage, ambiguous lineage, failed child lanes, and unsafe timestamp inference.
7. Surface accepted lineage or fail-closed rejection in `provider-linear-worker-proof.json` and `co-status`.
8. Add focused positive/negative/proof/status tests.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/src/cli/coStatusCliShell.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
- `provider-linear-worker-proof.json`
- child-lane audit entries and same-issue child-lane proof artifacts
- CO-403 source issue and retry recovery behavior

## Validation
- Packet lane checks:
  - `git diff --check`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term scan over the CO-408 packet files
- Parent-owned implementation checks:
  - valid launch-before-decision recovery with durable lineage
  - stale older unrelated child-lane rejection
  - stream-only match rejection
  - missing/ambiguous lineage rejection
  - safe legacy timestamp fallback classification
  - proof/status lineage visibility
- Rollback plan:
  - revert lineage-first retry recovery and packet updates together if tests show stale older child lanes can satisfy newer decisions or pending parent acceptance checks are weakened

## Risks & Mitigations
- Risk: implementation broadens timestamp tolerance instead of adding lineage.
  - Mitigation: this packet makes timestamp broadening a `Not Done If` condition and requires lineage-first tests.
- Risk: recovery markers become acceptance proof.
  - Mitigation: this packet classifies `recover_child_lane:<stream>` and `recover_run:<run_id>` as diagnostics unless tied to latest prior decision lineage.
- Risk: future implementation overreaches into unrelated provider current-state authority.
  - Mitigation: protected non-goals keep CO-408 bounded to child-lane decision lineage for retry recovery.
- Risk: queue admission treats this packet as implementation readiness by itself.
  - Mitigation: packet states CO-408 remains Backlog/Ready-gated until the packet lands and normal admission gates run.

## Approvals
- Docs-first packet: prepared on branch `kb/co-408-traceability-packet`
- Parent implementation: pending future CO-408 admission
- Parent review: pending
