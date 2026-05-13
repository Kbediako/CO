---
id: 20260513-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43
title: CO-488 plugin hook, cache, and external config import governance
relates_to: docs/PRD-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
related_action_plan: docs/ACTION_PLAN-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md
risk: medium
owners:
  - Codex
last_review: 2026-05-14
---

## Summary
- Objective: Complete CO-488 by hardening packaged-plugin hook/cache/import governance with live 0.128 evidence, docs, pack-smoke guardrails, and focused tests.
- Scope: Existing CO-488 packet docs/mirrors, packaged plugin setup/version-policy docs, `scripts/pack-smoke.mjs`, and focused `tests/pack-smoke.spec.ts` coverage.
- Constraints: No broad marketplace command rewrite, no CO-450 binary provenance work, no blanket plugin disablement, and no arbitrary external-agent hook/config adoption.

## Issue-Shaping Contract
- User-request translation carried forward: Queue blockers should be addressed at the root cause. CO-488 is now an active provider-worker lane; the implementation must govern the 0.128 hook/cache/import surfaces instead of treating the traceability packet as completion.
- Protected terms / exact artifact and surface names: plugin-bundled hooks, hook enablement state, remote plugin bundle cache, remote uninstall, external-agent config import, marketplace install flow, pack-smoke, downstream packaged plugin governance, `codex-cli-0128:plugin-hook-import-governance`, `backlog_head_follow_up_traceability_pending`.
- Nearby wrong interpretations to reject: Do not duplicate marketplace command rebaseline; do not absorb CO-450 binary provenance; do not trust imported hooks/config without safety checks; do not call packet creation implementation complete.
- Explicit non-goals carried forward: No broad plugin rewrite, no blanket plugin disablement, no arbitrary imported hook adoption, and no CO-450 binary provenance work.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Queue traceability | CO-488 has a well-shaped Linear description but no repo packet/mirrors. | Backlog follow-ups need packet and registry mirrors before admission. | Packet and mirrors exist with protected terms and canonical owner key. | Skipping the Backlog hold. |
| Plugin hooks | Hook behavior is a new CLI 0.128 surface. | CO hook behavior must be visible and governed. | Pack-smoke rejects packaged/cached plugin-bundled hook declarations and hook enablement state unless explicit CO hook governance is added. | Blanket hook disablement. |
| Cache/uninstall | Remote plugin bundle cache and remote uninstall can affect packaged behavior. | Pack-smoke should protect downstream packaging assumptions. | Existing cache-shape smoke is retained and docs classify cache/uninstall as packaged behavior, while CO-450 remains separate for provenance. | Binary provenance. |
| External config import | Imported external-agent config can change local behavior. | CO config authority should be explicit and fail closed when unsafe. | Pack-smoke rejects external-agent import output artifacts inside packaged/cached plugin roots and docs require ungoverned imports to fail closed or stay disabled. | External-agent feature adoption beyond governance. |

## Readiness Gate
- Not done if: protected plugin governance terms are missing; pack-smoke ignores hook/cache/import surfaces; imported hooks/config remain silently trusted; or CO-450 binary provenance is absorbed into this lane.
- Pre-implementation issue-quality review evidence: 2026-05-13 parent orchestration confirmed CO-488 is narrower than marketplace command rebaseline and CO-450 binary provenance.
- Safeguard ownership split: The active provider worker owns source/test/docs updates, Linear workpad, PR lifecycle, review, and merge closeout.

## Technical Requirements
- Functional requirements:
  1. Preserve the existing PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent/task` mirror for CO-488.
  2. Capture live 0.128 release or command evidence for marketplace add/upgrade/remove, plugin-bundled hooks, hook enablement state, remote plugin bundle cache, remote uninstall, and external-agent config import.
  3. Update packaged-plugin docs so hook/import/cache behavior is allowed, blocked, or explicitly out of scope.
  4. Update pack-smoke so ungoverned packaged/cached hook or imported-config artifacts fail closed.
  5. Add focused tests for the selected pack-smoke governance contract.
  6. Preserve canonical owner key `codex-cli-0128:plugin-hook-import-governance`.
- Non-functional requirements: JSON remains parseable; implementation stays narrow; validation must not weaken pack-smoke or marketplace command coverage.
- Interfaces / contracts: `scripts/pack-smoke.mjs` owns packaged downstream smoke expectations for plugin cache shape, plugin-bundled hook absence, hook enablement state absence, and imported external-agent artifact absence.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plugin hook/import governance | Plugin-bundled hooks or imported external-agent config can be trusted without CO safety checks. | remove fallback | CO-488 | Plugin hook/config import behavior affects packaged CO behavior. | 2026-05-03 | 2026-05-13 | N/A after implementation | Hook/import behavior is governed and validated, or fails closed. | Focused plugin/hook/import tests plus pack-smoke coverage or explicit non-applicability evidence. |
| Remote plugin bundle cache/uninstall | Cached remote plugin bundles or uninstall behavior can bypass packaged smoke expectations. | expire fallback | CO-488 | Remote plugin cache or uninstall behavior is used by packaged downstream users without deterministic CO coverage. | 2026-05-03 | 2026-05-13 | 2026-06-12 | Pack-smoke or focused validation covers cache/uninstall semantics, or the surface is documented as out of scope with fail-closed behavior. | Pack-smoke and focused cache/uninstall regression evidence. |

- Large-refactor check: If hook/import/cache authority is scattered across multiple plugin loaders or config import paths, implementation should consolidate the authority rather than adding another branch-specific bypass. Packet creation itself does not add a runtime seam.

## Architecture & Data
- Architecture / design adjustments: Reuse existing plugin marketplace and pack-smoke paths; add no new runtime authority.
- Data model changes / migrations: None.
- External dependencies / integrations: Codex CLI 0.128.0 plugin behavior, plugin bundle hooks, remote plugin cache/uninstall, external-agent config import.

## Validation Plan
- Tests / checks:
  - Focused `npm run test:core -- tests/pack-smoke.spec.ts`.
  - JSON parse for `tasks/index.json`.
  - JSON parse for `docs/docs-freshness-registry.json`.
  - Targeted protected-term scan for CO-488 and 0.128 hook/cache/import terms.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `npm run docs:check`.
- Rollout verification: Existing PR #802 must be updated, reviewed, and drained before Linear review handoff.
- Monitoring / alerts: Provider-worker lane should preserve Codex review and CodeRabbit current-head review gates before merge.

## Open Questions
- Should CO-531 or a follow-up extend packet scaffolding to direct, non-follow-up issue creation so future CO-488-shaped issues do not require manual packet branches?

## Approvals
- Reviewer: CO parent orchestrator.
- Date: 2026-05-13.
