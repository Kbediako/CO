# Task Checklist - CO-480 MultiAgentV2 0.128 thread-cap audit

- MCP Task ID: `linear-3abba033-52f0-45f3-af58-cce4939f087f`
- Linear issue: `CO-480` / `3abba033-52f0-45f3-af58-cce4939f087f`
- Primary PRD: `docs/PRD-linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- TECH_SPEC: `tasks/specs/linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- Summary of scope: audit and classify Codex CLI 0.128 MultiAgentV2 thread-cap support while preserving CO-354 old-path rejection and stable multi-agent defaults.

> Set `MCP_RUNNER_TASK_ID=linear-3abba033-52f0-45f3-af58-cce4939f087f` for orchestrator commands. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Live issue context inspected before transition or mutation. - Evidence: `linear issue-context` returned state `Rework`, attached PR #798, stale workpad `bc967bbe-2bef-4f52-b7fc-c2a7eb93f812`, and team states including `In Progress`, `In Review`, `Merging`, and `Done`.
- [x] Pre-turn decomposition matrix and parallelization decision recorded. - Evidence: `linear parallelization` recorded `forbid_parallel` / `parent_only_mutation` because Rework reset required closing stale PR #798, deleting the old workpad, and rebuilding from `origin/main`.
- [x] Full attached-PR feedback sweep completed before new implementation work. - Evidence: #798 was open, merge-dirty, Core Lane red, CodeRabbit approved latest head, and review threads were resolved.
- [x] Rework reset completed. - Evidence: PR #798 closed, old workpad deleted, workspace reset to `origin/main` `e7ed674534`, and branch `linear/co-480-rework` created.
- [x] Fresh workpad created. - Evidence: Linear workpad `6cb010be-0009-4122-a5e1-e0e3cda21caa`.
- [x] Docs-first packet seeded. - Evidence: this PRD, TECH_SPEC, ACTION_PLAN, task checklist, agent mirror, task index row, docs/TASKS snapshot, and docs freshness registry rows.
- [x] Docs-review evidence captured before implementation. - Evidence: `.runs/linear-3abba033-52f0-45f3-af58-cce4939f087f-co480-docs-review/cli/2026-05-13T12-46-00-796Z-d9908644/manifest.json` reached terminal failed status after `spec-guard` and `docs:check` passed; blocker was inherited `docs:freshness:maintain` `block_policy_over_budget` routed to live owner `CO-522`, not a CO-480 packet-local failure.

### Implementation
- [x] Source inspection completed on fresh base. - Evidence: CO-354 old-path guard was found in `orchestrator/src/cli/codexDefaultsSetup.ts`, `orchestrator/src/cli/init.ts`, `orchestrator/src/cli/doctor.ts`, and `orchestrator/src/cli/utils/codexFeatures.ts`; guidance stopped at "omit `agents.max_threads`" and did not classify the 0.128 v2 cap.
- [x] Document `features.multi_agent_v2.max_concurrent_threads_per_session`. - Evidence: `AGENTS.md`, `templates/codex/AGENTS.md`, `docs/guides/rlm-recursion-v2.md`, `skills/delegation-usage/SKILL.md`, and `skills/delegation-usage/DELEGATION_GUIDE.md` now name the v2-specific cap as user-owned Codex CLI 0.128+ tuning.
- [x] Preserve old-path omission/rejection for `agents.max_threads` under `features.multi_agent_v2=true`. - Evidence: shared config helpers detect boolean and table-form v2 config; defaults/init continue omitting `agents.max_threads`; local command probe recorded old-path rejection.
- [x] Add doctor/default/init support or user-owned classification for the v2 cap path. - Evidence: `doctor` now reports `multi_agent_v2_thread_cap` as `not_applicable`, `user_owned`, `configured`, or `advisory`; defaults/init preserve user-owned v2 caps without seeding them.
- [x] Add focused tests or command probes for old-path rejection and new-path acceptance. - Evidence: focused tests passed for `Doctor`, `CodexDefaultsSetup`, and `InitTemplates`; command probe artifact `out/linear-3abba033-52f0-45f3-af58-cce4939f087f/manual/multi-agent-v2-cap-probes.jsonl` records old rejection and new acceptance.
- [x] Preserve stable `features.multi_agent=true` `[agents] max_threads = 12`. - Evidence: stable baseline logic remains unchanged and focused defaults/init regression tests passed.

### Validation and Handoff
- [x] Focused tests/probes pass. - Evidence: `npm run test -- --run orchestrator/tests/Doctor.test.ts orchestrator/tests/CodexDefaultsSetup.test.ts orchestrator/tests/InitTemplates.test.ts` passed; command probe artifact has `ok: true` rows for old-path rejection and accepted v2 cap paths.
- [x] Required local gates pass or baseline blockers are explicitly routed. - Evidence: `node scripts/delegation-guard.mjs` OK; `node scripts/spec-guard.mjs --dry-run` OK; `npm run build` OK; `npm run lint` OK with three unrelated pre-existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`; `npm run test` passed 360 files / 5585 tests after instruction stamp refresh; `npm run docs:check` OK; `npm run docs:freshness` failed on inherited repo-wide stale-doc baseline with zero missing registry entries; `npm run repo:stewardship` OK; `node scripts/diff-budget.mjs` OK; `npm run pack:smoke` OK.
- [x] Manifest-backed standalone review produces `review_verdict=clean` or a valid waiver. - Evidence: `../../.runs/linear-3abba033-52f0-45f3-af58-cce4939f087f/cli/2026-05-13T12-35-04-200Z-eb104187/review/telemetry.json` reports `status=succeeded`, `review_outcome=bounded-success`, `review_verdict=clean`, and zero findings after the earlier P2 fixture finding was fixed.
- [x] Elegance/minimality pass completed. - Evidence: `out/linear-3abba033-52f0-45f3-af58-cce4939f087f/manual/elegance-review.md` records no cleanup needed; `git diff --check` passed.
- [ ] PR attached to CO-480. - Evidence: pending.
- [ ] `pr ready-review` drain exits cleanly before `In Review`. - Evidence: pending.
