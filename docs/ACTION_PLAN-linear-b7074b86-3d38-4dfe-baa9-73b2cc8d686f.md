# ACTION PLAN - CO-390 Upstream Codex CLI Release Detection And Release Intake

## Summary
- Goal: give the parent lane a docs-first packet for CO-390 that separates release detection and canonical release intake from Codex CLI adoption.
- Scope: docs packet, task mirrors, and registry entries only.
- Assumptions: the parent-provided source anchor is authoritative, the local source payload is unavailable in this child checkout, and parent owns all Linear/API mutation and implementation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-390`
  - upstream Codex CLI release detection
  - canonical release-intake triggering
  - GitHub release truth
  - npm `@openai/codex` dist-tags/time
  - CO version-policy target
  - workflow pins
  - one canonical Linear intake issue
  - CO-386 release-intake template
  - `docs/guides/codex-version-policy.md`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/cloud-canary.yml`
  - `tests/pack-smoke.spec.ts`
- Not done if:
  - release detection does not use both GitHub release truth and npm `@openai/codex` dist-tags/time
  - CO version-policy target and workflow pins are not comparison inputs
  - the trigger can open duplicate Linear intake issues
  - the CO-386 release-intake template is omitted
  - this lane changes implementation, package, workflow, test, pin, or Linear state
- Pre-implementation issue-quality review:
  - approved for docs-only packet drafting. CO-390 is a release-intake shaping lane with exact naming and deduplication requirements, so the micro-task path is not appropriate.

## Milestones & Sequencing
1. Draft PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror for CO-390.
2. Register task id `20260426-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f` in `tasks/index.json`.
3. Add docs freshness rows for the new packet and mirrors.
4. Parent reconciles this packet against authoritative Linear issue/workpad state and the CO-386 template.
5. Parent runs docs-review before implementation.
6. Parent implements or wires release evidence collection from GitHub release truth and npm `@openai/codex` dist-tags/time.
7. Parent compares release evidence against CO version-policy target and workflow pins.
8. Parent deduplicates against existing canonical intake before creating or updating one canonical Linear intake issue.
9. Parent validates only the touched implementation surfaces and records release-intake evidence before PR handoff.

## Dependencies
- Parent-provided source anchor `ctx:sha256:458c1773dc00d4b3c070ab6ce8919e6b73816c6d2a2fc0f4903ebf3b075386e5#chunk:c000001`.
- `docs/guides/codex-version-policy.md`.
- Workflow pin surfaces:
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/cloud-canary.yml`
  - `tests/pack-smoke.spec.ts`
- GitHub release truth for upstream Codex CLI.
- npm registry metadata for `@openai/codex` dist-tags/time.
- CO-386 release-intake template.
- Parent-owned Linear issue search/create/update integration.

## Validation
- Checks / tests:
  - protected-term scan across packet files
  - JSON parse for registry files
  - scoped `git diff --check --` over declared files
  - scoped changed-file review to confirm no out-of-scope edits
- Rollback plan: because this lane is docs-only, rollback is deleting this packet and registry rows before parent integration. Parent should not create or update Linear intake from this child lane output until patch acceptance.

## Risks & Mitigations
- Risk: release detection is interpreted as permission to promote a Codex CLI version.
  - Mitigation: packet states that release detection triggers intake only; version adoption remains a downstream posture lane with existing gates.
- Risk: npm `latest` and GitHub release data diverge.
  - Mitigation: require both GitHub release truth and npm `@openai/codex` dist-tags/time, and fail closed or advisory when evidence conflicts.
- Risk: repeated runs create duplicate Linear intake issues.
  - Mitigation: require deduplication and one canonical Linear intake issue per upstream release candidate.
- Risk: workflow pins are bumped mechanically because a newer release exists.
  - Mitigation: workflow pins are comparison evidence only; parent pin changes need separate implementation and validation.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent docs-review / implementation / validation / PR lifecycle: pending parent lane.
- Date: 2026-04-26
