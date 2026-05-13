---
id: 20260513-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43
title: CO-488 plugin hook, cache, and external config import governance
status: in_progress
owner: Codex
created: 2026-05-13
last_review: 2026-05-14
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
related_action_plan: docs/ACTION_PLAN-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
related_tasks:
  - tasks/tasks-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
review_notes:
  - 2026-05-13: Parent orchestration created the traceability packet from live CO-488 Linear context so the issue could leave Backlog only after packet and registry evidence lands.
  - 2026-05-14: Provider-worker implementation started from PR #802, captured 0.128 release/command evidence, and added pack-smoke governance for ungoverned packaged hook/import artifacts.
---

# TECH_SPEC - CO-488 plugin hook, cache, and external config import governance

## Canonical Reference
- PRD: `docs/PRD-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- Task checklist: `tasks/tasks-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- Agent mirror: `.agent/task/linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`

## Summary
- Objective: complete CO-488 by governing Codex CLI 0.128 plugin hook/cache/import surfaces for packaged downstream users.
- Scope:
  - six packet/mirror docs
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
  - packaged setup/version policy docs
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
- Constraints:
  - no broad marketplace command rewrite
  - no CO-450 binary provenance work
  - no arbitrary imported hook/config adoption

## Issue-Shaping Contract
- User-request translation:
  - Backlog blockers should be fixed at root cause, not patched over.
  - CO-488 has moved from traceability setup into active provider-worker implementation.
  - The implementation must govern plugin-bundled hooks, hook enablement state, remote bundle cache, remote uninstall, and external-agent config import.
- Protected terms / exact artifact and surface names:
  - plugin-bundled hooks
  - hook enablement state
  - remote plugin bundle cache
  - remote uninstall
  - external-agent config import
  - marketplace install flow
  - pack-smoke
  - downstream packaged plugin governance
  - `codex-cli-0128:plugin-hook-import-governance`
  - `backlog_head_follow_up_traceability_pending`
- Nearby wrong interpretations to reject:
  - marketplace command rebaseline duplicate
  - CO-450 binary provenance absorption
  - trusting imported hooks/config by default
  - packet-only branch as implementation completion
- Explicit non-goals:
  - no broad plugin rewrite
  - no blanket plugin disablement
  - no Linear/GitHub lifecycle mutation

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Traceability | CO-488 packet files and mirrors exist in PR #802. | Queue admission required packet evidence before implementation. | Packet remains current with implementation evidence. | Skipping packet evidence. |
| Plugin hook governance | 0.128 adds plugin-bundled hook behavior. | CO should not silently trust hook behavior. | Pack-smoke fails closed on packaged/cached hook declarations or hook state without explicit CO governance. | Blanket hook disablement. |
| Remote cache/uninstall | Cache/uninstall can affect downstream packaging. | Pack-smoke protects packaged behavior. | Cache-shape smoke remains required; docs classify remote cache/uninstall as packaged governance, not binary provenance. | Binary provenance. |
| External config import | Imported config can alter behavior. | CO config authority should be explicit. | Pack-smoke rejects imported external-agent config artifacts in packaged/cached plugin roots. | External-agent feature expansion. |

## Technical Requirements
- Functional requirements:
  1. Preserve six CO-488 packet/mirror files.
  2. Preserve task registration in `tasks/index.json`.
  3. Keep `docs/TASKS.md` and `docs/docs-freshness-registry.json` current.
  4. Capture live Codex CLI 0.128 release or command evidence for hook/cache/import surfaces.
  5. Document allowed, blocked, and out-of-scope packaged plugin behavior.
  6. Add pack-smoke fail-closed guardrails and focused tests for ungoverned hook/import artifacts.
  7. Preserve canonical owner key and protected terms.
- Non-functional requirements:
  - JSON remains parseable.
  - Implementation diff stays narrow to package docs, pack-smoke, and focused tests.
  - Validation classifies inherited docs freshness debt rather than hiding it.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plugin hook/import governance | Imported hooks/config can be silently trusted. | remove fallback | CO-488 | Plugin hook or external-agent config import affects packaged behavior. | 2026-05-03 | 2026-05-13 | N/A after implementation | Behavior is governed and validated, or fails closed. | Focused hook/import tests and pack-smoke where applicable. |
| Remote plugin bundle cache/uninstall | Cache/uninstall semantics are assumed without deterministic coverage. | expire fallback | CO-488 | Cache/uninstall behavior affects packaged downstream users. | 2026-05-03 | 2026-05-13 | 2026-06-12 | Pack-smoke or focused validation covers the behavior, or it is explicitly unavailable/fail-closed. | Pack-smoke and focused cache/uninstall regression evidence. |

- Large-refactor check: Packet setup adds no runtime seam. Provider-worker implementation should consolidate if hook/cache/import authority is split.

## Architecture & Data
- Architecture / design adjustments: Reuse existing pack-smoke marketplace install/cache coverage and add static package governance checks.
- Data model changes / migrations: None.
- External dependencies / integrations: Codex CLI 0.128 plugin bundles, hook enablement, remote bundle cache/uninstall, external-agent config import, pack-smoke.

## Validation Plan
- Tests / checks:
  - Focused `npm run test:core -- tests/pack-smoke.spec.ts`.
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
  - Protected-term scan.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `npm run docs:check`.
  - `npm run docs:freshness` with inherited CO-522 baseline classification if red.
- Rollout verification: Update existing PR #802 and run current-head review/drain before Linear review handoff.
- Monitoring / alerts: Later implementation PR must preserve current-head Codex/CodeRabbit review gates.

## Open Questions
- Should direct release-intake issue creation scaffold packets automatically in the same helper family as `create-follow-up`?

## Approvals
- Reviewer: CO parent orchestrator.
- Date: 2026-05-13.
