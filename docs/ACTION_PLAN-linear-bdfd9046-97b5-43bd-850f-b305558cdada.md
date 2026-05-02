# ACTION PLAN - CO-466 Codex CLI 0.128.0 release-intake

## Summary
- Goal: give the parent lane a docs-first packet for Codex CLI candidate `0.128.0` keyed by `codex-cli-release-intake:stable:0.128.0`.
- Scope: docs packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only.
- Assumptions:
  - the parent-provided source anchor is authoritative
  - the source payload path is unavailable in this child checkout
  - `.agent/task/templates/codex-cli-release-intake-template.md` is the closeout checklist contract
  - parent owns all release evidence, Linear/GitHub mutation, implementation, validation, workpad, PR lifecycle, and patch integration

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - upstream Codex CLI release detection
  - GitHub release truth
  - npm @openai/codex dist-tags/time
  - CO version-policy target
  - workflow pins
  - candidate `0.128.0`
  - canonical owner key `codex-cli-release-intake:stable:0.128.0`
  - `CO-386`
  - `CO-466`
  - `.agent/task/templates/codex-cli-release-intake-template.md`
- Not done if:
  - any protected term is missing
  - local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, or release notes are collapsed into one generic evidence bucket
  - the supersedes/holds matrix is absent or missing rows
  - closeout classification omits adopt latest, intentionally hold, or demote/archive-only states
  - stale current-facing docs, workflow pins, prior release evidence pages, or model posture claims remain unclassified
  - this child lane edits implementation, package, workflow, test, template, Linear, GitHub, workpad, or PR lifecycle surfaces
- Pre-implementation issue-quality review:
  - 2026-05-01: approved for docs packet bootstrap. The lane is not suitable for the micro-task path because correctness depends on exact protected terms, evidence axes, and release-intake closeout classification.

## Milestones & Sequencing
1. Create the CO-466 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register task id `20260501-linear-bdfd9046-97b5-43bd-850f-b305558cdada` in `tasks/index.json`.
3. Add docs freshness rows for all six packet/mirror files.
4. Add a current CO-466 snapshot to `docs/TASKS.md`.
5. Validate protected terms, JSON parsing, markdown diff hygiene, and scoped changed files.
6. Leave child-lane changes uncommitted for parent patch export.

## Parent-Owned Follow-On Plan
1. [x] Reconcile this packet against authoritative CO-466 Linear issue/workpad truth and the CO-386 release-intake template.
2. [x] Capture upstream Codex CLI release detection with GitHub release truth and npm @openai/codex dist-tags/time.
3. [x] Compare candidate `0.128.0` against the CO version-policy target and workflow pins.
4. [x] Collect local CLI evidence, package/downstream smoke evidence, cloud-canary evidence, workflow pins evidence, model posture evidence, docs surfaces evidence, and release notes evidence as separate gates.
5. [x] Fill every supersedes/holds matrix row with adopt latest, intentionally hold, or demote/archive-only classification.
6. [x] Keep archive-only classification limited to superseded evidence; unresolved blockers stay intentional holds or linked follow-ups.
7. [x] Update only the parent-owned surfaces justified by evidence.
8. [x] Run final validation and review for touched parent surfaces.
9. [x] Record final closeout classification in workpad, task mirrors, PR, and current docs surfaces.

## Parent Evidence Summary - 2026-05-01
- Adopt latest locally: Codex CLI `0.128.0` is adopted for CO-local ChatGPT-auth/appserver command/runtime posture after local command/auth/model probes, runtime-mode canary 20/20, package smoke, docs-review, and docs updates.
- Intentionally hold release/cloud: package/release workflow pins remain `@openai/codex@0.125.0`; `cloud-canary` remains `@openai/codex@0.124.0`; required cloud canary failed with `environment_not_found` while fallback cloud contract passed.
- Preserve model split: `gpt-5.5` / `xhigh` remains current validated local ChatGPT-auth/appserver posture; portable generated fallback remains `gpt-5.4` / `xhigh`.
- Preserve archive split: historical `0.124.0` evidence remains archive-only, and `0.125.0` is superseded locally but retained as the intentional release-facing compatibility hold.

## Dependencies
- Source anchor `ctx:sha256:246da4b00bfe547dbd454953dbd4a371e6bc66dc1103e2c6e042e09fcf424425#chunk:c000001`.
- Parent manifest `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-docs-packet-bootstrap/cli/2026-05-01T13-19-25-864Z-a46f6e90/manifest.json`.
- `.agent/task/templates/codex-cli-release-intake-template.md`.
- `docs/guides/codex-version-policy.md`.
- GitHub release truth for upstream Codex CLI.
- npm @openai/codex dist-tags/time.
- Parent-owned workflow pins, local CLI probes, package/downstream smoke, cloud-canary, model posture, docs surfaces, and release notes evidence.

## Validation
- Checks / tests:
  - protected-term scan across packet files
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - scoped `git diff --check --` over declared files
  - scoped changed-file review to confirm no out-of-scope edits
- Rollback plan: because this lane is docs-only, parent can reject or revert only this packet plus registry rows before integration.

## Risks & Mitigations
- Risk: candidate `0.128.0` is interpreted as adoption-ready.
  - Mitigation: action plan separates release detection, evidence collection, supersedes/holds classification, and final posture updates.
- Risk: GitHub release truth and npm @openai/codex dist-tags/time diverge.
  - Mitigation: parent must preserve both inputs and fail closed or hold when they conflict.
- Risk: workflow pins move mechanically because a newer candidate exists.
  - Mitigation: workflow pins evidence is a separate gate with explicit adopt/hold/follow-up classification.
- Risk: unresolved cloud, package, model, or docs blockers are hidden as archive-only.
  - Mitigation: archive-only is only for superseded historical evidence; live blockers require intentional hold or linked follow-up.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent docs-review and release-intake classification: completed in the parent lane; final PR lifecycle remains the active handoff step.
- Date: 2026-05-01
