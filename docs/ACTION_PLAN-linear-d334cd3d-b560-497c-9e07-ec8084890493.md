# ACTION_PLAN - CO: stabilize ControlServer read-only refresh temp cleanup ENOTEMPTY flake

## Added by Bootstrap 2026-04-19

## Summary
- Goal: close `CO-261` by fixing the `ControlServer.test.ts` read-only refresh temp cleanup / async lifecycle flake that reports `ENOTEMPTY` at `/tmp/control-server-*/.runs/task-0940/cli/run-1`, while preserving the no-control-state-mutation contract.
- Scope: docs-first packet and registry mirrors in this child lane; parent-owned investigation, smallest owning implementation fix, focused and stress validation, full `npm run test`, main Core Lane pass/non-repro classification, and PR lifecycle.
- Assumptions:
  - reported failure lineage is main Core Lane run `24623956000` on commit `c382730e0e6364cbfeb736a1999fc160c98b03cf`
  - `acknowledges read-only refresh requests without mutating control state` is the protected test contract
  - `CO-181` and `CO-150` are explicitly out of scope

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `ControlServer.test.ts`, `acknowledges read-only refresh requests without mutating control state`, `ENOTEMPTY`, `/tmp/control-server-*/.runs/task-0940/cli/run-1`, `control_seq`, `latest_action`, `/api/v1/refresh`, `/api/v1/state`, `npm run test`, `Core Lane`, `24623956000`, `c382730e0e6364cbfeb736a1999fc160c98b03cf`, `CO-181`, and `CO-150`
- Not done if:
  - the protected test can still leave the temp run root non-empty at cleanup
  - the read-only refresh no-mutation assertions are weakened
  - the fix is only timeout inflation or blind cleanup retry
  - focused stress validation, full `npm run test`, or later Core Lane classification is missing
  - implementation expands into `CO-181` or `CO-150`
- Pre-implementation issue-quality review:
  - lane is sufficiently shaped for parent implementation: one failing test, one protected temp path, one Core Lane run/commit lineage, explicit adjacent non-goals, and concrete validation requirements
  - parent owns implementation and validation; this child lane owns docs packet only

## Milestones & Sequencing
1. Done: draft and register the `CO-261` docs-first packet, mirror the checklist, and leave the child-lane patch uncommitted for parent export.
2. Done: parent accepted the packet and refreshed the parent-owned workpad.
3. Done: parent classified the exact-case local repro as intermittent and inspected the `ENOTEMPTY` failure path around `ControlServer.test.ts` and `/tmp/control-server-*/.runs/task-0940/cli/run-1`.
4. Done: parent identified provider polling health persistence as the async lifecycle owner and fixed close-time drain/flush behavior without changing read-only refresh semantics.
5. Done: parent reran focused validation and 20 focused stress iterations for the read-only refresh shape.
6. Parent runs full `npm run test`, then uses a later main Core Lane result to classify pass/non-repro against run `24623956000` and commit `c382730e0e6364cbfeb736a1999fc160c98b03cf`.

## Dependencies
- `orchestrator/tests/ControlServer.test.ts`
- `orchestrator/src/cli/control/controlServer.ts`
- `/api/v1/refresh`
- `/api/v1/state`
- temporary run roots under `/tmp/control-server-*`
- GitHub Actions `Core Lane`

## Validation
- Checks / tests:
  - child lane: documentation diff review and scoped JSON/whitespace checks only; no full repo validation suites
  - parent lane: focused `ControlServer.test.ts` read-only refresh validation passed
  - parent lane: 20 stress/focused repeated validations of the protected test shape passed
  - parent lane: full `ControlServer.test.ts` file validation passed
  - parent lane: full `npm run test`
  - parent lane: later main Core Lane pass/non-repro classification
- Rollback plan:
  - revert the lifecycle/test harness fix if it weakens read-only refresh assertions or hides active async work
  - preserve current test semantics as the rollback baseline

## Risks & Mitigations
- Risk: a cleanup retry hides an actual lifecycle leak.
  - Mitigation: require parent evidence identifying the owning async resource or cleanup-order seam.
- Risk: read-only refresh semantics are weakened to stabilize the test.
  - Mitigation: keep `control_seq` and `latest_action` assertions in the acceptance criteria.
- Risk: focused validation misses CI-only flake behavior.
  - Mitigation: require stress/focused repeat plus full `npm run test` and Core Lane classification.
- Risk: adjacent provider/control issues are pulled into the fix.
  - Mitigation: keep `CO-181` and `CO-150` as explicit non-goal scopes in the packet and checklist.

## Approvals
- Reviewer: parent implementation validation and bounded standalone review completed locally; later Core Lane classification pending
- Date: 2026-04-19
