# ACTION PLAN - CO-565 Codex CLI 0.131.0 release-intake

## Summary
- Goal: complete the CO-565 release-intake packet for Codex CLI candidate `0.131.0` keyed by `codex-cli-release-intake:stable:0.131.0`.
- Scope: release-intake packet, registry mirrors, current version-policy classification, and evidence capture; no workflow pins, package pins, local install, cloud promotion, model defaults, or source behavior change.
- Assumptions:
  - the parent-run source anchor is authoritative for this release-intake lane
  - the parent source payload is available at `.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/cli/2026-05-19T20-55-42-862Z-928a3f57/memory/source-0/source.txt` and parent owns final reconciliation
  - `.agent/task/templates/codex-cli-release-intake-template.md` is the closeout checklist contract
  - parent owns registry mirrors, all release evidence, Linear/GitHub mutation, validation, workpad, PR lifecycle, and final patch integration

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - candidate Codex CLI release `0.131.0`
  - canonical owner key `codex-cli-release-intake:stable:0.131.0`
  - canonical marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`
  - do not auto-promote `0.131.0`
  - local CLI
  - package/downstream smoke
  - cloud-canary
  - workflow pins
  - model posture
  - docs surfaces
  - release notes
  - supersedes/holds matrix
  - closeout classification gates
  - `.agent/task/templates/codex-cli-release-intake-template.md`
- Not done if:
  - any protected term is missing
  - local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, or release notes are collapsed into one generic evidence bucket
  - the supersedes/holds matrix is absent or missing rows
  - closeout classification omits adopt latest, intentionally hold, or demote/archive-only states
  - stale current-facing docs, workflow pins, prior release evidence pages, package/downstream holds, cloud-canary blockers, or model posture claims remain unclassified
  - this lane edits source files, package files, workflows, generated outputs, tests, templates, release publishing, local install state, model defaults, or unrelated Linear/GitHub lifecycle surfaces
- Pre-implementation issue-quality review:
  - 2026-05-19: approved for release-intake packet/classification. The lane is not suitable for the micro-task path because correctness depends on exact protected terms, evidence axes, and release-intake closeout classification.
- Fallback / refactor decision:
  - This lane adds no runtime fallback, compatibility path, legacy behavior, stale behavior, cached behavior, break-glass path, or minor seam. Existing release-facing package/downstream and cloud-canary holds are posture surfaces to classify, not new fallback behavior introduced by this lane.

## Milestones & Sequencing
1. [x] Create the CO-565 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
2. [x] Preserve source anchor, source object id, manifest pointer, canonical owner key, and canonical marker in traceability.
3. [x] Carry forward protected terms, issue intent checksum, non-goals, Not Done If, and acceptance criteria.
4. [x] Capture GitHub release truth and npm `@openai/codex` dist-tags/time for `0.131.0`.
5. [x] Capture local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes as separate evidence axes.
6. [x] Fill every supersedes/holds matrix row with adopt/latest, intentionally hold, or demote/archive-only classification.
7. [ ] Run final validation, standalone review, elegance review, PR handoff, ready-review drain, and Linear review-state transition.

## Parent-Owned Follow-On Plan
1. [x] Reconcile this packet against authoritative CO-565 Linear issue/workpad truth and the shared source payload.
2. [x] Register registry mirrors: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. [x] Capture upstream Codex CLI release detection with GitHub release truth and npm @openai/codex dist-tags/time for `0.131.0`.
4. [x] Compare candidate `0.131.0` against the CO version-policy target, posture matrix, and workflow pins.
5. [x] Collect local CLI evidence, package/downstream smoke evidence, cloud-canary evidence, workflow pins evidence, model posture evidence, docs surfaces evidence, and release notes evidence as separate gates.
6. [x] Fill every supersedes/holds matrix row with adopt latest, intentionally hold, or demote/archive-only classification.
7. [x] Keep archive-only classification limited to superseded evidence; unresolved blockers stay intentional holds or linked blockers.
8. [x] Update only parent-owned surfaces justified by evidence.
9. [ ] Run final validation and review for touched parent surfaces.
10. [ ] Record final closeout classification in workpad, task mirrors, PR, and current docs surfaces.

## Dependencies
- Source anchor `ctx:sha256:2bc9d835d25cc769df42134a55d81362f859e6e881c0ba271234658d26152a4b#chunk:c000001`.
- Source object id `sha256:2bc9d835d25cc769df42134a55d81362f859e6e881c0ba271234658d26152a4b`.
- Parent manifest `.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/cli/2026-05-19T20-55-42-862Z-928a3f57/manifest.json`.
- Parent source payload `.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/cli/2026-05-19T20-55-42-862Z-928a3f57/memory/source-0/source.txt`.
- `.agent/task/templates/codex-cli-release-intake-template.md`.
- `docs/guides/codex-version-policy.md`.
- `docs/codex-posture-matrix.json`.
- GitHub release truth for upstream Codex CLI.
- npm @openai/codex dist-tags/time.
- Parent-owned workflow pins, local CLI probes, package/downstream smoke, cloud-canary, model posture, docs surfaces, and release notes evidence.

## Validation
- Checks / tests:
  - protected-term scan across the six packet/checklist files
  - scoped `git diff --check --` over declared files
  - scoped changed-file review to confirm no out-of-scope edits
- Rollback plan: because this lane is docs/policy/registry scoped, revert the CO-565 packet, registry mirrors, task snapshot, and version-policy candidate audit rows without touching source behavior, workflow pins, package pins, local install state, or model defaults.

## Risks & Mitigations
- Risk: candidate `0.131.0` is interpreted as adoption-ready.
  - Mitigation: action plan separates release detection, evidence collection, supersedes/holds classification, and final posture updates.
- Risk: GitHub release truth and npm @openai/codex dist-tags/time diverge.
  - Mitigation: parent must preserve both inputs and fail closed or hold when they conflict.
- Risk: workflow pins move mechanically because a newer candidate exists.
  - Mitigation: workflow pins evidence is a separate gate with explicit adopt/hold/follow-up classification.
- Risk: unresolved cloud, package, model, or docs blockers are hidden as archive-only.
  - Mitigation: archive-only is only for superseded historical evidence; live blockers require intentional hold or linked follow-up.
- Risk: registry mirrors are assumed to prove release adoption.
  - Mitigation: registry mirrors only record the release-intake decision; adoption remains limited to upstream/npm marker and package evidence while local/cloud/workflow holds stay explicit.

## Acceptance Note
- Closeout classification: adopt `0.131.0` for upstream/npm release-intake marker and package command-surface evidence only; intentionally hold local `0.130.0`, release-facing `0.125.0`, cloud `0.124.0`, and unchanged model posture until their gates are clean.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent release-intake classification: completed; final validation/review/PR handoff pending.
- Date: 2026-05-19
