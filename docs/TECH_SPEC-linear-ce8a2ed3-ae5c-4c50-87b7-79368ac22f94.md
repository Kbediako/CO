# Technical Spec - CO-525 docs freshness preventive lifecycle automation

Source of truth for requirements: `docs/PRD-linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94.md`.

## Objective
Make docs freshness preventive by joining terminal task lifecycle, docs freshness registry/catalog metadata, implementation-docs archive automation, scheduled docs truthfulness, status projection, and provider intake/handoff around one lifecycle-aware repo-gate model.

## Scope
### In scope
- Creation-time metadata contract for docs-first/task packet registry rows.
- Lifecycle classifier for terminal task packet surfaces: `.agent/task`, `docs/PRD-*`, `docs/TECH_SPEC-*`, `docs/ACTION_PLAN-*`, `tasks/specs`, `tasks/tasks-*`, and `docs/findings`.
- Mechanical archive/reclassification dry-run/self-heal action planning before stale windows block unrelated lanes.
- Direct pre-expiry review/action routing for public/current/shipped docs outside rolling deferral.
- `docs:freshness:maintain` actionable forecast and scheduled docs truthfulness workflow integration.
- `co-status --format json` and status UI `repo_gates.docs_freshness_maintain` projection.
- Provider intake/handoff repo-gate context for unrelated lanes and docs/spec-touching lanes.
- Guide/catalog declared-cohort parity check for the `co-420` drift family.

### Out of scope
- Weakening freshness, spec, docs, archive, provider review, or fallback-expiry gates.
- Blind `last_review` bumps, stale-doc deletion, or rolling cap/window expansion.
- Duplicate owner issue creation.
- Reopening CO-431 or expanding CO-522 unless fresh evidence changes their boundaries.

