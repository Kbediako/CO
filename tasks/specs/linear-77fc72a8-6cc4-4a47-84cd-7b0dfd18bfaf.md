---
id: 20260502-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf
title: "CO-485 Codex CLI 0.128 permission-profile/trust-flow rebaseline"
relates_to: docs/PRD-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md
risk: high
owners:
  - Codex
last_review: 2026-05-02
related_action_plan: docs/ACTION_PLAN-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md
task_checklists:
  - tasks/tasks-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md
---

## Canonical Reference
- PRD: `docs/PRD-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- Task checklist: `tasks/tasks-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- `.agent` mirror: `.agent/task/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- Source anchor: `ctx:sha256:7b8009ed1070b9651f8299646e34cc07a9edf0d71d948584365cd01269075452#chunk:c000001`
- Canonical owner key: `codex-cli-0128:permission-profile-trust-flow-rebaseline`

## Summary
- Objective: define the CO-485 docs-first contract for Codex CLI 0.128.0 permission profiles, sandbox profile config controls, cwd controls, active-profile metadata, `--full-auto` deprecation, trust flows, doctor/default setup, and provider-worker prompts.
- Scope:
  - CO-485 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror
  - `tasks/index.json` registration
  - `docs/TASKS.md` snapshot
  - `docs/docs-freshness-registry.json` rows for packet files
  - parent-owned implementation guidance for current-facing docs/prompts and focused validation
- Constraints:
  - child lane stays docs-only and does not edit implementation, tests, package, workflow, Linear, GitHub, workpad, PR, or lifecycle surfaces
  - CO-466 remains the broad Codex CLI 0.128.0 release-intake owner
  - parent owns docs-review, source changes, validation, PR lifecycle, and Linear/workpad state

## Issue-Shaping Contract
- User-request translation carried forward: CO-485 is the narrow permission-profile/trust-flow rebaseline for Codex CLI 0.128.0. It must not duplicate CO-466 release intake or change portable model defaults; it must ensure current-facing docs and provider-worker prompts no longer present `--full-auto` as normal guidance and instead distinguish permission profiles, sandbox profile config controls, cwd controls, active-profile metadata, and trust flows.
- Protected terms / exact artifact and surface names:
  - Codex CLI 0.128.0
  - permission profiles
  - sandbox profile config controls
  - cwd controls
  - active-profile metadata
  - `--full-auto` deprecation
  - trust flows
  - doctor/default setup
  - provider-worker prompts
  - canonical owner key `codex-cli-0128:permission-profile-trust-flow-rebaseline`
  - `CO-466`
  - `CO-485`
- Nearby wrong interpretations to reject:
  - broad 0.128 release-intake duplicate
  - portable `gpt-5.4` fallback default changes
  - automatic weakening of sandbox/approval safety
  - historical-spec churn unless current-facing guidance imports stale wording
  - `--full-auto` as normal recommended flow
  - permission profiles described only as generic sandbox/approval shorthand

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Release-intake ownership | CO-466 classified Codex CLI 0.128.0 broadly. | CO-466 remains the owner for release posture, package, cloud, workflow pins, and model split. | CO-485 references CO-466 and owns only permission-profile/trust-flow rebaseline. | No release-intake duplicate or workflow pin movement. |
| Permission profiles | Some current-facing guidance can still use old approval/sandbox shorthand or `--full-auto` examples. | Codex CLI 0.128.0 guidance should use permission profiles and sandbox profile config controls. | Current docs/prompts distinguish permission profiles, sandbox profile config controls, cwd controls, and trust flows. | No safety weakening or broad config rewrite. |
| Active-profile metadata | Operators can lack machine-readable evidence of active profile-backed posture. | Doctor/default setup and provider-worker prompts should surface enough metadata to explain active posture. | Active-profile metadata identifies profile-backed posture drift. | No portable `gpt-5.4` fallback default changes. |
| Deprecated flag wording | Historical `--full-auto` references can be valid as history, but current guidance cannot recommend it as normal. | Deprecated or migration-only wording must be explicit. | Current-facing docs/prompts remove or reclassify stale `--full-auto` recommendations. | No historical-spec churn unless stale wording is imported into current guidance. |

## Readiness Gate
- Not done if:
  - current-facing docs/prompts recommend `--full-auto` as normal
  - permission-profile distinction is omitted
  - doctor/default setup cannot identify profile-backed posture drift
  - validation lacks focused tests or live command evidence
