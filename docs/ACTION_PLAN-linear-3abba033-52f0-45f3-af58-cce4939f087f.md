# ACTION_PLAN - CO-480 MultiAgentV2 0.128 thread-cap audit

## Summary
- Goal: add narrow CO guidance/classification for the Codex CLI 0.128 MultiAgentV2 thread cap without regressing CO-354 or stable multi-agent defaults.
- Scope: docs packet, doctor/default/init posture, focused tests/probes, and affected multi-agent guidance docs/skills.
- Assumptions: `features.multi_agent=true` remains the stable baseline; `features.multi_agent_v2=true` remains opt-in/experimental and must not receive `agents.max_threads`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `Codex CLI 0.128`, `MultiAgentV2`, `features.multi_agent_v2=true`, `agents.max_threads`, `features.multi_agent_v2.max_concurrent_threads_per_session`, `CO-354`, `CO-466`, `doctor/default/init behavior`.
- Not done if: docs imply no current v2 cap path; doctor/default/init write `agents.max_threads` under v2; doctor/default/init stay silent about the accepted v2 cap path without user-owned classification; old rejection and new acceptance lack tests/probes; scope expands into model/cloud/release/delegation changes.
- Pre-implementation issue-quality review: live Linear context confirmed `Rework`; stale PR #798 was swept and closed; stale workpad was deleted; fresh branch `linear/co-480-rework` was created from `origin/main` at `e7ed674534`; current main lacks CO-480 packet files and still has only CO-354 old-path guard guidance.
- Fallback / refactor decision: touches compatibility behavior. Decision is to remove the stale "omit only" fallback by documenting/classifying the 0.128 v2 cap path while preserving the valid old-path rejection guard.
- Durable retention evidence: no retained fallback is planned.
- Large-refactor check: a larger refactor is not warranted because this is one missing cap classification in existing doctor/default/init guidance, not a split authority or lifecycle redesign.

## Milestones & Sequencing
1. Seed docs-first packet, registry mirrors, and task checklist before implementation edits.
2. Run docs-review evidence or record explicit baseline blocker before implementation.
3. Inspect current doctor/default/init code and local Codex cap behavior.
4. Implement the smallest support/classification change and docs guidance.
5. Run focused tests/probes, then required validation, standalone review, elegance pass, PR, ready-review, and Linear handoff.

## Dependencies
- Live Linear issue context and Rework reset.
- Codex CLI local probe for old/new cap behavior.
- Existing CO-354 tests and helpers.

## Validation
- Checks / tests:
  - focused old-path rejection and new-path acceptance probes
  - focused `Doctor`, `CodexDefaultsSetup`, and `InitTemplates` tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
  - explicit elegance/minimality pass
- Rollback plan: revert the CO-480 docs/doctor/default/init/test diff; CO-354 rejection guard and stable multi-agent baseline remain the fallback posture.

## Risks & Mitigations
- Risk: confusing CLI feature-probe path with persisted config path. Mitigation: run command probes and document any split explicitly.
- Risk: accidentally promoting MultiAgentV2. Mitigation: do not seed v2 cap by default; keep guidance user-owned unless source inspection proves CO should own writes.
- Risk: stable users lose max_threads baseline. Mitigation: targeted stable-baseline regression tests.

## Approvals
- Reviewer: docs-review child stream captured inherited `docs:freshness:maintain` blocker routed to CO-522; implementation validation is current through pack smoke except the known repo-wide `docs:freshness` baseline failure; manifest-backed standalone review reports `review_verdict=clean`; explicit elegance/minimality pass found no cleanup patch needed.
- Date: 2026-05-13.
