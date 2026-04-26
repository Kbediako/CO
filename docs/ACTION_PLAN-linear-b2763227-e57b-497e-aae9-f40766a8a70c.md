# ACTION_PLAN - CO: stabilize `cli-source-bootstrap` signal-forwarding CI flake

## Added by Bootstrap 2026-04-22

## Traceability
- Linear issue: `CO-301` / `b2763227-e57b-497e-aae9-f40766a8a70c`
- Linear URL: https://linear.app/asabeko/issue/CO-301/co-stabilize-testscli-source-bootstrapspects-signal-forwarding-ci

## Summary
- Goal: finish `CO-301` by removing the current fixture timing race while keeping truthful bootstrap signal-forwarding coverage.
- Scope: docs-first packet, focused child-lane characterization, bounded fix in the signal-forwarding surface, focused validation, required review/elegance passes, and workpad refreshes.
- Assumptions:
  - the primary race is in the test fixture readiness ordering, not yet proven bootstrap implementation drift
  - the current `waitForFileContents(...)` helper is useful only after the signal handler actually runs
  - the issue can stay bounded to `tests/cli-source-bootstrap.spec.ts`, `bin/codex-orchestrator.js`, and required docs unless validation disproves the current hypothesis

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `tests/cli-source-bootstrap.spec.ts`, `child-signal.txt`, `bin/codex-orchestrator.js`, `forwards termination signals to the re-execed source entrypoint`, and `Core Lane`
  - reject "just rerun CI", "delete the regression", and "assume bootstrap is broken before proving the fixture race"
- Not done if:
  - Core Lane can still fail on the same `child-signal.txt` `ENOENT` shape
  - the signal-forwarding regression no longer proves anything useful
  - docs/workpad closeout does not explain the remaining timing assumptions, if any
- Pre-implementation issue-quality review:
  - the current evidence already narrows the likely root cause to readiness-before-handler ordering in the test fixture, with `CO-134` showing that filesystem polling alone was insufficient

## Milestones & Sequencing
1. Register the `CO-301` docs-first packet, task registry entry, docs freshness registry entries, task mirror, and `docs/TASKS.md` snapshot.
2. Run `linear child-stream --pipeline docs-review` for the new packet and record manifest-backed evidence or a truthful fallback if the wrapper fails without diff-local findings.
3. Wait for the active same-issue tests child lane to return characterization and, if available, a bounded test-file patch.
4. Integrate the child findings, implement the smallest viable stabilization fix, and keep bootstrap code unchanged unless targeted evidence requires it.
5. Run focused validation for the stabilized regression and then the repo-required validation set implied by the touched files.
6. Run standalone review first, then an explicit elegance/minimality pass, and refresh the single Linear workpad before any review handoff.

## Dependencies
- `tests/cli-source-bootstrap.spec.ts`
- `bin/codex-orchestrator.js`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-b2763227-e57b-497e-aae9-f40766a8a70c "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-301-docs-review --format json`
  - focused `vitest` coverage for `tests/cli-source-bootstrap.spec.ts`
  - repo-required validation for the final touched-file set
  - `MCP_RUNNER_TASK_ID=linear-b2763227-e57b-497e-aae9-f40766a8a70c FORCE_CODEX_REVIEW=1 npm run review` before handoff if the diff is non-trivial
- Rollback plan:
  - revert the readiness-contract change if it weakens the regression without reducing the flake
  - keep the issue in `In Progress` until the focused regression and required evidence are both clean

## Risks & Mitigations
- Risk: only widening polling hides the race again.
  - Mitigation: change readiness ordering, not just the file-read window.
- Risk: bootstrap implementation gets changed unnecessarily.
  - Mitigation: treat bootstrap code as read-only unless post-fix validation still shows a real implementation problem.
- Risk: child-lane findings and parent edits diverge.
  - Mitigation: keep parent out of `tests/cli-source-bootstrap.spec.ts` until the child lane completes or is invalidated.

## Approvals
- Reviewer: Current-main validation rerun completed; no remaining docs-review blocker is open for this packet.
- Date: 2026-04-22