## Issue-Shaping Contract
- User-request translation carried forward: this lane owns root lifecycle prevention for docs freshness, not another date-bound cleanup or live-owner re-home.
- Protected terms / exact artifact and surface names: `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, `terminal task lifecycle`, `docs freshness registry`, `docs catalog`, `implementation-docs archive automation`, `terminal_pending_archive`, `preserved_historical_stub`, `repo_gates.docs_freshness_maintain`, `canonical owner key`, `block_policy_over_budget`, `block_diff_local`, `blocking_changed_paths=[]`.
- Nearby wrong interpretations to reject: cap/window widening, blind date bumps, deleting historical evidence, owner re-home only, report-only weekly workflow only, or counting repo-gate ownership as provider WIP.
- Explicit non-goals carried forward: no gate weakening, no historical evidence deletion, no duplicate owner creation, no unrelated CO-431/CO-522 broadening.

## Parity / Alignment Matrix
See the PRD for the full matrix. The implementation must align task lifecycle, scheduled action, rolling policy, public/current doc routing, status monitor, provider intake, and guide/catalog parity.

## Readiness Gate
- Not done if: terminal completed packets can remain ordinary active stale debt, scheduled maintenance remains warn-only, status/provider surfaces lack repo-gate context, or public/current docs enter rolling deferral.
- Pre-implementation issue-quality review evidence: CO-525 issue description includes protected terms, non-goals, parity matrix, not-done conditions, and acceptance criteria. Provider worker re-read live issue context on 2026-05-13 and self-approved the issue as broad enough for the required root lifecycle refactor.
- Safeguard ownership split: parent owns lifecycle architecture, packet metadata, archive/status/provider integration, and final validation. Same-issue child lane `guide-catalog-parity` owns only its declared parity test/doc files until accepted or rejected.

## Technical Requirements
- Functional requirements:
  - Every packet creation/registration path must write or validate source issue, doc class, lifecycle state, owner, created_at, last_review, cadence_days, and next_review metadata.
  - Terminal issue/task state must classify all packet surfaces into active reviewed docs, `terminal_pending_archive`, `preserved_historical_stub`, archived, or done-style inactive states before normal stale classification.
  - Mechanical terminal-packet cases must produce deterministic dry-run actions and, where existing workflow credentials allow, a self-heal PR branch/PR path.
  - Public/current/shipped docs must be excluded from rolling deferral and routed to direct pre-expiry action.
  - `docs:freshness:maintain -- --format json` must expose severity, owner state, spec-guard status, capacity, next expiry, action counts, and action path.
  - `co-status --format json` and status UI must include `repo_gates.docs_freshness_maintain` without counting repo-gate owner state as provider WIP.
  - Provider intake/handoff must record repo-gate context early, distinguishing `blocks_unrelated_lanes`, `blocks_handoff`, and `action_required_count`.
  - Guide/catalog declared cohort parity must be machine checked, including the `co-420-apr-28-march-28-task-packet-mirror` candidate.
- Non-functional requirements: deterministic JSON outputs, fail-closed validation, small reviewable helpers, and no network dependency for local dry-runs.
- Interfaces / contracts: `scripts/docs-freshness.mjs`, `scripts/docs-freshness-maintain.mjs`, `scripts/implementation-docs-archive.mjs`, docs truthfulness workflow, `orchestrator/src/cli/statusCliShell.ts`, status UI data, provider Linear workflow helpers, `tasks/index.json`, and docs registry/catalog JSON.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor check: required. The work crosses lifecycle authority, registry metadata, scheduled action, and status/provider gate reporting; another minor freshness seam is rejected.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scheduled docs truthfulness | Warn/report-only result | remove fallback | CO-525 | Report shows actionable stale debt with no action path | 2026-05-13 | 2026-05-13 | immediate | Forecast/action planner replaces warn-only terminal behavior | Scheduled/action tests |
| Terminal packet registry | Completed packet rows remain `active` | remove fallback | CO-525 | Terminal task/Linear state conflicts with active stale registry row | 2026-05-13 | 2026-05-13 | immediate | Lifecycle classifier reclassifies/archive-plans packet rows before stale blocking | Lifecycle tests |
| Repo-gate visibility | Provider handoff discovers repo gate late | remove fallback | CO-525 | `docs:freshness:maintain` blocks with `blocking_changed_paths=[]` | 2026-05-13 | 2026-05-13 | immediate | Status/provider surfaces expose repo-gate context early | Status/provider tests |

## Architecture & Data
- Architecture / design adjustments:
  - Add or reuse a central docs freshness lifecycle module that computes doc metadata, lifecycle classification, action routing, and repo-gate summary.
  - Let freshness, maintenance, archive automation, scheduled workflow, status projection, and provider intake consume that module rather than growing independent policy branches.
- Data model changes / migrations:
  - Extend docs freshness registry/catalog consumption to understand richer metadata where present while preserving compatibility with existing rows until migration.
  - Introduce lifecycle states such as `terminal_pending_archive` and `preserved_historical_stub` as explicit non-active outcomes.
  - Emit repo-gate JSON with stable fields: severity, owner, spec_guard, capacity, next_expiry, action_required_count, blocks_unrelated_lanes, blocks_handoff.
- External dependencies / integrations:
  - Linear state remains read through existing helpers.
  - GitHub PR creation should use existing workflow/CLI surfaces and must have deterministic dry-run behavior.

## Validation Plan
- Tests / checks:
  - Focused lifecycle unit tests for terminal packet active-row prevention.
  - Archive self-heal dry-run tests.
  - Public/current doc direct action routing tests.
  - Guide/catalog declared-cohort parity tests.
  - `docs:freshness:maintain` over-budget/action-output tests.
  - `co-status --format json` and status UI projection tests.
  - Provider intake/handoff repo-gate context tests.
- Rollout verification:
  - Baseline artifacts under `out/linear-ce8a2ed3-ae5c-4c50-87b7-79368ac22f94/`.
  - Final validation chain from the Linear issue acceptance criteria.
- Monitoring / alerts:
  - Scheduled docs truthfulness output should make action-required counts and next expiry visible in artifacts and status projection.

## Open Questions
- Whether self-heal PR creation should run by default in scheduled automation or remain behind an explicit workflow flag with dry-run artifacts as the local default.

## Approvals
- Reviewer: Provider worker pre-implementation review, 2026-05-13.
- Date: 2026-05-13.
