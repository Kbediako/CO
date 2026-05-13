# ACTION_PLAN - CO-488 plugin hook, cache, and external config import governance

## Summary
- Goal: complete CO-488 by hardening packaged-plugin docs and pack-smoke expectations for Codex CLI 0.128 hook/cache/import governance.
- Scope: packet docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, packaged plugin setup/version-policy docs, `scripts/pack-smoke.mjs`, and focused `tests/pack-smoke.spec.ts`.
- Assumptions:
  - CO-488 is now in active provider-worker implementation with PR #802 already attached.
  - CO-450 remains the binary provenance owner.
  - CO-509/CO-531 own helper automation gaps; this lane only governs packaged plugin hook/cache/import behavior.

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
  - 2026-05-13: packet setup happened before implementation admission.
  - 2026-05-14: provider-worker implementation must update the existing PR with live 0.128 evidence, docs, pack-smoke guardrails, and focused tests.
- Fallback / refactor decision: remove the silent-trust hook/import seam and expire any cache/uninstall assumption that lacks validation.
- Durable retention evidence: Not applicable; no fallback is justified for indefinite retention.
- Large-refactor check: no large refactor is needed for the selected package-smoke guardrail; if future work intentionally supports packaged hooks/imports, it must consolidate hook/import authority rather than adding another bypass.

## Milestones & Sequencing
1. Read CO-488 live Linear issue context and attached PR feedback before implementation edits.
2. Correct detached workspace posture by working from the existing PR head without stealing the sibling worktree branch.
3. Record provider-worker parallelization and run a bounded docs child lane for setup/version-policy docs.
4. Capture live Codex CLI 0.128 npm/release/help evidence for marketplace add/upgrade/remove, plugin-bundled hooks, hook enablement state, remote plugin bundle cache, remote uninstall, and external-agent config import.
5. Add package-smoke guardrails that reject ungoverned packaged/cached plugin-bundled hooks, hook enablement state, and imported external-agent config artifacts.
6. Add focused `tests/pack-smoke.spec.ts` coverage.
7. Refresh packet/mirror docs, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry as needed.
8. Run focused tests, repo validation gates, standalone review, elegance pass, push PR #802, and drain `pr ready-review` before Linear `In Review` handoff.

## Dependencies
- Linear issue `CO-488` / `4cbc2024-e85b-469d-adbc-7ee6f4ff2d43`.
- Canonical owner key `codex-cli-0128:plugin-hook-import-governance`.
- Codex CLI 0.128.0 release-intake follow-up context.
- Existing plugin marketplace and pack-smoke governance.
- CO-450 binary provenance boundary.
- CO-509/CO-531 helper automation gaps for future issue creation.

## Validation
- Checks / tests:
  - `npm run test:core -- tests/pack-smoke.spec.ts`.
  - JSON parse for `tasks/index.json`.
  - JSON parse for `docs/docs-freshness-registry.json`.
  - targeted protected-term scan for `linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43`.
  - targeted protected-term scan for plugin hook/cache/import terms.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `npm run docs:check`.
  - `npm run docs:freshness` with inherited CO-522 baseline classified if still red.
- Rollback plan:
  - revert only the CO-488 implementation/doc changes from PR #802 if review rejects the selected package-smoke contract.

## Risks & Mitigations
- Risk: package-smoke guard is mistaken as broad plugin hook support.
  - Mitigation: docs and tests classify ungoverned plugin-bundled hooks/imports as blocked or fail-closed, not supported.
- Risk: plugin hook/import governance widens into marketplace command work.
  - Mitigation: protected non-goals reject duplicating the marketplace command rebaseline.
- Risk: imported config or hooks are trusted by default.
  - Mitigation: fallback decision requires remove/fail-closed behavior unless validation proves a governed path.
- Risk: current direct issue creation keeps producing packetless backlog items.
  - Mitigation: relate this live debt to CO-509/CO-531 helper automation and keep future scaffolding as a separate root-cause lane if needed.

## Approvals
- Reviewer: CO parent orchestrator.
- Date: 2026-05-13.
