# ACTION PLAN - CO-481 removed feature defaults after Codex CLI 0.128

## Summary
- Goal: give the parent lane a docs-first packet for Codex CLI 0.128 removed-feature defaults keyed by `codex-cli-0128:removed-feature-defaults`.
- Scope: docs packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only.
- Assumptions:
  - the parent-provided source anchor is authoritative
  - the source payload path is unavailable in this child checkout
  - CO-452 remains the reference for retiring active `js_repl` posture and canaries
  - parent owns docs-review, source/test changes, live command evidence, validation, Linear/GitHub mutation, workpad, PR lifecycle, and patch integration

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - Codex CLI 0.128
  - codex features list
  - js_repl
  - js_repl_tools_only
  - removed feature keys
  - codex-orchestrator doctor
  - codex-orchestrator codex defaults
  - CO-452
  - canonical owner key `codex-cli-0128:removed-feature-defaults`
- Not done if:
  - `codex-orchestrator doctor` recommends configuring `js_repl`, `js_repl_tools_only`, or removed feature keys as current posture
  - `codex-orchestrator codex defaults` writes `js_repl` or `js_repl_tools_only` under Codex CLI 0.128 removed-feature truth
  - `codex features list` is ignored or replaced with stale hard-coded assumptions
  - the lane adds runtime/provider-worker behavior, js_repl canaries, broad config rewrite, unrelated feature flag cleanup, or model/release/cloud posture changes
  - this child lane edits implementation, package, workflow, test, template, Linear, GitHub, workpad, PR, or lifecycle surfaces
- Pre-implementation issue-quality review:
  - 2026-05-05: approved for docs packet bootstrap. The lane is not suitable for the micro-task path because correctness depends on exact protected terms, removed-feature classification, and doctor/default setup validation evidence.
- Fallback / refactor decision: the task touches stale/legacy defaults for removed feature keys; both removed feature defaults and removed feature advisories choose `remove fallback`.

## Milestones & Sequencing
1. Create the CO-481 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register task id `20260505-linear-217c6584-bb47-486a-9765-f24e8ed84fc0` in `tasks/index.json`.
3. Add docs freshness rows for all six packet/mirror files.
4. Add a current CO-481 snapshot to `docs/TASKS.md`.
5. Validate protected terms, JSON parsing, markdown diff hygiene, and scoped changed files.
6. In the child lane, keep local edits uncommitted and export a patch; the parent lane applies and commits the exported patch.

## Parent-Owned Follow-On Plan
1. Reconcile this packet against authoritative CO-481 Linear issue/workpad truth.
2. Capture or parse current `codex features list` evidence for removed feature keys.
3. Audit `codex-orchestrator doctor` for removed-feature advisory behavior.
4. Audit `codex-orchestrator codex defaults` for removed-feature default generation.
5. Remove or suppress current default/advisory output for `js_repl`, `js_repl_tools_only`, and other removed feature keys.
6. Keep CO-452 as historical/reference context without adding js_repl canaries.
7. Preserve non-goals: no runtime/provider-worker behavior, no broad config rewrite, no unrelated feature flag cleanup, and no model/release/cloud posture change.
8. Add focused tests or capture live command evidence for removed-feature handling.
9. Run parent-owned docs-review and final validation before PR handoff.

## Dependencies
- Source anchor `ctx:sha256:65228e314b6bfafd429ea381e50f53c312b8a534372bf4d2d9d5567cafca1da8#chunk:c000001`.
- Child manifest `.runs/linear-217c6584-bb47-486a-9765-f24e8ed84fc0-docs-packet/cli/2026-05-05T01-54-52-566Z-51511a3f/manifest.json`.
- CO-452 active `js_repl` posture retirement context.
- Parent-owned `codex-orchestrator doctor`, `codex-orchestrator codex defaults`, and feature-state parsing surfaces.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required for this bounded removed-defaults guardrail; the lane removes stale default/advisory behavior instead of adding another compatibility layer.
- Minor-seam decision: acceptable because the implementation target is limited to existing doctor/default setup surfaces.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Removed feature defaults | `js_repl`, `js_repl_tools_only`, or other removed feature keys are written as current defaults. | remove fallback | CO-481 | Codex CLI 0.128 `codex features list` reports a key as removed. | pre-0.128 guidance | 2026-05-05 | immediate removal | defaults setup no longer writes removed feature keys as current config. | Focused defaults test or live `codex-orchestrator codex defaults` evidence. |
| Removed feature advisories | Doctor recommends configuring removed feature keys. | remove fallback | CO-481 | Doctor/default setup sees removed feature-state evidence. | pre-0.128 guidance | 2026-05-05 | immediate removal | doctor reports removed keys as unavailable or suppresses remediation. | Focused doctor test or live `codex-orchestrator doctor` evidence. |

## Validation
- Checks / tests:
  - protected-term scan across packet files
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - scoped `git diff --check --` over declared files
  - scoped changed-file review to confirm no out-of-scope edits
- Rollback plan: because this lane is docs-only, parent can reject or revert only this packet plus registry rows before integration.

## Risks & Mitigations
- Risk: CO-481 duplicates CO-452.
  - Mitigation: action plan keeps CO-452 reference-only and blocks js_repl canaries.
- Risk: stale removed defaults survive in current output.
  - Mitigation: Not Done If requires parent to remove or suppress those defaults.
- Risk: stale doctor advisories survive.
  - Mitigation: parent validation must cover doctor removed-feature behavior.
- Risk: scope expands into broad posture changes.
  - Mitigation: non-goals reject runtime/provider-worker behavior, broad config rewrite, unrelated feature flag cleanup, and model/release/cloud posture change.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent docs-review and implementation validation: pending parent lane.
- Date: 2026-05-05
