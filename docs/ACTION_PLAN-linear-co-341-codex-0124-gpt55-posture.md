# ACTION_PLAN - CO: Re-audit Codex CLI 0.124.0 posture and GPT-5.5 hook/config alignment

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: promote or hold Codex CLI `0.124.0` and `gpt-5.5` `xhigh` posture through evidence-backed CO gates, while fixing local hook/config drift and keeping Linear state truthful.
- Scope: docs-first packet, command/release/model audit, local hook/config smoke, runtime/review/delegation/provider/cloud/pack-smoke validation, posture edits, tests, review/elegance pass, and Linear monitoring.
- Assumptions: CO-341 is the canonical posture lane, CO-338 remains the separate release publish blocker, and the clean worktree `/Users/kbediako/Code/CO-co341-codex-0124` is the only repo edit surface for this lane.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `0.124.0`, `gpt-5.5`, `xhigh`, `codex_hooks`, `legacy_notify`, `co_orchestration_autocontinue.json`, `codex review`, `codex cloud`, `npm run ci:cloud-canary`, `npm run pack:smoke`, CO-337, CO-338, CO-340, and CO-341.
- Not done if: promotion is based only on local exec, hook/config smoke still has targeted drift warnings, cloud/review/delegation/provider evidence is missing, or Linear issues are closed without terminal criteria.
- Pre-implementation issue-quality review: subagent validation confirmed CO-341 is canonical and related issue state is correct; parent Orchestrator accepts the issue for docs-first implementation.

## Milestones & Sequencing
1. Capture and repair local 0.124 hook/config drift, then rerun a `gpt-5.5` `codex exec` smoke.
2. Register this docs-first packet in `docs/TASKS.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, and `.agent/task/`.
3. Capture command/release/model artifacts for `0.124.0` and classify any residual warnings.
4. Run runtime-mode, delegation, review/provider, cloud-required, cloud-fallback, marketplace, and pack-smoke validation.
5. If gates pass, update version policy, AGENTS/README mirrors, default config generation, workflow pins, and focused tests to `0.124.0` / validated `gpt-5.5`; if gates fail, record a HOLD and Linear follow-up.
6. Run the validation floor, standalone review, and explicit elegance/minimality pass.
7. Monitor CO-337, CO-338, CO-340, and CO-341 until each has a truthful terminal state or a documented blocker.

## Dependencies
- Codex CLI `0.124.0` installed locally.
- ChatGPT auth for local model/delegation/review surfaces.
- GitHub and npm access for release/package evidence.
- Linear access for issue comments/state transitions.
- Cloud canary environment when required cloud execution is tested.

## Validation
- Checks / tests:
  - `codex exec --ephemeral --json -m gpt-5.5 "Reply with OK only."`
  - `codex --version`, npm package metadata, release/tag evidence, command help surfaces, and feature list
  - `node scripts/runtime-mode-canary.mjs`
  - `npm run ci:cloud-canary` required and fallback contracts
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan: if a gate fails, do not promote `0.124.0` or `gpt-5.5`; keep repo posture at the last validated target, record HOLD evidence under the CO-341 artifacts, and raise or relate a Linear follow-up only for a validated distinct problem.

## Risks & Mitigations
- Risk: OpenAI docs are not fully synchronized on latest Codex model wording. Mitigation: prefer local CLI model catalog and official Codex model/config docs while recording the FAQ drift caveat.
- Risk: local config fixes hide repo-shippable issues. Mitigation: separate local operator config patch evidence from repo posture edits and add repo docs/tests only where CO owns the surface.
- Risk: cloud or review gates lag behind local exec support. Mitigation: hold promotion for that surface and keep default posture conservative where evidence is incomplete.
- Risk: Linear issue count exceeds cap. Mitigation: keep CO-337, CO-338, CO-340, and CO-341 as the only In Progress set until a slot frees.

## Approvals
- Reviewer: parent Orchestrator
- Date: 2026-04-24
