# ACTION PLAN - CO Codex CLI 0.123.0 Posture And Marketplace Command Surface Correction

## Summary
- Goal: give CO-337 a docs-first packet so the parent lane can correct marketplace capability truth and make an evidence-backed release-pin decision for `0.123.0`.
- Scope: packet files, pack-smoke/test/workflow-policy implementation, delegated docs refresh, and current release-note classification.
- Assumptions: the live CO-337 issue body is authoritative, and the delegated docs child lane stays inside its four declared files.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - Codex CLI `0.123.0`
  - Codex CLI `0.122.0`
  - Codex CLI `0.121.0`
  - Codex CLI `0.118.0`
  - `rust-v0.123.0`
  - `codex plugin marketplace add`
  - `codex marketplace add`
  - `pack:smoke`
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
  - `docs/guides/codex-version-policy.md`
  - `README.md`
  - `docs/public/downstream-setup.md`
  - `plugins/codex-orchestrator/launcher.mjs`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/cloud-canary.yml`
  - `node scripts/runtime-mode-canary.mjs`
  - `CODEX_CLOUD_ENV_ID`
  - `remote_sandbox_config`
- Not done if:
  - corrected marketplace truth is not reflected in code/tests/docs
  - the release-facing pin decision still cites the stale assumption
  - `0.123.0` is promoted without runtime/cloud evidence
  - `pack:smoke` or cloud-canary guardrails are weakened
- Pre-implementation issue-quality review:
  - approved for docs-first packet plus parent implementation. The lane is not narrow enough for micro-task treatment because correctness depends on exact command names, exact workflow surfaces, and current release-note classification.

## Milestones & Sequencing
1. Create the CO-337 packet, registry entries, and task mirrors.
2. Launch and monitor the docs-only child lane for `README.md`, `docs/public/downstream-setup.md`, `docs/guides/codex-version-policy.md`, and `plugins/codex-orchestrator/launcher.mjs`.
3. Capture official `rust-v0.123.0`, local `0.123.0`, and versioned `0.121.0` / `0.122.0` / `0.123.0` command evidence.
4. Update `scripts/pack-smoke.mjs` to probe and use the supported marketplace add path.
5. Update `tests/pack-smoke.spec.ts` and any workflow pins/rationale implied by the corrected surface.
6. Rerun docs-review, targeted tests, workflow-matched pack-smoke, and then the required validation floor.
7. Run standalone review and elegance review.
8. Refresh the workpad with final evidence and prepare review handoff or next-state transition.

## Dependencies
- official `openai/codex` release page for `rust-v0.123.0`
- local `codex` CLI
- `npx @openai/codex@0.121.0`, `0.122.0`, and `0.123.0`
- delegated docs child lane `marketplace-docs`
- workflow pin surfaces and current version-policy file

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - targeted `vitest` for `tests/pack-smoke.spec.ts`
  - workflow-matched `npm run pack:smoke` on a post-`0.121.0` candidate
  - repo validation floor for the final diff
  - standalone review
  - explicit elegance review
- Rollback plan:
  - if corrected-surface smoke still fails on post-`0.121.0`, keep release-facing pins on `0.121.0` with the corrected rationale and preserve the active-target hold

## Risks & Mitigations
- Risk: docs and code diverge on which marketplace command is supported.
  - Mitigation: use the same verified `0.121.0` / `0.122.0` / `0.123.0` evidence for both.
- Risk: parent edits collide with delegated docs files.
  - Mitigation: parent avoids those files until the child patch is accepted or rejected.
- Risk: corrected pack-smoke still leaves unknown release-pin blockers.
  - Mitigation: rerun workflow-matched smoke before any pin decision and keep the pin hold explicit if blockers remain.

## Approvals
- Docs-first packet: pending parent lane.
- Parent implementation / validation / PR lifecycle: pending.
- Date: 2026-04-24
