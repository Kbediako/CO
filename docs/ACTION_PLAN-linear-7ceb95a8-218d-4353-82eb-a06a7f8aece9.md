# ACTION_PLAN - Child-lane launcher fail closed on appserver scope drift and stuck launching ledgers

## Summary
- Goal: give the parent lane a bounded implementation plan for `CO-303`, preserving the exact `CO-295` child-lane failure shapes while keeping this child patch limited to the six packet files.
- Scope: docs-first packet only in this child lane, then parent-owned launcher/runtime/ledger implementation, focused tests, registry mirror updates, docs-review, validation, and PR handoff.
- Assumptions:
  - the recorded `source-0` payload is provenance metadata only
  - authoritative issue wording came from read-only `linear issue-context` output for `CO-303` and `CO-295`
  - the current live seams are launcher/runtime fail-closed behavior plus parent-visible ledger repair around recoverable `status=launching` rows tied to real child manifests

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `linear child-lane`
  - `provider-linear-child-lane`
  - `review-docs-nitpicks`
  - `review-tests-validation`
  - `status=launching`
  - `provider_worker_child_lane_not_ready`
  - `appserver runtime`
  - `patch artifact`
  - `parent PR branch`
  - `parent-owned PR monitoring`
  - `bounded advisory lane`
  - `CO-295`
  - `PR #597`
- Not done if:
  - a child lane can still commit or push directly to the parent PR branch instead of returning a parent-owned patch or artifact
  - a child lane can still drift into parent-owned Linear/GitHub/PR monitoring after a bounded docs/tests prompt
  - a lane can remain `status=launching` with a real appserver child run in progress and no operator-safe terminal classification
  - runtime override expectations remain ambiguous when callers attempt to force a non-appserver child-lane path
- Pre-implementation issue-quality review:
  - 2026-04-22: read-only `CO-303` and `CO-295` issue-context output confirms this is a launcher/runtime/ledger contract lane. Correctness depends on exact protected terms, exact child-lane ownership boundaries, exact evidence paths, and exact rejection of direct-push integration, so the micro-task path is ineligible.

## Milestones & Sequencing
1. Completed in this child lane: create `docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `docs/TECH_SPEC-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `docs/ACTION_PLAN-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `tasks/tasks-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, and `.agent/task/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`.
2. Parent refreshes registry mirrors in the authoritative workspace: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Parent inspects the launcher/runtime seam in `orchestrator/src/cli/providerLinearChildLaneShell.ts`, `orchestrator/src/cli/providerLinearChildLaneRunner.ts`, and nearby parent-visible ledger projection paths.
4. Parent inspects the exact `CO-295` evidence manifests for `review-docs-nitpicks` and `review-tests-validation`.
5. Parent defines the smallest fail-closed contract for:
   - direct-push integration drift
   - bounded-scope drift into parent-owned Linear/GitHub/PR lifecycle work
   - stuck `status=launching` rows tied to real child manifests or killed/stalled appserver child runs
   - unsupported runtime override expectations
6. Parent adds focused regression or harness coverage for the two named `CO-295` failure shapes plus terminal launcher/ledger convergence.
7. Parent runs docs-review, focused validation, required validation floor, standalone review, and elegance review before PR handoff.

## Dependencies
- Linear issue `CO-303`
- Source issue `CO-295`
- Source anchor: `ctx:sha256:856f6a3b5bc0f34cf9ee98b4f991a782420eb41733154f29ec229e5ec3ee2341#chunk:c000001`
- Read-only issue-context commands:
  - `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-303 --format json`
  - `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-295 --format json`
- CO-295 evidence manifests:
  - `.runs/linear-994efebc-e1e4-4e00-8046-c60143813251-review-docs-nitpicks/cli/2026-04-22T05-53-20-840Z-5177eb47/manifest.json`
  - `.runs/linear-994efebc-e1e4-4e00-8046-c60143813251-review-tests-validation/cli/2026-04-22T06-12-29-447Z-4d1c90c4/manifest.json`
- Likely parent-owned implementation surfaces:
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- Likely parent-owned focused tests:
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`

## Validation
- Child-lane packet checks:
  - protected-term grep across the six packet files
  - `git diff --check` across the six packet files
  - read-only issue-context capture for `CO-303` and `CO-295`
- Parent implementation lane:
  - focused regression or harness coverage for the `review-docs-nitpicks` stuck-launching/direct-push shape
  - focused regression or harness coverage for the `review-tests-validation` appserver drift shape
  - focused launcher/ledger convergence coverage for start, finish, stall, kill, and invalidation paths
  - parent docs-review before implementation
  - required validation floor: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `codex-orchestrator review`, and `npm run pack:smoke`
- Rollback plan:
  - if the smallest truthful fix cannot be completed without widening into broader provider-worker orchestration or `CO-295` product logic, stop and relaunch with widened ownership instead of silently broadening the patch

## Risks & Mitigations
- Risk: parent accepts a direct child push as a de facto success path.
  - Mitigation: preserve parent-owned patch integration as an explicit acceptance requirement and reject direct-push success interpretation in every packet artifact.
- Risk: stuck `launching` rows are hidden instead of converged.
  - Mitigation: require terminal launcher/ledger classification plus manifest/session evidence and recovery guidance.
- Risk: bounded docs/tests prompts still drift into parent-owned Linear/GitHub/PR lifecycle work.
  - Mitigation: require explicit fail-closed classification before those surfaces are mutated further.
- Risk: runtime override expectations remain ambiguous.
  - Mitigation: keep runtime posture and unsupported override behavior explicit in the implementation contract and validation.
- Risk: parent scope drifts back into `CO-295` product behavior.
  - Mitigation: keep `CO-295` attachment ownership truth explicit as adjacent but out of scope for this lane.

## Approvals
- Child packet: bounded same-issue docs child lane
- Parent registry updates / implementation / review / PR lifecycle: pending in the authoritative workspace
