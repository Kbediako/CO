---
id: 20260418-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129
title: CO: harden marketplace pack:smoke coverage after CO-196
relates_to: docs/PRD-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

# TECH_SPEC - CO: harden marketplace pack:smoke coverage after CO-196

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`
- PRD: `docs/PRD-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`
- Task checklist: `tasks/tasks-linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`
- `.agent` mirror: `.agent/task/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129.md`

## Traceability
- Linear issue: `CO-217` / `0cca0c91-1a3f-4a75-b629-f7c56648d129`
- Shared source 0 anchor: `ctx:sha256:c68320feb662fb56167ab93a196f71369d54a97a84bca89b2d0c0206ee122e0f#chunk:c000001`
- Source object id: `sha256:c68320feb662fb56167ab93a196f71369d54a97a84bca89b2d0c0206ee122e0f`
- Origin manifest: `.runs/linear-0cca0c91-1a3f-4a75-b629-f7c56648d129-docs-packet/cli/2026-04-18T20-19-38-475Z-02ff97ee/manifest.json`

## Summary
- Objective: make marketplace install/register coverage part of `npm run pack:smoke` by default and make any CI/release skip explicit after `CO-196`.
- Decision: marketplace smoke is mandatory by default. Skipping is allowed only through an explicit env/flag opt-out with documented allowed use and reason evidence.
- Scope:
  - pack-smoke marketplace prerequisite handling and reasoned opt-out enforcement
  - focused workflow posture regression coverage for mandatory marketplace smoke
  - release-guide documentation of the non-coverage skip contract
  - validation that preserves `CO-196` local proof
  - docs packet and registry mirrors from the accepted child lane
- Constraints:
  - do not replace the `CO-196` local validation proof
  - do not broaden into release-pipeline refactors
  - do not change guardrail, delegation, or runtime behavior

## Protected Surfaces
- `npm run pack:smoke`
- Codex marketplace install/register coverage
- `Codex 0.121+ marketplace support`
- CI/release workflow posture
- `CO-196`
- explicit env/flag opt-out with documented allowed use

## Technical Requirements
- Functional requirements:
  - `npm run pack:smoke` must exercise marketplace install/register coverage by default from the packaged downstream simulation.
  - CI/release lanes that claim pack-smoke coverage must not silently omit marketplace coverage.
  - Any opt-out must be explicit, machine-checkable, reasoned, and limited to documented allowed uses.
  - Unsupported Codex marketplace environments, including non-`0.121+` compatibility lanes, must be reported as explicit non-coverage or waived evidence rather than green marketplace proof.
  - `CO-196` local validation proof remains the source/reference proof for marketplace correctness.
- Non-functional requirements:
  - keep changes narrow to pack-smoke and relevant workflow posture
  - keep logs/artifacts reviewer-readable
  - avoid network or credential assumptions beyond what the marketplace smoke contract explicitly documents
  - avoid broad release-pipeline, guardrail, delegation, or runtime refactors
- Touched surfaces:
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `docs/skills-release.md`

## Opt-Out Policy
- Default: marketplace smoke runs as part of `npm run pack:smoke`.
- Allowed skips must use `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1` and `PACK_SMOKE_MARKETPLACE_SKIP_REASON=<reason>`.
- Allowed-use examples to document:
  - local docs-only validation where no package/workflow marketplace coverage is being claimed
  - an explicit compatibility lane for Codex versions before marketplace support
  - a documented external marketplace outage or unavailable service where release owners record non-coverage evidence
- Not allowed:
  - release/tag publication claiming marketplace coverage without running marketplace smoke
  - CI/backstop green status that hides missing marketplace install/register coverage
  - implicit skip because a marketplace helper, Codex version, or network precondition was absent

## Acceptance Criteria
1. `npm run pack:smoke` includes marketplace install/register coverage by default after `CO-196`.
2. Marketplace coverage can be skipped only by explicit opt-out plus reason evidence.
3. Relevant CI/release workflows fail, waive visibly, or report non-coverage when marketplace smoke does not run.
4. Release-facing status cannot claim marketplace coverage from generic pack-smoke success alone.
5. The `CO-196` local validation proof remains intact and is referenced as the upstream proof this hardening complements.
6. No broad release-pipeline, guardrail, delegation, or runtime-mode change is required for acceptance.

## Validation Plan
- Child lane:
  - scoped protected-term check over the docs packet and mirrors
  - JSON parse/registry presence check for `tasks/index.json` and `docs/docs-freshness-registry.json`
- Parent lane:
  - docs-review and `node scripts/spec-guard.mjs --dry-run` after patch import
  - focused tests or assertions for mandatory marketplace smoke and opt-out behavior
  - `npm run pack:smoke` on the final implementation
  - workflow posture review for relevant CI/release lanes
  - standalone review and explicit elegance/minimality pass before PR handoff

## Open Questions
- Answered 2026-04-18: core-lane, pack-smoke backstop, and release publish consume the mandatory marketplace smoke contract in this slice.
- Answered 2026-04-18: opt-out reason text is required through `PACK_SMOKE_MARKETPLACE_SKIP_REASON=<reason>` whenever `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1` suppresses marketplace coverage.
- Answered 2026-04-18: the focused helper exposes `run|skip|fail` decisions; no separate persisted summary field is required for this slice.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- Parent lane completed final validation, standalone review/elegance, and pack-smoke proof before PR handoff.