- Pre-implementation issue-quality review evidence:
  - 2026-05-02: source payload path is absent in this child checkout; the parent issue contract and source anchor are authoritative for this packet.
  - 2026-05-02: micro-task path is not appropriate because correctness depends on exact protected terms, deprecation wording, profile/trust distinctions, and validation evidence.
- Safeguard ownership split:
  - child lane owns only the declared docs and registry files
  - parent owns issue body reconciliation, docs-review, implementation, tests, validation, PR lifecycle, and Linear/workpad state

## Technical Requirements
- Functional requirements:
  1. Create the CO-485 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
  2. Register task id `20260502-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf` in `tasks/index.json`.
  3. Add current CO-485 rows to `docs/TASKS.md` and `docs/docs-freshness-registry.json`.
  4. Preserve all protected CO-485 terms exactly.
  5. Keep CO-466 as the broad Codex CLI 0.128.0 release-intake owner.
  6. Require parent implementation to remove or reclassify current-facing `--full-auto` normal-flow guidance.
  7. Require parent implementation to distinguish permission profiles, sandbox profile config controls, cwd controls, active-profile metadata, and trust flows.
  8. Require doctor/default setup to identify profile-backed posture drift.
  9. Require focused tests or live command evidence for validation.
- Non-functional requirements:
  - wording must remain concise and implementation-facing
  - no implementation drift outside declared docs scope
  - no lifecycle mutations
  - no weakening of sandbox, approval, cwd, or trust safety
- Interfaces / contracts:
  - `tasks/index.json` remains canonical under `items[]`
  - `docs/TASKS.md` records the current task snapshot
  - `docs/docs-freshness-registry.json` tracks packet files
  - provider-worker prompts and doctor/default setup are parent-owned implementation surfaces

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required for this bounded rebaseline; ownership remains in existing current-facing docs, doctor/default setup, and review-wrapper surfaces.
- Minor-seam decision: acceptable only for the temporary legacy Codex config retry while 0.124/0.125 release-facing pins still reject `default_permissions`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `--full-auto` current guidance | Deprecated flag remains normal recommendation. | remove fallback | CO-485 | Current-facing docs/prompts recommend `--full-auto`. | pre-0.128 guidance | 2026-05-02 | N/A after removal | Current guidance uses permission profiles or marks historical examples as deprecated/migration-only. | Protected-term scan plus focused parent validation. |
| Doctor/default setup drift | Profile-backed posture is checked through old fields only. | expire fallback | CO-485 | Active profile differs from expected sandbox profile config controls or cwd controls. | 2026-05-02 | 2026-05-02 | 2026-06-01 | Doctor/default setup reports active-profile metadata and drift. | Parent-owned focused test or live command evidence. |
| Trust-flow shorthand | Cwd trust is treated as full permission posture. | remove fallback | CO-485 | Guidance conflates cwd controls, trust flows, permission profiles, and sandbox controls. | pre-0.128 guidance | 2026-05-02 | N/A after removal | Guidance separates the controls. | Parent-owned prompt/docs scan plus focused validation. |

## Validation Plan
- Child-lane checks:
  - protected-term scan across CO-485 packet files
  - JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - scoped `git diff --check --` over declared files
  - scoped changed-file review
- Parent-owned checks:
  - docs-review before implementation
  - focused tests or live command evidence for permission profiles, doctor/default setup, and provider-worker prompts
  - normal parent validation floor before PR handoff

## Risks
- CO-485 becomes a second release-intake issue.
  - Mitigation: packet names CO-466 as the broad release-intake owner and keeps CO-485 narrow.
- Deprecated `--full-auto` wording survives in current guidance.
  - Mitigation: Not Done If blocks current-facing docs/prompts that recommend `--full-auto` as normal.
- Safety is weakened by profile abstraction.
  - Mitigation: requirements explicitly preserve sandbox/approval safety and separate cwd controls from trust flows.
- Historical cleanup expands the lane.
  - Mitigation: historical specs are untouched unless current-facing guidance imports stale wording.

## Completion Criteria
- CO-485 packet and mirrors exist in declared paths.
- `tasks/index.json` and `docs/docs-freshness-registry.json` parse as JSON.
- Protected-term scan confirms all requested terms and canonical owner key are present.
- Scoped diff review shows no edits outside declared file scope.
- Parent can continue with docs-review, implementation, focused validation, and lifecycle work.
