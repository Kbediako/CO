---
id: 20260513-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43
title: CO-488 plugin hook, cache, and external config import governance
status: backlog
owner: Codex
created: 2026-05-13
last_review: 2026-05-13
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
related_action_plan: docs/ACTION_PLAN-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
related_tasks:
  - tasks/tasks-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
review_notes:
  - 2026-05-13: Parent orchestration created the traceability packet from live CO-488 Linear context so the issue can leave Backlog only after packet and registry evidence lands.
---

# TECH_SPEC - CO-488 plugin hook, cache, and external config import governance

## Canonical Reference
- PRD: `docs/PRD-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- Task checklist: `tasks/tasks-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- Agent mirror: `.agent/task/linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`

## Summary
- Objective: create packet and registry mirrors for CO-488 before implementation begins.
- Scope:
  - six packet/mirror docs
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Constraints:
  - no plugin implementation in this branch
  - no Linear transition or PR lifecycle mutation from packet text
  - no CO-450 binary provenance work

## Issue-Shaping Contract
- User-request translation:
  - Backlog blockers should be fixed at root cause, not patched over.
  - CO-488 is held because it lacks packet and registry mirrors, so packet setup is the immediate queue action.
  - The eventual provider-worker lane must govern plugin-bundled hooks, hook enablement state, remote bundle cache, remote uninstall, and external-agent config import.
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
  - no source/test edits
  - no broad plugin rewrite
  - no blanket plugin disablement
  - no Linear/GitHub lifecycle mutation

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Backlog traceability | CO-488 has no packet files or registry mirrors. | Queue admission requires packet evidence. | Packet evidence exists before Ready/In Progress. | Skipping the hold. |
| Plugin hook governance | 0.128 adds plugin-bundled hook behavior. | CO should not silently trust hook behavior. | Provider-worker implementation must govern or fail closed. | Blanket hook disablement. |
| Remote cache/uninstall | Cache/uninstall can affect downstream packaging. | Pack-smoke protects packaged behavior. | Add deterministic coverage or explicit non-applicability. | Binary provenance. |
| External config import | Imported config can alter behavior. | CO config authority should be explicit. | Gate or reject unsafe imported config behavior. | External-agent feature expansion. |

## Technical Requirements
- Functional requirements:
  1. Create six CO-488 packet/mirror files.
  2. Register the task in `tasks/index.json`.
  3. Add a `docs/TASKS.md` snapshot.
  4. Add six active registry rows to `docs/docs-freshness-registry.json`.
  5. Preserve canonical owner key and protected terms.
  6. Record packet setup as the evidence that clears `backlog_head_follow_up_traceability_pending`.
  7. Leave implementation to a later provider-worker lane.
- Non-functional requirements:
  - JSON remains parseable.
  - Packet diff stays scoped to docs/task/registry files.
  - Validation classifies inherited CO-522 docs freshness debt rather than hiding it.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plugin hook/import governance | Imported hooks/config can be silently trusted. | remove fallback | CO-488 | Plugin hook or external-agent config import affects packaged behavior. | 2026-05-03 | 2026-05-13 | N/A after implementation | Behavior is governed and validated, or fails closed. | Focused hook/import tests and pack-smoke where applicable. |
| Remote plugin bundle cache/uninstall | Cache/uninstall semantics are assumed without deterministic coverage. | expire fallback | CO-488 | Cache/uninstall behavior affects packaged downstream users. | 2026-05-03 | 2026-05-13 | 2026-06-12 | Pack-smoke or focused validation covers the behavior, or it is explicitly unavailable/fail-closed. | Pack-smoke and focused cache/uninstall regression evidence. |

- Large-refactor check: Packet setup adds no runtime seam. Provider-worker implementation should consolidate if hook/cache/import authority is split.

## Architecture & Data
- Architecture / design adjustments: None in packet branch.
- Data model changes / migrations: None.
- External dependencies / integrations: Codex CLI 0.128 plugin bundles, hook enablement, remote bundle cache/uninstall, external-agent config import, pack-smoke.

## Validation Plan
- Tests / checks:
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
  - Targeted path scan for CO-488 files and registry rows.
  - Protected-term scan.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `npm run docs:check`.
  - `npm run docs:freshness` with inherited CO-522 baseline classification if red.
- Rollout verification: Re-check `co-status` after packet merge to confirm CO-488 is no longer held for packet traceability.
- Monitoring / alerts: Later implementation PR must preserve current-head Codex/CodeRabbit review gates.

## Open Questions
- Should direct release-intake issue creation scaffold packets automatically in the same helper family as `create-follow-up`?

## Approvals
- Reviewer: CO parent orchestrator.
- Date: 2026-05-13.
