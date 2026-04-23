# ACTION_PLAN - CO-297 stop-hook structured sentinel contract

## Summary
- Goal: prevent false stop sentinel mentions from disabling CO auto-continue while preserving deliberate terminal/destructive stop flows.
- Scope: docs-first packet, repo-owned hook source, installed hook sync, focused regression tests, validation and review handoff.
- Assumptions: the installed hook at `/Users/kbediako/.codex/hooks/continue_co_orchestration.py` is the live operator surface; adding a repo-owned copy makes the behavior reviewable and testable.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO stop hook`, `false stop sentinels`, `co_orchestration_autocontinue.json`, `enabled=false`, `last_assistant_message`, and the three `CO_ORCHESTRATOR_*` sentinels.
- Not done if: raw substring matching can still disable the gate, false read-only mentions persist `enabled=false`, quoted sentinel text disables the gate, or true structured critical-blocker/done/destructive stops fail to disable.
- Pre-implementation issue-quality review: parent provider worker confirmed no attached PR/workpad existed, moved the issue to `In Progress`, and recorded a serial decision because no safe child-lane split existed before the implementation surface was defined.

## Milestones & Sequencing
1. Register PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows.
2. Run docs-review or record a concrete review fallback if the child stream is unavailable.
3. Add repo-owned hook source and focused regression tests.
4. Sync the installed hook to the repo-owned source and verify checksum equality.
5. Run focused tests and required validation/review gates before PR/review handoff.

## Dependencies
- Python 3 for the hook.
- Vitest for regression coverage.
- Linear workpad and provider-worker review handoff helpers.

## Validation
- Checks / tests:
  - focused hook regression suite
  - installed-hook checksum comparison
  - relevant repo build/lint/test/docs gates according to final diff scope
  - standalone review plus elegance pass before review handoff
- Rollback plan:
  - revert the installed hook to the previous file from VCS/source backup if structured detection blocks true stop behavior unexpectedly
  - keep the gate fail-open behavior so hook exceptions do not stop user work

## Risks & Mitigations
- Risk: a new stop line is too strict and agents fail to stop when truly blocked or done.
  - Mitigation: update the resume prompt to make the structured line explicit and cover true critical-blocker/done/destructive cases in tests.
- Risk: tests accidentally mutate the real user state.
  - Mitigation: use `CO_ORCHESTRATION_AUTOCONTINUE_STATE_PATH` in all test invocations.
- Risk: repo-owned source and installed hook diverge.
  - Mitigation: record checksum proof after syncing.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-22
