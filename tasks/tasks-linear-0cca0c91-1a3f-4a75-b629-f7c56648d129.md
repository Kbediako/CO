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
- [ ] `npm run pack:smoke` includes Codex marketplace install/register coverage by default after `CO-196`. Evidence: pending parent implementation and validation.
- [ ] Marketplace smoke can be skipped only through explicit env/flag opt-out plus documented allowed-use reason. Evidence: pending parent implementation and validation.
- [ ] Relevant CI/release workflows cannot silently miss marketplace smoke. Evidence: pending parent workflow posture update/review.
- [ ] Release-facing status does not claim marketplace coverage from generic pack-smoke success alone. Evidence: pending parent validation.
- [ ] `CO-196` local validation proof remains intact and complementary. Evidence: pending parent review.

## Validation
- [x] Child scoped protected-term scan over packet and mirrors. Evidence: `rg -n "npm run pack:smoke|Codex marketplace install/register coverage|Codex 0\\.121\\+ marketplace support|CI/release workflow posture|CO-196|explicit env/flag opt-out|documented allowed use|broad release-pipeline|guardrail|delegation|runtime|local validation proof" docs/PRD-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md docs/TECH_SPEC-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md docs/ACTION_PLAN-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md tasks/specs/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md tasks/tasks-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md .agent/task/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`.
- [x] Child JSON parse/registry presence check. Evidence: `node -e` parsed `tasks/index.json` and `docs/docs-freshness-registry.json`, found `20260418-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129`, and confirmed 6 freshness entries.
- [ ] Parent docs-review / `node scripts/spec-guard.mjs --dry-run` after patch import. Evidence: pending.
- [ ] Parent focused mandatory marketplace smoke and opt-out coverage. Evidence: pending.
- [ ] Parent final `npm run pack:smoke`. Evidence: pending.
- [ ] Parent required validation/review/elegance gates before PR handoff. Evidence: pending.

## Progress Log
- 2026-04-18: Bounded same-issue child lane created the `CO-217` docs-first packet and registry mirrors against source anchor `ctx:sha256:c68320feb662fb56167ab93a196f71369d54a97a84bca89b2d0c0206ee122e0f#chunk:c000001`. The expected shared source payload path was absent in this child checkout, so the packet is anchored on the protected lane instructions and current repo pack-smoke/release posture. The packet preserves `npm run pack:smoke`, Codex marketplace install/register coverage, `Codex 0.121+ marketplace support`, CI/release workflow posture, `CO-196`, explicit env/flag opt-out, documented allowed use, and rejects broad release-pipeline, guardrail, delegation, runtime, or `CO-196` proof-replacement scope.
