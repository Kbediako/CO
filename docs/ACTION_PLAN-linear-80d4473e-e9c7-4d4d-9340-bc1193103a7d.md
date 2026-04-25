# ACTION_PLAN - CO: route docs-freshness owner reuse by canonical cohort without broadening CO-320

## Goal
- Add a truthful canonical owner-resolution path for docs freshness maintenance so stamped live owners are reused by exact `canonical_owner_key` without broadening `CO-320` into unrelated stale cohorts.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs/docs-catalog.json`, `policies.rolling_freshness_cohorts.owner_issue`, `docs:freshness:maintain`, `owner_issue`, `owner_issue_action`, `canonical_owner_key`, `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`, `CO-320`, `CO-300`, `block_policy_over_budget`, `configured_owner_terminal`.
- Not done if: future provider lanes still need to broaden `CO-320` through the single global `owner_issue` field, unrelated candidate cohorts still show `owner_issue=CO-320`, exact-key owner reuse cannot prevent duplicates, or the fix depends on reopening/reusing terminal `CO-300`.
- Pre-implementation issue-quality review: the issue is a routing-seam follow-up to `CO-319`, not an owner-recreation lane and not a broad historical docs freshness refresh.

## Milestones & Sequencing
1. [x] Create the docs-first packet and registry mirrors for `CO-323`. Evidence: `docs/PRD-linear-80d4473e-e9c7-4d4d-9340-bc1193103a7d.md`, `docs/TECH_SPEC-linear-80d4473e-e9c7-4d4d-9340-bc1193103a7d.md`, `docs/ACTION_PLAN-linear-80d4473e-e9c7-4d4d-9340-bc1193103a7d.md`, `tasks/specs/linear-80d4473e-e9c7-4d4d-9340-bc1193103a7d.md`, `tasks/tasks-linear-80d4473e-e9c7-4d4d-9340-bc1193103a7d.md`, `.agent/task/linear-80d4473e-e9c7-4d4d-9340-bc1193103a7d.md`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. [ ] Parent lane runs pre-implementation docs review or records a bounded fallback. Evidence target: parent-owned manifest/workpad.
3. [ ] Parent implementation adds exact `canonical_owner_key` live-owner resolution without repointing `policies.rolling_freshness_cohorts.owner_issue` to `CO-320`. Evidence target: parent-owned source diff and focused regressions.
4. [ ] Parent validation proves `CO-320` is surfaced only for the exact Mar 23 `tasks/tasks-*` canonical key and unrelated cohorts do not inherit it. Evidence target: focused maintenance-output tests/logs.
5. [ ] Parent updates workpad, review handoff, and PR lifecycle after scoped validation is clean. Evidence target: parent-owned workpad, PR, and review artifacts.

## Dependencies
- `CO-319` owner recreation and packet/mirror truthfulness.
- `CO-320` stamped live owner issue for the exact Mar 23 `tasks/tasks-*` canonical key.
- Existing canonical owner marker/reuse behavior from the recurring baseline debt owner contract.

## Validation
- Checks / tests: focused docs freshness maintenance-output regressions for exact-key owner reuse, unrelated-cohort negative routing, and terminal owner evidence-only behavior.
- Rollback plan: revert the owner-resolution source change and keep `docs/docs-catalog.json` policy owner metadata unchanged; this docs packet remains the issue-shaping record.

## Risks & Mitigations
- Risk: treating `CO-320` as a global replacement for `CO-300` hides unrelated stale debt under the wrong owner. Mitigation: exact `canonical_owner_key` matching is mandatory.
- Risk: duplicate-prevention regresses if stamped owner lookup is bypassed. Mitigation: require focused coverage for repeated exact-key lanes.
- Risk: terminal owner metadata is reused as live truth. Mitigation: keep `CO-300` evidence-only in both spec and validation.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-04-23.
