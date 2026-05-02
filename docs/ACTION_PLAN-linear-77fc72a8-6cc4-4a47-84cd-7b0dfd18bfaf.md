# ACTION PLAN - CO-485 Codex CLI 0.128 permission-profile/trust-flow rebaseline

## Summary
- Goal: give the parent lane a docs-first packet for Codex CLI 0.128.0 permission-profile and trust-flow rebaseline keyed by `codex-cli-0128:permission-profile-trust-flow-rebaseline`.
- Scope: docs packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only.
- Assumptions:
  - the parent-provided source anchor is authoritative
  - the source payload path is unavailable in this child checkout
  - CO-466 remains the broad Codex CLI 0.128.0 release-intake owner
  - parent owns docs-review, source/test changes, live command evidence, validation, Linear/GitHub mutation, workpad, PR lifecycle, and patch integration

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - current-facing docs/prompts recommend `--full-auto` as normal
  - permission-profile distinction is omitted
  - doctor/default setup cannot identify profile-backed posture drift
  - validation lacks focused tests or live command evidence
  - this child lane edits implementation, package, workflow, test, template, Linear, GitHub, workpad, PR, or lifecycle surfaces
- Pre-implementation issue-quality review:
  - 2026-05-02: approved for docs packet bootstrap. The lane is not suitable for the micro-task path because correctness depends on exact protected terms, `--full-auto` deprecation wording, profile/trust distinctions, and validation evidence.

## Milestones & Sequencing
1. Create the CO-485 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register task id `20260502-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf` in `tasks/index.json`.
3. Add docs freshness rows for all six packet/mirror files.
4. Add a current CO-485 snapshot to `docs/TASKS.md`.
5. Validate protected terms, JSON parsing, markdown diff hygiene, and scoped changed files.
6. Leave child-lane changes uncommitted for parent patch export.

## Parent-Owned Follow-On Plan
1. Reconcile this packet against authoritative CO-485 Linear issue/workpad truth.
2. Audit current-facing docs and provider-worker prompts for `--full-auto` normal-flow recommendations.
3. Replace or reclassify stale current-facing wording with permission profiles, sandbox profile config controls, cwd controls, active-profile metadata, and trust flows.
4. Keep historical specs unchanged unless current-facing guidance imports stale wording.
5. Update doctor/default setup so profile-backed posture drift is identifiable.
6. Preserve portable `gpt-5.4` fallback defaults and sandbox/approval safety.
7. Add focused tests or capture live command evidence for the chosen implementation surfaces.
8. Run parent-owned docs-review and final validation before PR handoff.

## Dependencies
- Source anchor `ctx:sha256:7b8009ed1070b9651f8299646e34cc07a9edf0d71d948584365cd01269075452#chunk:c000001`.
- Child manifest `.runs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf-docs-packet-bootstrap/cli/2026-05-02T12-25-28-667Z-edf96fa7/manifest.json`.
- CO-466 release-intake classification for broad Codex CLI 0.128.0 posture.
- Parent-owned provider-worker prompts, doctor/default setup, and current-facing docs.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required for this bounded rebaseline; ownership remains in existing current-facing docs, doctor/default setup, and review-wrapper surfaces.
- Minor-seam decision: acceptable only for the temporary legacy Codex config retry while 0.124/0.125 release-facing pins still reject `default_permissions`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `--full-auto` current guidance | Deprecated flag remains normal recommendation. | remove fallback | CO-485 | Current-facing docs/prompts recommend `--full-auto`. | pre-0.128 guidance | 2026-05-02 | N/A after removal | Current guidance uses permission profiles or marks historical examples as deprecated/migration-only. | Protected-term scan plus focused parent validation. |
| Doctor/default setup drift | Profile-backed posture is checked through old fields only. | expire fallback | CO-485 | Active profile differs from expected sandbox profile config controls or cwd controls. | 2026-05-02 | 2026-05-02 | 2026-06-01 | Doctor/default setup reports active-profile metadata and drift. | Parent-owned focused test or live command evidence. |
| Trust-flow shorthand | Cwd trust is treated as full permission posture. | remove fallback | CO-485 | Guidance conflates cwd controls, trust flows, permission profiles, and sandbox controls. | pre-0.128 guidance | 2026-05-02 | N/A after removal | Guidance separates the controls. | Parent-owned prompt/docs scan plus focused validation. |

## Validation
- Checks / tests:
  - protected-term scan across packet files
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - scoped `git diff --check --` over declared files
  - scoped changed-file review to confirm no out-of-scope edits
- Rollback plan: because this lane is docs-only, parent can reject or revert only this packet plus registry rows before integration.

## Risks & Mitigations
- Risk: CO-485 duplicates CO-466 release intake.
  - Mitigation: action plan keeps CO-466 as release-intake owner and limits CO-485 to permission-profile/trust-flow rebaseline.
- Risk: stale `--full-auto` examples remain in current-facing guidance.
  - Mitigation: Not Done If requires parent to remove or reclassify those recommendations.
- Risk: permission profiles weaken sandbox/approval posture.
  - Mitigation: requirements preserve sandbox/approval safety and separate cwd controls from trust flows.
- Risk: validation is too narrative.
  - Mitigation: parent must provide focused tests or live command evidence.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent docs-review and implementation validation: pending parent lane.
- Date: 2026-05-02
