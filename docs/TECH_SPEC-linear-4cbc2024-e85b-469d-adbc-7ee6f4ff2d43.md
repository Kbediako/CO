---
id: 20260513-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43
title: CO-488 plugin hook, cache, and external config import governance
relates_to: docs/PRD-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
related_action_plan: docs/ACTION_PLAN-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
risk: medium
owners:
  - Codex
last_review: 2026-05-13
---

## Summary
- Objective: Register CO-488 with a complete docs-first packet and bounded implementation contract for plugin hook/cache/import governance.
- Scope: Packet docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only.
- Constraints: No source implementation, Linear transition, GitHub lifecycle, workpad mutation, or plugin behavior change in this packet branch.

## Issue-Shaping Contract
- User-request translation carried forward: Queue blockers should be addressed at the root cause. CO-488 is currently blocked from leaving Backlog because its traceability packet and mirrors are absent, not because implementation has started.
- Protected terms / exact artifact and surface names: plugin-bundled hooks, hook enablement state, remote plugin bundle cache, remote uninstall, external-agent config import, marketplace install flow, pack-smoke, downstream packaged plugin governance, `codex-cli-0128:plugin-hook-import-governance`, `backlog_head_follow_up_traceability_pending`.
- Nearby wrong interpretations to reject: Do not duplicate marketplace command rebaseline; do not absorb CO-450 binary provenance; do not trust imported hooks/config without safety checks; do not call packet creation implementation complete.
- Explicit non-goals carried forward: No broad plugin rewrite, no blanket plugin disablement, no arbitrary imported hook adoption, and no implementation in this packet lane.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Queue traceability | CO-488 has a well-shaped Linear description but no repo packet/mirrors. | Backlog follow-ups need packet and registry mirrors before admission. | Packet and mirrors exist with protected terms and canonical owner key. | Skipping the Backlog hold. |
| Plugin hooks | Hook behavior is a new CLI 0.128 surface. | CO hook behavior must be visible and governed. | Provider-worker implementation must audit and validate plugin-bundled hooks and hook enablement state. | Blanket hook disablement. |
| Cache/uninstall | Remote plugin bundle cache and remote uninstall can affect packaged behavior. | Pack-smoke should protect downstream packaging assumptions. | Implementation must add or justify deterministic governance for cache/uninstall behavior. | Binary provenance. |
| External config import | Imported external-agent config can change local behavior. | CO config authority should be explicit and fail closed when unsafe. | Implementation must gate or document imported config behavior and add focused validation. | External-agent feature adoption beyond governance. |

## Readiness Gate
- Not done if: packet/mirror files are absent; protected plugin governance terms are missing; implementation starts before packet registration; or imported hooks/config remain silently trusted.
- Pre-implementation issue-quality review evidence: 2026-05-13 parent orchestration confirmed CO-488 is held by `backlog_head_follow_up_traceability_pending` and is narrower than CO-509/CO-531 helper automation fixes.
- Safeguard ownership split: This branch owns only packet and registry mirror files. Provider-worker implementation owns source/test changes, Linear transitions, PR lifecycle, review, and merge closeout.

## Technical Requirements
- Functional requirements:
  1. Create PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent/task` mirror for CO-488.
  2. Register task id `20260513-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43` in `tasks/index.json`.
  3. Add a `docs/TASKS.md` snapshot for CO-488.
  4. Add six active rows to `docs/docs-freshness-registry.json`.
  5. Preserve canonical owner key `codex-cli-0128:plugin-hook-import-governance`.
  6. Record packet setup as clearing `backlog_head_follow_up_traceability_pending`.
- Non-functional requirements: JSON remains parseable; packet diff is docs/registry only; validation should stay scoped to packet readiness.
- Interfaces / contracts: Later implementation should touch plugin packaging, hook safety/import handling, and pack-smoke only after docs-review or equivalent packet review.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plugin hook/import governance | Plugin-bundled hooks or imported external-agent config can be trusted without CO safety checks. | remove fallback | CO-488 | Plugin hook/config import behavior affects packaged CO behavior. | 2026-05-03 | 2026-05-13 | N/A after implementation | Hook/import behavior is governed and validated, or fails closed. | Focused plugin/hook/import tests plus pack-smoke coverage or explicit non-applicability evidence. |
| Remote plugin bundle cache/uninstall | Cached remote plugin bundles or uninstall behavior can bypass packaged smoke expectations. | expire fallback | CO-488 | Remote plugin cache or uninstall behavior is used by packaged downstream users without deterministic CO coverage. | 2026-05-03 | 2026-05-13 | 2026-06-12 | Pack-smoke or focused validation covers cache/uninstall semantics, or the surface is documented as out of scope with fail-closed behavior. | Pack-smoke and focused cache/uninstall regression evidence. |

- Large-refactor check: If hook/import/cache authority is scattered across multiple plugin loaders or config import paths, implementation should consolidate the authority rather than adding another branch-specific bypass. Packet creation itself does not add a runtime seam.

## Architecture & Data
- Architecture / design adjustments: None in packet branch; later implementation should reuse existing plugin marketplace and pack-smoke paths where possible.
- Data model changes / migrations: None in packet branch.
- External dependencies / integrations: Codex CLI 0.128.0 plugin behavior, plugin bundle hooks, remote plugin cache/uninstall, external-agent config import.

## Validation Plan
- Tests / checks:
  - JSON parse for `tasks/index.json`.
  - JSON parse for `docs/docs-freshness-registry.json`.
  - Targeted path scan for `linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43` and `CO-488`.
  - Protected-term scan across the six packet files and mirrors.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `npm run docs:check`.
  - `npm run docs:freshness` may remain red on inherited CO-522 baseline, but CO-488 must not introduce missing registry or packet blockers.
- Rollout verification: After packet PR merge, re-check `co-status`/autopilot to confirm the Backlog traceability hold no longer names CO-488.
- Monitoring / alerts: Provider-worker lane should preserve Codex review and CodeRabbit current-head review gates before merge.

## Open Questions
- Should CO-531 or a follow-up extend packet scaffolding to direct, non-follow-up issue creation so future CO-488-shaped issues do not require manual packet branches?

## Approvals
- Reviewer: CO parent orchestrator.
- Date: 2026-05-13.
