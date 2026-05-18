# Task Checklist - linear-0cca0c91-1a3f-4a75-b629-f7c56648d129

- Linear Issue: `CO-217` / `0cca0c91-1a3f-4a75-b629-f7c56648d129`
- MCP Task ID: `linear-0cca0c91-1a3f-4a75-b629-f7c56648d129`
- Primary PRD: `docs/PRD-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`
- TECH_SPEC: `tasks/specs/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`
- Shared source 0 anchor: `ctx:sha256:c68320feb662fb56167ab93a196f71369d54a97a84bca89b2d0c0206ee122e0f#chunk:c000001`
- Source object id: `sha256:c68320feb662fb56167ab93a196f71369d54a97a84bca89b2d0c0206ee122e0f`
- Origin manifest: `.runs/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129-docs-packet/cli/2026-04-18T20-19-38-475Z-02ff97ee/manifest.json`

## Docs-First
- [x] PRD drafted for marketplace `pack:smoke` hardening after `CO-196`. Evidence: `docs/PRD-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`.
- [x] TECH_SPEC drafted with mandatory-default marketplace smoke decision, protected surfaces, non-goals, and validation plan. Evidence: `tasks/specs/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`, `docs/TECH_SPEC-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused validation, workflow posture, and handoff. Evidence: `docs/ACTION_PLAN-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`.
- [x] Checklist mirrored to `.agent/task/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`. Evidence: `.agent/task/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`.
- [x] TECH_SPEC linked in `tasks/index.json`. Evidence: `tasks/index.json`.
- [x] Task snapshot and docs freshness registry mirrors updated. Evidence: `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md` readiness gate.

## Workflow
- [x] Child lane stayed docs-only and did not mutate Linear state or the parent workpad. Evidence: changed files are limited to the declared docs/task/registry scope.
- [x] Child lane did not edit implementation, test, package, or workflow files. Evidence: `git diff --name-only`.
- [x] Child lane left workspace changes in place for parent patch export instead of committing. Evidence: no commit created in this lane.

## Implementation Acceptance
- [x] `npm run pack:smoke` includes Codex marketplace install/register coverage by default after `CO-196`. Evidence: `npm run pack:smoke` passed and logged local plus served-git marketplace add/install coverage.
- [x] Marketplace smoke can be skipped only through explicit env/flag opt-out plus documented allowed-use reason. Evidence: `scripts/pack-smoke.mjs` requires `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1` plus `PACK_SMOKE_MARKETPLACE_SKIP_REASON=<reason>` before skip; `npm run test:orchestrator -- tests/pack-smoke.spec.ts` passed.
- [x] Relevant CI/release workflows cannot silently miss marketplace smoke. Evidence: `tests/pack-smoke.spec.ts` pins Codex `0.121.0` install before every `npm run pack:smoke` occurrence in core-lane, pack-smoke backstop, and release workflows, and rejects `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP` in those workflows.
- [x] Release-facing status does not claim marketplace coverage from generic pack-smoke success alone. Evidence: `docs/skills-release.md` records marketplace smoke as mandatory by default and marks reasoned skips as non-coverage evidence.
- [x] `CO-196` local validation proof remains intact and complementary. Evidence: branch merged `origin/main` containing `CO-196`; pack-smoke marketplace assertions were preserved and prerequisite handling only was hardened.

## Validation
- [x] Child scoped protected-term scan over packet and mirrors. Evidence: `rg -n "npm run pack:smoke|Codex marketplace install/register coverage|Codex 0\\.121\\+ marketplace support|CI/release workflow posture|CO-196|explicit env/flag opt-out|documented allowed use|broad release-pipeline|guardrail|delegation|runtime|local validation proof" docs/PRD-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md docs/TECH_SPEC-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md docs/ACTION_PLAN-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md tasks/specs/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md tasks/tasks-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md .agent/task/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`.
- [x] Child JSON parse/registry presence check. Evidence: `node -e` parsed `tasks/index.json` and `docs/docs-freshness-registry.json`, found `20260418-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129`, and confirmed 6 freshness entries.
- [x] Parent docs/spec gates after patch import. Evidence: `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness` passed.
- [x] Parent focused mandatory marketplace smoke and opt-out coverage. Evidence: `npm run test:orchestrator -- tests/pack-smoke.spec.ts` passed 4 tests.
- [x] Parent final `npm run pack:smoke`. Evidence: command passed and logged `Added marketplace codex-orchestrator` for local and served-git sources plus `✅ pack smoke passed`.
- [x] Parent required validation/review/elegance gates before PR handoff. Evidence: delegation guard, spec guard, build, lint, full test suite, docs gates, repo stewardship, diff budget, clean standalone review telemetry, explicit elegance pass, and pack-smoke all completed.

## Progress Log
- 2026-04-18: Bounded same-issue child lane created the `CO-217` docs-first packet and registry mirrors against source anchor `ctx:sha256:c68320feb662fb56167ab93a196f71369d54a97a84bca89b2d0c0206ee122e0f#chunk:c000001`. The expected shared source payload path was absent in this child checkout, so the packet is anchored on the protected lane instructions and current repo pack-smoke/release posture. The packet preserves `npm run pack:smoke`, Codex marketplace install/register coverage, `Codex 0.121+ marketplace support`, CI/release workflow posture, `CO-196`, explicit env/flag opt-out, documented allowed use, and rejects broad release-pipeline, guardrail, delegation, runtime, or `CO-196` proof-replacement scope.
- 2026-04-19: Parent lane merged current `origin/main` with `CO-196`, hardened `scripts/pack-smoke.mjs` to fail closed unless local opt-outs include reason evidence, added focused regression coverage for helper behavior and workflow Codex provisioning, documented release posture, and completed required validation through full test, clean standalone review/elegance, and `npm run pack:smoke`.
