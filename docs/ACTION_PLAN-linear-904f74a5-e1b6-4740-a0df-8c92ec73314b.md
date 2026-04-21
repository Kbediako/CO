# ACTION_PLAN: CO-268 marketplace docs and smoke coverage rebaseline to Codex 0.122 plugin marketplace commands

## Goal

Align CO's public marketplace docs, launcher guidance, pack-smoke implementation, related tests, and smoke workflow pins to the live Codex CLI `0.122.0` command surface: `codex plugin marketplace add` and `codex plugin marketplace remove`.

## Constraints

- Keep npm as the supported baseline install path.
- Keep the packaged marketplace/plugin architecture unchanged.
- Keep scope limited to the intended docs, launcher, smoke, and related test/workflow surfaces.
- Respect child-lane ownership of `README.md` and `docs/public/downstream-setup.md` until the patch is accepted or manually applied.

## Source Evidence

- Linear issue: `CO-268`
- Issue id: `904f74a5-e1b6-4740-a0df-8c92ec73314b`
- Source anchor: `ctx:sha256:ec9b1d2d54349512a2691004f2a7801fa37b85ef8f086240d3f4199d1fc8bbee#chunk:c000001`
- Declared source payload: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b/cli/2026-04-21T01-43-26-870Z-6fb785d8/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b/cli/2026-04-21T01-43-26-870Z-6fb785d8/manifest.json`
- Observed local command surface:
  - `codex-cli 0.122.0`
  - old `codex marketplace add` path fails
  - new `codex plugin marketplace add/remove` paths succeed

## Issue Readiness Gate

- Intent checksum / protected terms carried forward:
  - `Codex CLI 0.122.0`
  - `codex plugin marketplace add`
  - `codex plugin marketplace remove`
  - `codex marketplace add`
  - `README.md`
  - `docs/public/downstream-setup.md`
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
  - `plugins/codex-orchestrator/launcher.mjs`
- Not done if:
  - docs or launcher guidance still point to the old command path
  - smoke logic/tests/workflows still encode only the old command surface
  - rollback/removal guidance omits `codex plugin marketplace remove`
  - scope drifts into packaging redesign or posture promotion
- Pre-implementation issue-quality review:
  - 2026-04-21: confirmed a narrow rebaseline lane. Workflow pin updates are required because the related pack-smoke test contract currently enforces `@openai/codex@0.121.0`, which would preserve stale smoke truth after the command-surface change.

## Milestones & Sequencing

1. Create the docs packet, task mirrors, registry entries, workpad, and pre-turn decomposition matrix; record the required parallelization decision.
2. Accept or manually apply the child-lane public docs patch for `README.md` and `docs/public/downstream-setup.md`.
3. Update parent-owned surfaces:
   - `plugins/codex-orchestrator/launcher.mjs`
   - `scripts/pack-smoke.mjs`
   - `tests/pack-smoke.spec.ts`
   - `.github/workflows/core-lane.yml`
   - `.github/workflows/pack-smoke-backstop.yml`
   - `.github/workflows/release.yml`
4. Run `docs-review`, focused checks, required repo validation, standalone review, and elegance review.
5. Prepare PR/handoff state once validation and review artifacts are clean.

## Dependencies

- live local `codex-cli 0.122.0`
- successful same-issue child lane for the public docs surface
- current stable release evidence from upstream `rust-v0.122.0`

## Validation

- Checks / tests:
  - local command-surface evidence commands
  - focused `tests/pack-smoke.spec.ts`
  - required repo gates including `npm run pack:smoke`
  - `docs-review`, standalone review, elegance review
- Rollback plan:
  - revert the narrow command-surface changes if smoke or docs no longer match actual local CLI behavior
  - preserve the docs packet as the issue-shaping contract while reworking any failed implementation

## Risks & Mitigations

- Risk: only the wording changes, while smoke still validates `0.121.0`.
  - Mitigation: update the workflow pin and related test contract alongside the helper messages/invocation.
- Risk: child-lane ownership collides with parent docs edits.
  - Mitigation: parent avoids `README.md` and `docs/public/downstream-setup.md` until lane resolution.
- Risk: scope expands into unrelated internal docs.
  - Mitigation: keep this lane to the explicit public/launcher/smoke surfaces plus required smoke-enforcement workflows; file a follow-up if broader cleanup is needed.

## Approvals

- Reviewer: Codex provider worker.
- Date: 2026-04-21.
