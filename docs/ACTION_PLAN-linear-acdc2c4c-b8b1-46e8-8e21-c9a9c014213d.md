# ACTION PLAN - CO Codex CLI 0.120.0 Adoption Posture

## Summary
- Goal: decide and document CO's Codex CLI `0.120.0` compatibility/adoption posture after local baseline drift from the documented `0.118.0` target.
- Scope: docs-first packet, task-scoped audit artifacts, runtime/cloud gate evidence or waivers, active truth-surface updates, validation, review, and PR handoff.
- Assumptions: local `codex --version` remains `codex-cli 0.120.0`; no runtime architecture work is needed unless canaries expose a concrete `exec` / `resume` regression.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - Codex CLI `0.120.0`
  - Codex CLI `0.118.0`
  - `docs/guides/codex-version-policy.md`
  - `codex exec`
  - `codex exec resume`
  - `codex review`
  - `codex login --device-auth`
  - runtime-mode canary
  - cloud canary contract
  - cloud fallback contract
- Not done if:
  - the final posture is only a version-string edit
  - cloud gates are neither run nor explicitly waived with exact blocker evidence
  - docs-catalog checked surfaces disagree after the decision
  - provider-worker/review-wrapper assumptions lack current command-surface proof
- Pre-implementation issue-quality review:
  - approved. The issue is correctly broader than a string bump and narrower than a runtime rewrite; the protected surfaces and non-goals are explicit.

## Milestones & Sequencing
1. Claim issue, transition to `In Progress`, create workpad, record parallelization decision, and launch the bounded audit child lane.
2. Register the docs-first packet in `tasks/index.json`, `docs/TASKS.md`, `.agent/task/`, and `docs/docs-freshness-registry.json`.
3. Run docs-review before implementation; record a truthful fallback if wrapper/provenance boundaries block completion.
4. Collect and reconcile audit evidence from child and parent gates.
5. Decide promote versus hold; update active truth surfaces consistently.
6. Run required validation and save key logs under `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/`.
7. Run standalone review plus elegance pass, open/attach PR, drain automated feedback, and hand off to `In Review`.

## Dependencies
- Local Codex CLI installation.
- Cloud canary credentials/environment for required cloud contract, or explicit waiver evidence if absent.
- Existing docs-catalog `codex-cli-version` posture checks.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `node scripts/runtime-mode-canary.mjs`
  - `npm run ci:cloud-canary` required and fallback variants, or waiver artifacts
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review and explicit elegance pass
- Rollback plan: revert docs posture changes and leave `0.118.0` as the target with the audit/hold rationale preserved.

## Decision
- 2026-04-14 posture: HOLD current Codex CLI target at `0.118.0`.
- Rationale: local `codex-cli 0.120.0` is acceptable workspace drift because protected command surfaces still pass and the runtime-mode canary passes after `npm run build`; repository-wide promotion is blocked because the provider workspace lacks `CODEX_CLOUD_ENV_ID`, so the required cloud canary contract cannot pass.
- Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-version-canary/compare/decision-go-no-go.md`.

## Risks & Mitigations
- Risk: local-only `0.120.0` help compatibility masks cloud contract drift.
  - Mitigation: cloud gate run-or-waiver evidence is a hard acceptance item.
- Risk: docs drift remains after policy edit.
  - Mitigation: rely on docs-catalog `codex-cli-version` truth checks in `docs:check`.
- Risk: child-lane artifacts collide with parent docs edits.
  - Mitigation: child owns only audit artifacts; parent owns policy/docs edits and workpad.

## Approvals
- Docs-review: clean-success in `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d-co-180-docs-review-r2/cli/2026-04-14T10-06-30-092Z-440706ce/manifest.json`.
- Standalone review: pending before PR handoff.
- Date: 2026-04-14
