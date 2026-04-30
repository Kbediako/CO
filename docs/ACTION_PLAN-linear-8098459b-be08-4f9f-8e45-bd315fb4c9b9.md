# ACTION_PLAN - CO-408 durable child-lane decision lineage

## Summary
- Goal: complete CO-408 by preserving the traceability packet and adding durable same-issue child-lane decision lineage without weakening CO-403 fail-closed retry recovery.
- Scope: packet files and mirrors, child-lane and parallelization audit/proof persistence, provider-worker retry recovery, proof/status projection, focused tests, validation, review, and PR handoff.
- Assumptions:
  - CO-408 is in provider-worker execution on the existing traceability-packet branch.
  - The packet remains based on the parent-provided CO-408 issue details and CO-403 source issue context.
  - Implementation must run under normal provider-worker validation and review gates before handoff.

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
  - implementation edits unrelated provider current-state authority, broadens timestamp tolerance, or changes PR handoff behavior
- Pre-implementation issue-quality review:
  - 2026-04-30 Australia/Sydney worker date (2026-04-29 UTC): approved for provider-worker implementation. The issue is not merely a timestamp-tolerance tweak; it requires durable parent turn and parallelization decision lineage plus lineage-first retry recovery. CO-403's narrow fail-closed behavior remains the reference safety posture.
- Immediate Traceability:
  - The original packet unblocked `backlog_head_follow_up_traceability_pending`; this worker now completes the implementation on the same PR branch.
  - The active provider-worker lane owns workpad refreshes, validation, PR updates, and review handoff.

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
6. Add durable lineage to child-lane records or companion audit entries, make retry recovery lineage-first, preserve narrow legacy timestamp fallback only when explicitly safe, and expose lineage through proof/status.
7. Add focused lineage tests, proof/status diagnostics coverage, and prior-run child-lane recovery tests.
8. Run the standard validation floor, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff steps.
9. Commit, push, and update PR #726 if validation is clean and GitHub auth works non-interactively.

## Implementation Plan
1. Reconcile live CO-408 issue text and queue state before moving from Backlog/Ready.
2. Inspect `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/providerLinearChildLaneRunner.ts`, `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `orchestrator/src/cli/coStatusCliShell.ts`, and existing child-lane audit/proof persistence.
3. Add or derive a durable lineage object tying a same-issue child lane to parent issue id, parent run/turn, `parallelize_now` decision id, decision stream, child stream, child run id, and pending parent acceptance state.
4. Update retry recovery to prefer lineage before timestamp inference.
5. Keep legacy timestamp inference only for records without lineage where the existing narrow skew check remains safe.
6. Reject stale older child lanes, stream-only matches, lineage mismatches, ambiguous lineage, failed child lanes, missing lineage without safe legacy fallback, and unsafe timestamp inference.
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
- Current implementation checks:
  - `git diff --check`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term scan over the CO-408 packet files
  - valid launch-before-decision recovery with durable lineage
  - stale older unrelated child-lane rejection
  - stream-only match rejection
  - lineage mismatch and missing-lineage-without-safe-fallback rejection
  - safe legacy timestamp fallback classification
  - proof/status lineage visibility
  - `codex-orchestrator review` / `npm run review` as the final pre-handoff review command, preserving task/PRD context and manifest evidence in the saved review prompt artifact
  - standalone review, elegance pass, PR checks, and ready-review drain
- Rollback plan:
  - revert lineage-first retry recovery and packet updates together if tests show stale older child lanes can satisfy newer decisions or pending parent acceptance checks are weakened

## Risks & Mitigations
- Risk: implementation broadens timestamp tolerance instead of adding lineage.
  - Mitigation: this packet makes timestamp broadening a `Not Done If` condition and requires lineage-first tests.
- Risk: recovery markers become acceptance proof.
  - Mitigation: this packet classifies `recover_child_lane:<stream>` and `recover_run:<run_id>` as diagnostics unless tied to latest prior decision lineage.
- Risk: implementation overreaches into unrelated provider current-state authority.
  - Mitigation: protected non-goals keep CO-408 bounded to child-lane decision lineage for retry recovery.
- Risk: PR handoff happens before validation and automated-feedback drain finish.
  - Mitigation: keep review-state transition blocked until validation, standalone review, elegance review, PR checks, ready-review drain, and workpad refresh are complete.

## Approvals
- Docs-first packet: prepared on branch `kb/co-408-traceability-packet`
- Parent implementation: active on branch `kb/co-408-traceability-packet`
- Parent review: pending
