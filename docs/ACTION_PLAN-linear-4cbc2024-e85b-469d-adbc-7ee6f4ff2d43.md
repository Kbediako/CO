# ACTION_PLAN - CO-488 plugin hook, cache, and external config import governance

## Summary
- Goal: create the CO-488 docs-first packet and traceability mirrors so plugin hook/cache/import governance can leave Backlog with its protected boundaries intact.
- Scope: packet docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - CO-488 remains in Backlog until packet evidence exists on main.
  - CO-450 remains the binary provenance owner.
  - CO-509/CO-531 own helper automation gaps; this branch clears the current CO-488 packet debt only.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - CO-488 lacks six packet files or registry mirrors.
  - plugin-bundled hooks or imported config can silently alter packaged CO behavior.
  - implementation duplicates marketplace command rebaseline or absorbs CO-450.
  - packet creation is treated as implementation completion.
- Pre-implementation issue-quality review:
  - 2026-05-13: CO-488 is a plugin governance issue, not another marketplace command rebaseline.
  - 2026-05-13: the micro-task path is unavailable because correctness depends on protected terms, exact plugin surfaces, and fail-closed governance for imported hooks/config.
  - 2026-05-13: packet setup must happen before the issue leaves Backlog.
- Fallback / refactor decision: remove the silent-trust hook/import seam and expire any cache/uninstall assumption that lacks validation.
- Durable retention evidence: Not applicable; no fallback is justified for indefinite retention.
- Large-refactor check: no large refactor is needed for packet setup; provider-worker implementation should consolidate hook/import/cache authority if source audit finds split authority.

## Milestones & Sequencing
1. Read CO-488 live Linear issue context and confirm labels, canonical owner key, Backlog state, and missing packet files.
2. Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and agent mirror.
3. Register task id `20260513-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43` in `tasks/index.json`.
4. Add the CO-488 snapshot to `docs/TASKS.md`.
5. Add six active rows to `docs/docs-freshness-registry.json`.
6. Validate JSON parse, protected terms, packet paths, spec guard, and docs checks.
7. Open a packet-only PR and wait for current-head review/check signals.
8. After merge, re-check `co-status`; if CO-488 is no longer held, let normal provider intake promote/admit the implementation lane under WIP limits.

## Dependencies
- Linear issue `CO-488` / `4cbc2024-e85b-469d-adbc-7ee6f4ff2d43`.
- Canonical owner key `codex-cli-0128:plugin-hook-import-governance`.
- Codex CLI 0.128.0 release-intake follow-up context.
- Existing plugin marketplace and pack-smoke governance.
- CO-450 binary provenance boundary.
- CO-509/CO-531 helper automation gaps for future issue creation.

## Validation
- Checks / tests:
  - JSON parse for `tasks/index.json`.
  - JSON parse for `docs/docs-freshness-registry.json`.
  - targeted path scan for `linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43`.
  - targeted protected-term scan for plugin hook/cache/import terms.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `npm run docs:check`.
  - `npm run docs:freshness` with inherited CO-522 baseline classified if still red.
- Rollback plan:
  - revert only the CO-488 packet files, task index entry, docs/TASKS snapshot, and registry rows if the packet is rejected.

## Risks & Mitigations
- Risk: packet is mistaken as implementation completion.
  - Mitigation: all packet surfaces state that source/test/plugin behavior remains parent/provider-worker owned.
- Risk: plugin hook/import governance widens into marketplace command work.
  - Mitigation: protected non-goals reject duplicating the marketplace command rebaseline.
- Risk: imported config or hooks are trusted by default.
  - Mitigation: fallback decision requires remove/fail-closed behavior unless validation proves a governed path.
- Risk: current direct issue creation keeps producing packetless backlog items.
  - Mitigation: relate this live debt to CO-509/CO-531 helper automation and keep future scaffolding as a separate root-cause lane if needed.

## Approvals
- Reviewer: CO parent orchestrator.
- Date: 2026-05-13.
