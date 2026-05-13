# ACTION_PLAN - CO: Add optional distributed worker-host parity with SSH routing, capacity, and worker_host observability

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: land one real optional distributed worker-host path for provider-worker execution without destabilizing the single-host default.
- Scope:
  - register the CO-90 docs packet, task mirrors, registry entries, and initial workpad
  - run audited docs-review before implementation
  - add worker-host inventory and capacity selection to the control-host provider path
  - route eligible launches over SSH and preserve truthful retry or recovery semantics
  - project `worker_host` into proof and operator surfaces
  - add focused regressions, then run the normal validation and review gates
- Assumptions:
  - the smallest truthful launch seam is the current control-host provider launcher, not the worker loop itself

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - optional distributed worker-host parity, SSH routing, capacity, `worker_host` observability, optional and bounded, single-host default remains intact
- Not done if:
  - the lane only lands config or docs
  - host capacity is not enforced in runtime truth
  - `worker_host` is not surfaced where relevant
  - the feature becomes mandatory or destabilizes the local default
- Pre-implementation issue-quality review:
  - Current repo truth is specific and bounded: the provider launcher is still local-only, provider capacity is global or per-state only, workflow metadata has no worker-host inventory, and operator surfaces still treat the host as local. The right seam is additive host inventory plus launch routing under the control host, not a broad runtime rewrite.

## Milestones & Sequencing
1) Register the `linear-51baaff3-2c6d-47e4-b668-088763d36197` docs packet, task mirrors, registry entries, and workpad mirror, then run the audited `docs-review` child stream and fold back any packet-only fixes.
2) Add additive worker-host metadata plus control-host selection logic, so provider dispatch can choose eligible hosts with explicit per-host capacity and truthful retry behavior.
3) Wire bounded SSH launch or resume handling through the provider launcher and persist `worker_host` through proof or state surfaces.
4) Integrate `worker_host` into read-model and operator surfaces, add focused regressions, complete validation, then run standalone review plus an explicit elegance pass before PR handoff.

## Dependencies
- `codex.orchestrator.json`
- `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
- `orchestrator/src/cli/control/providerAgentCapacity.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/operatorDashboardPresenter.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused host-selection, SSH-launch, and observability tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - keep the new worker-host path additive and metadata-driven so it can be removed without disturbing the default single-host flow

## Risks & Mitigations
- Remote launch could drift away from local launch semantics.
  - Mitigation: reuse existing provider launch-spec construction and keep the control host authoritative.
- Capacity truth could be wrong if host load is not persisted in the same state surfaces as active claims.
  - Mitigation: derive host load from persisted provider claim or proof state and add focused regression coverage.
- `docs/TASKS.md` is already at the line cap before this lane snapshot is added.
  - Mitigation: use the repo-supported task-archive fallback immediately after registration if the new snapshot exceeds the budget.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream succeeded after the repo-supported `docs:archive-tasks` trim restored `docs/TASKS.md` to the 450-line budget
- Date: 2026-04-09
